import { useMemo, useState } from 'react'
import { MatchReplay2D } from '../components/replay/MatchReplay2D'
import { tactics } from '../data/tactics'
import { createAwayLineupSnapshot } from '../game/replayEngine'
import { useGame } from '../state/GameContext'
import type { GoalRecord, MatchRecord, MatchState, Player, ReplayViewMode, TacticId } from '../types/game'

const tacticName=(id?:string)=>tactics.find((tactic)=>tactic.id===id)?.name??'不明'
type LiveStage='first'|'halfTime'|'second'|'finished'

function goalsFromMatch(match:MatchState,players:Player[]):GoalRecord[] {
  return match.events.filter((event)=>event.type==='goal').map((event)=>({
    minute:event.minute,half:event.half,team:event.team,scorerId:event.playerId,assistPlayerId:event.assistPlayerId,
    scorerName:players.find((player)=>player.id===event.playerId)?.name??(event.team==='home'?'青葉高校':match.opponent.name),
    assistName:players.find((player)=>player.id===event.assistPlayerId)?.name,
  }))
}

function provisionalRecord(match:MatchState,players:Player[],week:number):MatchRecord {
  const goals=goalsFromMatch(match,players)
  return {
    id:match.id,week,opponent:match.opponent.name,roundLabel:match.roundLabel,score:match.score,result:'draw',
    events:match.events,scorers:goals.filter((goal)=>goal.team==='home').map((goal)=>goal.scorerName),goals,
    homeLineupSnapshot:match.lineupIds.map((id)=>players.find((player)=>player.id===id)).filter((player):player is Player=>Boolean(player)).map((player)=>({id:player.id,name:player.name,position:player.position,grade:player.grade,team:'home'})),
    awayLineupSnapshot:createAwayLineupSnapshot(),firstHalfTactic:match.firstHalfTactic,secondHalfTactic:match.secondHalfTactic,
    formationId:match.formationId,lineupAssignments:match.lineupAssignments,frames:match.frames,framePlayerIds:match.framePlayerIds,framePlayerTeams:match.framePlayerTeams,
  }
}

function halfRecord(record:MatchRecord,half:'first'|'second'):MatchRecord {
  const events=record.events.filter((event)=>event.half===half||(half==='second'&&event.half==='fullTime'))
  const goals=record.goals.filter((goal)=>goal.half===half)
  return {...record,events,goals,frames:record.frames?.filter((frame)=>frame.half===half)}
}

export function ReplayScreen({matchId,mode='replay',onBack,onLiveComplete}:{matchId:string|null;mode?:ReplayViewMode;onBack:()=>void;onLiveComplete?:()=>void}) {
  const {state,dispatch}=useGame()
  const [liveStage,setLiveStage]=useState<LiveStage>('first')
  const [secondHalfTactic,setSecondHalfTactic]=useState<TacticId>(state.tacticId)
  const current=state.currentMatch
  const saved=state.matchHistory.find((match)=>match.id===(mode==='liveWatch'?current?.id:matchId))
  const fullRecord=mode==='liveWatch'?(saved??(current?provisionalRecord(current,state.players,state.week):undefined)):saved
  const record=useMemo(()=>{
    if(!fullRecord||mode!=='liveWatch')return fullRecord
    return halfRecord(fullRecord,liveStage==='first'||liveStage==='halfTime'?'first':'second')
  },[fullRecord,liveStage,mode])
  if(!record)return <section className="empty-state"><span>2D MATCH</span><h2>試合データを準備しています</h2><p>観戦用フレームを確認しています。</p>{mode==='replay'&&<button className="kickoff" onClick={onBack}>記録画面に戻る</button>}</section>

  const startSecondHalf=()=>{
    dispatch({type:'SIMULATE_SECOND_HALF',tacticId:secondHalfTactic})
    setLiveStage('second')
  }
  const finishLiveWatch=()=>{
    dispatch({type:'CONTINUE_AFTER_MATCH'})
    onLiveComplete?.()
  }
  return <section className={`page-section replay-screen ${mode==='liveWatch'?'live-watch-screen':''}`}>
    {mode==='replay'&&<button className="replay-back" onClick={onBack}>← 記録画面に戻る</button>}
    <div className="replay-heading"><div><span className="section-kicker">{mode==='liveWatch'?'LIVE 2D MATCH':'2D MATCH REPLAY'}</span><h2>{record.roundLabel}</h2><p>{mode==='liveWatch'?'結果を伏せたまま、ピッチ上の90分を観戦します。':`第${record.week}週 / 布陣 ${record.formationId??'記録なし'} / 前半 ${tacticName(record.firstHalfTactic)} / 後半 ${tacticName(record.secondHalfTactic??record.firstHalfTactic)}`}</p></div>{mode==='replay'&&<div className="replay-score"><span>青葉高校</span><b>{record.score.home}<i>−</i>{record.score.away}</b><span>{record.opponent}</span></div>}{mode==='liveWatch'&&<div className="live-fixture"><span>青葉高校</span><b>VS</b><span>{record.opponent}</span></div>}</div>
    {liveStage!=='halfTime'&&liveStage!=='finished'&&<MatchReplay2D key={`${record.id}-${liveStage}`} record={record} players={state.players} mode={mode} autoStart={mode==='liveWatch'} onComplete={mode==='liveWatch'?()=>setLiveStage(liveStage==='first'?'halfTime':'finished'):undefined}/>} 
    {mode==='liveWatch'&&liveStage==='halfTime'&&<div className="live-halftime"><span>HALF TIME</span><div className="halftime-score"><b>青葉高校</b><strong>{record.score.home}<i>−</i>{record.score.away}</strong><b>{record.opponent}</b></div><h2>後半の戦術を決める</h2><p>前半の内容を踏まえ、後半の戦い方を選択してください。</p><div>{tactics.map((tactic)=><button key={tactic.id} className={secondHalfTactic===tactic.id?'active':''} onClick={()=>setSecondHalfTactic(tactic.id)}><b>{tactic.name}</b><small>{tactic.description}</small></button>)}</div><button className="kickoff" onClick={startSecondHalf}>後半の観戦を開始する</button></div>}
    {mode==='liveWatch'&&liveStage==='finished'&&saved&&<div className="live-watch-result"><span>FULL TIME</span><h2>{saved.result==='win'?'勝利':saved.result==='loss'?'敗戦':'引き分け'}</h2><div><b>青葉高校</b><strong>{saved.score.home}<i>−</i>{saved.score.away}</strong><b>{saved.opponent}</b></div><section><h3>得点記録</h3>{saved.goals.length?saved.goals.map((goal,index)=><p key={`${goal.minute}-${index}`}><time>{goal.half==='first'?'前半':'後半'} {goal.half==='second'?goal.minute-45:goal.minute}分</time><b>{goal.scorerName}</b><span>{goal.assistName?`アシスト ${goal.assistName}`:'アシストなし'}</span></p>):<p>得点はありませんでした。</p>}</section><button className="kickoff" onClick={finishLiveWatch}>{saved.week===40?'大会を進める':'試合画面へ戻る'} →</button></div>}
  </section>
}
