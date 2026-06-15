import type { ReplayFrame } from '../../types/game'
import { BallMarker } from './BallMarker'
import { PlayerMarker } from './PlayerMarker'

export function Pitch2D({frame,motionMs=180,isCompressedCut=false}:{frame:ReplayFrame;motionMs?:number;isCompressedCut?:boolean}) {
  return <div className="pitch-shell">
    <div className={`pitch-2d${frame.continuous?' continuous':''}${isCompressedCut?' compressed-cut':''}`} style={{'--replay-motion-ms':`${motionMs}ms`} as React.CSSProperties} role="img" aria-label="2Dサッカーピッチ">
      <div className="pitch-halfway"/><div className="pitch-center-circle"/><div className="pitch-center-dot"/>
      <div className="penalty-area penalty-left"/><div className="penalty-area penalty-right"/>
      <div className="goal-area goal-area-left"/><div className="goal-area goal-area-right"/>
      <div className="pitch-goal pitch-goal-left"/><div className="pitch-goal pitch-goal-right"/>
      <div className="penalty-dot penalty-dot-left"/><div className="penalty-dot penalty-dot-right"/>
      {frame.players.map((player)=><PlayerMarker key={player.id} player={player} isActive={player.id===frame.activePlayerId} isTarget={player.id===frame.targetPlayerId} isAssist={player.id===frame.assistPlayerId}/>) }
      <BallMarker position={frame.ballPosition}/>
    </div>
  </div>
}
