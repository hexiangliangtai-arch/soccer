import type { FormationSlot as FormationSlotType, Player } from '../../types/game'

export function FormationSlot({slot,player,isSelected,onSelect,onAssign,onClear}:{slot:FormationSlotType;player?:Player;isSelected:boolean;onSelect:()=>void;onAssign:(playerId:string)=>void;onClear:()=>void}) {
  const mismatch=Boolean(player&&player.position!==slot.preferredPosition)
  return <div className={`formation-slot ${isSelected?'selected':''} ${mismatch?'mismatch':''}`} style={{left:`${slot.x}%`,top:`${slot.y}%`}} onClick={onSelect} onDragOver={(event)=>{event.preventDefault();event.dataTransfer.dropEffect='move'}} onDrop={(event)=>{event.preventDefault();const playerId=event.dataTransfer.getData('text/player-id');if(playerId)onAssign(playerId)}}>
    <span>{slot.label}</span>{player?<><b draggable onDragStart={(event)=>event.dataTransfer.setData('text/player-id',player.id)}>{player.name}</b><small>{player.position}{mismatch?'・不一致':''}</small><button onClick={(event)=>{event.stopPropagation();onClear()}} aria-label={`${slot.label}から外す`}>×</button></>:<em>選手を配置</em>}
  </div>
}
