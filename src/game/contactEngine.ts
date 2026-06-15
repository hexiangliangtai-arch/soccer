import type { MatchPlayerState, MatchWorldState } from '../types/aiMatch'
import type { PitchPosition } from '../types/game'
import type { RandomSource } from './random'
import { clamp, distance, getGoalPosition, pointOf } from './pitchMath'
import { makeBallLoose, transitionPossession } from './possessionEngine'

function segmentDistance(point:PitchPosition,start:PitchPosition,end:PitchPosition) {
  const dx=end.x-start.x;const dy=end.y-start.y
  const lengthSquared=dx*dx+dy*dy
  if(!lengthSquared)return distance(point,start)
  const ratio=clamp(((point.x-start.x)*dx+(point.y-start.y)*dy)/lengthSquared,0,1)
  return distance(point,{x:start.x+dx*ratio,y:start.y+dy*ratio})
}

function contactCandidates(world:MatchWorldState,from:PitchPosition,to:PitchPosition) {
  return world.players
    .filter((player)=>{
      if(player.playerId===world.ball.lastTouchPlayerId&&world.timeSec-(world.ball.kickStartedAtSec??-99)<1)return false
      const radius=player.role==='GK'&&world.ball.mode==='shot'
        ?3.6
        :world.ball.mode==='shot'
          ?6
          :world.ball.mode==='pass'
            ?player.team===world.ball.lastTouchTeam?2.15:1.15
            :2.1
      return segmentDistance(player,from,to)<=radius
    })
    .sort((a,b)=>segmentDistance(a,from,to)-segmentDistance(b,from,to))
}

export function detectMovingBallContact(world:MatchWorldState,from:PitchPosition,to:PitchPosition,random:RandomSource) {
  if(world.ball.mode==='pass') {
    const contact=contactCandidates(world,from,to)[0]
    if(contact) {
      const sameTeam=contact.team===world.ball.lastTouchTeam
      transitionPossession(world,{owner:contact,reason:sameTeam?'passComplete':'intercept',position:pointOf(contact)})
      contact.decisionCooldown=sameTeam?80+random.next()*35:50+random.next()*25
      if(!sameTeam)world.counterTeam=contact.team
      return true
    }
    if(world.ball.x<1||world.ball.x>99||world.ball.y<1||world.ball.y>99) {
      world.ball.mode='loose';world.ball.isLoose=true;world.ball.ownerTeam=null
      world.ball.x=clamp(world.ball.x,1,99);world.ball.y=clamp(world.ball.y,1,99)
      return true
    }
  }

  if(world.ball.mode==='shot') {
    const contacts=contactCandidates(world,from,to).filter((player)=>player.team!==world.ball.lastTouchTeam)
    for(const contact of contacts) {
      const goalkeeper=contact.role==='GK'
      const control=(contact.defense*.55+contact.mental*.25+contact.speed*.2)/100
      const homeTactic=contact.team==='home'?world.tacticId:'balanced'
      const tacticModifier=homeTactic==='defensive'?.22:homeTactic==='attacking'?-.1:homeTactic==='pressing'?.05:0
      const chance=clamp((goalkeeper?.4+control*.52:.42+control*.32)+tacticModifier,.12,.94)
      if(random.next()>chance)continue
      if(goalkeeper) {
        transitionPossession(world,{owner:contact,reason:'save',position:pointOf(contact)})
        world.ball.mode='saved'
      } else {
        world.ball.lastTouchPlayerId=contact.playerId;world.ball.lastTouchTeam=contact.team
        makeBallLoose(world,pointOf(contact),{x:-world.ball.vx*.28,y:world.ball.vy*.22})
        world.ball.mode='deflection'
      }
      return true
    }
    const shootingTeam=world.ball.lastTouchTeam??world.possessionTeam
    const goalLine=getGoalPosition(shootingTeam,world.half).x
    const crossed=goalLine===100?world.ball.x>=goalLine:world.ball.x<=goalLine
    if(crossed) {
      world.ball.x=goalLine
      world.ball.mode='outOfPlay';world.ball.isLoose=false
      if(world.ball.y>=43&&world.ball.y<=57) {
        if(shootingTeam==='home')world.homeScore++;else world.awayScore++
      }
      return true
    }
  }
  return false
}

export function detectLooseBallRecovery(world:MatchWorldState) {
  if(world.ball.mode!=='loose'&&world.ball.mode!=='deflection')return false
  const contact=[...world.players]
    .filter((player)=>distance(player,world.ball)<=2.1)
    .sort((a,b)=>distance(a,world.ball)-distance(b,world.ball))[0]
  if(!contact)return false
  const previousTeam=world.possessionTeam
  transitionPossession(world,{owner:contact,reason:'looseBallRecover',position:pointOf(contact)})
  contact.decisionCooldown=3
  if(contact.team!==previousTeam)world.counterTeam=contact.team
  return true
}

export function detectTackleContact(world:MatchWorldState,random:RandomSource) {
  if(world.ball.mode!=='owned'||!world.ball.ownerPlayerId)return false
  const owner=world.players.find((player)=>player.playerId===world.ball.ownerPlayerId)
  if(!owner)return false
  const defender=world.players
    .filter((player)=>player.team!==owner.team&&player.actionState==='press'&&distance(player,owner)<2.15)
    .sort((a,b)=>distance(a,owner)-distance(b,owner))[0]
  if(!defender)return false
  if((defender.reactionCooldown??0)>0)return false
  defender.reactionCooldown=18
  const defense=(defender.defense*.55+defender.speed*.2+defender.mental*.25)
  const control=(owner.technique*.55+owner.speed*.25+owner.mental*.2)
  const tacticBoost=defender.team==='home'&&world.tacticId==='pressing'?.12:0
  const chance=clamp(.08+(defense-control)/220+tacticBoost,0.04,.4)
  if(random.next()>chance)return false
  defender.actionState='tackle';defender.actionStartedAt=world.timeSec
  owner.actionState='idle'
  world.ball.lastTouchPlayerId=owner.playerId;world.ball.lastTouchTeam=owner.team
  makeBallLoose(world,pointOf(owner),{x:(defender.vx-owner.vx)*.8,y:(defender.vy-owner.vy)*.8})
  world.counterTeam=defender.team
  world.lastPasserId=null;world.lastPassTeam=null
  return true
}
