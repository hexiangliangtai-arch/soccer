import type { OpponentTeam } from '../types/game'

export const friendlyOpponents: Record<number, OpponentTeam> = {
  10: { id:'opp-river', name:'川南高校', strength:54, style:'粘り強い守備' },
  20: { id:'opp-port', name:'港ヶ丘高校', strength:63, style:'サイド攻撃' },
  30: { id:'opp-east', name:'東雲学園', strength:70, style:'素早いパス回し' },
}

export const tournamentOpponents: OpponentTeam[] = [
  { id:'opp-t1', name:'若葉高校', strength:60, style:'勢いある前線' },
  { id:'opp-t2', name:'北陵高校', strength:70, style:'堅守速攻' },
  { id:'opp-t3', name:'城西学院', strength:80, style:'完成度の高い組織' },
  { id:'opp-t4', name:'帝峰学園', strength:88, style:'王者のポゼッション' },
]

export const tournamentRounds = ['県大会 1回戦', '県大会 準々決勝', '県大会 準決勝', '県大会 決勝']

export function isMatchWeek(week: number) { return week === 10 || week === 20 || week === 30 || week === 40 }

export function getNextSchedule(week: number) {
  if (week >= 40) return '県大会'
  const nextMatch = [10,20,30,40].find((value) => value >= week) ?? 40
  return `${nextMatch}週目 ${nextMatch === 40 ? '県大会' : '練習試合'}`
}
