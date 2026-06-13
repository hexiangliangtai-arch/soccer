import type { AbilityKey, Player, Position } from '../types/game'

const weights: Record<Position, Partial<Record<AbilityKey, number>>> = {
  GK: { defense:0.46, mental:0.24, technique:0.12, stamina:0.1, speed:0.08 },
  DF: { defense:0.4, stamina:0.2, mental:0.17, speed:0.12, technique:0.08, attack:0.03 },
  MF: { technique:0.28, stamina:0.21, mental:0.17, attack:0.15, defense:0.1, speed:0.09 },
  FW: { attack:0.36, speed:0.22, technique:0.2, mental:0.1, stamina:0.09, defense:0.03 },
}

export function getOverallRating(player: Player) {
  const total = Object.entries(weights[player.position]).reduce((sum, [key, weight]) => {
    return sum + player[key as AbilityKey] * (weight ?? 0)
  }, 0)
  return Math.round(total)
}

export function getMatchRating(player: Player) {
  const availability = 0.72 + player.condition / 360 - player.fatigue / 300
  return Math.max(1, Math.round(getOverallRating(player) * availability))
}

export function getTeamCondition(players: Player[]) {
  if (!players.length) return 0
  return Math.round(players.reduce((sum, player) => sum + player.condition - player.fatigue * 0.55, 0) / players.length)
}

export function getTeamOverall(players: Player[]) {
  if (!players.length) return 0
  return Math.round(players.reduce((sum, player) => sum + getMatchRating(player), 0) / players.length)
}
