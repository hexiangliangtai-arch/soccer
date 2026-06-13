import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { SquadScreen } from '../screens/SquadScreen'
import { GameProvider } from '../state/GameContext'
import { createInitialState } from '../state/gameState'

describe('SquadScreen player details',()=>{
  beforeEach(()=>localStorage.clear())

  it('opens player details without exposing lineup controls',()=>{
    const state=createInitialState()
    localStorage.setItem('aoba-soccer-manager-v1',JSON.stringify(state))
    const {container}=render(<GameProvider><SquadScreen/></GameProvider>)

    expect(container.querySelectorAll('.ability .rank-badge')).toHaveLength(state.players.length*6)
    expect(container.querySelectorAll('.ability>small')).toHaveLength(state.players.length*6)
    expect(container.querySelector('.ability>small')).toHaveTextContent(String(Math.round(state.players[0].attack)))
    expect(container.querySelector('.ability .stat-bar')).not.toBeInTheDocument()
    expect(container.querySelector('.condition .stat-bar')).toBeInTheDocument()

    const player=state.players.find((item)=>item.id===state.lineupIds[0])!
    fireEvent.click(screen.getByText(player.name))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText(`${player.name}の能力六角形グラフ`)).toBeInTheDocument()
    expect(container.querySelectorAll('.detail-abilities .rank-badge')).toHaveLength(6)
    expect(container.querySelector('.detail-abilities .stat-bar')).not.toBeInTheDocument()
    expect(screen.getByText('出場試合')).toBeInTheDocument()
    expect(screen.queryByLabelText(`${player.name}をスタメンから外す`)).not.toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('閉じる'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
