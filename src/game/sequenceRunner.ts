import type { MatchWorldState } from '../types/aiMatch'
import type { RandomSource } from './random'

// Legacy compatibility entry point. PlaySequence is now a team intention, so
// it must never execute coordinates or mutate possession as a command list.
export function runActiveSequence(world:MatchWorldState,_random:RandomSource) {
  world.activeSequence=undefined
  world.sequenceTargets={}
  return false
}
