import type { MatchPlayerState, MatchWorldState } from '../types/aiMatch'
import type { PitchPosition } from '../types/game'
import { pointOf } from './pitchMath'

export type PossessionChangeReason =
  | 'kickoff'
  | 'passComplete'
  | 'intercept'
  | 'tackle'
  | 'looseBallRecover'
  | 'save'
  | 'clear'
  | 'goalRestart'

const crossTeamReasons = new Set<PossessionChangeReason>([
  'kickoff','intercept','tackle','looseBallRecover','save','clear','goalRestart',
])

export function transitionPossession(world:MatchWorldState,input:{
  owner:MatchPlayerState
  reason:PossessionChangeReason
  position?:PitchPosition
}) {
  const previousTeam=world.ball.ownerTeam??world.possessionTeam
  if(previousTeam!==input.owner.team&&!crossTeamReasons.has(input.reason)) return false
  const position=input.position??pointOf(input.owner)
  world.players.forEach((player)=>{player.hasBall=player.playerId===input.owner.playerId})
  if(input.reason==='kickoff'||input.reason==='goalRestart') {
    input.owner.x=position.x;input.owner.y=position.y
  }
  world.ball={
    x:input.reason==='kickoff'||input.reason==='goalRestart'?position.x:input.owner.x,
    y:input.reason==='kickoff'||input.reason==='goalRestart'?position.y:input.owner.y,
    vx:0,vy:0,ownerPlayerId:input.owner.playerId,ownerTeam:input.owner.team,isLoose:false,mode:'owned',
    lastTouchPlayerId:input.owner.playerId,lastTouchTeam:input.owner.team,
  }
  world.possessionTeam=input.owner.team
  world.looseBallTicks=0
  input.owner.decisionCooldown=0
  return true
}

export function makeBallLoose(world:MatchWorldState,position:PitchPosition,velocity={x:0,y:0}) {
  world.players.forEach((player)=>{player.hasBall=false})
  world.ball={
    x:position.x,y:position.y,vx:velocity.x,vy:velocity.y,ownerPlayerId:null,ownerTeam:null,isLoose:true,mode:'loose',
    lastTouchPlayerId:world.ball.lastTouchPlayerId,lastTouchTeam:world.ball.lastTouchTeam,
  }
  world.looseBallTicks=0
}
