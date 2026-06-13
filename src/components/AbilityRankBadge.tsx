export type AbilityRank = 'S' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'

export function getAbilityRank(value: number): AbilityRank {
  if (value >= 90) return 'S'
  if (value >= 80) return 'A'
  if (value >= 70) return 'B'
  if (value >= 60) return 'C'
  if (value >= 50) return 'D'
  if (value >= 40) return 'E'
  if (value >= 20) return 'F'
  return 'G'
}

export function AbilityRankBadge({value}:{value:number}) {
  const rank=getAbilityRank(value)
  return <span className={`rank-badge rank-${rank.toLowerCase()}`} title={`能力値 ${Math.round(value)}`}>{rank}</span>
}
