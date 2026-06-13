import { fireEvent,render,screen } from '@testing-library/react'
import { beforeEach,describe,expect,it } from 'vitest'
import App from '../App'
import { GameProvider } from '../state/GameContext'
import { createInitialState,gameReducer } from '../state/gameState'

function stateWithMatch() {
  const initial={...createInitialState(),week:10}
  const started=gameReducer(initial,{type:'START_MATCH',tacticId:'possession',seed:2468})
  const half=gameReducer(started,{type:'SIMULATE_FIRST_HALF'})
  return gameReducer(half,{type:'SIMULATE_SECOND_HALF',tacticId:'attacking'})
}

describe('2D replay navigation',()=>{
  beforeEach(()=>localStorage.clear())

  it('opens a saved match from records and provides replay controls',()=>{
    localStorage.setItem('aoba-soccer-manager-v1',JSON.stringify(stateWithMatch()))
    const {container}=render(<GameProvider><App/></GameProvider>)
    fireEvent.click(screen.getByRole('button',{name:/記録/}))
    fireEvent.click(screen.getByRole('button',{name:'2Dリプレイを見る'}))
    expect(screen.getByRole('img',{name:'2Dサッカーピッチ'})).toBeInTheDocument()
    expect(screen.getByRole('button',{name:'再生'})).toBeInTheDocument()
    expect(screen.getByRole('button',{name:'次のイベント'})).toBeInTheDocument()
    expect(screen.getByRole('button',{name:'最初から'})).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:'次のイベント'}))
    expect(container.querySelector('.replay-status>div:nth-child(2) b')).toHaveTextContent(/^2 \/ /)
    fireEvent.click(screen.getByRole('button',{name:'最初から'}))
    expect(container.querySelector('.replay-status>div:nth-child(2) b')).toHaveTextContent(/^1 \/ /)
    fireEvent.click(screen.getByRole('button',{name:'← 記録画面に戻る'}))
    expect(screen.getByText('シーズン記録')).toBeInTheDocument()
  })
})
