import type { Player } from '../types/game'
import type { RandomSource } from './random'

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

export function recoverForNextWeek(players: Player[], random: RandomSource): Player[] {
  return players.map((player) => {
    const recoveryWeeks = Math.max(0, player.injury.recoveryWeeks - 1)
    return {
      ...player,
      fatigue: clamp(player.fatigue - 7 - Math.round(random.next() * 3), 0, 100),
      condition: clamp(player.condition + Math.round(random.next() * 7 - 2), 1, 100),
      injury: recoveryWeeks === 0 ? { status:'healthy' as const, recoveryWeeks:0 } : { status:'injured' as const, recoveryWeeks },
    }
  })
}

export function recoverBetweenTournamentMatches(players: Player[], lineupIds: string[]): Player[] {
  return players.map((player) => ({
    ...player,
    fatigue: Math.max(0, player.fatigue - (lineupIds.includes(player.id) ? 5 : 10)),
    condition: Math.min(100, player.condition + 2),
  }))
}
