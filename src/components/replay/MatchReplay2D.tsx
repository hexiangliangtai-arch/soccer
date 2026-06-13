import { useEffect, useMemo, useState } from 'react'
import { createReplayFrames, getFrameAtIndex } from '../../game/replayEngine'
import type { MatchRecord, Player } from '../../types/game'
import { Pitch2D } from './Pitch2D'
import { ReplayControls } from './ReplayControls'

export function MatchReplay2D({record,players}:{record:MatchRecord;players:Player[]}) {
  const frames=useMemo(()=>createReplayFrames(record,players),[record,players])
  const [index,setIndex]=useState(0); const [isPlaying,setIsPlaying]=useState(false); const [speed,setSpeed]=useState(1)
  const frame=getFrameAtIndex(frames,index); const isAtEnd=!frames.length||index>=frames.length-1

  useEffect(()=>{setIndex(0);setIsPlaying(false)},[record.id])
  useEffect(()=>{
    if (!isPlaying||!frame) return
    if (isAtEnd) { setIsPlaying(false); return }
    const timer=window.setTimeout(()=>setIndex((current)=>Math.min(frames.length-1,current+1)),Math.max(250,frame.durationMs/speed))
    return ()=>window.clearTimeout(timer)
  },[frame,frames.length,isAtEnd,isPlaying,speed])

  if (!frame) return <div className="replay-empty"><h3>リプレイデータがありません</h3><p>この試合には再生できるイベントが保存されていません。</p></div>
  return <section className="match-replay">
    <div className="replay-status"><div><span>{frame.half==='first'?'前半':frame.half==='second'?'後半':'試合終了後'}</span><b>{frame.minute}<small>分</small> {String(frame.second).padStart(2,'0')}<small>秒</small></b></div><div><span>EVENT</span><b>{index+1}<small> / {frames.length}</small></b></div><div><span>TYPE</span><b>{frame.eventType}</b></div></div>
    <Pitch2D frame={frame}/>
    <div className={`replay-commentary event-${frame.eventType}`}><span>{frame.team==='home'?'青葉高校':'相手チーム'}</span><p>{frame.description}</p></div>
    <ReplayControls isPlaying={isPlaying} isAtEnd={isAtEnd} speed={speed} onToggle={()=>isAtEnd?undefined:setIsPlaying((value)=>!value)} onNext={()=>{setIsPlaying(false);setIndex((current)=>Math.min(frames.length-1,current+1))}} onRestart={()=>{setIsPlaying(false);setIndex(0)}} onSpeedChange={setSpeed}/>
  </section>
}
