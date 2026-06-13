export function ReplayControls({isPlaying,isAtEnd,speed,onToggle,onNext,onRestart,onSpeedChange}:{
  isPlaying:boolean;isAtEnd:boolean;speed:number;onToggle:()=>void;onNext:()=>void;onRestart:()=>void;onSpeedChange:(speed:number)=>void
}) {
  return <div className="replay-controls">
    <button className="replay-primary" onClick={onToggle} disabled={isAtEnd&&!isPlaying}>{isPlaying?'一時停止':'再生'}</button>
    <button onClick={onNext} disabled={isAtEnd}>次のイベント</button>
    <button onClick={onRestart}>最初から</button>
    <label>速度<select value={speed} onChange={(event)=>onSpeedChange(Number(event.target.value))}><option value={0.5}>0.5x</option><option value={1}>1x</option><option value={2}>2x</option></select></label>
  </div>
}
