import { act,cleanup,fireEvent,render,screen,within } from '@testing-library/react'
import { afterEach,describe,expect,it,vi } from 'vitest'
import { MatchReplay2D } from '../components/replay/MatchReplay2D'
import { generateInitialPlayers } from '../data/players'
import type { MatchRecord } from '../types/game'

const record: MatchRecord={
  id:'timer-match',week:10,opponent:'相手校',roundLabel:'練習試合',score:{home:0,away:0},result:'draw',scorers:[],goals:[],
  events:[
    {id:'e0',matchId:'timer-match',sequence:0,minute:0,second:0,half:'first',type:'matchStart',team:'home',durationMs:100,description:'開始'},
    {id:'e1',matchId:'timer-match',sequence:1,minute:90,second:0,half:'second',type:'matchEnd',team:'home',durationMs:100,description:'終了'},
  ],
}

const goalRecord:MatchRecord={
  id:'goal-match',week:10,opponent:'相手校',roundLabel:'練習試合',score:{home:1,away:0},result:'win',scorers:['山田 太一'],
  goals:[{minute:23,half:'first',team:'home',scorerId:'home-scorer',scorerName:'山田 太一'}],
  homeLineupSnapshot:[{id:'home-scorer',name:'山田 太一',position:'FW',team:'home'}],
  events:[
    {id:'g0',matchId:'goal-match',sequence:0,minute:0,second:0,half:'first',type:'matchStart',team:'home',description:'開始'},
    {id:'g1',matchId:'goal-match',sequence:1,minute:23,second:1,half:'first',type:'shoot',team:'home',playerId:'home-scorer',description:'シュート'},
    {id:'g2',matchId:'goal-match',sequence:2,minute:23,second:2,half:'first',type:'goal',team:'home',playerId:'home-scorer',result:'goal',description:'ゴール'},
    {id:'g3',matchId:'goal-match',sequence:3,minute:90,second:0,half:'second',type:'matchEnd',team:'home',description:'終了'},
  ],
}

describe('MatchReplay2D playback',()=>{
  afterEach(()=>{cleanup();vi.useRealTimers()})

  it('stops automatically at the final event',()=>{
    vi.useFakeTimers()
    render(<MatchReplay2D record={record} players={generateInitialPlayers(1)}/>)
    fireEvent.click(screen.getByRole('button',{name:'再生'}))
    expect(screen.getByRole('button',{name:'一時停止'})).toBeInTheDocument()
    act(()=>vi.advanceTimersByTime(300))
    expect(screen.getByRole('button',{name:'再生'})).toBeDisabled()
  })

  it('pauses once at a goal, shows the scorer and resumes automatically',()=>{
    vi.useFakeTimers()
    render(<MatchReplay2D record={goalRecord} players={generateInitialPlayers(2)}/>)
    fireEvent.click(screen.getByRole('button',{name:'再生'}))
    act(()=>vi.advanceTimersByTime(280))
    act(()=>vi.advanceTimersByTime(520))
    const celebration=screen.getByRole('dialog',{name:'ゴール演出'})
    expect(celebration).toBeInTheDocument()
    expect(within(celebration).getByText('GOAL!')).toBeInTheDocument()
    expect(within(celebration).getByText('山田 太一')).toBeInTheDocument()
    expect(within(celebration).getByText('前半 23分')).toBeInTheDocument()
    act(()=>vi.advanceTimersByTime(3000))
    expect(screen.queryByRole('dialog',{name:'ゴール演出'})).not.toBeInTheDocument()
    expect(screen.getByRole('button',{name:'一時停止'})).toBeInTheDocument()
  })
})
