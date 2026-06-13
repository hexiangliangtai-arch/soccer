import { getOverallRating } from '../../game/playerRating'
import type { Player } from '../../types/game'

export function DraggablePlayerCard({player,isAssigned,onSelect,onOpenDetails}:{player:Player;isAssigned:boolean;onSelect:()=>void;onOpenDetails:()=>void}) {
  const injured=player.injury.status==='injured'
  return <button className={`tactics-player-card ${isAssigned?'assigned':''} ${injured?'injured':''}`} draggable={!injured} onDragStart={(event)=>{event.dataTransfer.setData('text/player-id',player.id);event.dataTransfer.effectAllowed='move'}} onClick={()=>{if(!injured)onSelect()}} onDoubleClick={onOpenDetails} aria-disabled={injured}>
    <em className={`pos ${player.position}`}>{player.position}</em><span><b>{player.name}</b><small>{player.grade}年 / 調子{player.condition} / 疲労{player.fatigue}</small></span><strong>{getOverallRating(player)}</strong>
  </button>
}
