import { createAssignments, getFormation } from '../data/formations'
import type { MatchPlayerState, PlayerRole } from '../types/aiMatch'
import type { FormationId, FormationSlot, MatchState, MatchTeam, Player, Position } from '../types/game'
import { clamp, mirrorPointForAway } from './pitchMath'

const awayFormation: Array<{id:string;name:string;position:Position;role:PlayerRole;x:number;y:number}> = [
  {id:'away-gk-1',name:'相手GK',position:'GK',role:'GK',x:8,y:50},
  {id:'away-df-1',name:'相手DF1',position:'DF',role:'FB',x:25,y:16},
  {id:'away-df-2',name:'相手DF2',position:'DF',role:'CB',x:23,y:39},
  {id:'away-df-3',name:'相手DF3',position:'DF',role:'CB',x:23,y:61},
  {id:'away-df-4',name:'相手DF4',position:'DF',role:'FB',x:25,y:84},
  {id:'away-mf-1',name:'相手MF1',position:'MF',role:'WG',x:48,y:15},
  {id:'away-mf-2',name:'相手MF2',position:'MF',role:'CM',x:45,y:39},
  {id:'away-mf-3',name:'相手MF3',position:'MF',role:'CM',x:45,y:61},
  {id:'away-mf-4',name:'相手MF4',position:'MF',role:'WG',x:48,y:85},
  {id:'away-fw-1',name:'相手FW1',position:'FW',role:'ST',x:73,y:36},
  {id:'away-fw-2',name:'相手FW2',position:'FW',role:'ST',x:73,y:64},
]

export function roleFromSlot(slot: FormationSlot): PlayerRole {
  const label=slot.label.toUpperCase()
  if (label==='GK') return 'GK'
  if (label==='CB') return 'CB'
  if (label==='LB'||label==='RB') return 'FB'
  if (label==='LWB'||label==='RWB') return 'WB'
  if (label==='DM') return 'DM'
  if (label==='AM') return 'AM'
  if (label==='CM') return 'CM'
  if (['LW','RW','LM','RM'].includes(label)) return 'WG'
  return 'ST'
}

function toMatchPlayer(player: Player,team: MatchTeam,role: PlayerRole,x:number,y:number): MatchPlayerState {
  return {
    playerId:player.id,name:player.name,team,position:player.position,role,
    x,y,baseX:x,baseY:y,targetX:x,targetY:y,hasBall:false,vx:0,vy:0,decisionCooldown:0,
    actionState:role==='GK'?'goalkeeping':'returnToShape',reactionCooldown:0,
    attack:player.attack,defense:player.defense,speed:player.speed,stamina:player.stamina,
    technique:player.technique,mental:player.mental,condition:player.condition,fatigue:player.fatigue,currentStamina:100,
  }
}

function homePlayers(match: MatchState,players: Player[]) {
  const formationId:FormationId=match.formationId??'4-4-2'
  const formation=getFormation(formationId)
  const lineup=match.lineupIds.map((id)=>players.find((player)=>player.id===id)).filter((player):player is Player=>Boolean(player))
  const supplied=match.lineupAssignments?.length===11?match.lineupAssignments:createAssignments(formationId,match.lineupIds,players)
  const validIds=new Set(match.lineupIds)
  const used=new Set<string>()
  const result=formation.slots.map((slot)=>{
    const assigned=supplied.find((item)=>item.slotId===slot.slotId)?.playerId
    const player=lineup.find((item)=>item.id===assigned&&validIds.has(item.id)&&!used.has(item.id))
      ?? lineup.find((item)=>item.position===slot.preferredPosition&&!used.has(item.id))
      ?? lineup.find((item)=>!used.has(item.id))
    if (!player) return null
    used.add(player.id)
    return toMatchPlayer(player,'home',roleFromSlot(slot),slot.x,slot.y)
  }).filter((player):player is MatchPlayerState=>Boolean(player))
  if (result.length!==11) throw new Error('AI試合用のhome選手を11人配置できません')
  return result
}

function opponentAbilities(strength:number,position:Position) {
  const base=clamp(strength,35,92)
  const values={attack:base,defense:base,speed:base,stamina:base,technique:base,mental:base}
  if (position==='GK') Object.assign(values,{attack:clamp(base-45),defense:clamp(base+8),speed:clamp(base-15),mental:clamp(base+7)})
  if (position==='DF') Object.assign(values,{attack:clamp(base-22),defense:clamp(base+7),stamina:clamp(base+4),mental:clamp(base+3)})
  if (position==='MF') Object.assign(values,{attack:clamp(base-5),defense:clamp(base-5),stamina:clamp(base+5),technique:clamp(base+6),mental:clamp(base+3)})
  if (position==='FW') Object.assign(values,{attack:clamp(base+8),defense:clamp(base-35),speed:clamp(base+7),technique:clamp(base+4)})
  return values
}

function awayPlayers(match: MatchState): MatchPlayerState[] {
  return awayFormation.map((item)=>{
    const point=mirrorPointForAway(item)
    return {
      playerId:item.id,name:item.name,team:'away',position:item.position,role:item.role,
      x:point.x,y:point.y,baseX:point.x,baseY:point.y,targetX:point.x,targetY:point.y,hasBall:false,vx:0,vy:0,decisionCooldown:0,
      actionState:item.role==='GK'?'goalkeeping':'returnToShape',reactionCooldown:0,
      ...opponentAbilities(match.opponent.strength,item.position),condition:100,fatigue:0,currentStamina:100,
    }
  })
}

export function createAiMatchPlayers(match: MatchState,players: Player[]) {
  return [...homePlayers(match,players),...awayPlayers(match)]
}
