import type { LineupSnapshotPlayer, MatchEvent, MatchRecord, PitchPosition, Player, Position, ReplayFrame, ReplayPlayer } from '../types/game'
import { getFormation } from '../data/formations'

const clamp = (value: number) => Math.max(0,Math.min(100,value))
const center: PitchPosition = {x:50,y:50}
const defaultDuration: Record<MatchEvent['type'],number> = {
  matchStart:1400, halfTime:1500, matchEnd:1800, penaltyShootout:1800,
  pass:900, dribble:1100, chance:1200, shoot:1000, goal:1800, save:1300,
  foul:1200, counter:950, pressure:900,
}

export function sortEventsForReplay(events: MatchEvent[] = []) {
  return [...events].sort((a,b)=>a.sequence-b.sequence)
}

export function createAwayLineupSnapshot(): LineupSnapshotPlayer[] {
  return [
    {id:'away-gk-1',name:'相手GK',position:'GK',team:'away'},
    ...Array.from({length:4},(_,index)=>({id:`away-df-${index+1}`,name:`相手DF${index+1}`,position:'DF' as const,team:'away' as const})),
    ...Array.from({length:4},(_,index)=>({id:`away-mf-${index+1}`,name:`相手MF${index+1}`,position:'MF' as const,team:'away' as const})),
    ...Array.from({length:2},(_,index)=>({id:`away-fw-${index+1}`,name:`相手FW${index+1}`,position:'FW' as const,team:'away' as const})),
  ]
}

function fallbackHomeSnapshot(players: Player[]): LineupSnapshotPlayer[] {
  const take = (position: Position,count: number) => players.filter((player)=>player.position===position).slice(0,count)
  return [...take('GK',1),...take('DF',4),...take('MF',4),...take('FW',2)].map((player)=>({
    id:player.id,name:player.name,position:player.position,grade:player.grade,team:'home' as const,
  }))
}

function positionPlayers(players: LineupSnapshotPlayer[],team: 'home'|'away'): ReplayPlayer[] {
  const xByPosition: Record<Position,number> = team==='home'
    ? {GK:8,DF:25,MF:45,FW:70}
    : {GK:92,DF:75,MF:55,FW:30}
  return players.map((player)=>{
    const group=players.filter((item)=>item.position===player.position)
    const index=group.findIndex((item)=>item.id===player.id)
    const y=group.length===1?50:18+index*(64/(group.length-1))
    return {...player,x:xByPosition[player.position],y,label:player.position==='GK'?'GK':String(index+1)}
  })
}

export function createInitialPlayerPositions(record: MatchRecord,players: Player[]) {
  const home=record.homeLineupSnapshot?.length?record.homeLineupSnapshot:fallbackHomeSnapshot(players)
  const away=record.awayLineupSnapshot?.length?record.awayLineupSnapshot:createAwayLineupSnapshot()
  const formationPlayers=record.formationId&&record.lineupAssignments?.length
    ? record.lineupAssignments.map((assignment)=>{
        const player=home.find((item)=>item.id===assignment.playerId); const slot=getFormation(record.formationId!).slots.find((item)=>item.slotId===assignment.slotId)
        return player&&slot?{...player,x:slot.x,y:slot.y,label:slot.label}:null
      }).filter((player):player is ReplayPlayer=>Boolean(player))
    : []
  return [...(formationPlayers.length===11?formationPlayers:positionPlayers(home,'home')),...positionPlayers(away,'away')]
}

function fallbackAwayPlayer(event: MatchEvent,players: ReplayPlayer[]) {
  const desired: Position = event.type==='save'?'GK':event.type==='pass'||event.type==='pressure'?'MF':'FW'
  const candidates=players.filter((player)=>player.team==='away'&&player.position===desired)
  return candidates[event.sequence%Math.max(1,candidates.length)] ?? players.find((player)=>player.team==='away')
}

function resolvePlayerId(id: string|undefined,event: MatchEvent,players: ReplayPlayer[]) {
  if (id&&players.some((player)=>player.id===id)) return id
  return event.team==='away'?fallbackAwayPlayer(event,players)?.id:id
}

function eventBallPosition(event: MatchEvent,previous: PitchPosition) {
  if (event.type==='matchStart'||event.type==='halfTime'||event.type==='matchEnd'||event.type==='penaltyShootout') return center
  const movingToTarget=['pass','dribble','counter','chance','shoot','goal','save'].includes(event.type)
  const point=movingToTarget?(event.targetPosition??event.position):(event.position??event.targetPosition)
  return point?{x:clamp(point.x),y:clamp(point.y)}:previous
}

export function normalizeEventToFrame(event: MatchEvent,previousFrame: ReplayFrame|undefined,initialPlayers: ReplayPlayer[]): ReplayFrame {
  const players=(previousFrame?.players??initialPlayers).map((player)=>({...player}))
  const activePlayerId=resolvePlayerId(event.playerId,event,players)
  const targetPlayerId=event.targetPlayerId&&players.some((player)=>player.id===event.targetPlayerId)?event.targetPlayerId:undefined
  const assistPlayerId=event.assistPlayerId&&players.some((player)=>player.id===event.assistPlayerId)?event.assistPlayerId:undefined
  if (activePlayerId&&event.position) {
    const active=players.find((player)=>player.id===activePlayerId)
    if (active) Object.assign(active,{x:clamp(event.position.x),y:clamp(event.position.y)})
  }
  if (targetPlayerId&&event.targetPosition) {
    const target=players.find((player)=>player.id===targetPlayerId)
    if (target) Object.assign(target,{x:clamp(event.targetPosition.x),y:clamp(event.targetPosition.y)})
  }
  return {
    sequence:event.sequence,minute:event.minute,second:event.second,half:event.half,eventType:event.type,
    description:event.description,durationMs:event.durationMs??defaultDuration[event.type],
    ballPosition:eventBallPosition(event,previousFrame?.ballPosition??center),players,
    activePlayerId,targetPlayerId,assistPlayerId,team:event.team,
  }
}

export function createReplayFrames(record: MatchRecord,players: Player[]): ReplayFrame[] {
  const initialPlayers=createInitialPlayerPositions(record,players)
  return sortEventsForReplay(record.events??[]).reduce<ReplayFrame[]>((frames,event)=>{
    frames.push(normalizeEventToFrame(event,frames.at(-1),initialPlayers))
    return frames
  },[])
}

export function getFrameAtIndex(frames: ReplayFrame[],index: number) {
  if (!frames.length) return undefined
  return frames[Math.max(0,Math.min(frames.length-1,index))]
}
