import { fireEvent,render,screen } from '@testing-library/react'
import { beforeEach,describe,expect,it } from 'vitest'
import { TacticsScreen } from '../screens/TacticsScreen'
import { GameProvider } from '../state/GameContext'
import { createInitialState } from '../state/gameState'

describe('TacticsScreen',()=>{
  beforeEach(()=>localStorage.clear())

  it('changes formation, tactic and supports click-based assignment',()=>{
    const state=createInitialState()
    localStorage.setItem('aoba-soccer-manager-v1',JSON.stringify(state))
    const {container}=render(<GameProvider><TacticsScreen/></GameProvider>)
    fireEvent.change(screen.getByRole('combobox',{name:/フォーメーション/}),{target:{value:'4-3-3'}})
    expect(container.querySelectorAll('.formation-slot')).toHaveLength(11)
    fireEvent.click(screen.getByRole('button',{name:/ハイプレス/}))
    expect(screen.getByRole('button',{name:/ハイプレス/})).toHaveClass('active')
    const emptyingButton=screen.getByRole('button',{name:'LBから外す'})
    fireEvent.click(emptyingButton)
    expect(screen.getByText(/スタメンは11人必要です（現在10人）/)).toBeInTheDocument()
    const emptySlot=[...container.querySelectorAll<HTMLElement>('.formation-slot')].find((slot)=>!slot.querySelector('b'))!
    fireEvent.click(emptySlot)
    const benchPlayer=state.players.find((player)=>player.position==='DF'&&!state.lineupIds.includes(player.id)&&player.injury.status==='healthy')!
    fireEvent.click(screen.getByRole('button',{name:new RegExp(benchPlayer.name)}))
    expect(screen.queryByText(/スタメンは11人必要です（現在10人）/)).not.toBeInTheDocument()
  })

  it('opens player details by double-clicking a player',()=>{
    const state=createInitialState()
    localStorage.setItem('aoba-soccer-manager-v1',JSON.stringify(state))
    render(<GameProvider><TacticsScreen/></GameProvider>)
    fireEvent.doubleClick(screen.getByRole('button',{name:new RegExp(state.players[0].name)}))
    expect(screen.getByRole('dialog')).toHaveTextContent(state.players[0].name)
  })
})
