import type { ReplayPaceMode } from '../../types/game'

export function ReplayControls({isPlaying,isAtEnd,pace,onToggle,onNext,onRestart,onPaceChange,disabled=false}:{
  isPlaying:boolean;isAtEnd:boolean;pace:ReplayPaceMode;onToggle:()=>void;onNext:()=>void;onRestart:()=>void;onPaceChange:(pace:ReplayPaceMode)=>void;disabled?:boolean
}) {
  return <div className="replay-controls">
    <button className="replay-primary" onClick={onToggle} disabled={disabled||(isAtEnd&&!isPlaying)}>{isPlaying?'一時停止':'再生'}</button>
    <button onClick={onNext} disabled={disabled||isAtEnd}>次のイベント</button>
    <button onClick={onRestart} disabled={disabled}>最初から</button>
    <label>再生<select value={pace} disabled={disabled} onChange={(event)=>onPaceChange(event.target.value as ReplayPaceMode)}><option value="standard">標準</option><option value="fast">速い</option><option value="highlights">ハイライト</option></select></label>
  </div>
}
