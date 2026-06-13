import { createContext, useContext, useEffect, useReducer, type Dispatch, type ReactNode } from 'react'
import type { GameState } from '../types/game'
import { createInitialState, gameReducer, normalizeLoadedState, type GameAction } from './gameState'

const STORAGE_KEY = 'aoba-soccer-manager-v1'
const GameContext = createContext<{state:GameState;dispatch:Dispatch<GameAction>} | null>(null)

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return createInitialState()
    const parsed = JSON.parse(saved) as GameState
    return parsed.version === 1 && Array.isArray(parsed.players) ? normalizeLoadedState(parsed) : createInitialState()
  } catch { return createInitialState() }
}

export function GameProvider({children}:{children:ReactNode}) {
  const [state,dispatch] = useReducer(gameReducer,undefined,loadState)
  useEffect(()=>localStorage.setItem(STORAGE_KEY,JSON.stringify(state)),[state])
  return <GameContext.Provider value={{state,dispatch}}>{children}</GameContext.Provider>
}

export function useGame() {
  const context = useContext(GameContext)
  if (!context) throw new Error('useGame must be used inside GameProvider')
  return context
}
