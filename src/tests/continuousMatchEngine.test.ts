import { describe,expect,it } from 'vitest'
import { friendlyOpponents } from '../data/calendar'
import { createAssignments } from '../data/formations'
import { generateDefaultLineup,generateInitialPlayers } from '../data/players'
import { createMatch,simulateHalf } from '../game/matchEngine'
import { createReplayFrames } from '../game/replayEngine'
import type { MatchRecord } from '../types/game'

describe('continuous 90 minute match simulation',()=>{
  it('stores compact frames for 22 moving players and a continuously moving ball',()=>{
    const players=generateInitialPlayers(2600)
    const lineupIds=generateDefaultLineup(players)
    const assignments=createAssignments('4-4-2',lineupIds,players)
    let match=createMatch(players,lineupIds,friendlyOpponents[10],'balanced','練習試合',2600,{formationId:'4-4-2',lineupAssignments:assignments})
    match=simulateHalf(match,players,'balanced')
    match=simulateHalf(match,players,'counter')

    expect(match.frames?.length).toBeGreaterThanOrEqual(1800)
    expect(match.frames?.length).toBeLessThanOrEqual(1810)
    expect(match.framePlayerIds).toHaveLength(22)
    expect(match.framePlayerTeams?.filter((team)=>team==='home')).toHaveLength(11)
    expect(match.frames?.every((frame)=>frame.players.length===22)).toBe(true)
    expect(match.frames?.[0].timeSec).toBe(0)
    expect(match.frames?.at(-1)?.timeSec).toBe(5400)
    expect(match.frames?.at(-1)?.homeScore).toBe(match.score.home)
    expect(match.frames?.at(-1)?.awayScore).toBe(match.score.away)

    for(let playerIndex=0;playerIndex<22;playerIndex++) {
      const positions=new Set(match.frames?.map((frame)=>`${frame.players[playerIndex][0]},${frame.players[playerIndex][1]}`))
      expect(positions.size).toBeGreaterThan(2)
    }
    const ballPositions=new Set(match.frames?.map((frame)=>`${frame.ball[0]},${frame.ball[1]}`))
    expect(ballPositions.size).toBeGreaterThan(20)
    const ballOwners=new Set(match.frames?.map((frame)=>frame.ball[2]).filter((ownerIndex)=>ownerIndex>=0))
    expect(ballOwners.size).toBeGreaterThan(2)

    const eventIds=new Set(match.events.map((event)=>event.id))
    match.frames?.flatMap((frame)=>frame.eventIds??[]).forEach((id)=>expect(eventIds.has(id)).toBe(true))
    expect(JSON.stringify({frames:match.frames,framePlayerIds:match.framePlayerIds,framePlayerTeams:match.framePlayerTeams}).length).toBeLessThan(1_300_000)

    const record:MatchRecord={
      id:match.id,week:10,opponent:match.opponent.name,roundLabel:match.roundLabel,score:match.score,result:'draw',
      events:match.events,scorers:[],goals:[],formationId:match.formationId,lineupAssignments:match.lineupAssignments,
      frames:match.frames,framePlayerIds:match.framePlayerIds,framePlayerTeams:match.framePlayerTeams,
    }
    const replayFrames=createReplayFrames(record,players)
    expect(replayFrames).toHaveLength(match.frames?.length??0)
    expect(replayFrames[0].continuous).toBe(true)
    expect(replayFrames.every((frame)=>frame.players.length===22)).toBe(true)
  })
})
