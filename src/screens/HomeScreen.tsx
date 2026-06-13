import { friendlyOpponents, isMatchWeek, tournamentOpponents } from '../data/calendar'
import { getTeamCondition, getTeamOverall } from '../game/playerRating'
import { useGame } from '../state/GameContext'
import { TrainingPanel } from '../components/TrainingPanel'

export function HomeScreen({goTo}:{goTo:(screen:'match'|'tactics')=>void}) {
  const {state}=useGame(); const starters=state.players.filter((player)=>state.lineupIds.includes(player.id))
  const opponent=state.week===40?tournamentOpponents[state.tournament.roundIndex]:friendlyOpponents[state.week]
  return <section className="page-section home-screen"><div className="home-summary"><div><span className="section-kicker">MANAGER DASHBOARD</span><h2>{state.teamName}</h2><p>第{state.week}週・目標は県大会優勝</p></div><div className="home-summary-stats"><div><span>TEAM</span><b>{getTeamOverall(starters)}</b><small>チーム総合</small></div><div><span>CONDITION</span><b>{getTeamCondition(starters)}</b><small>スタメン状態</small></div><div><span>NEXT</span><b>{opponent?.name??'育成週'}</b><small>{isMatchWeek(state.week)?'試合予定':'次の試合へ準備'}</small></div></div></div>
    {isMatchWeek(state.week)?<div className="home-match-actions"><div><span className="section-kicker">MATCH DAY</span><h3>{opponent?.name}戦</h3><p>スタメンと戦術を最終確認してください。</p></div><button onClick={()=>goTo('tactics')}>編成を確認</button><button className="primary-button" onClick={()=>goTo('match')}>試合へ進む →</button></div>:<TrainingPanel/>}
    <section className="paper-card home-log"><span className="section-kicker">RECENT LOG</span><h3>最近の活動</h3>{state.logs.slice(0,4).map((log,index)=><p key={`${log}-${index}`}>{log}</p>)}</section>
  </section>
}
