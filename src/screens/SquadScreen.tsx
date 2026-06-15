import { useMemo, useState } from 'react'
import { getMatchRating, getOverallRating } from '../game/playerRating'
import { useGame } from '../state/GameContext'
import type { Position } from '../types/game'
import { StatBar } from '../components/StatBar'
import { PlayerDetailModal } from '../components/PlayerDetailModal'
import { AbilityRankBadge } from '../components/AbilityRankBadge'

export function SquadScreen() {
  const {state}=useGame(); const [filter,setFilter]=useState<'ALL'|Position>('ALL'); const [selectedPlayerId,setSelectedPlayerId]=useState<string|null>(null)
  const players=useMemo(()=>state.players.filter((player)=>filter==='ALL'||player.position===filter),[state.players,filter])
  return <section className="page-section"><div className="page-heading"><div><span className="section-kicker">PLAYER DIRECTORY</span><h2>選手</h2><p>能力、状態、シーズン成績を確認できます。選手をクリックすると詳細を表示します。</p></div></div>
    <div className="filter-row">{(['ALL','GK','DF','MF','FW'] as const).map((position)=><button className={filter===position?'active':''} onClick={()=>setFilter(position)} key={position}>{position}</button>)}<span>全{state.players.length}名</span></div>
    <div className="player-table"><div className="player-row player-only-row table-head"><span>選手</span><span>評価</span><span>攻撃力</span><span>守備力</span><span>スピード</span><span>スタミナ</span><span>テクニック</span><span>メンタル</span><span>状態・成績</span></div>{players.map((player)=><div className="player-row player-only-row player-data-row" key={player.id} onClick={()=>setSelectedPlayerId(player.id)} role="button" tabIndex={0} onKeyDown={(event)=>{if(event.key==='Enter'||event.key===' ')setSelectedPlayerId(player.id)}}><span className="player-name"><em className={`pos ${player.position}`}>{player.position}</em><b>{player.name}<small>{player.grade}年・詳細を見る</small></b></span><strong>{getOverallRating(player)}<small>試合 {getMatchRating(player)}</small></strong>{(['attack','defense','speed','stamina','technique','mental'] as const).map((key)=><span className="ability" key={key}><AbilityRankBadge value={player[key]}/><small>{Math.round(player[key])}</small></span>)}<span className="condition">調子 {player.condition}<StatBar value={player.condition} type="condition"/><small>疲労 {player.fatigue} / 出場 {player.stats.appearances} / 得点 {player.stats.goals} / AST {player.stats.assists}</small>{player.injury.status==='injured'&&<mark>怪我 {player.injury.recoveryWeeks}週</mark>}</span></div>)}</div>
    {selectedPlayerId&&<PlayerDetailModal player={state.players.find((player)=>player.id===selectedPlayerId)!} onClose={()=>setSelectedPlayerId(null)}/>} 
  </section>
}
