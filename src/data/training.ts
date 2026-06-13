import type { TrainingMenu } from '../types/game'

export const trainingMenus: TrainingMenu[] = [
  { id:'shooting', name:'シュート練習', icon:'◎', description:'決定力とボール技術を磨く。FW・MFに効果大。', effects:{ attack:2.2, technique:0.8 }, fatigue:9, condition:-1, injuryChance:0, favoredPositions:['FW','MF'] },
  { id:'defending', name:'守備練習', icon:'盾', description:'対人守備と我慢強さを鍛える。DF・GKに効果大。', effects:{ defense:2.1, mental:0.7 }, fatigue:8, condition:-1, injuryChance:0, favoredPositions:['DF','GK'] },
  { id:'running', name:'走り込み', icon:'走', description:'試合を走り切る体を作る。疲労は大きい。', effects:{ stamina:2.1, speed:0.8 }, fatigue:15, condition:-3, injuryChance:0 },
  { id:'scrimmage', name:'紅白戦', icon:'戦', description:'実戦感覚を養い、全能力を少し伸ばす。', effects:{ attack:0.55, defense:0.55, speed:0.35, stamina:0.45, technique:0.55, mental:0.45 }, fatigue:12, condition:1, injuryChance:0.025 },
  { id:'meeting', name:'ミーティング', icon:'話', description:'映像と対話で判断力、自信を高める。', effects:{ mental:2.3, technique:0.3 }, fatigue:2, condition:3, injuryChance:0 },
  { id:'rest', name:'休養', icon:'休', description:'心身を休め、疲労とコンディションを回復。', effects:{}, fatigue:-24, condition:12, injuryChance:0 },
]
