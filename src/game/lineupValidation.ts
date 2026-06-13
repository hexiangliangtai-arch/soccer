import type { Player, Position } from '../types/game'

export interface LineupValidation { valid: boolean; errors: string[]; counts: Record<Position, number> }

export function validateLineup(lineupIds: string[], players: Player[]): LineupValidation {
  const selected = lineupIds.map((id) => players.find((player) => player.id === id)).filter((player): player is Player => Boolean(player))
  const counts: Record<Position, number> = { GK:0, DF:0, MF:0, FW:0 }
  selected.forEach((player) => counts[player.position]++)
  const errors: string[] = []
  if (selected.length !== 11) errors.push(`スタメンは11人必要です（現在${selected.length}人）`)
  if (counts.GK !== 1) errors.push('GKをちょうど1人選んでください')
  if (counts.DF < 3 || counts.DF > 5) errors.push('DFは3〜5人にしてください')
  if (counts.MF < 2 || counts.MF > 6) errors.push('MFは2〜6人にしてください')
  if (counts.FW < 1 || counts.FW > 3) errors.push('FWは1〜3人にしてください')
  if (selected.some((player) => player.injury.status === 'injured')) errors.push('怪我中の選手は選べません')
  return { valid: errors.length === 0, errors, counts }
}
