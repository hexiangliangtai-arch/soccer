import { describe,expect,it } from 'vitest'
import { friendlyOpponents } from '../data/calendar'
import { createAssignments } from '../data/formations'
import { generateDefaultLineup,generateInitialPlayers } from '../data/players'
import { createMatch,simulateHalf } from '../game/matchEngine'
import { transitionPossession } from '../game/possessionEngine'
import { createSeededRandom } from '../game/random'
import { buildPlaySequence } from '../game/sequenceBuilder'
import { createAiMatchPlayers } from '../game/teamSetup'
import type { MatchWorldState } from '../types/aiMatch'

function createWorld():MatchWorldState {
  const players=generateInitialPlayers(7600)
  const lineupIds=generateDefaultLineup(players)
  const match=createMatch(players,lineupIds,friendlyOpponents[10],'attacking','test',7600,{formationId:'4-3-3',lineupAssignments:createAssignments('4-3-3',lineupIds,players)})
  const matchPlayers=createAiMatchPlayers(match,players)
  const owner=matchPlayers.find((player)=>player.team==='home'&&player.role==='CM')??matchPlayers.find((player)=>player.team==='home')!
  owner.hasBall=true
  return {
    matchId:match.id,half:'first',minute:0,second:0,stepIndex:0,timeSec:0,homeScore:0,awayScore:0,
    possessionTeam:'home',players:matchPlayers,ball:{x:owner.x,y:owner.y,vx:0,vy:0,ownerPlayerId:owner.playerId,ownerTeam:'home',isLoose:false,mode:'owned'},
    events:[],currentSequence:0,tacticId:'attacking',lastPasserId:null,lastPassTeam:null,frames:[],frameEventIds:[],
    ballMotion:null,dribbleMotion:null,counterTeam:null,looseBallTicks:0,completedSequences:[],sequenceTargets:{},nextSequenceTimeSec:0,
    teamIntents:{
      home:{id:'home-intent',type:'buildUp',team:'home',startedAtSec:0,riskLevel:.5,tempo:'normal'},
      away:{id:'away-intent',type:'defensiveBlock',team:'away',startedAtSec:0,riskLevel:.2,tempo:'slow'},
    },recordedActions:[],
  }
}

describe('play sequence layer',()=>{
  it('builds a side-attack intention without pre-planned actions',()=>{
    const world=createWorld()
    const owner=world.players.find((player)=>player.playerId===world.ball.ownerPlayerId)!
    const sequence=buildPlaySequence(world,'sideAttack',owner,createSeededRandom(1))
    expect(sequence).not.toBeNull()
    expect(sequence.type).toBe('sideAttack')
    expect(sequence.actions).toEqual([])
    expect(sequence.preferredZone).toMatch(/left|right/)
  })

  it('rejects an unexplained cross-team pass completion',()=>{
    const world=createWorld()
    const away=world.players.find((player)=>player.team==='away')!
    expect(transitionPossession(world,{owner:away,reason:'passComplete'})).toBe(false)
    expect(world.ball.ownerTeam).toBe('home')
    expect(transitionPossession(world,{owner:away,reason:'intercept'})).toBe(true)
    expect(world.ball.ownerTeam).toBe('away')
  })

  it('records sequence actions and reasons for cross-team possession changes',()=>{
    const players=generateInitialPlayers(7610)
    const lineupIds=generateDefaultLineup(players)
    let match=createMatch(players,lineupIds,friendlyOpponents[10],'attacking','test',7610,{formationId:'4-3-3',lineupAssignments:createAssignments('4-3-3',lineupIds,players)})
    match=simulateHalf(match,players,'attacking')
    match=simulateHalf(match,players,'attacking')

    expect(match.events.some((event)=>['throughPass','cross'].includes(event.type))).toBe(true)
    expect(match.events.some((event)=>['miss','block','save','goal'].includes(event.type))).toBe(true)
    match.events.filter((event)=>event.type==='goal').forEach((goal)=>expect(match.events[goal.sequence-1]?.type).toBe('shoot'))

    const eventById=new Map(match.events.map((event)=>[event.id,event]))
    const teams=match.framePlayerTeams??[]
    const frames=match.frames??[]
    for(let index=1;index<frames.length;index++) {
      const previousOwner=frames[index-1].ball[2]
      const owner=frames[index].ball[2]
      if(previousOwner<0||owner<0||teams[previousOwner]===teams[owner])continue
      const transitionEvents=(frames[index].eventIds??[]).map((id)=>eventById.get(id)?.type)
      expect(transitionEvents.some((type)=>type&&['matchStart','intercept','tackle','recover','save','clear','goal'].includes(type))).toBe(true)
    }
  })

  it('produces misses and blocks instead of treating every failed shot as a save',()=>{
    const players=generateInitialPlayers(7620)
    const lineupIds=generateDefaultLineup(players)
    const outcomes=[]
    for(let seed=7620;seed<7628;seed++) {
      let match=createMatch(players,lineupIds,friendlyOpponents[10],'attacking','test',seed,{formationId:'4-3-3',lineupAssignments:createAssignments('4-3-3',lineupIds,players)})
      match=simulateHalf(match,players,'attacking')
      match=simulateHalf(match,players,'attacking')
      outcomes.push(...match.events.filter((event)=>['miss','block'].includes(event.type)).map((event)=>event.type))
    }
    expect(outcomes).toContain('miss')
    expect(outcomes).toContain('block')
  })
})
