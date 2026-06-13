import { describe,expect,it } from 'vitest'
import { generateDefaultLineup,generateInitialPlayers } from '../data/players'
import { createAwayLineupSnapshot,createReplayFrames,getFrameAtIndex,sortEventsForReplay } from '../game/replayEngine'
import type { MatchEvent,MatchRecord } from '../types/game'

const players=generateInitialPlayers(44)
const lineup=generateDefaultLineup(players)
const events: MatchEvent[] = [
  {id:'e2',matchId:'m1',sequence:2,minute:5,second:3,half:'first',type:'pass',team:'home',playerId:lineup[1],targetPlayerId:lineup[8],position:{x:25,y:30},targetPosition:{x:62,y:45},description:'パス'},
  {id:'e0',matchId:'m1',sequence:0,minute:0,second:0,half:'first',type:'matchStart',team:'home',description:'開始'},
  {id:'e1',matchId:'m1',sequence:1,minute:4,second:55,half:'first',type:'pressure',team:'away',playerId:'away-legacy-1',position:{x:60,y:55},targetPosition:{x:48,y:55},description:'プレス'},
]
const record: MatchRecord={id:'m1',week:10,opponent:'川南高校',roundLabel:'練習試合',score:{home:1,away:0},result:'win',events,scorers:[],goals:[]}

describe('replayEngine',()=>{
  it('uses sequence order rather than minute and second',()=>{
    expect(sortEventsForReplay(events).map((event)=>event.sequence)).toEqual([0,1,2])
  })

  it('creates 22-player replay frames for an old record without snapshots',()=>{
    const frames=createReplayFrames(record,players)
    expect(frames).toHaveLength(3)
    expect(frames[0].players).toHaveLength(22)
    expect(frames[1].activePlayerId).toMatch(/^away-/)
    expect(frames[2].ballPosition).toEqual({x:62,y:45})
    expect(getFrameAtIndex(frames,99)).toBe(frames.at(-1))
  })

  it('creates stable away lineup ids',()=>{
    const away=createAwayLineupSnapshot()
    expect(away).toHaveLength(11)
    expect(away[0].id).toBe('away-gk-1')
    expect(new Set(away.map((player)=>player.id)).size).toBe(11)
  })
})
