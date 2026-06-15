import type { MatchPlayerState, MatchWorldState, PlayerActionState } from '../types/aiMatch'
import type { MatchTeam, PitchPosition, TacticId } from '../types/game'
import type { RandomSource } from './random'
import { createPlaySequence } from './playSequenceEngine'
import { clamp, distance, getAttackDirection, getGoalPosition } from './pitchMath'

function tacticForTeam(team:MatchTeam,home:TacticId):TacticId {return team==='home'?home:'balanced'}

export function updateTeamIntents(world:MatchWorldState,random:RandomSource) {
  for(const team of ['home','away'] as const) {
    const current=world.teamIntents[team]
    if(current&&world.timeSec-current.startedAtSec<30)continue
    const owner=world.players.find((player)=>player.playerId===world.ball.ownerPlayerId&&player.team===team)
      ??world.players.find((player)=>player.team===team&&player.role==='CM')
      ??world.players.find((player)=>player.team===team)!
    const intent=createPlaySequence(world,owner,random)
    if(intent) {
      world.teamIntents[team]=intent
      if(world.counterTeam===team)world.counterTeam=null
    }
  }
}

function projectedBall(world:MatchWorldState,seconds:number):PitchPosition {
  return {x:clamp(world.ball.x+world.ball.vx*seconds,2,98),y:clamp(world.ball.y+world.ball.vy*seconds,3,97)}
}

function setState(player:MatchPlayerState,state:PlayerActionState,world:MatchWorldState,desired?:PitchPosition) {
  if(player.actionState!==state) {
    player.actionState=state;player.actionStartedAt=world.timeSec;player.actionStartPosition={x:player.x,y:player.y}
  }
  player.intent=world.teamIntents[player.team]?.type
  player.desiredPosition=desired
  player.focusBall=['receivePass','intercept','recoverLooseBall','goalkeeping'].includes(state)
}

export function updatePlayerActionStates(world:MatchWorldState) {
  const owner=world.players.find((player)=>player.playerId===world.ball.ownerPlayerId)
  const projected=projectedBall(world,1.5)
  const loose=world.ball.mode==='loose'||world.ball.mode==='deflection'
  const chasers=loose?[...world.players].filter((player)=>player.role!=='GK').sort((a,b)=>distance(a,world.ball)-distance(b,world.ball)).slice(0,4):[]
  const interceptors=world.ball.mode==='pass'?[...world.players]
    .filter((player)=>player.team!==world.ball.lastTouchTeam&&player.role!=='GK')
    .sort((a,b)=>distance(a,projected)-distance(b,projected)).slice(0,3):[]
  const defenders=owner?[...world.players].filter((player)=>player.team!==owner.team&&player.role!=='GK').sort((a,b)=>distance(a,owner)-distance(b,owner)):[]

  world.players.forEach((player)=>{
    player.reactionCooldown=Math.max(0,(player.reactionCooldown??0)-1)
    if(player.role==='GK') {setState(player,'goalkeeping',world);return}
    if(loose&&chasers.some((item)=>item.playerId===player.playerId)) {setState(player,'recoverLooseBall',world,{x:world.ball.x,y:world.ball.y});return}
    if(world.ball.mode==='pass') {
      if(player.playerId===world.ball.intendedReceiverId) {
        player.receivePoint=projected;setState(player,'receivePass',world,projected);return
      }
      if(interceptors.some((item)=>item.playerId===player.playerId)) {setState(player,'intercept',world,projected);return}
    }
    if(owner) {
      if(player.playerId===owner.playerId) {
        setState(player,player.actionState==='dribble'?'dribble':'carryBall',world,player.desiredPosition);return
      }
      if(player.team!==owner.team) {
        if(player.playerId===defenders[0]?.playerId) {setState(player,'press',world,{x:owner.x,y:owner.y});return}
        if(player.playerId===defenders[1]?.playerId) {setState(player,'cover',world,{x:(owner.x+player.baseX)/2,y:(owner.y+player.baseY)/2});return}
        setState(player,'mark',world);return
      }
      const direction=getAttackDirection(player.team,world.half)
      const intent=world.teamIntents[player.team]?.type
      if(['ST','WG','AM'].includes(player.role)&&intent!=='keepPossession') {
        setState(player,'runIntoSpace',world,{x:clamp(player.baseX+direction*(intent==='counter'?15:8),4,96),y:player.baseY});return
      }
      setState(player,'support',world,{x:clamp(owner.x-direction*8,4,96),y:clamp((owner.y+player.baseY)/2,5,95)});return
    }
    setState(player,'returnToShape',world)
  })
}

export function chooseDribbleDirection(owner:MatchPlayerState,world:MatchWorldState,random:RandomSource) {
  const direction=getAttackDirection(owner.team,world.half)
  const opponents=world.players.filter((player)=>player.team!==owner.team&&distance(player,owner)<12)
  const candidates=[-14,-7,0,7,14].map((lateral)=>{
    const point={x:clamp(owner.x+direction*(5+random.next()*3),3,97),y:clamp(owner.y+lateral,4,96)}
    const space=Math.min(...opponents.map((player)=>distance(player,point)),18)
    const sidelinePenalty=Math.min(point.y,100-point.y)<8?8:0
    return {point,score:space-sidelinePenalty+random.next()*2}
  })
  return candidates.sort((a,b)=>b.score-a.score)[0].point
}

export function goalkeeperTarget(player:MatchPlayerState,world:MatchWorldState):PitchPosition {
  const ownGoal=getGoalPosition(player.team==='home'?'away':'home',world.half)
  const direction=getAttackDirection(player.team,world.half)
  const shotThreat=world.ball.mode==='shot'&&world.ball.lastTouchTeam!==player.team
  return {
    x:clamp(ownGoal.x+direction*(6+Math.abs(world.ball.x-ownGoal.x)/100*5),5,95),
    y:clamp(50+(world.ball.y-50)*(shotThreat?.65:.24),36,64),
  }
}

export function teamTactic(world:MatchWorldState,team:MatchTeam) {return tacticForTeam(team,world.tacticId)}
