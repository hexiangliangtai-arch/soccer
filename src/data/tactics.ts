import type { Tactic } from '../types/game'

export const tactics: Tactic[] = [
  { id:'balanced', name:'バランス', shortName:'均衡', description:'攻守の偏りを抑え、安定した試合運びを狙う。', attack:1, defense:1, control:1, fatigue:3 },
  { id:'attacking', name:'攻撃重視', shortName:'攻撃', description:'前へ人数をかける。得点力と失点リスクが上がる。', attack:1.16, defense:0.91, control:1.02, fatigue:6 },
  { id:'defensive', name:'守備重視', shortName:'堅守', description:'ブロックを低く保つ。失点を抑えるが攻撃力は落ちる。', attack:0.86, defense:1.18, control:0.94, fatigue:2 },
  { id:'counter', name:'カウンター', shortName:'速攻', description:'快速FWを生かして一気にゴールへ迫る。', attack:1.07, defense:0.96, control:0.9, fatigue:4 },
  { id:'possession', name:'ポゼッション', shortName:'保持', description:'技術あるMFを中心に試合を安定させる。', attack:1.0, defense:1.04, control:1.17, fatigue:3 },
  { id:'pressing', name:'ハイプレス', shortName:'圧力', description:'高い位置で奪う。スタミナ消費が大きい。', attack:1.09, defense:1.04, control:1.08, fatigue:9 },
]
