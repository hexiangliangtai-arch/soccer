import { describe,expect,it } from 'vitest'
import { friendlyOpponents } from '../data/calendar'
import { createAssignments,getFormation } from '../data/formations'
import { generateDefaultLineup,generateInitialPlayers } from '../data/players'
import { createMatch,simulateHalf } from '../game/matchEngine'
import { createAiMatchPlayers } from '../game/teamSetup'
import { getAttackDirection,getGoalPosition } from '../game/pitchMath'
import type { MatchEvent,TacticId } from '../types/game'

const players=generateInitialPlayers(2025)
const lineupIds=generateDefaultLineup(players)
const assignments=createAssignments('4-3-3',lineupIds,players)

function fullMatch(tactic:TacticId,seed:number) {
  let match=createMatch(players,lineupIds,friendlyOpponents[10],tactic,'練習試合',seed,{formationId:'4-3-3',lineupAssignments:assignments})
  match=simulateHalf(match,players,tactic)
  return simulateHalf(match,players,tactic)
}

function count(events:MatchEvent[],type:MatchEvent['type'],team?:'home'|'away') {
  return events.filter((event)=>event.type===type&&(!team||event.team===team)).length
}

describe('AI match setup',()=>{
  it('creates 22 internal players from the selected home formation and stable away ids',()=>{
    const match=createMatch(players,lineupIds,friendlyOpponents[10],'balanced','練習試合',11,{formationId:'4-3-3',lineupAssignments:assignments})
    const states=createAiMatchPlayers(match,players)
    expect(states).toHaveLength(22)
    expect(states.filter((player)=>player.team==='home')).toHaveLength(11)
    expect(states.filter((player)=>player.team==='away').map((player)=>player.playerId)).toEqual([
      'away-gk-1','away-df-1','away-df-2','away-df-3','away-df-4',
      'away-mf-1','away-mf-2','away-mf-3','away-mf-4','away-fw-1','away-fw-2',
    ])
    assignments.forEach((assignment)=>{
      const slot=getFormation('4-3-3').slots.find((item)=>item.slotId===assignment.slotId)!
      const home=states.find((player)=>player.playerId===assignment.playerId)
      expect(home).toBeDefined()
      expect({x:home?.baseX,y:home?.baseY}).toEqual({x:slot.x,y:slot.y})
    })
  })

  it('reverses attack direction, goals and formation positions in the second half',()=>{
    const match=createMatch(players,lineupIds,friendlyOpponents[10],'balanced','練習試合',12,{formationId:'4-3-3',lineupAssignments:assignments})
    const first=createAiMatchPlayers(match,players,'first')
    const second=createAiMatchPlayers(match,players,'second')
    expect(getAttackDirection('home','first')).toBe(1)
    expect(getAttackDirection('home','second')).toBe(-1)
    expect(getAttackDirection('away','first')).toBe(-1)
    expect(getAttackDirection('away','second')).toBe(1)
    expect(getGoalPosition('home','first').x).toBe(100)
    expect(getGoalPosition('home','second').x).toBe(0)
    first.forEach((player)=>{
      const reversed=second.find((item)=>item.playerId===player.playerId)!
      expect(reversed.baseX).toBe(100-player.baseX)
      expect(reversed.baseY).toBe(player.baseY)
    })
  })
})

describe('AI match events',()=>{
  it('generates deterministic, ordered and replay-compatible events',()=>{
    let firstHalf=createMatch(players,lineupIds,friendlyOpponents[10],'balanced','練習試合',404,{formationId:'4-3-3',lineupAssignments:assignments})
    firstHalf=simulateHalf(firstHalf,players,'balanced')
    const firstHalfEventCount=firstHalf.events.filter((event)=>event.half==='first'&&event.type!=='matchStart').length
    expect(firstHalfEventCount).toBeGreaterThanOrEqual(25)
    expect(firstHalfEventCount).toBeLessThanOrEqual(220)
    const first=simulateHalf(firstHalf,players,'balanced')
    const second=fullMatch('balanced',404)
    expect(first.events).toEqual(second.events)
    expect(first.events.length).toBeGreaterThanOrEqual(45)
    expect(first.events.map((event)=>event.sequence)).toEqual(first.events.map((_,index)=>index))
    expect(count(first.events,'pass')).toBeGreaterThan(0)
    expect(count(first.events,'dribble')).toBeGreaterThan(0)
    expect(count(first.events,'shoot')).toBeGreaterThan(0)
    expect(count(first.events,'pressure')).toBeGreaterThan(0)
    first.events.filter((event)=>event.position||event.targetPosition).forEach((event)=>{
      for (const point of [event.position,event.targetPosition].filter(Boolean)) {
        expect(point!.x).toBeGreaterThanOrEqual(0);expect(point!.x).toBeLessThanOrEqual(100)
        expect(point!.y).toBeGreaterThanOrEqual(0);expect(point!.y).toBeLessThanOrEqual(100)
      }
    })
    first.events.filter((event)=>event.type==='goal').forEach((goal)=>{
      expect(goal.playerId).toBeTruthy()
      expect(first.events[goal.sequence-1]?.type).toBe('shoot')
    })
  })

  it('changes event tendencies according to the selected tactic',()=>{
    const totals=(tactic:TacticId)=>Array.from({length:4},(_,index)=>fullMatch(tactic,700+index).events).reduce((value,events)=>({
      passes:value.passes+count(events,'pass','home')+count(events,'throughPass','home')+count(events,'cross','home'),
      counters:value.counters+count(events,'counter','home'),
      pressures:value.pressures+count(events,'pressure','home'),
      shots:value.shots+count(events,'shoot','home'),
      conceded:value.conceded+count(events,'goal','away'),
    }),{passes:0,counters:0,pressures:0,shots:0,conceded:0})
    const balanced=totals('balanced');const possession=totals('possession');const counter=totals('counter')
    const pressing=totals('pressing');const defensive=totals('defensive');const attacking=totals('attacking')
    expect(possession.passes).toBeGreaterThan(attacking.passes)
    expect(counter.counters).toBeGreaterThan(balanced.counters)
    expect(pressing.pressures).toBeGreaterThan(balanced.pressures)
    expect(attacking.shots).toBeGreaterThan(defensive.shots)
    expect(defensive.conceded).toBeLessThanOrEqual(attacking.conceded)
  })
})
