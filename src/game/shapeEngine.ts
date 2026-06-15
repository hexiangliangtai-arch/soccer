import type { MatchPlayerState, MatchWorldState } from '../types/aiMatch'
import type { PitchPosition } from '../types/game'
import { getAiTacticProfile } from './playerAi'
import { clamp, getAttackDirection, moveToward } from './pitchMath'
import { goalkeeperTarget, teamTactic } from './playerStateEngine'

function formationTarget(player:MatchPlayerState,world:MatchWorldState):PitchPosition {
  const tactic=teamTactic(world,player.team)
  const profile=getAiTacticProfile(tactic)
  const direction=getAttackDirection(player.team)
  const inPossession=player.team===world.possessionTeam
  const push=inPossession?(tactic==='attacking'?10:tactic==='counter'?7:4):(tactic==='defensive'?-9:-4)
  const rolePush=player.role==='ST'?6:player.role==='AM'||player.role==='WG'?4:player.role==='CM'?2:player.role==='DM'?-1:-3
  const sideSlide=(world.ball.y-50)*(tactic==='possession'?.23:.15)
  return {
    x:clamp(player.baseX+direction*(push+rolePush+profile.lineOffset*.35),4,96),
    y:clamp(player.baseY+sideSlide,5,95),
  }
}

function targetForState(player:MatchPlayerState,world:MatchWorldState):PitchPosition {
  if(player.role==='GK')return goalkeeperTarget(player,world)
  if(player.actionState==='receivePass'||player.actionState==='intercept') {
    const lead=player.actionState==='receivePass'?1.25:.9
    return {x:clamp(world.ball.x+world.ball.vx*lead,2,98),y:clamp(world.ball.y+world.ball.vy*lead,3,97)}
  }
  if(player.actionState==='press'||player.actionState==='recoverLooseBall')return {x:world.ball.x,y:world.ball.y}
  if(player.actionState==='cover'||player.actionState==='support'||player.actionState==='runIntoSpace'||player.actionState==='dribble') {
    return player.desiredPosition??formationTarget(player,world)
  }
  if(player.actionState==='carryBall')return player.desiredPosition??formationTarget(player,world)
  return formationTarget(player,world)
}

export function updateContinuousMovement(world:MatchWorldState) {
  world.players=world.players.map((player)=>{
    const target=targetForState(player,world)
    const tactic=teamTactic(world,player.team)
    const profile=getAiTacticProfile(tactic)
    const urgent=['press','intercept','receivePass','recoverLooseBall','dribble'].includes(player.actionState)
    const readiness=clamp(.72+player.condition/350-player.fatigue/320,.55,1.05)*(player.currentStamina/100)
    const stateBoost=player.actionState==='press'?profile.pressSpeed:urgent?1.18:1
    const speedPerSecond=(.3+player.speed/140)*readiness*stateBoost
    const next=moveToward(player,target,speedPerSecond)
    const vx=next.x-player.x;const vy=next.y-player.y
    return {
      ...player,x:next.x,y:next.y,vx,vy,targetX:target.x,targetY:target.y,
      currentStamina:Math.max(35,player.currentStamina-(urgent?.012*stateBoost:.003)),
    }
  })
}
