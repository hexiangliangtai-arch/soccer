import type { ReplayPlayer } from '../../types/game'

export function PlayerMarker({player,isActive,isTarget,isAssist}:{player:ReplayPlayer;isActive:boolean;isTarget:boolean;isAssist:boolean}) {
  const classes=['replay-player',`team-${player.team}`,isActive?'active':'',isTarget?'target':'',isAssist?'assist':''].filter(Boolean).join(' ')
  return <div className={classes} style={{left:`${player.x}%`,top:`${player.y}%`}} title={player.name}>
    <span>{player.label}</span><small>{player.name}</small>
  </div>
}
