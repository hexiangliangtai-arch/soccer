import type { MatchEventType, MatchTeam, PitchPosition } from './game'

export type PlaySequenceType =
  | 'buildUp'
  | 'counter'
  | 'sideAttack'
  | 'centralAttack'
  | 'dribbleBreak'
  | 'pressingWin'
  | 'turnover'
  | 'clearance'

export type TeamIntentType =
  | 'keepPossession'
  | 'buildUp'
  | 'sideAttack'
  | 'centralAttack'
  | 'counter'
  | 'pressing'
  | 'defensiveBlock'
  | 'clearDanger'

export interface TeamIntent {
  id: string
  type: TeamIntentType
  team: MatchTeam
  startedAtSec: number
  preferredZone?: 'left' | 'center' | 'right'
  riskLevel: number
  tempo: 'slow' | 'normal' | 'fast'
}

export type PlayActionType =
  | 'pass'
  | 'receive'
  | 'carry'
  | 'dribble'
  | 'throughPass'
  | 'cross'
  | 'shoot'
  | 'intercept'
  | 'tackle'
  | 'looseBall'
  | 'recover'
  | 'clear'
  | 'supportRun'
  | 'pressure'
  | 'chance'
  | 'block'
  | 'save'
  | 'miss'

export type PlayActionResult =
  | 'success'
  | 'fail'
  | 'intercepted'
  | 'tackled'
  | 'loose'
  | 'recovered'
  | 'goal'
  | 'save'
  | 'miss'
  | 'blocked'

export interface PlayAction {
  id: string
  type: PlayActionType
  team: MatchTeam
  actorPlayerId?: string
  targetPlayerId?: string
  defenderPlayerId?: string
  start: PitchPosition
  end: PitchPosition
  waypoints?: PitchPosition[]
  startTimeSec: number
  endTimeSec: number
  result?: PlayActionResult
  relatedEventType?: MatchEventType
  description?: string
  status?: 'pending' | 'active' | 'completed'
  waypointIndex?: number
  startedAtSec?: number
  lastContestSec?: number
  pressureEmitted?: boolean
  relatedEventId?: string
}

export type PlaySequenceResult =
  | 'chance'
  | 'shot'
  | 'goal'
  | 'turnover'
  | 'cleared'
  | 'lost'
  | 'continued'

// Kept as a compatibility name. A sequence now describes only the team's
// current intention; actions are post-match records, never movement commands.
export interface PlaySequence extends TeamIntent {
  sequenceType?: PlaySequenceType
  startTimeSec: number
  endTimeSec: number
  actions: PlayAction[]
  currentActionIndex: number
  result?: PlaySequenceResult
  description?: string
}
