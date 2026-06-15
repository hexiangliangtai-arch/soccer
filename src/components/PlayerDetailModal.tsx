import type { AbilityKey, Player } from '../types/game'
import { RadarChart } from './RadarChart'
import { StatBar } from './StatBar'
import { AbilityRankBadge } from './AbilityRankBadge'

const abilities: {key:AbilityKey;label:string}[] = [
  {key:'attack',label:'攻撃力'}, {key:'defense',label:'守備力'}, {key:'speed',label:'スピード'},
  {key:'stamina',label:'スタミナ'}, {key:'technique',label:'テクニック'}, {key:'mental',label:'メンタル'},
]
const growthLabels = {rapid:'早熟型',steady:'標準型',lateBloomer:'晩成型'}

export function PlayerDetailModal({player,onClose}:{player:Player;onClose:()=>void}) {
  return <div className="modal-backdrop" onClick={onClose} role="presentation">
    <section className="player-detail" role="dialog" aria-modal="true" aria-labelledby="player-detail-title" onClick={(event)=>event.stopPropagation()}>
      <button className="modal-close" onClick={onClose} aria-label="閉じる">×</button>
      <header><em className={`pos ${player.position}`}>{player.position}</em><div><span>{player.grade}年生</span><h2 id="player-detail-title">{player.name}</h2></div></header>
      <div className="player-detail-grid">
        <RadarChart player={player}/>
        <div className="detail-abilities">{abilities.map(({key,label})=><div key={key}><span>{label}</span><span className="ability-value"><AbilityRankBadge value={player[key]}/><small>{Math.round(player[key])}</small></span></div>)}</div>
      </div>
      <div className="detail-condition"><div><span>コンディション</span><b>{player.condition}</b><StatBar value={player.condition} type="condition"/></div><div><span>疲労</span><b>{player.fatigue}</b><StatBar value={player.fatigue} type="fatigue"/></div></div>
      <dl className="detail-profile"><div><dt>怪我状態</dt><dd>{player.injury.status==='healthy'?'健康':`怪我・復帰まで${player.injury.recoveryWeeks}週`}</dd></div><div><dt>成長タイプ</dt><dd>{growthLabels[player.growthType]}</dd></div></dl>
      <div className="career-stats"><div><span>出場試合</span><b>{player.stats.appearances}</b></div><div><span>得点</span><b>{player.stats.goals}</b></div><div><span>アシスト</span><b>{player.stats.assists}</b></div></div>
    </section>
  </div>
}
