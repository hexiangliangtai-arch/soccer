import type { BallState, MatchPlayerState, MatchWorldState, PlayerActionState } from '../types/aiMatch'
import type { MatchTeam, PitchPosition } from '../types/game'
import type { PlayAction, PlayActionResult, PlayActionType } from '../types/playSequence'
import { createAiEvent } from './aiEventFactory'
import { distance, getGoalPosition, pointOf } from './pitchMath'

export interface WorldSnapshot {
  ball:BallState
  homeScore:number
  awayScore:number
  actions:Record<string,PlayerActionState>
  positions:Record<string,PitchPosition>
  intents:Record<MatchTeam,string>
}

export function captureWorldSnapshot(world:MatchWorldState):WorldSnapshot {
  return {
    ball:{...world.ball,kickFrom:world.ball.kickFrom?{...world.ball.kickFrom}:undefined},
    homeScore:world.homeScore,awayScore:world.awayScore,
    actions:Object.fromEntries(world.players.map((player)=>[player.playerId,player.actionState])),
    positions:Object.fromEntries(world.players.map((player)=>[player.playerId,pointOf(player)])),
    intents:{home:world.teamIntents.home?.id??'',away:world.teamIntents.away?.id??''},
  }
}

function player(world:MatchWorldState,id:string|null|undefined) {return id?world.players.find((item)=>item.playerId===id):undefined}

function emit(world:MatchWorldState,input:Parameters<typeof createAiEvent>[1]) {
  const event=createAiEvent(world,input);world.frameEventIds.push(event.id);return event
}

function activeAction(world:MatchWorldState,type:PlayActionType) {
  return [...world.recordedActions].reverse().find((action)=>action.type===type&&action.status==='active')
}

function beginAction(world:MatchWorldState,type:PlayActionType,actor:MatchPlayerState|undefined,target:MatchPlayerState|undefined,eventId:string,start:PitchPosition) {
  const action:PlayAction={
    id:`${world.matchId}-record-${world.recordedActions.length}`,type,team:actor?.team??world.possessionTeam,
    actorPlayerId:actor?.playerId,targetPlayerId:target?.playerId,start,end:start,
    startTimeSec:world.timeSec,endTimeSec:world.timeSec,status:'active',relatedEventId:eventId,
  }
  world.recordedActions.push(action)
}

function finishAction(world:MatchWorldState,type:PlayActionType,end:PitchPosition,result:PlayActionResult) {
  const action=activeAction(world,type)
  if(!action)return
  action.end=end;action.endTimeSec=world.timeSec;action.result=result;action.status='completed'
}

function latestKickEvent(world:MatchWorldState) {
  return [...world.events].reverse().find((event)=>['pass','throughPass','cross'].includes(event.type)&&event.playerId===world.ball.lastTouchPlayerId)
    ??[...world.events].reverse().find((event)=>['pass','throughPass','cross'].includes(event.type)&&event.result===undefined)
}

export function detectWorldEvents(world:MatchWorldState,before:WorldSnapshot) {
  const previousOwner=player(world,before.ball.ownerPlayerId)
  const currentOwner=player(world,world.ball.ownerPlayerId)

  if(before.ball.mode==='owned'&&world.ball.mode==='pass') {
    const actor=player(world,world.ball.lastTouchPlayerId)??previousOwner
    const target=player(world,world.ball.intendedReceiverId)
    const type=world.ball.kickType==='throughPass'||world.ball.kickType==='cross'?world.ball.kickType:'pass'
    const event=emit(world,{type,team:actor?.team??world.possessionTeam,player:actor,target,position:world.ball.kickFrom,targetPosition:target?pointOf(target):undefined})
    beginAction(world,type,actor,target,event.id,world.ball.kickFrom??{x:world.ball.x,y:world.ball.y})
    world.lastPasserId=actor?.playerId??null;world.lastPassTeam=actor?.team??null
  }

  if(before.ball.mode==='owned'&&world.ball.mode==='shot') {
    const shooter=player(world,world.ball.shooterPlayerId)??previousOwner
    emit(world,{type:'chance',team:shooter?.team??world.possessionTeam,player:shooter,position:world.ball.kickFrom,targetPosition:world.ball.kickFrom,result:'success'})
    const shootingTeam=shooter?.team??world.ball.lastTouchTeam??world.possessionTeam
    const event=emit(world,{type:'shoot',team:shootingTeam,player:shooter,position:world.ball.kickFrom,targetPosition:{x:getGoalPosition(shootingTeam,world.half).x,y:world.ball.y},result:'success'})
    beginAction(world,'shoot',shooter,undefined,event.id,world.ball.kickFrom??{x:world.ball.x,y:world.ball.y})
  }

  for(const item of world.players) {
    if(before.actions[item.playerId]!=='dribble'&&item.actionState==='dribble'&&item.hasBall) {
      const event=emit(world,{type:'dribble',team:item.team,player:item,position:pointOf(item),targetPosition:item.desiredPosition})
      beginAction(world,'dribble',item,undefined,event.id,pointOf(item))
    }
  }

  if(before.ball.mode==='pass'&&world.ball.mode==='owned'&&currentOwner) {
    const sameTeam=currentOwner.team===before.ball.lastTouchTeam
    const event=latestKickEvent(world)
    if(event)event.result=sameTeam?'success':'failed'
    finishAction(world,(before.ball.kickType==='throughPass'||before.ball.kickType==='cross'?before.ball.kickType:'pass'),pointOf(currentOwner),sameTeam?'success':'intercepted')
    if(!sameTeam) {
      emit(world,{type:'intercept',team:currentOwner.team,player:currentOwner,target:player(world,before.ball.lastTouchPlayerId),position:pointOf(currentOwner),targetPosition:pointOf(currentOwner),result:'success'})
      world.lastPasserId=null;world.lastPassTeam=null
    }
  }

  if(before.ball.mode==='pass'&&(world.ball.mode==='loose'||world.ball.mode==='deflection')) {
    const event=latestKickEvent(world);if(event)event.result='failed'
    finishAction(world,(before.ball.kickType==='throughPass'||before.ball.kickType==='cross'?before.ball.kickType:'pass'),{x:world.ball.x,y:world.ball.y},'loose')
    emit(world,{type:'looseBall',team:before.ball.lastTouchTeam??world.possessionTeam,player:player(world,before.ball.lastTouchPlayerId),position:{x:world.ball.x,y:world.ball.y},result:'failed'})
  }

  if(before.ball.mode==='owned'&&(world.ball.mode==='loose'||world.ball.mode==='deflection')) {
    const tackler=world.players.find((item)=>item.actionState==='tackle')
    if(tackler) {
      const victim=player(world,before.ball.ownerPlayerId)
      emit(world,{type:'pressure',team:tackler.team,player:tackler,target:victim,position:pointOf(tackler),targetPosition:victim?pointOf(victim):undefined,result:'success'})
      emit(world,{type:'tackle',team:tackler.team,player:tackler,target:victim,position:{x:world.ball.x,y:world.ball.y},targetPosition:{x:world.ball.x,y:world.ball.y},result:'success'})
      emit(world,{type:'looseBall',team:tackler.team,player:tackler,target:victim,position:{x:world.ball.x,y:world.ball.y},result:'success'})
      finishAction(world,'dribble',{x:world.ball.x,y:world.ball.y},'tackled')
    }
  }

  if((before.ball.mode==='loose'||before.ball.mode==='deflection')&&world.ball.mode==='owned'&&currentOwner) {
    emit(world,{type:'recover',team:currentOwner.team,player:currentOwner,position:pointOf(currentOwner),targetPosition:{x:before.ball.x,y:before.ball.y},result:'success'})
  }

  if(before.ball.mode==='shot'&&(world.ball.mode==='owned'||world.ball.mode==='saved')&&currentOwner?.role==='GK') {
    const shooter=player(world,before.ball.shooterPlayerId??before.ball.lastTouchPlayerId)
    emit(world,{type:'save',team:currentOwner.team,player:currentOwner,target:shooter,position:pointOf(currentOwner),targetPosition:pointOf(currentOwner),result:'saved'})
    finishAction(world,'shoot',pointOf(currentOwner),'save');world.lastPasserId=null;world.lastPassTeam=null
  }

  if(before.ball.mode==='shot'&&world.ball.mode==='owned'&&currentOwner&&currentOwner.role!=='GK'&&currentOwner.team!==before.ball.lastTouchTeam) {
    const shooter=player(world,before.ball.shooterPlayerId??before.ball.lastTouchPlayerId)
    emit(world,{type:'block',team:currentOwner.team,player:currentOwner,target:shooter,position:pointOf(currentOwner),targetPosition:pointOf(currentOwner),result:'blocked'})
    emit(world,{type:'recover',team:currentOwner.team,player:currentOwner,target:shooter,position:pointOf(currentOwner),targetPosition:pointOf(currentOwner),result:'success'})
    finishAction(world,'shoot',pointOf(currentOwner),'blocked')
    world.lastPasserId=null;world.lastPassTeam=null
  }

  if(before.ball.mode==='shot'&&(world.ball.mode==='loose'||world.ball.mode==='deflection')) {
    const blocker=player(world,world.ball.lastTouchPlayerId)
    const shooter=player(world,before.ball.shooterPlayerId??before.ball.lastTouchPlayerId)
    emit(world,{type:'block',team:blocker?.team??(shooter?.team==='home'?'away':'home'),player:blocker,target:shooter,position:{x:world.ball.x,y:world.ball.y},targetPosition:{x:world.ball.x,y:world.ball.y},result:'blocked'})
    emit(world,{type:'looseBall',team:blocker?.team??world.possessionTeam,player:blocker,target:shooter,position:{x:world.ball.x,y:world.ball.y},result:'success'})
    finishAction(world,'shoot',{x:world.ball.x,y:world.ball.y},'blocked')
  }

  if(before.ball.mode==='shot'&&world.ball.mode==='outOfPlay') {
    const shooter=player(world,before.ball.shooterPlayerId??before.ball.lastTouchPlayerId)
    const scored=world.homeScore>before.homeScore||world.awayScore>before.awayScore
    if(scored&&shooter) {
      const assist=world.lastPassTeam===shooter.team&&world.lastPasserId!==shooter.playerId?player(world,world.lastPasserId):undefined
      emit(world,{type:'goal',team:shooter.team,player:shooter,assist,position:{x:world.ball.x,y:world.ball.y},targetPosition:{x:world.ball.x,y:world.ball.y},result:'goal'})
      finishAction(world,'shoot',{x:world.ball.x,y:world.ball.y},'goal')
    } else {
      emit(world,{type:'miss',team:shooter?.team??world.possessionTeam,player:shooter,position:{x:world.ball.x,y:world.ball.y},targetPosition:{x:world.ball.x,y:world.ball.y},result:'failed'})
      finishAction(world,'shoot',{x:world.ball.x,y:world.ball.y},'miss')
    }
  }

  if(before.ball.mode==='outOfPlay'&&world.ball.mode==='owned'&&currentOwner?.role==='GK') {
    emit(world,{type:'clear',team:currentOwner.team,player:currentOwner,position:pointOf(currentOwner),targetPosition:pointOf(currentOwner),result:'success'})
  }

  for(const team of ['home','away'] as const) {
    if(before.intents[team]!==world.teamIntents[team]?.id&&world.teamIntents[team]?.type==='counter'&&world.ball.ownerTeam===team) {
      emit(world,{type:'counter',team,player:currentOwner,position:{x:world.ball.x,y:world.ball.y},targetPosition:{x:world.ball.x,y:world.ball.y},result:'success'})
    }
  }
}
