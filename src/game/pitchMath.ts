import type { MatchPlayerState } from '../types/aiMatch'
import type { MatchTeam, PitchPosition } from '../types/game'
import type { RandomSource } from './random'

export function clamp(value: number,min=0,max=100) {
  return Math.max(min,Math.min(max,value))
}

export function clampPoint(point: PitchPosition): PitchPosition {
  return {x:clamp(point.x),y:clamp(point.y)}
}

export function distance(a: PitchPosition,b: PitchPosition) {
  return Math.hypot(a.x-b.x,a.y-b.y)
}

export function moveToward(current: PitchPosition,target: PitchPosition,amount: number): PitchPosition {
  const total=distance(current,target)
  if (!total||total<=amount) return clampPoint(target)
  const ratio=amount/total
  return clampPoint({x:current.x+(target.x-current.x)*ratio,y:current.y+(target.y-current.y)*ratio})
}

export function findNearestPlayer(players: MatchPlayerState[],point: PitchPosition,filter: (player:MatchPlayerState)=>boolean=()=>true) {
  return players.filter(filter).sort((a,b)=>distance(a,point)-distance(b,point))[0]
}

export function getGoalPosition(team: MatchTeam): PitchPosition {
  return team==='home'?{x:100,y:50}:{x:0,y:50}
}

export function getAttackDirection(team: MatchTeam): 1|-1 {
  return team==='home'?1:-1
}

export function mirrorPointForAway(point: PitchPosition): PitchPosition {
  return {x:100-point.x,y:point.y}
}

export function randomBetween(random: RandomSource,min: number,max: number) {
  return min+random.next()*(max-min)
}

export function pointOf(player: MatchPlayerState): PitchPosition {
  return {x:player.x,y:player.y}
}
