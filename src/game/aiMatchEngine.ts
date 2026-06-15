import { tactics } from '../data/tactics'
import type { AiMatchState, MatchPlayerState } from '../types/aiMatch'
import type { MatchEvent, MatchState, MatchTeam, Player, TacticId } from '../types/game'
import { createAiEvent } from './aiEventFactory'
import { resolveDribble, resolveLooseBall, resolvePass, resolvePressure, resolveShoot } from './ballEngine'
import { decideBallAction, getAiTacticProfile, nearestDefender, updatePlayerPositions } from './playerAi'
import { clamp, distance, getAttackDirection, getGoalPosition, pointOf } from './pitchMath'
import { createSeededRandom, randomInt } from './random'
import { createAiMatchPlayers } from './teamSetup'

function playerById(state:AiMatchState,id:string|null|undefined) {
  return id?state.players.find((player)=>player.playerId===id):undefined
}

function tacticForTeam(team:MatchTeam,homeTactic:TacticId) {
  return team==='home'?homeTactic:'balanced'
}

function setBallOwner(state:AiMatchState,owner:MatchPlayerState,point=pointOf(owner)) {
  state.players.forEach((player)=>{player.hasBall=player.playerId===owner.playerId})
  owner.x=point.x; owner.y=point.y
  state.ball={x:point.x,y:point.y,vx:0,vy:0,ownerPlayerId:owner.playerId,ownerTeam:owner.team,isLoose:false,mode:'owned'}
  state.possessionTeam=owner.team
}

function resetForKickoff(state:AiMatchState,team:MatchTeam) {
  state.players.forEach((player)=>{player.x=player.baseX;player.y=player.baseY;player.targetX=player.baseX;player.targetY=player.baseY;player.hasBall=false})
  const candidates=state.players.filter((player)=>player.team===team&&player.role!=='GK')
  const owner=candidates.sort((a,b)=>distance(a,{x:50,y:50})-distance(b,{x:50,y:50}))[0]
  if (!owner) throw new Error('キックオフ選手が見つかりません')
  setBallOwner(state,owner,{x:50,y:50})
  state.lastPasserId=null;state.lastPassTeam=null
}

function createInitialAiState(match:MatchState,allPlayers:Player[],tacticId:TacticId,half:'first'|'second'):AiMatchState {
  const players=createAiMatchPlayers(match,allPlayers,half)
  const existingGoals=match.events.filter((event)=>event.type==='goal')
  const state:AiMatchState={
    matchId:match.id,half,minute:half==='first'?0:45,second:0,stepIndex:0,
    homeScore:existingGoals.filter((event)=>event.team==='home').length,
    awayScore:existingGoals.filter((event)=>event.team==='away').length,
    possessionTeam:half==='first'?'home':'away',players,
    ball:{x:50,y:50,ownerPlayerId:null,ownerTeam:null,isLoose:false,vx:0,vy:0,mode:'owned'},events:[],
    currentSequence:match.events.length,tacticId,lastPasserId:null,lastPassTeam:null,
  }
  resetForKickoff(state,state.possessionTeam)
  return state
}

function turnover(state:AiMatchState,newOwner:MatchPlayerState) {
  setBallOwner(state,newOwner)
  state.lastPasserId=null;state.lastPassTeam=null
}

function processAction(state:AiMatchState,random:ReturnType<typeof createSeededRandom>,counterTeam:MatchTeam|null) {
  let owner=playerById(state,state.ball.ownerPlayerId)
  if (!owner) {
    const recovered=resolveLooseBall(state.players,state.ball,random)
    if (recovered) turnover(state,recovered)
    return null
  }

  const defender=nearestDefender(owner,state.players)
  const defendingTactic=tacticForTeam(defender?.team??'away',state.tacticId)
  const defendingProfile=getAiTacticProfile(defendingTactic)
  if (defender&&distance(defender,owner)<defendingProfile.pressRange) {
    const pressureChance=defendingTactic==='pressing'?.72:.24
    if (random.next()<pressureChance) {
      const pressure=resolvePressure(defender,owner,random,defendingTactic==='pressing'?10:0)
      createAiEvent(state,{type:'pressure',team:defender.team,player:defender,target:owner,position:pointOf(owner),targetPosition:pointOf(owner),result:pressure.won?'success':'failed'})
      if (pressure.won) {
        const wonAt=pointOf(owner);defender.x=wonAt.x;defender.y=wonAt.y
        turnover(state,defender)
        return defender.team
      }
    }
  }

  owner=playerById(state,state.ball.ownerPlayerId)
  if (!owner) return null
  const ownerTactic=tacticForTeam(owner.team,state.tacticId)
  if (counterTeam===owner.team&&(ownerTactic==='counter'||(owner.team==='away'&&random.next()<.18))&&distance(owner,getGoalPosition(owner.team,state.half))>22) {
    const start=pointOf(owner);const direction=getAttackDirection(owner.team,state.half)
    const target={x:clamp(owner.x+direction*(12+random.next()*5),5,95),y:clamp(owner.y+(random.next()-.5)*10,7,93)}
    createAiEvent(state,{type:'counter',team:owner.team,player:owner,position:start,targetPosition:target,result:'success'})
    owner.x=target.x;owner.y=target.y;setBallOwner(state,owner,target)
    return null
  }

  const decision=decideBallAction(owner,state,random)
  if (decision.type==='pass'&&decision.targetPlayerId) {
    const target=playerById(state,decision.targetPlayerId)
    if (!target) return null
    const start=pointOf(owner);const destination=pointOf(target)
    const controlMultiplier=owner.team==='home'?(tactics.find((item)=>item.id===state.tacticId)?.control??1):1
    const result=resolvePass(owner,target,state.players,random,controlMultiplier)
    createAiEvent(state,{type:'pass',team:owner.team,player:owner,target,position:start,targetPosition:destination,result:result.success?'success':'failed'})
    if (result.success) {
      state.lastPasserId=owner.playerId;state.lastPassTeam=owner.team
      setBallOwner(state,target,destination)
      return null
    }
    if (result.interceptor) {
      result.interceptor.x=destination.x;result.interceptor.y=destination.y
      createAiEvent(state,{type:'pressure',team:result.interceptor.team,player:result.interceptor,target:owner,position:destination,targetPosition:destination,result:'success'})
      turnover(state,result.interceptor)
      return result.interceptor.team
    }
  }

  if (decision.type==='dribble'&&decision.targetPosition) {
    const start=pointOf(owner);const result=resolveDribble(owner,decision.targetPosition,state.players,random)
    createAiEvent(state,{type:'dribble',team:owner.team,player:owner,position:start,targetPosition:decision.targetPosition,result:result.success?'success':'failed'})
    if (result.success) {
      owner.x=decision.targetPosition.x;owner.y=decision.targetPosition.y;setBallOwner(state,owner,decision.targetPosition)
      return null
    }
    if (result.defender) {
      result.defender.x=decision.targetPosition.x;result.defender.y=decision.targetPosition.y
      createAiEvent(state,{type:'pressure',team:result.defender.team,player:result.defender,target:owner,position:decision.targetPosition,targetPosition:decision.targetPosition,result:'success'})
      turnover(state,result.defender)
      return result.defender.team
    }
  }

  if (decision.type==='shoot') {
    const start=pointOf(owner);const goal=getGoalPosition(owner.team,state.half)
    const goalPoint={x:goal.x,y:clamp(44+random.next()*12,42,58)}
    const goalkeeper=state.players.find((player)=>player.team!==owner!.team&&player.role==='GK')
    if (!goalkeeper) throw new Error('GKが見つかりません')
    const homeTactic=tactics.find((item)=>item.id===state.tacticId)??tactics[0]
    const attackMultiplier=owner.team==='home'?homeTactic.attack:1
    const defenseMultiplier=owner.team==='away'?homeTactic.defense:1
    const shot=resolveShoot(owner,goalkeeper,random,attackMultiplier,defenseMultiplier,state.half)
    createAiEvent(state,{type:'chance',team:owner.team,player:owner,position:start,targetPosition:start,result:'success'})
    createAiEvent(state,{type:'shoot',team:owner.team,player:owner,position:start,targetPosition:goalPoint,result:'success'})
    if (shot.goal) {
      const assist=state.lastPassTeam===owner.team&&state.lastPasserId!==owner.playerId&&random.next()<.76?playerById(state,state.lastPasserId):undefined
      createAiEvent(state,{type:'goal',team:owner.team,player:owner,assist,position:goalPoint,targetPosition:goalPoint,result:'goal'})
      if (owner.team==='home') state.homeScore++; else state.awayScore++
      resetForKickoff(state,owner.team==='home'?'away':'home')
      return null
    }
    createAiEvent(state,{type:'save',team:goalkeeper.team,player:goalkeeper,target:owner,position:goalPoint,targetPosition:pointOf(goalkeeper),result:'saved'})
    setBallOwner(state,goalkeeper)
    state.lastPasserId=null;state.lastPassTeam=null
  }
  return null
}

export function simulateAiHalf(match:MatchState,allPlayers:Player[],tacticId:TacticId):MatchEvent[] {
  const half=match.phase==='preMatch'?'first':'second'
  const state=createInitialAiState(match,allPlayers,tacticId,half)
  const random=createSeededRandom(match.seed+(half==='first'?1703:9109)+tacticId.length*137)
  const totalSteps=360
  const secondsPerStep=7.5
  let actionCooldown=randomInt(random,5,9)
  let counterTeam:MatchTeam|null=null
  for (let step=0;step<totalSteps;step++) {
    state.stepIndex=step
    const elapsed=Math.floor(step*secondsPerStep)
    state.minute=(half==='first'?0:45)+Math.floor(elapsed/60)
    state.second=elapsed%60
    state.players=updatePlayerPositions(state)
    const owner=playerById(state,state.ball.ownerPlayerId)
    if (owner) { state.ball.x=owner.x;state.ball.y=owner.y }
    actionCooldown--
    if (actionCooldown<=0&&state.events.length<44) {
      const nextCounter=processAction(state,random,counterTeam)
      counterTeam=nextCounter
      actionCooldown=randomInt(random,10,16)
    }
  }
  state.minute=half==='first'?45:90;state.second=0
  createAiEvent(state,{type:half==='first'?'halfTime':'matchEnd',team:'home'})
  return state.events
}
