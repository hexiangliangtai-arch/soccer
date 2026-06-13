import type { AbilityKey, Player, TrainingMenu } from '../types/game'
import type { RandomSource } from './random'

const abilityKeys: AbilityKey[] = ['attack','defense','speed','stamina','technique','mental']
const growthMultiplier = { rapid:1.2, steady:1, lateBloomer:0.9 }
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

export interface TrainingResult { players: Player[]; summary: string; details: string[] }

export function applyTraining(players: Player[], menu: TrainingMenu, random: RandomSource): TrainingResult {
  const details: string[] = []
  let injuries = 0
  const updated = players.map((player) => {
    const changes: string[] = []
    const favored = menu.favoredPositions?.includes(player.position) ? 1.18 : 1
    const copy: Player = { ...player, injury:{ ...player.injury } }
    abilityKeys.forEach((key) => {
      const base = menu.effects[key]
      if (!base) return
      const ceiling = 0.45 + (100 - player[key]) / 140
      const variation = 0.82 + random.next() * 0.38
      const gain = base * growthMultiplier[player.growthType] * favored * ceiling * variation
      const next = clamp(Math.round((player[key] + gain) * 10) / 10, 1, 100)
      if (next > player[key]) changes.push(`${keyLabel[key]}+${(next-player[key]).toFixed(1)}`)
      copy[key] = next
    })
    copy.fatigue = clamp(player.fatigue + menu.fatigue + Math.round(random.next() * 2), 0, 100)
    copy.condition = clamp(player.condition + menu.condition + Math.round(random.next() * 4 - 2), 1, 100)
    if (menu.injuryChance > 0 && player.injury.status === 'healthy' && random.next() < menu.injuryChance * (1 + player.fatigue / 90)) {
      copy.injury = { status:'injured', recoveryWeeks: random.next() < 0.75 ? 1 : 2 }
      injuries++
      changes.push(`怪我（${copy.injury.recoveryWeeks}週）`)
    }
    if (changes.length) details.push(`${player.name}: ${changes.join('、')}`)
    return copy
  })
  const growthText = Object.keys(menu.effects).length ? '選手たちは確かな手応えを得た。' : '心身を休め、次週への準備を整えた。'
  const injuryText = injuries ? ` ${injuries}人が練習中に怪我をした。` : ''
  return { players:updated, details, summary:`${menu.name}を行った。${growthText}${injuryText}` }
}

const keyLabel: Record<AbilityKey, string> = {
  attack:'攻撃', defense:'守備', speed:'速度', stamina:'体力', technique:'技術', mental:'精神',
}
