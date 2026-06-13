import type { PitchPosition } from '../../types/game'

export function BallMarker({position}:{position:PitchPosition}) {
  return <div className="replay-ball" style={{left:`${position.x}%`,top:`${position.y}%`}} aria-label="ボール"><i/></div>
}
