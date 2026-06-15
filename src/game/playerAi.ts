import type { AiDecision, AiMatchState, MatchPlayerState } from '../types/aiMatch'
import type { MatchTeam, PitchPosition, TacticId } from '../types/game'
import type { RandomSource } from './random'
import { choosePassTarget, forwardDribbleTarget } from './ballEngine'
import { distance, findNearestPlayer, getAttackDirection, getGoalPosition, moveToward, pointOf } from './pitchMath'

interface TacticProfile {
  passBias:number
  dribbleBias:number
  shootBias:number
  support:number
  pressRange:number
  pressSpeed:number
  lineOffset:number
}

export function getAiTacticProfile(tacticId:TacticId):TacticProfile {
  const profiles:Record<TacticId,TacticProfile>={
    balanced:{passBias:1,dribbleBias:1,shootBias:1,support:1,pressRange:13,pressSpeed:1,lineOffset:0},
    possession:{passBias:1.55,dribbleBias:.78,shootBias:.72,support:1.35,pressRange:14,pressSpeed:1.02,lineOffset:2},
    counter:{passBias:1.12,dribbleBias:1.35,shootBias:1.08,support:.9,pressRange:12,pressSpeed:1.05,lineOffset:1},
    pressing:{passBias:1,dribbleBias:.95,shootBias:1.03,support:1.05,pressRange:21,pressSpeed:1.48,lineOffset:4},
    defensive:{passBias:1.25,dribbleBias:.68,shootBias:.68,support:.78,pressRange:11,pressSpeed:.9,lineOffset:-7},
    attacking:{passBias:.9,dribbleBias:1.28,shootBias:1.55,support:1.18,pressRange:15,pressSpeed:1.08,lineOffset:8},
  }
  return profiles[tacticId]
}

function tacticForTeam(team:MatchTeam,homeTactic:TacticId):TacticId {
  return team==='home'?homeTactic:'balanced'
}

function weightedAction(weights:Array<{type:AiDecision['type'];weight:number}>,random:RandomSource) {
  const total=weights.reduce((sum,item)=>sum+Math.max(0,item.weight),0)
  let roll=random.next()*total
  for (const item of weights) { roll-=Math.max(0,item.weight); if (roll<=0) return item.type }
  return 'pass' as const
}

export function decideBallAction(owner:MatchPlayerState,state:AiMatchState,random:RandomSource):AiDecision {
  const tacticId=tacticForTeam(owner.team,state.tacticId)
  const profile=getAiTacticProfile(tacticId)
  const goalDistance=distance(owner,getGoalPosition(owner.team))
  const nearbyOpponents=state.players.filter((player)=>player.team!==owner.team&&distance(player,owner)<11).length
  const target=choosePassTarget(owner,state.players,tacticId,random)
  const defensiveRole=['GK','CB','FB','WB','DM'].includes(owner.role)
  const shootBase=goalDistance<19?2.6:goalDistance<30?1.25:goalDistance<40?.38:.05
  const passBase=(target?1.1:.1)+nearbyOpponents*.32+(defensiveRole?.32:0)
  const dribbleBase=(goalDistance>13?.72:.18)+(owner.speed+owner.technique-125)/150-nearbyOpponents*.18
  const type=weightedAction([
    {type:'pass',weight:passBase*profile.passBias},
    {type:'dribble',weight:Math.max(.08,dribbleBase)*profile.dribbleBias},
    {type:'shoot',weight:shootBase*profile.shootBias*(.72+owner.attack/180)},
  ],random)
  if (type==='pass'&&target) return {type,playerId:owner.playerId,targetPlayerId:target.playerId,targetPosition:pointOf(target)}
  if (type==='shoot') return {type,playerId:owner.playerId,targetPosition:getGoalPosition(owner.team)}
  return {type:'dribble',playerId:owner.playerId,targetPosition:forwardDribbleTarget(owner,random,tacticId)}
}

function attackTarget(player:MatchPlayerState,ball:PitchPosition,tacticId:TacticId):PitchPosition {
  const profile=getAiTacticProfile(tacticId)
  const direction=getAttackDirection(player.team)
  let x=player.baseX+direction*profile.lineOffset
  let y=player.baseY
  if (player.role==='ST') x+=direction*(tacticId==='counter'?11:6)
  if (player.role==='AM'||player.role==='CM'||player.role==='WG') {
    x+=(ball.x-x)*.18*profile.support
    y+=(ball.y-y)*.28*profile.support
  }
  if (player.role==='FB'||player.role==='WB') y+=(ball.y-y)*.12
  return {x,y}
}

function defendTarget(player:MatchPlayerState,tacticId:TacticId):PitchPosition {
  const profile=getAiTacticProfile(tacticId)
  const direction=getAttackDirection(player.team)
  const roleDrop=player.role==='CB'||player.role==='FB'||player.role==='DM'?4:0
  return {x:player.baseX-direction*(Math.max(0,-profile.lineOffset)+roleDrop),y:player.baseY}
}

export function updatePlayerPositions(state:AiMatchState):MatchPlayerState[] {
  const ballPoint={x:state.ball.x,y:state.ball.y}
  const defenders=state.players.filter((player)=>player.team!==state.possessionTeam&&player.role!=='GK').sort((a,b)=>distance(a,ballPoint)-distance(b,ballPoint))
  const presser=defenders[0]; const cover=defenders[1]
  return state.players.map((player)=>{
    const tacticId=tacticForTeam(player.team,state.tacticId)
    const profile=getAiTacticProfile(tacticId)
    let target:PitchPosition={x:player.baseX,y:player.baseY}
    if (player.role==='GK') target={x:player.baseX,y:Math.max(38,Math.min(62,ballPoint.y))}
    else if (player.team===state.possessionTeam) target=player.hasBall?pointOf(player):attackTarget(player,ballPoint,tacticId)
    else if (player.playerId===presser?.playerId) target=ballPoint
    else if (player.playerId===cover?.playerId) target={x:(ballPoint.x+getGoalPosition(state.possessionTeam).x)/2,y:(ballPoint.y+50)/2}
    else target=defendTarget(player,tacticId)
    const pressing=player.playerId===presser?.playerId
    const movement=(.32+player.speed/190)*(pressing?profile.pressSpeed:1)*(player.currentStamina/100)
    const next=moveToward(player,target,movement)
    return {...player,x:next.x,y:next.y,targetX:target.x,targetY:target.y,currentStamina:Math.max(35,player.currentStamina-(pressing?.018*profile.pressSpeed:.006))}
  })
}

export function nearestDefender(owner:MatchPlayerState,players:MatchPlayerState[]) {
  return findNearestPlayer(players,owner,(player)=>player.team!==owner.team&&player.role!=='GK')
}
