import { MatchReplay2D } from '../components/replay/MatchReplay2D'
import { tactics } from '../data/tactics'
import { useGame } from '../state/GameContext'

const tacticName=(id?:string)=>tactics.find((tactic)=>tactic.id===id)?.name??'不明'

export function ReplayScreen({matchId,onBack}:{matchId:string|null;onBack:()=>void}) {
  const {state}=useGame()
  const record=state.matchHistory.find((match)=>match.id===matchId)
  if (!record) return <section className="empty-state"><span>2D MATCH REPLAY</span><h2>試合記録が見つかりません</h2><p>記録画面から、リプレイする試合を選択してください。</p><button className="kickoff" onClick={onBack}>記録画面に戻る</button></section>
  return <section className="page-section replay-screen">
    <button className="replay-back" onClick={onBack}>← 記録画面に戻る</button>
    <div className="replay-heading"><div><span className="section-kicker">2D MATCH REPLAY</span><h2>{record.roundLabel}</h2><p>第{record.week}週 / 布陣 {record.formationId??'記録なし'} / 前半 {tacticName(record.firstHalfTactic)} / 後半 {tacticName(record.secondHalfTactic??record.firstHalfTactic)}</p></div><div className="replay-score"><span>青葉高校</span><b>{record.score.home}<i>−</i>{record.score.away}</b><span>{record.opponent}</span></div></div>
    <MatchReplay2D record={record} players={state.players}/>
  </section>
}
