import { act,fireEvent,render,screen } from '@testing-library/react'
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

describe('MatchReplay2D playback',()=>{
  afterEach(()=>vi.useRealTimers())

  it('stops automatically at the final event',()=>{
    vi.useFakeTimers()
    render(<MatchReplay2D record={record} players={generateInitialPlayers(1)}/>)
    fireEvent.click(screen.getByRole('button',{name:'再生'}))
    expect(screen.getByRole('button',{name:'一時停止'})).toBeInTheDocument()
    act(()=>vi.advanceTimersByTime(300))
    expect(screen.getByRole('button',{name:'再生'})).toBeDisabled()
  })
})
