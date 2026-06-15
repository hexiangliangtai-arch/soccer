import { describe, expect, it } from 'vitest'
import { friendlyOpponents } from '../data/calendar'
import { generateDefaultLineup, generateInitialPlayers } from '../data/players'
import { tactics } from '../data/tactics'
import { trainingMenus } from '../data/training'
import { validateLineup } from '../game/lineupValidation'
import { createMatch, simulateHalf } from '../game/matchEngine'
import { createSeededRandom } from '../game/random'
import { applyTraining } from '../game/trainingEngine'
import { createInitialState, gameReducer, normalizeLoadedState } from '../state/gameState'

const initialPlayers=generateInitialPlayers(1234)
const defaultLineupIds=generateDefaultLineup(initialPlayers)

describe('initial player generation',()=>{
  it('creates a balanced squad with natural unique names',()=>{
    const players=generateInitialPlayers(99)
    expect(players).toHaveLength(20)
    expect(new Set(players.map((player)=>player.name)).size).toBe(20)
    expect(players.every((player)=>/^[^ ]+ [^ ]+$/.test(player.name))).toBe(true)
    expect(players.filter((player)=>player.position==='GK')).toHaveLength(2)
    expect(players.filter((player)=>player.position==='DF')).toHaveLength(7)
    expect(players.filter((player)=>player.position==='MF')).toHaveLength(7)
    expect(players.filter((player)=>player.position==='FW')).toHaveLength(4)
    expect(players.filter((player)=>player.grade===1)).toHaveLength(6)
    expect(players.filter((player)=>player.grade===2)).toHaveLength(7)
    expect(players.filter((player)=>player.grade===3)).toHaveLength(7)
    expect(players.every((player)=>player.condition===100&&player.fatigue===0)).toBe(true)
    expect(validateLineup(generateDefaultLineup(players),players).valid).toBe(true)
  })

  it('gives each position its intended ability tendency',()=>{
    const players=generateInitialPlayers(100)
    const average=(position:'GK'|'DF'|'MF'|'FW',key:'attack'|'defense'|'speed'|'stamina'|'technique'|'mental')=>{
      const values=players.filter((player)=>player.position===position).map((player)=>player[key])
      return values.reduce((sum,value)=>sum+value,0)/values.length
    }
    expect(average('GK','defense')).toBeGreaterThan(average('GK','attack'))
    expect(average('DF','defense')).toBeGreaterThan(average('DF','attack'))
    expect(average('MF','technique')).toBeGreaterThan(average('MF','defense'))
    expect(average('FW','attack')).toBeGreaterThan(average('FW','defense'))
  })
})

describe('lineup validation',()=>{
  it('accepts the initial balanced eleven',()=>expect(validateLineup(defaultLineupIds,initialPlayers).valid).toBe(true))
  it('rejects an incomplete lineup',()=>expect(validateLineup(defaultLineupIds.slice(0,10),initialPlayers).valid).toBe(false))
})

describe('training',()=>{
  it('keeps abilities and condition within their limits',()=>{
    const result=applyTraining(initialPlayers,trainingMenus[2],createSeededRandom(10))
    result.players.forEach((player)=>{
      expect(player.stamina).toBeLessThanOrEqual(100)
      expect(player.fatigue).toBeGreaterThanOrEqual(0)
      expect(player.fatigue).toBeLessThanOrEqual(100)
    })
  })
  it('rest lowers fatigue',()=>{
    const fatiguedPlayers=initialPlayers.map((player)=>({...player,fatigue:20}))
    const result=applyTraining(fatiguedPlayers,trainingMenus[5],createSeededRandom(2))
    expect(result.players[0].fatigue).toBeLessThan(fatiguedPlayers[0].fatigue)
  })
})

describe('match engine',()=>{
  it.each(tactics.map((t)=>t.id))('finishes a match using %s',tactic=>{
    let match=createMatch(initialPlayers,defaultLineupIds,friendlyOpponents[10],tactic,'練習試合',12345)
    match=simulateHalf(match,initialPlayers,tactic)
    expect(match.phase).toBe('halfTime')
    match=simulateHalf(match,initialPlayers,tactic)
    expect(match.phase).toBe('finished')
    const goals=match.events.filter((event)=>event.type==='goal')
    expect(match.score.home+match.score.away).toBe(goals.length)
    goals.forEach((goal)=>{
      const shot=match.events.find((event)=>event.sequence===goal.sequence-1)
      expect(shot?.type).toBe('shoot')
      if (goal.team==='home'&&goal.assistPlayerId) expect(goal.assistPlayerId).not.toBe(goal.playerId)
    })
  })

  it('generates both assisted and unassisted home goals',()=>{
    const homeGoals=[]
    for (let seed=1;seed<=24;seed++) {
      let match=createMatch(initialPlayers,defaultLineupIds,friendlyOpponents[10],'attacking','練習試合',seed)
      match=simulateHalf(match,initialPlayers,'attacking')
      match=simulateHalf(match,initialPlayers,'attacking')
      homeGoals.push(...match.events.filter((event)=>event.type==='goal'&&event.team==='home'))
    }
    expect(homeGoals.some((goal)=>Boolean(goal.assistPlayerId))).toBe(true)
    expect(homeGoals.some((goal)=>!goal.assistPlayerId)).toBe(true)
    homeGoals.filter((goal)=>goal.assistPlayerId).forEach((goal)=>expect(goal.description).toContain('ラストパス'))
  })
})

describe('season reducer',()=>{
  it('advances automatically after one training session',()=>{
    const initial=createInitialState()
    const trained=gameReducer(initial,{type:'TRAIN',trainingId:'meeting',seed:1})
    expect(trained.week).toBe(2)
    expect(trained.logs.some((log)=>log.includes('ミーティング'))).toBe(true)
  })

  it.each([10,20,30])('records week %i friendly and advances automatically',week=>{
    const base={...createInitialState(),week}
    const started=gameReducer(base,{type:'START_MATCH',tacticId:'possession',seed:12345})
    const half=gameReducer(started,{type:'SIMULATE_FIRST_HALF'})
    const finished=gameReducer(half,{type:'SIMULATE_SECOND_HALF',tacticId:'attacking'})
    expect(finished.currentMatch?.phase).toBe('finished')
    expect(finished.matchHistory).toHaveLength(1)
    expect(finished.matchHistory[0].events.length).toBeGreaterThan(0)
    expect(finished.matchHistory[0].homeLineupSnapshot).toHaveLength(11)
    expect(finished.matchHistory[0].awayLineupSnapshot).toHaveLength(11)
    expect(finished.players.filter((player)=>finished.currentMatch?.lineupIds.includes(player.id)).every((player)=>player.stats.appearances===1)).toBe(true)
    const homeGoals=finished.matchHistory[0].goals.filter((goal)=>goal.team==='home')
    expect(finished.players.reduce((sum,player)=>sum+player.stats.goals,0)).toBe(homeGoals.length)
    expect(finished.players.reduce((sum,player)=>sum+player.stats.assists,0)).toBe(homeGoals.filter((goal)=>goal.assistPlayerId).length)
    expect(finished.week).toBe(week+1)
    const closed=gameReducer(finished,{type:'CONTINUE_AFTER_MATCH'})
    expect(closed.currentMatch).toBeNull()
    expect(gameReducer(closed,{type:'START_MATCH',tacticId:'attacking',seed:2})).toEqual(closed)
  })

  it('keeps week 40 within the season and prevents replaying the same tournament round',()=>{
    const base={...createInitialState(),week:40,tournament:{active:true,roundIndex:0,eliminated:false,champion:false}}
    const fatigueBefore=new Map(base.players.map((player)=>[player.id,player.fatigue]))
    const conditionBefore=new Map(base.players.map((player)=>[player.id,player.condition]))
    const started=gameReducer(base,{type:'START_MATCH',tacticId:'possession',seed:12345})
    const half=gameReducer(started,{type:'SIMULATE_FIRST_HALF'})
    const finished=gameReducer(half,{type:'SIMULATE_SECOND_HALF',tacticId:'attacking'})
    expect(finished.week).toBe(40)
    expect(finished.matchHistory).toHaveLength(1)
    finished.players.forEach((player)=>expect(player.fatigue).toBe(fatigueBefore.get(player.id)))
    finished.players.forEach((player)=>expect(player.condition).toBe(conditionBefore.get(player.id)))
    expect(gameReducer(finished,{type:'START_MATCH',tacticId:'attacking',seed:2})).toEqual(finished)
  })

  it('migrates an old save that was waiting for the next-week button',()=>{
    const legacy={...createInitialState(),week:5,weekActionCompleted:true}
    expect(normalizeLoadedState(legacy).week).toBe(6)
  })

  it('adds formation, assignments and tactic defaults to an old save',()=>{
    const current=createInitialState()
    const legacy={...current,selectedFormation:undefined,lineupAssignments:undefined,tacticId:undefined} as unknown as typeof current
    const migrated=normalizeLoadedState(legacy)
    expect(migrated.selectedFormation).toBe('4-4-2')
    expect(migrated.lineupAssignments).toHaveLength(11)
    expect(migrated.lineupIds).toHaveLength(11)
    expect(migrated.tacticId).toBe('balanced')
  })

  it('syncs formation assignments with lineup ids and prevents duplicate players',()=>{
    const state=createInitialState()
    const changed=gameReducer(state,{type:'SET_FORMATION',formationId:'4-3-3'})
    expect(changed.selectedFormation).toBe('4-3-3')
    expect(changed.lineupAssignments).toHaveLength(11)
    const firstPlayer=changed.lineupAssignments[0].playerId!
    const moved=gameReducer(changed,{type:'ASSIGN_PLAYER',slotId:changed.lineupAssignments[1].slotId,playerId:firstPlayer})
    expect(moved.lineupAssignments.filter((assignment)=>assignment.playerId===firstPlayer)).toHaveLength(1)
    expect(new Set(moved.lineupIds).size).toBe(moved.lineupIds.length)
  })

  it('does not assign an injured player to a formation slot',()=>{
    const initial=createInitialState()
    const bench=initial.players.find((player)=>!initial.lineupIds.includes(player.id))!
    const state={...initial,players:initial.players.map((player)=>player.id===bench.id?{...player,injury:{status:'injured' as const,recoveryWeeks:2}}:player)}
    const result=gameReducer(state,{type:'ASSIGN_PLAYER',slotId:state.lineupAssignments[0].slotId,playerId:bench.id})
    expect(result).toBe(state)
  })

  it('stores the selected team tactic and match formation snapshot',()=>{
    const base={...createInitialState(),week:10}
    const tactical=gameReducer(base,{type:'SET_TEAM_TACTIC',tacticId:'pressing'})
    const started=gameReducer(tactical,{type:'START_MATCH',tacticId:tactical.tacticId,seed:333})
    expect(tactical.tacticId).toBe('pressing')
    expect(started.currentMatch?.firstHalfTactic).toBe('pressing')
    expect(started.currentMatch?.formationId).toBe(tactical.selectedFormation)
    expect(started.currentMatch?.lineupAssignments).toEqual(tactical.lineupAssignments)
  })

  it('enters the tournament without advancing beyond week 40',()=>{
    const week39={...createInitialState(),week:39}
    const tournament=gameReducer(week39,{type:'TRAIN',trainingId:'rest',seed:9})
    expect(tournament.week).toBe(40)
    expect(tournament.tournament.active).toBe(true)
    expect(gameReducer(tournament,{type:'TRAIN',trainingId:'rest',seed:10})).toEqual(tournament)
  })
})
