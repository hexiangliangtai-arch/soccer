import { getFormation } from '../../data/formations'
import type { FormationId, LineupAssignment, Player } from '../../types/game'
import { FormationSlot } from './FormationSlot'

export function FormationBoard({formationId,assignments,players,selectedSlotId,onSelectSlot,onAssign,onClear}:{formationId:FormationId;assignments:LineupAssignment[];players:Player[];selectedSlotId:string|null;onSelectSlot:(slotId:string)=>void;onAssign:(slotId:string,playerId:string)=>void;onClear:(slotId:string)=>void}) {
  const formation=getFormation(formationId)
  return <div className="formation-board-wrap"><div className="formation-board"><div className="formation-board-line"/><div className="formation-board-circle"/>{formation.slots.map((slot)=>{const assignment=assignments.find((item)=>item.slotId===slot.slotId);const player=players.find((item)=>item.id===assignment?.playerId);return <FormationSlot key={slot.slotId} slot={slot} player={player} isSelected={selectedSlotId===slot.slotId} onSelect={()=>onSelectSlot(slot.slotId)} onAssign={(playerId)=>onAssign(slot.slotId,playerId)} onClear={()=>onClear(slot.slotId)}/>})}</div></div>
}
