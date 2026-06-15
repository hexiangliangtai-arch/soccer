import type { LineupSnapshotPlayer, MatchEvent, MatchRecord, PitchPosition, Player, Position, ReplayFrame, ReplayPlayer } from '../types/game'
import { getFormation } from '../data/formations'

const clamp = (value: number) => Math.max(0,Math.min(100,value))
const center: PitchPosition = {x:50,y:50}
const defaultDuration: Record<MatchEvent['type'],number> = {
  matchStart:1400, halfTime:1500, matchEnd:1800, penaltyShootout:1800,
  pass:900, dribble:1100, chance:1200, shoot:1000, goal:1800, save:1300,
  foul:1200, counter:950, pressure:900,
  throughPass:950,cross:1100,intercept:1000,tackle:1000,looseBall:800,
  recover:850,clear:1000,miss:1000,block:1100,
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
  const desired: Position = event.type==='save'?'GK':['pass','throughPass','cross','pressure','intercept','tackle','recover','clear'].includes(event.type)?'MF':'FW'
  const candidates=players.filter((player)=>player.team==='away'&&player.position===desired)
  return candidates[event.sequence%Math.max(1,candidates.length)] ?? players.find((player)=>player.team==='away')
}

function resolvePlayerId(id: string|undefined,event: MatchEvent,players: ReplayPlayer[]) {
  if (id&&players.some((player)=>player.id===id)) return id
  return event.team==='away'?fallbackAwayPlayer(event,players)?.id:id
}

function eventBallPosition(event: MatchEvent,previous: PitchPosition) {
  if (event.type==='matchStart'||event.type==='halfTime'||event.type==='matchEnd'||event.type==='penaltyShootout') return center
  const movingToTarget=['pass','throughPass','cross','dribble','counter','chance','shoot','goal','save','clear','miss','block'].includes(event.type)
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

function createContinuousReplayFrames(record:MatchRecord,players:Player[]):ReplayFrame[] {
  const storedFrames=record.frames??[]
  const playerIds=record.framePlayerIds??[]
  const playerTeams=record.framePlayerTeams??[]
  if (!storedFrames.length||playerIds.length!==22||playerTeams.length!==playerIds.length) return []

  const initialPlayers=createInitialPlayerPositions(record,players)
  const initialById=new Map(initialPlayers.map((player)=>[player.id,player]))
  const eventsById=new Map((record.events??[]).map((event)=>[event.id,event]))
  let latestEvent=sortEventsForReplay(record.events??[]).find((event)=>event.type==='matchStart')

  return [...storedFrames].sort((a,b)=>a.frameIndex-b.frameIndex).map((stored)=>{
    const frameEvents=(stored.eventIds??[]).map((id)=>eventsById.get(id)).filter((event):event is MatchEvent=>Boolean(event))
    latestEvent=frameEvents.at(-1)??latestEvent
    const ownerId=stored.ball[2]>=0?playerIds[stored.ball[2]]:undefined
    const replayPlayers=stored.players.map((point,index):ReplayPlayer=>{
      const id=playerIds[index]??`unknown-${index}`
      const initial=initialById.get(id)
      const team=playerTeams[index]??(id.startsWith('away-')?'away':'home')
      return {
        id,name:initial?.name??(team==='home'?'青葉高校選手':`相手選手${index+1}`),
        position:initial?.position??'MF',grade:initial?.grade,team,
        x:clamp(point[0]),y:clamp(point[1]),label:initial?.label??(initial?.position==='GK'?'GK':String(index+1)),
      }
    })
    return {
      sequence:stored.frameIndex,minute:stored.minute,second:stored.second,half:stored.half,
      eventType:latestEvent?.type??'matchStart',description:latestEvent?.description??'試合が進んでいます。',
      durationMs:50,ballPosition:{x:clamp(stored.ball[0]),y:clamp(stored.ball[1])},players:replayPlayers,
      activePlayerId:ownerId??latestEvent?.playerId,targetPlayerId:latestEvent?.targetPlayerId,assistPlayerId:latestEvent?.assistPlayerId,
      team:latestEvent?.team??stored.possessionTeam??'home',homeScore:stored.homeScore,awayScore:stored.awayScore,
      possessionTeam:stored.possessionTeam,eventIds:stored.eventIds??[],continuous:true,
    }
  })
}

export function createReplayFrames(record: MatchRecord,players: Player[]): ReplayFrame[] {
  const continuous=createContinuousReplayFrames(record,players)
  if (continuous.length) return continuous
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
