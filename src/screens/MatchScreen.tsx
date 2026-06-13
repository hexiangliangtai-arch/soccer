import { useState } from 'react'
import { friendlyOpponents, isMatchWeek, tournamentOpponents, tournamentRounds } from '../data/calendar'
import { tactics } from '../data/tactics'
import { formations, getFormation } from '../data/formations'
import { validateLineup } from '../game/lineupValidation'
import { useGame } from '../state/GameContext'
import type { FormationId, TacticId } from '../types/game'
import { TacticSelector } from '../components/tactics/TacticSelector'

export function MatchScreen({onReplay,onOpenTactics}:{onReplay?:(matchId:string)=>void;onOpenTactics?:()=>void}) {
  const {state,dispatch}=useGame(); const [tactic,setTactic]=useState<TacticId>(state.tacticId)
  const match=state.currentMatch; const validation=validateLineup(state.lineupIds,state.players)
  const available=isMatchWeek(state.week); const opponent=state.week===40?tournamentOpponents[state.tournament.roundIndex]:friendlyOpponents[state.week]
  if (!match && !available) return <section className="empty-state"><span>NEXT MATCH</span><h2>試合は第{[10,20,30,40].find(w=>w>state.week)}週</h2><p>今は鍛える時間です。日々の積み重ねが、試合の一瞬を変えます。</p></section>
  if (!match) return <section className="page-section"><div className="match-poster"><span>{state.week===40?tournamentRounds[state.tournament.roundIndex]:'FRIENDLY MATCH'}</span><div><h2>青葉高校</h2><b>VS</b><h2>{opponent.name}</h2></div><p>相手総合力 {opponent.strength} / {opponent.style}</p></div><div className="prematch-setup"><div className="prematch-formation"><span className="section-kicker">FORMATION</span><label>フォーメーション<select value={state.selectedFormation} onChange={(event)=>dispatch({type:'SET_FORMATION',formationId:event.target.value as FormationId})}>{formations.map((formation)=><option key={formation.id} value={formation.id}>{formation.name}</option>)}</select></label><p>{getFormation(state.selectedFormation).description}</p><div className="prematch-lineup">{state.lineupAssignments.map((assignment)=>{const slot=getFormation(state.selectedFormation).slots.find((item)=>item.slotId===assignment.slotId);const player=state.players.find((item)=>item.id===assignment.playerId);return <span key={assignment.slotId}><b>{slot?.label}</b>{player?.name??'未配置'}</span>})}</div>{onOpenTactics&&<button onClick={onOpenTactics}>詳しく変更する →</button>}</div><div className="prematch-tactic"><span className="section-kicker">TEAM TACTIC</span><TacticSelector compact value={state.tacticId} onChange={(tacticId)=>{dispatch({type:'SET_TEAM_TACTIC',tacticId});setTactic(tacticId)}}/></div></div>{!validation.valid&&<div className="alert">試合を始めるには有効なスタメンが必要です。{validation.errors.join(' ')}</div>}<button className="kickoff" disabled={!validation.valid} onClick={()=>dispatch({type:'START_MATCH',tacticId:state.tacticId,seed:Date.now()})}>メンバーを送り出す</button></section>
  const visible=match.events.filter((e)=>!['pass'].includes(e.type)).slice().reverse()
  const homeGoals=match.events.filter((event)=>event.type==='goal'&&event.team==='home')
  const homeWon=match.shootoutWinner?match.shootoutWinner==='home':match.score.home>match.score.away
  const homeLost=match.shootoutWinner?match.shootoutWinner==='away':match.score.home<match.score.away
  return <section className="page-section match-live"><div className="live-score"><span>{match.roundLabel}</span><div><b>青葉高校</b><strong>{match.score.home}<i>−</i>{match.score.away}</strong><b>{match.opponent.name}</b></div><p>{match.phase==='preMatch'?'KICK OFF':match.phase==='halfTime'?'HALF TIME':'FULL TIME'}</p></div>
    {match.phase==='preMatch'&&<button className="kickoff" onClick={()=>dispatch({type:'SIMULATE_FIRST_HALF'})}>前半を開始する</button>}
    {match.phase==='halfTime'&&<div className="halftime-panel"><span className="section-kicker">HALF TIME TALK</span><h3>後半の作戦を選ぶ</h3><TacticPicker value={tactic} onChange={setTactic}/><button className="kickoff" onClick={()=>dispatch({type:'SIMULATE_SECOND_HALF',tacticId:tactic})}>後半へ</button></div>}
    {match.phase==='finished'&&<><div className="result-banner"><b>{homeWon?'勝利':homeLost?'敗戦':'引き分け'}</b><p>{state.week===40?'結果を確定すると県大会の進行が更新されます。':'試合結果を保存し、次の週へ自動で進みました。'}</p><div className="result-actions">{onReplay&&<button onClick={()=>onReplay(match.id)}>2Dリプレイを見る</button>}<button onClick={()=>dispatch({type:'CONTINUE_AFTER_MATCH'})}>{state.week===40?'結果を確定する':'結果画面を閉じる'} →</button></div></div><div className="goal-summary"><span className="section-kicker">GOAL RECORD</span><h3>得点記録</h3>{homeGoals.length?homeGoals.map((goal)=>{const scorer=state.players.find((player)=>player.id===goal.playerId)?.name??'青葉高校';const assist=state.players.find((player)=>player.id===goal.assistPlayerId)?.name;return <p key={goal.id}><time>{goal.half==='first'?'前半': '後半'} {goal.half==='first'?goal.minute:goal.minute-45}分</time><b>{scorer}</b><span>アシスト：{assist??'なし'}</span></p>}):<p>青葉高校の得点はありませんでした。</p>}</div></>}
    <div className="commentary"><div className="commentary-head"><span className="section-kicker">LIVE COMMENTARY</span><h3>テキスト実況</h3></div>{visible.map((e)=><div className={`event-line ${e.type}`} key={e.id}><time>{e.minute}'</time><i>{eventIcon[e.type]??'・'}</i><p>{e.description}<small>{e.type} / {e.position?`${e.position.x}, ${e.position.y}`:'system'}</small></p></div>)}</div>
  </section>
}

function TacticPicker({value,onChange}:{value:TacticId;onChange:(id:TacticId)=>void}) { return <div className="tactic-grid">{tactics.map((item)=><button className={value===item.id?'active':''} onClick={()=>onChange(item.id)} key={item.id}><span>{item.shortName}</span><b>{item.name}</b><small>{item.description}</small></button>)}</div> }
const eventIcon:Record<string,string>={goal:'GOAL',shoot:'蹴',save:'止',chance:'!',dribble:'走',counter:'速',pressure:'圧',foul:'笛',halfTime:'HT',matchEnd:'FT',matchStart:'KO',penaltyShootout:'PK'}
