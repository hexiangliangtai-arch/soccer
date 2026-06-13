import { getNextSchedule } from '../data/calendar'
import { getTeamCondition, getTeamOverall } from '../game/playerRating'
import { useGame } from '../state/GameContext'

export function Header() {
  const {state} = useGame()
  const lineup = state.players.filter((player)=>state.lineupIds.includes(player.id))
  return <header className="hero">
    <div className="hero__brand">
      <span className="eyebrow">AOBA HIGH SCHOOL FOOTBALL CLUB</span>
      <h1>青葉高校 <strong>監督室</strong></h1>
      <p>目標：県大会優勝</p>
    </div>
    <div className="scoreboard">
      <div><small>SEASON</small><b>第 {state.week} 週</b><span>/ 40</span></div>
      <div><small>NEXT</small><b>{getNextSchedule(state.week)}</b><span>{state.weekActionCompleted?'今週の行動完了':'行動を選択'}</span></div>
      <div><small>TEAM</small><b>総合 {getTeamOverall(lineup)}</b><span>状態 {getTeamCondition(lineup)}</span></div>
    </div>
  </header>
}
