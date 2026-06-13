import type { FormationDefinition, FormationId, FormationSlot, LineupAssignment, Player, Position } from '../types/game'

const slot = (slotId:string,label:string,preferredPosition:Position,x:number,y:number):FormationSlot => ({slotId,label,preferredPosition,x,y})

export const formations: FormationDefinition[] = [
  {id:'4-4-2',name:'4-4-2',description:'攻守のバランスに優れた基本布陣。',slots:[
    slot('gk','GK','GK',8,50),slot('lb','LB','DF',25,16),slot('cb1','CB','DF',23,39),slot('cb2','CB','DF',23,61),slot('rb','RB','DF',25,84),
    slot('lm','LM','MF',48,15),slot('cm1','CM','MF',45,39),slot('cm2','CM','MF',45,61),slot('rm','RM','MF',48,85),
    slot('st1','ST','FW',73,36),slot('st2','ST','FW',73,64),
  ]},
  {id:'4-3-3',name:'4-3-3',description:'前線を広く使い、攻撃の選択肢を増やす。',slots:[
    slot('gk','GK','GK',8,50),slot('lb','LB','DF',25,16),slot('cb1','CB','DF',23,39),slot('cb2','CB','DF',23,61),slot('rb','RB','DF',25,84),
    slot('cm1','CM','MF',47,27),slot('cm2','CM','MF',43,50),slot('cm3','CM','MF',47,73),
    slot('lw','LW','FW',72,18),slot('st','ST','FW',76,50),slot('rw','RW','FW',72,82),
  ]},
  {id:'4-2-3-1',name:'4-2-3-1',description:'中盤の層を厚くし、トップ下を生かす。',slots:[
    slot('gk','GK','GK',8,50),slot('lb','LB','DF',25,16),slot('cb1','CB','DF',23,39),slot('cb2','CB','DF',23,61),slot('rb','RB','DF',25,84),
    slot('dm1','DM','MF',41,37),slot('dm2','DM','MF',41,63),slot('lw','LW','MF',58,18),slot('am','AM','MF',57,50),slot('rw','RW','MF',58,82),slot('st','ST','FW',76,50),
  ]},
  {id:'3-5-2',name:'3-5-2',description:'中盤を支配し、両翼の運動量を生かす。',slots:[
    slot('gk','GK','GK',8,50),slot('cb1','CB','DF',24,27),slot('cb2','CB','DF',21,50),slot('cb3','CB','DF',24,73),
    slot('lwb','LWB','MF',46,12),slot('cm1','CM','MF',45,34),slot('cm2','CM','MF',42,50),slot('cm3','CM','MF',45,66),slot('rwb','RWB','MF',46,88),
    slot('st1','ST','FW',73,36),slot('st2','ST','FW',73,64),
  ]},
  {id:'3-4-2-1',name:'3-4-2-1',description:'2人のトップ下が中央で攻撃を組み立てる。',slots:[
    slot('gk','GK','GK',8,50),slot('cb1','CB','DF',24,27),slot('cb2','CB','DF',21,50),slot('cb3','CB','DF',24,73),
    slot('lm','LM','MF',44,15),slot('cm1','CM','MF',43,40),slot('cm2','CM','MF',43,60),slot('rm','RM','MF',44,85),
    slot('am1','AM','MF',62,35),slot('am2','AM','MF',62,65),slot('st','ST','FW',78,50),
  ]},
]

export function getFormation(id: FormationId) { return formations.find((formation)=>formation.id===id)??formations[0] }

export function createAssignments(formationId: FormationId,playerIds: string[],players: Player[]): LineupAssignment[] {
  const slots=getFormation(formationId).slots
  const available=playerIds.map((id)=>players.find((player)=>player.id===id)).filter((player):player is Player=>Boolean(player)).filter((player)=>player.injury.status==='healthy')
  const used=new Set<string>()
  return slots.map((formationSlot)=>{
    const preferred=available.find((player)=>!used.has(player.id)&&player.position===formationSlot.preferredPosition)
    const fallback=available.find((player)=>!used.has(player.id))
    const selected=preferred??fallback
    if (selected) used.add(selected.id)
    return {slotId:formationSlot.slotId,playerId:selected?.id??null}
  })
}

export function lineupIdsFromAssignments(assignments: LineupAssignment[]) {
  return assignments.map((assignment)=>assignment.playerId).filter((id):id is string=>Boolean(id))
}
