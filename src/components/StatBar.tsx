import type { AbilityKey } from '../types/game'

export type StatBarType = AbilityKey | 'condition' | 'fatigue'

export function StatBar({value,type='stamina'}:{value:number;type?:StatBarType}) {
  const width = Math.max(3,Math.min(100,value))
  return <span className={`stat-bar stat-${type}`}><i style={{width:`${width}%`}} /></span>
}
