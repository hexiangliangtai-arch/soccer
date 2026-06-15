import { useEffect, useMemo, useRef, useState } from 'react'
import { createReplayFrames, getFrameAtIndex } from '../../game/replayEngine'
import type { MatchEvent, MatchRecord, Player, ReplayPaceMode, ReplayViewMode } from '../../types/game'
import { Pitch2D } from './Pitch2D'
import { ReplayControls } from './ReplayControls'

const importantTypes=new Set<MatchEvent['type']>(['chance','shoot','goal','save','miss','block','penaltyShootout','halfTime','matchEnd'])

function frameEvents(frame:ReturnType<typeof getFrameAtIndex>,record:MatchRecord) {
  if(!frame)return []
  if(frame.continuous) {
    if(!frame.eventIds?.length)return []
    const ids=new Set(frame.eventIds)
    return record.events.filter((event)=>ids.has(event.id))
  }
  return record.events.filter((event)=>event.sequence===frame.sequence)
}

function goalDetails(event:MatchEvent,record:MatchRecord,players:Player[]) {
  const goal=record.goals.find((item)=>item.team===event.team&&item.minute===event.minute&&item.scorerId===event.playerId)
  const scorer=goal?.scorerName??players.find((player)=>player.id===event.playerId)?.name??(event.team==='home'?'青葉高校':'相手チーム')
  const assist=goal?.assistName??players.find((player)=>player.id===event.assistPlayerId)?.name
  return {scorer,assist}
}

export function MatchReplay2D({record,players,mode='replay',autoStart=false,onComplete}:{
  record:MatchRecord;players:Player[];mode?:ReplayViewMode;autoStart?:boolean;onComplete?:()=>void
}) {
  const frames=useMemo(()=>createReplayFrames(record,players),[record,players])
  const [index,setIndex]=useState(0)
  const [isPlaying,setIsPlaying]=useState(autoStart)
  const [pace,setPace]=useState<ReplayPaceMode>('standard')
  const [goalEvent,setGoalEvent]=useState<MatchEvent|null>(null)
  const [compressedCut,setCompressedCut]=useState(false)
  const seenGoals=useRef(new Set<string>())
  const resumeAfterGoal=useRef(false)
  const completed=useRef(false)
  const frame=getFrameAtIndex(frames,index)
  const isAtEnd=!frames.length||index>=frames.length-1
  const currentEvents=useMemo(()=>frameEvents(frame,record),[frame,record])
  const eventFrameIndexes=useMemo(()=>frames[0]?.continuous
    ? [0,...frames.flatMap((item,itemIndex)=>itemIndex>0&&item.eventIds?.length?[itemIndex]:[])]
    : frames.map((_,itemIndex)=>itemIndex),[frames])
  const importantFrameIndexes=useMemo(()=>eventFrameIndexes.filter((frameIndex)=>frameEvents(frames[frameIndex],record).some((event)=>importantTypes.has(event.type))),[eventFrameIndexes,frames,record])
  const eventOrdinal=Math.max(1,eventFrameIndexes.filter((itemIndex)=>itemIndex<=index).length)

  useEffect(()=>{
    setIndex(0);setIsPlaying(autoStart);setPace('standard');setGoalEvent(null);setCompressedCut(false)
    seenGoals.current.clear();completed.current=false
  },[record.id,autoStart])

  useEffect(()=>{
    const goal=currentEvents.find((event)=>event.type==='goal'&&!seenGoals.current.has(event.id))
    if(!goal)return
    seenGoals.current.add(goal.id)
    resumeAfterGoal.current=isPlaying
    setIsPlaying(false);setGoalEvent(goal)
  },[currentEvents,isPlaying])

  const resumeGoal=()=>{
    setGoalEvent(null)
    if(resumeAfterGoal.current&&!isAtEnd)setIsPlaying(true)
    resumeAfterGoal.current=false
  }

  useEffect(()=>{
    if(!goalEvent)return
    const timer=window.setTimeout(resumeGoal,3000)
    return ()=>window.clearTimeout(timer)
  },[goalEvent])

  useEffect(()=>{
    if(!isPlaying||!frame||goalEvent)return
    if(isAtEnd) {setIsPlaying(false);return}
    const important=currentEvents.some((event)=>importantTypes.has(event.type))
    const hasEvent=currentEvents.length>0
    let next=index+1
    let delay=important?520:hasEvent?280:190
    let cut=false
    if(pace==='fast')delay=important?420:hasEvent?180:105
    if(pace==='highlights'&&!important) {
      next=importantFrameIndexes.find((item)=>item>index)??frames.length-1
      delay=hasEvent?180:90;cut=next>index+1
    }
    const timer=window.setTimeout(()=>{setCompressedCut(cut);setIndex(Math.min(frames.length-1,next))},delay)
    return ()=>window.clearTimeout(timer)
  },[currentEvents,frame,frames.length,goalEvent,importantFrameIndexes,index,isAtEnd,isPlaying,pace])

  useEffect(()=>{
    if(!isAtEnd||!frame||completed.current)return
    completed.current=true;setIsPlaying(false);onComplete?.()
  },[frame,isAtEnd,onComplete])

  useEffect(()=>{if(compressedCut){const timer=window.setTimeout(()=>setCompressedCut(false),30);return()=>window.clearTimeout(timer)}},[compressedCut,index])

  if(!frame)return <div className="replay-empty"><h3>リプレイデータがありません</h3><p>この試合には再生できるイベントが保存されていません。</p></div>
  const goalInfo=goalEvent?goalDetails(goalEvent,record,players):null
  const displayMinute=goalEvent?.half==='second'?Math.max(1,goalEvent.minute-45):goalEvent?.minute
  const motionMs=currentEvents.some((event)=>importantTypes.has(event.type))?420:pace==='fast'?100:190
  return <section className={`match-replay ${mode==='liveWatch'?'live-watch':''}`}>
    <div className="replay-status"><div><span>{frame.half==='first'?'前半':frame.half==='second'?'後半':'試合終了後'}</span><b>{frame.minute}<small>分</small> {String(frame.second).padStart(2,'0')}<small>秒</small></b></div><div><span>{mode==='liveWatch'?'MATCH PACE':'EVENT'}</span><b>{mode==='liveWatch'?(pace==='standard'?'標準':pace==='fast'?'速い':'見どころ'):eventOrdinal}<small>{mode==='replay'?` / ${eventFrameIndexes.length}`:''}</small></b></div><div><span>SCORE</span><b>{frame.homeScore??0}<small> - </small>{frame.awayScore??0}</b></div></div>
    <div className="replay-pitch-stage">
      <Pitch2D frame={frame} motionMs={motionMs} isCompressedCut={compressedCut}/>
      {goalEvent&&goalInfo&&<div className={`goal-celebration team-${goalEvent.team}`} role="dialog" aria-label="ゴール演出"><div><span>GOAL!</span><p>{goalEvent.half==='first'?'前半':'後半'} {displayMinute}分</p><h2>{goalInfo.scorer}</h2>{goalInfo.assist&&<small>ASSIST {goalInfo.assist}</small>}<strong>{goalEvent.team==='home'?'青葉高校':record.opponent} 得点</strong><b>{frame.homeScore??0}<i>−</i>{frame.awayScore??0}</b><button onClick={resumeGoal}>再開</button></div></div>}
    </div>
    <div className={`replay-commentary event-${frame.eventType}`}><span>{frame.team==='home'?'青葉高校':record.opponent}</span><p>{frame.description}</p></div>
    <ReplayControls isPlaying={isPlaying} isAtEnd={isAtEnd} pace={pace} disabled={Boolean(goalEvent)} onToggle={()=>isAtEnd?undefined:setIsPlaying((value)=>!value)} onNext={()=>{setIsPlaying(false);setCompressedCut(true);setIndex(eventFrameIndexes.find((itemIndex)=>itemIndex>index)??frames.length-1)}} onRestart={()=>{setIsPlaying(false);setIndex(0);setGoalEvent(null);seenGoals.current.clear();completed.current=false}} onPaceChange={setPace}/>
  </section>
}
