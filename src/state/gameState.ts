import { friendlyOpponents, isMatchWeek, tournamentOpponents, tournamentRounds } from '../data/calendar'
import { generateDefaultLineup, generateInitialPlayers } from '../data/players'
import { createAssignments, lineupIdsFromAssignments } from '../data/formations'
import { trainingMenus } from '../data/training'
import { recoverBetweenTournamentMatches, recoverForNextWeek } from '../game/calendarEngine'
import { applyMatchFatigue, createMatch, simulateHalf } from '../game/matchEngine'
import { createAwayLineupSnapshot } from '../game/replayEngine'
import { createSeededRandom } from '../game/random'
import { applyTraining } from '../game/trainingEngine'
import type { FormationId, GameState, GoalRecord, MatchRecord, Player, TacticId, TrainingId } from '../types/game'

export type GameAction =
  | { type:'TOGGLE_LINEUP'; playerId:string }
  | { type:'SET_LINEUP'; lineupIds:string[] }
  | { type:'SET_FORMATION'; formationId:FormationId }
  | { type:'ASSIGN_PLAYER'; slotId:string; playerId:string|null }
  | { type:'SET_TEAM_TACTIC'; tacticId:TacticId }
  | { type:'TRAIN'; trainingId:TrainingId; seed:number }
  | { type:'START_MATCH'; tacticId:TacticId; seed:number }
  | { type:'SIMULATE_FIRST_HALF' }
  | { type:'SIMULATE_SECOND_HALF'; tacticId:TacticId }
  | { type:'CONTINUE_AFTER_MATCH' }
  | { type:'RESET' }

export function createInitialState(): GameState {
  const players = generateInitialPlayers()
  const lineupIds=generateDefaultLineup(players)
  return {
    version:1, teamName:'青葉高校', week:1, players, lineupIds,
    selectedFormation:'4-4-2',lineupAssignments:createAssignments('4-4-2',lineupIds,players),tacticId:'balanced',
    weekActionCompleted:false, currentMatch:null, matchHistory:[], tournament:{active:false,roundIndex:0,eliminated:false,champion:false},
    logs:['新シーズンが始まった。県大会優勝を目指し、40週間の挑戦が始まる。'], seasonComplete:false,
  }
}

function makeRecord(state: GameState): MatchRecord | null {
  const match = state.currentMatch
  if (!match || match.phase !== 'finished') return null
  const result = match.shootoutWinner ? (match.shootoutWinner === 'home' ? 'win' : 'loss') : match.score.home > match.score.away ? 'win' : match.score.home < match.score.away ? 'loss' : 'draw'
  const goals: GoalRecord[] = match.events.filter((event)=>event.type==='goal').map((event)=>({
    minute:event.minute,
    half:event.half,
    team:event.team,
    scorerId:event.playerId,
    assistPlayerId:event.assistPlayerId,
    scorerName:state.players.find((player)=>player.id===event.playerId)?.name ?? (event.team==='home'?'青葉高校':match.opponent.name),
    assistName:state.players.find((player)=>player.id===event.assistPlayerId)?.name,
  }))
  const scorers = goals.filter((goal)=>goal.team==='home').map((goal)=>goal.scorerName)
  const homeLineupSnapshot=match.lineupIds.map((id)=>state.players.find((player)=>player.id===id)).filter((player):player is Player=>Boolean(player)).map((player)=>({id:player.id,name:player.name,position:player.position,grade:player.grade,team:'home' as const}))
  return {
    id:match.id, week:state.week, opponent:match.opponent.name, roundLabel:match.roundLabel, score:match.score, result,
    events:match.events, scorers, goals, homeLineupSnapshot, awayLineupSnapshot:createAwayLineupSnapshot(),
    firstHalfTactic:match.firstHalfTactic, secondHalfTactic:match.secondHalfTactic, seed:match.seed,
    formationId:match.formationId??state.selectedFormation,lineupAssignments:(match.lineupAssignments??state.lineupAssignments).map((assignment)=>({...assignment})),
  }
}

function applyMatchStats(players: Player[], record: MatchRecord, lineupIds: string[]) {
  const homeGoals = record.goals.filter((goal)=>goal.team==='home')
  return players.map((player)=>({
    ...player,
    stats:{
      appearances:player.stats.appearances+(lineupIds.includes(player.id)?1:0),
      goals:player.stats.goals+homeGoals.filter((goal)=>goal.scorerId===player.id).length,
      assists:player.stats.assists+homeGoals.filter((goal)=>goal.assistPlayerId===player.id).length,
    },
  }))
}

function advanceWeek(state: GameState, seed: number, keepFinishedMatch = false): GameState {
  if (state.week >= 40) return state
  const nextWeek = state.week + 1
  return {
    ...state,
    week:nextWeek,
    currentMatch:keepFinishedMatch ? state.currentMatch : null,
    weekActionCompleted:false,
    players:recoverForNextWeek(state.players,createSeededRandom(seed)),
    tournament:nextWeek===40 ? {active:true,roundIndex:0,eliminated:false,champion:false} : state.tournament,
    logs:[`第${nextWeek}週。${isMatchWeek(nextWeek)?'試合の日がやってきた。':'新しい一週間が始まった。'}`,...state.logs],
  }
}

export function normalizeLoadedState(state: GameState): GameState {
  const selectedFormation=state.selectedFormation??'4-4-2'
  const lineupAssignments=state.lineupAssignments?.length===11?state.lineupAssignments:createAssignments(selectedFormation,state.lineupIds??[],state.players)
  const migrated = {
    ...state,
    selectedFormation,
    lineupAssignments,
    lineupIds:lineupIdsFromAssignments(lineupAssignments),
    tacticId:state.tacticId??'balanced',
    players:state.players.map((player)=>({
      ...player,
      stats:player.stats ?? {appearances:0,goals:0,assists:0},
    })),
    matchHistory:state.matchHistory.map((record)=>({
      ...record,
      events:record.events??[],
      goals:record.goals ?? (record.events??[]).filter((event)=>event.type==='goal').map((event)=>({
        minute:event.minute, half:event.half, team:event.team, scorerId:event.playerId, assistPlayerId:event.assistPlayerId,
        scorerName:state.players.find((player)=>player.id===event.playerId)?.name ?? (event.team==='home'?'青葉高校':record.opponent),
        assistName:state.players.find((player)=>player.id===event.assistPlayerId)?.name,
      })),
    })),
  }
  if (migrated.weekActionCompleted && migrated.week < 40) {
    return advanceWeek(migrated,Date.now(),migrated.currentMatch?.phase==='finished')
  }
  return migrated
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'TOGGLE_LINEUP': {
      const player = state.players.find((item)=>item.id===action.playerId)
      if (!player || player.injury.status === 'injured') return state
      const selected = state.lineupIds.includes(action.playerId)
      if (!selected && state.lineupIds.length >= 11) return state
      const lineupIds=selected ? state.lineupIds.filter((id)=>id!==action.playerId) : [...state.lineupIds,action.playerId]
      const lineupAssignments=createAssignments(state.selectedFormation,lineupIds,state.players)
      return { ...state, lineupIds:lineupIdsFromAssignments(lineupAssignments),lineupAssignments }
    }
    case 'SET_LINEUP': {
      const lineupAssignments=createAssignments(state.selectedFormation,action.lineupIds,state.players)
      return { ...state,lineupIds:lineupIdsFromAssignments(lineupAssignments),lineupAssignments }
    }
    case 'SET_FORMATION': {
      const lineupAssignments=createAssignments(action.formationId,state.lineupIds,state.players)
      return {...state,selectedFormation:action.formationId,lineupAssignments,lineupIds:lineupIdsFromAssignments(lineupAssignments)}
    }
    case 'ASSIGN_PLAYER': {
      if (action.playerId) {
        const player=state.players.find((item)=>item.id===action.playerId)
        if (!player||player.injury.status==='injured') return state
      }
      const lineupAssignments=state.lineupAssignments.map((assignment)=>{
        if (assignment.slotId===action.slotId) return {...assignment,playerId:action.playerId}
        if (action.playerId&&assignment.playerId===action.playerId) return {...assignment,playerId:null}
        return assignment
      })
      return {...state,lineupAssignments,lineupIds:lineupIdsFromAssignments(lineupAssignments)}
    }
    case 'SET_TEAM_TACTIC': return {...state,tacticId:action.tacticId}
    case 'TRAIN': {
      if (state.weekActionCompleted || isMatchWeek(state.week)) return state
      const menu = trainingMenus.find((item)=>item.id===action.trainingId)
      if (!menu) return state
      const result = applyTraining(state.players,menu,createSeededRandom(action.seed))
      const completed = { ...state, players:result.players, weekActionCompleted:true, logs:[result.summary,...result.details.slice(0,4),...state.logs].slice(0,80) }
      return advanceWeek(completed,action.seed+1)
    }
    case 'START_MATCH': {
      if (state.currentMatch || state.weekActionCompleted || !isMatchWeek(state.week)) return state
      const opponent = state.week === 40 ? tournamentOpponents[state.tournament.roundIndex] : friendlyOpponents[state.week]
      const roundLabel = state.week === 40 ? tournamentRounds[state.tournament.roundIndex] : `第${state.week}週 練習試合`
      const alreadyPlayed = state.matchHistory.some((record)=>record.week===state.week&&record.opponent===opponent.name&&record.roundLabel===roundLabel)
      if (alreadyPlayed) return state
      return { ...state, currentMatch:createMatch(state.players,state.lineupIds,opponent,action.tacticId,roundLabel,action.seed,{formationId:state.selectedFormation,lineupAssignments:state.lineupAssignments}), logs:[`${roundLabel}、${opponent.name}戦のメンバーを送り出した。`,...state.logs] }
    }
    case 'SIMULATE_FIRST_HALF': {
      if (!state.currentMatch || state.currentMatch.phase !== 'preMatch') return state
      return { ...state, currentMatch:simulateHalf(state.currentMatch,state.players,state.currentMatch.firstHalfTactic) }
    }
    case 'SIMULATE_SECOND_HALF': {
      if (!state.currentMatch || state.currentMatch.phase !== 'halfTime') return state
      const finished = simulateHalf(state.currentMatch,state.players,action.tacticId)
      const nextState = { ...state, currentMatch:finished }
      const record = makeRecord(nextState)
      if (!record) return nextState
      const scoreText = `${record.score.home}-${record.score.away}`
      const fatiguedPlayers = applyMatchFatigue(state.players,finished)
      const completed = {
        ...nextState,
        players:applyMatchStats(fatiguedPlayers,record,finished.lineupIds),
        weekActionCompleted:true,
        matchHistory:[record,...state.matchHistory],
        logs:[`${record.roundLabel} ${scoreText}。${record.result==='win'?'勝利！':record.result==='draw'?'引き分け。':'敗戦。'}`,...state.logs],
      }
      return state.week === 40 ? completed : advanceWeek(completed,finished.seed+100000,true)
    }
    case 'CONTINUE_AFTER_MATCH': {
      const record = makeRecord(state)
      if (!record) return state
      if (state.week !== 40) return { ...state, currentMatch:null }
      if (record.result !== 'win') return { ...state, currentMatch:null, tournament:{...state.tournament,active:false,eliminated:true}, seasonComplete:true, logs:['県大会敗退。青葉高校の挑戦はここで幕を閉じた。',...state.logs] }
      if (state.tournament.roundIndex === 3) return { ...state, currentMatch:null, tournament:{...state.tournament,active:false,champion:true}, seasonComplete:true, logs:['青葉高校、県大会優勝！ 選手たちが監督を囲んで喜びを爆発させた。',...state.logs] }
      const nextRound = state.tournament.roundIndex + 1
      return {
        ...state, currentMatch:null, weekActionCompleted:false,
        players:recoverBetweenTournamentMatches(state.players,state.lineupIds),
        tournament:{...state.tournament,roundIndex:nextRound},
        logs:[`${tournamentRounds[nextRound]}へ進出。短い休息の後、次の戦いに備える。`,...state.logs],
      }
    }
    case 'RESET': return createInitialState()
  }
}
