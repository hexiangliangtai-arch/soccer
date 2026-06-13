import { tactics } from '../../data/tactics'
import type { TacticId } from '../../types/game'

export function TacticSelector({value,onChange,compact=false}:{value:TacticId;onChange:(id:TacticId)=>void;compact?:boolean}) {
  return <div className={`team-tactic-selector ${compact?'compact':''}`}>{tactics.map((tactic)=><button key={tactic.id} className={value===tactic.id?'active':''} onClick={()=>onChange(tactic.id)}><span>{tactic.shortName}</span><b>{tactic.name}</b>{!compact&&<small>{tactic.description}</small>}</button>)}</div>
}
