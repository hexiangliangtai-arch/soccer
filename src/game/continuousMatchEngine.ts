import type { MatchPlayerState, MatchWorldState } from '../types/aiMatch'
import type { MatchEvent, MatchFrame, MatchState, MatchTeam, PitchPosition, Player, TacticId } from '../types/game'
import type { TeamIntent } from '../types/playSequence'
import { createAiEvent } from './aiEventFactory'
import { kickBall, updateBallPhysics } from './ballPhysics'
import { detectLooseBallRecovery, detectMovingBallContact, detectTackleContact } from './contactEngine'
import { captureWorldSnapshot, detectWorldEvents } from './eventDetector'
import { decideBallAction } from './playerAi'
import { clamp, distance, getAttackDirection, getGoalPosition, pointOf } from './pitchMath'
import { chooseDribbleDirection, updatePlayerActionStates, updateTeamIntents } from './playerStateEngine'
import { transitionPossession } from './possessionEngine'
import { createSeededRandom, randomInt, type RandomSource } from './random'
import { updateContinuousMovement } from './shapeEngine'
import { createAiMatchPlayers } from './teamSetup'

export interface ContinuousHalfResult {
  events: MatchEvent[]
  frames: MatchFrame[]
  framePlayerIds: string[]
  framePlayerTeams: MatchTeam[]
}

const SIMULATE_STEP_SEC=1
const SAVE_FRAME_INTERVAL_SEC=3
const HALF_SECONDS=45*60

function defaultIntent(matchId:string,team:MatchTeam,timeSec:number):TeamIntent {
  return {id:`${matchId}-intent-${team}-${timeSec}`,type:'buildUp',team,startedAtSec:timeSec,preferredZone:'center',riskLevel:.45,tempo:'normal'}
}

function playerById(world:MatchWorldState,id:string|null|undefined) {
  return id?world.players.find((player)=>player.playerId===id):undefined
}

function resetKickoff(world:MatchWorldState,team:MatchTeam,reason:'kickoff'|'goalRestart'='kickoff') {
  world.players.forEach((player)=>{
    player.x=player.baseX;player.y=player.baseY;player.vx=0;player.vy=0
    player.targetX=player.baseX;player.targetY=player.baseY;player.hasBall=false
    player.actionState=player.role==='GK'?'goalkeeping':'returnToShape'
    player.desiredPosition=undefined;player.receivePoint=undefined
  })
  const owner=world.players.filter((player)=>player.team===team&&player.role!=='GK').sort((a,b)=>distance(a,{x:50,y:50})-distance(b,{x:50,y:50}))[0]
  if(!owner)throw new Error('キックオフ選手が見つかりません')
  transitionPossession(world,{owner,position:{x:50,y:50},reason})
  owner.decisionCooldown=20
  world.ballMotion=null;world.dribbleMotion=null;world.lastPasserId=null;world.lastPassTeam=null
  world.counterTeam=null;world.activeSequence=undefined;world.sequenceTargets={}
}

function createWorld(match:MatchState,allPlayers:Player[],tacticId:TacticId,half:'first'|'second'):MatchWorldState {
  const players=createAiMatchPlayers(match,allPlayers,half)
  const goals=match.events.filter((event)=>event.type==='goal')
  const timeSec=half==='first'?0:HALF_SECONDS
  const world:MatchWorldState={
    matchId:match.id,half,minute:half==='first'?0:45,second:0,stepIndex:0,timeSec,
    homeScore:goals.filter((event)=>event.team==='home').length,awayScore:goals.filter((event)=>event.team==='away').length,
    possessionTeam:half==='first'?'home':'away',players,
    ball:{x:50,y:50,vx:0,vy:0,ownerPlayerId:null,ownerTeam:null,isLoose:false,mode:'owned'},
    events:[],frames:[],frameEventIds:[],currentSequence:match.events.length,tacticId,lastPasserId:null,lastPassTeam:null,
    ballMotion:null,dribbleMotion:null,counterTeam:null,looseBallTicks:0,completedSequences:[],sequenceTargets:{},nextSequenceTimeSec:0,
    teamIntents:{home:defaultIntent(match.id,'home',timeSec),away:defaultIntent(match.id,'away',timeSec)},recordedActions:[],
  }
  resetKickoff(world,world.possessionTeam)
  if(half==='second') {
    const event=createAiEvent(world,{type:'matchStart',team:world.possessionTeam,description:'後半キックオフ。両チームが再びピッチへ動き出します。'})
    world.frameEventIds.push(event.id)
  }
  return world
}

function round1(value:number) {return Math.round(value*10)/10}

function captureFrame(world:MatchWorldState,frameOffset:number) {
  const ownerIndex=world.ball.ownerPlayerId?world.players.findIndex((player)=>player.playerId===world.ball.ownerPlayerId):-1
  world.frames.push({
    frameIndex:frameOffset+world.frames.length,timeSec:world.timeSec,minute:world.minute,second:world.second,half:world.half,
    homeScore:world.homeScore,awayScore:world.awayScore,possessionTeam:world.ball.ownerTeam,
    ball:[round1(world.ball.x),round1(world.ball.y),ownerIndex,world.ball.mode==='loose'||world.ball.mode==='deflection'?1:0],
    players:world.players.map((player)=>[round1(player.x),round1(player.y),player.hasBall?1:0]),
    ...(world.frameEventIds.length?{eventIds:[...world.frameEventIds]}:{}),
  })
  world.frameEventIds=[]
}

function leadPassTarget(target:MatchPlayerState,owner:MatchPlayerState,world:MatchWorldState):PitchPosition {
  const direction=getAttackDirection(owner.team,world.half)
  const intent=world.teamIntents[owner.team]?.type
  const lead=intent==='counter'?7:intent==='sideAttack'?4:2.5
  return {
    x:clamp(target.x+target.vx*2+direction*lead,2,98),
    y:clamp(target.y+target.vy*2,3,97),
  }
}

function passType(owner:MatchPlayerState,target:MatchPlayerState,world:MatchWorldState) {
  const direction=getAttackDirection(owner.team,world.half)
  const forward=(target.x-owner.x)*direction
  const intent=world.teamIntents[owner.team]?.type
  if(intent==='sideAttack'&&Math.abs(owner.y-50)>22)return 'cross' as const
  if(forward>13||intent==='counter')return 'throughPass' as const
  return 'pass' as const
}

function startPass(world:MatchWorldState,owner:MatchPlayerState,target:MatchPlayerState) {
  const destination=leadPassTarget(target,owner,world)
  const speed=8.5+owner.technique/28
  kickBall(world,owner,destination,{mode:'pass',speed,receiverId:target.playerId,type:passType(owner,target,world)})
  owner.decisionCooldown=10+Math.max(0,Math.round(distance(owner,target)/5))
}

function startShot(world:MatchWorldState,owner:MatchPlayerState,random:RandomSource) {
  const goal=getGoalPosition(owner.team,world.half)
  const direction=getAttackDirection(owner.team,world.half)
  const accuracy=(owner.attack*.58+owner.technique*.3+owner.mental*.12)/100
  const defensivePressure=owner.team==='away'?(world.tacticId==='defensive'?1.65:world.tacticId==='attacking'?.65:1):1
  const spread=((1-accuracy)*34+5)*defensivePressure
  const target={x:goal.x+direction*2,y:50+(random.next()-.5)*spread*2}
  kickBall(world,owner,target,{mode:'shot',speed:18+owner.attack/15,type:'shoot'})
  owner.decisionCooldown=10
}

function startDribble(world:MatchWorldState,owner:MatchPlayerState,random:RandomSource) {
  owner.actionState='dribble';owner.actionStartedAt=world.timeSec;owner.actionStartPosition=pointOf(owner)
  owner.desiredPosition=chooseDribbleDirection(owner,world,random)
  owner.decisionCooldown=randomInt(random,16,25)
  world.lastPasserId=null;world.lastPassTeam=null
}

function decideOwnerAction(world:MatchWorldState,random:RandomSource) {
  if(world.ball.mode!=='owned')return
  const owner=playerById(world,world.ball.ownerPlayerId)
  if(!owner)return
  owner.decisionCooldown-=SIMULATE_STEP_SEC
  if(owner.actionState==='dribble')owner.desiredPosition=chooseDribbleDirection(owner,world,random)
  if(owner.decisionCooldown>0)return
  if(owner.role==='GK') {
    const target=world.players.filter((player)=>player.team===owner.team&&player.role!=='GK').sort((a,b)=>distance(a,owner)-distance(b,owner))[0]
    if(target)startPass(world,owner,target)
    return
  }
  const decision=decideBallAction(owner,world,random)
  if(decision.type==='shoot'&&distance(owner,getGoalPosition(owner.team,world.half))>38) {
    const target=world.players.filter((player)=>player.team===owner.team&&player.playerId!==owner.playerId).sort((a,b)=>distance(a,getGoalPosition(owner.team,world.half))-distance(b,getGoalPosition(owner.team,world.half)))[0]
    if(target)startPass(world,owner,target);else startDribble(world,owner,random)
    return
  }
  if(decision.type==='pass'&&decision.targetPlayerId) {
    const target=playerById(world,decision.targetPlayerId)
    if(target)startPass(world,owner,target)
    else startDribble(world,owner,random)
  } else if(decision.type==='shoot')startShot(world,owner,random)
  else startDribble(world,owner,random)
}

function settleOutOfPlay(world:MatchWorldState,beforeScore:{home:number;away:number}) {
  if(world.ball.mode==='saved') {world.ball.mode='owned';return}
  if(world.ball.mode!=='outOfPlay')return
  const scored=world.homeScore>beforeScore.home||world.awayScore>beforeScore.away
  if(scored) {
    const scoringTeam=world.homeScore>beforeScore.home?'home':'away'
    resetKickoff(world,scoringTeam==='home'?'away':'home','goalRestart')
    return
  }
  const defendingTeam=world.ball.lastTouchTeam==='home'?'away':'home'
  const goalkeeper=world.players.find((player)=>player.team===defendingTeam&&player.role==='GK')
  if(goalkeeper) {
    transitionPossession(world,{owner:goalkeeper,reason:'clear',position:pointOf(goalkeeper)})
    goalkeeper.decisionCooldown=5
  } else resetKickoff(world,defendingTeam)
  world.lastPasserId=null;world.lastPassTeam=null
}

function runDetectedPhase(world:MatchWorldState,before:ReturnType<typeof captureWorldSnapshot>,operation:()=>void) {
  operation();detectWorldEvents(world,before)
}

export function simulateContinuousHalf(match:MatchState,allPlayers:Player[],tacticId:TacticId):ContinuousHalfResult {
  const half=match.phase==='preMatch'?'first':'second'
  const world=createWorld(match,allPlayers,tacticId,half)
  const random=createSeededRandom(match.seed+(half==='first'?2609:12011)+tacticId.length*173)
  const frameOffset=match.frames?.length??0
  captureFrame(world,frameOffset)

  for(let elapsed=1;elapsed<=HALF_SECONDS;elapsed+=SIMULATE_STEP_SEC) {
    world.stepIndex=elapsed;world.timeSec=(half==='first'?0:HALF_SECONDS)+elapsed
    world.minute=(half==='first'?0:45)+Math.floor(elapsed/60);world.second=elapsed%60

    const movementBefore=captureWorldSnapshot(world)
    updateTeamIntents(world,random)
    updatePlayerActionStates(world)
    updateContinuousMovement(world)
    if(world.ball.mode==='owned') {
      const owner=playerById(world,world.ball.ownerPlayerId)
      if(owner) {world.ball.x=owner.x;world.ball.y=owner.y;world.ball.vx=owner.vx;world.ball.vy=owner.vy}
    }
    detectTackleContact(world,random)
    detectWorldEvents(world,movementBefore)

    const decisionBefore=captureWorldSnapshot(world)
    runDetectedPhase(world,decisionBefore,()=>decideOwnerAction(world,random))

    const physicsBefore=captureWorldSnapshot(world)
    const scoreBefore={home:world.homeScore,away:world.awayScore}
    updateBallPhysics(world,(from,to)=>detectMovingBallContact(world,from,to,random))
    detectLooseBallRecovery(world)
    detectWorldEvents(world,physicsBefore)
    const settleBefore=captureWorldSnapshot(world)
    settleOutOfPlay(world,scoreBefore)
    detectWorldEvents(world,settleBefore)

    if(elapsed%SAVE_FRAME_INTERVAL_SEC===0)captureFrame(world,frameOffset)
  }

  world.minute=half==='first'?45:90;world.second=0
  const boundary=createAiEvent(world,{
    type:half==='first'?'halfTime':'matchEnd',team:'home',
    description:half==='first'?'前半終了。選手たちがベンチへ戻ります。':'試合終了。両チーム、力を出し切りました。',
  })
  world.frameEventIds.push(boundary.id)
  const lastFrame=world.frames.at(-1)
  if(lastFrame&&lastFrame.timeSec===world.timeSec)lastFrame.eventIds=[...(lastFrame.eventIds??[]),...world.frameEventIds]
  else captureFrame(world,frameOffset)
  return {events:world.events,frames:world.frames,framePlayerIds:world.players.map((player)=>player.playerId),framePlayerTeams:world.players.map((player)=>player.team)}
}
