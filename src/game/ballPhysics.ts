import type { MatchPlayerState, MatchWorldState } from '../types/aiMatch'
import type { PitchPosition } from '../types/game'
import { clamp, distance, pointOf } from './pitchMath'

export type BallSegmentHandler = (from:PitchPosition,to:PitchPosition)=>boolean

export function kickBall(
  world:MatchWorldState,
  owner:MatchPlayerState,
  target:PitchPosition,
  input:{mode:'pass'|'shot';speed:number;receiverId?:string;type?:'pass'|'throughPass'|'cross'|'shoot'|'clear'},
) {
  const from=pointOf(owner)
  const length=Math.max(.01,distance(from,target))
  world.players.forEach((player)=>{player.hasBall=false})
  world.ball={
    x:from.x,y:from.y,
    vx:(target.x-from.x)/length*input.speed,
    vy:(target.y-from.y)/length*input.speed,
    ownerPlayerId:null,ownerTeam:owner.team,isLoose:false,mode:input.mode,
    lastTouchPlayerId:owner.playerId,lastTouchTeam:owner.team,
    intendedReceiverId:input.receiverId,kickStartedAtSec:world.timeSec,kickFrom:from,
    kickType:input.type??(input.mode==='shot'?'shoot':'pass'),
    shooterPlayerId:input.mode==='shot'?owner.playerId:undefined,travelDistance:0,
  }
  owner.actionState=input.mode==='shot'?'shoot':'returnToShape'
  owner.actionStartedAt=world.timeSec
}

export function updateBallPhysics(world:MatchWorldState,onSegment:BallSegmentHandler) {
  const owner=world.ball.ownerPlayerId?world.players.find((player)=>player.playerId===world.ball.ownerPlayerId):undefined
  if(world.ball.mode==='owned'&&owner) {
    world.ball.x=owner.x;world.ball.y=owner.y;world.ball.vx=owner.vx;world.ball.vy=owner.vy
    return
  }
  if(!['pass','shot','deflection','loose'].includes(world.ball.mode))return

  const subSteps=4
  for(let index=0;index<subSteps;index++) {
    const from={x:world.ball.x,y:world.ball.y}
    world.ball.x+=world.ball.vx/subSteps
    world.ball.y+=world.ball.vy/subSteps
    world.ball.travelDistance=(world.ball.travelDistance??0)+distance(from,world.ball)
    if(onSegment(from,{x:world.ball.x,y:world.ball.y}))return
    const friction=world.ball.mode==='shot'?.997:world.ball.mode==='pass'?.985:.9
    world.ball.vx*=friction;world.ball.vy*=friction
  }

  if(world.ball.mode==='pass'&&Math.hypot(world.ball.vx,world.ball.vy)<1.4) {
    world.ball.mode='loose';world.ball.isLoose=true;world.ball.ownerTeam=null
  }
  if(world.ball.mode==='loose'||world.ball.mode==='deflection') {
    world.ball.x=clamp(world.ball.x,1,99);world.ball.y=clamp(world.ball.y,2,98)
    if(Math.hypot(world.ball.vx,world.ball.vy)<.08) {world.ball.vx=0;world.ball.vy=0}
  }
}
