import { useGame } from '../state/GameContext'
import { tactics } from '../data/tactics'

const tacticName=(id?:string)=>tactics.find((tactic)=>tactic.id===id)?.name??'不明'

export function RecordsScreen({onReplay}:{onReplay:(matchId:string)=>void}) {
  const {state,dispatch}=useGame()
  const goals=state.matchHistory.reduce((sum,m)=>sum+m.score.home,0); const conceded=state.matchHistory.reduce((sum,m)=>sum+m.score.away,0)
  return <section className="page-section"><div className="page-heading"><div><span className="section-kicker">SEASON ARCHIVE</span><h2>シーズン記録</h2><p>40週間の判断と、ピッチで起きた出来事の記録です。</p></div></div>
    <div className="record-summary"><div><span>試合</span><b>{state.matchHistory.length}</b></div><div><span>勝利</span><b>{state.matchHistory.filter(m=>m.result==='win').length}</b></div><div><span>得点</span><b>{goals}</b></div><div><span>失点</span><b>{conceded}</b></div></div>
    <div className="history-list">{state.matchHistory.length===0?<p className="no-records">まだ試合記録はありません。</p>:state.matchHistory.map((m)=><article key={m.id}><time>WEEK {m.week}</time><div><span>{m.roundLabel}</span><h3>青葉高校 <b>{m.score.home} − {m.score.away}</b> {m.opponent}</h3><p>{m.goals.filter(goal=>goal.team==='home').map((goal)=>`${goal.scorerName}（アシスト：${goal.assistName??'なし'}）`).join('、')||'得点なし'} / イベント {(m.events??[]).length}件</p><p>布陣 {m.formationId??'記録なし'} / 前半 {tacticName(m.firstHalfTactic)} / 後半 {tacticName(m.secondHalfTactic??m.firstHalfTactic)}</p><button className="history-replay-button" onClick={()=>onReplay(m.id)} disabled={!(m.events??[]).length}>2Dリプレイを見る</button></div><strong className={m.result}>{m.result==='win'?'WIN':m.result==='draw'?'DRAW':'LOSS'}</strong></article>)}</div>
    <div className="reset-zone"><h3>セーブデータ</h3><p>進行状況はブラウザに自動保存されています。</p><button onClick={()=>{if(confirm('現在のシーズンを削除して最初から始めますか？'))dispatch({type:'RESET'})}}>最初から始める</button></div>
  </section>
}
