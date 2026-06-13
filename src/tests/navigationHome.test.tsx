import { cleanup,fireEvent,render,screen } from '@testing-library/react'
import { afterEach,beforeEach,describe,expect,it } from 'vitest'
import App from '../App'
import { GameProvider } from '../state/GameContext'
import { createInitialState } from '../state/gameState'

describe('navigation and home training',()=>{
  afterEach(cleanup)
  beforeEach(()=>{
    localStorage.clear()
    localStorage.setItem('aoba-soccer-manager-v1',JSON.stringify(createInitialState()))
  })

  it('uses the five-screen menu without a standalone training tab',()=>{
    render(<GameProvider><App/></GameProvider>)
    expect(screen.getByRole('button',{name:/ホーム/})).toBeInTheDocument()
    expect(screen.getByRole('button',{name:/選手$/})).toBeInTheDocument()
    expect(screen.getByRole('button',{name:/スタメン・戦術/})).toBeInTheDocument()
    expect(screen.getByRole('button',{name:/試合/})).toBeInTheDocument()
    expect(screen.getByRole('button',{name:/記録/})).toBeInTheDocument()
    expect(screen.queryByRole('button',{name:'練習'})).not.toBeInTheDocument()
  })

  it('runs training from home and advances to the next week',()=>{
    render(<GameProvider><App/></GameProvider>)
    expect(screen.getAllByRole('button',{name:'実行'})).toHaveLength(6)
    fireEvent.click(screen.getAllByRole('button',{name:'実行'})[0])
    expect(screen.getByText(/第2週・目標は県大会優勝/)).toBeInTheDocument()
  })
})
