import type { MatchEvent, MatchFrame, MatchHalf, MatchTeam, PitchPosition, Position, TacticId } from './game'
import type { PlayAction, PlaySequence, TeamIntent, TeamIntentType } from './playSequence'

export type PlayerRole = 'GK' | 'CB' | 'FB' | 'WB' | 'DM' | 'CM' | 'AM' | 'WG' | 'ST'

export type AiActionType =
  | 'hold' | 'move' | 'support' | 'press' | 'return'
  | 'pass' | 'dribble' | 'shoot' | 'save' | 'intercept'
  | 'tackle' | 'clear' | 'looseBall'

export type PlayerActionState =
  | 'idle'
  | 'returnToShape'
  | 'support'
  | 'runIntoSpace'
  | 'receivePass'
  | 'carryBall'
  | 'dribble'
  | 'press'
  | 'cover'
  | 'mark'
  | 'intercept'
  | 'tackle'
  | 'recoverLooseBall'
  | 'prepareShot'
  | 'shoot'
  | 'goalkeeping'

export type BallMode = 'owned' | 'pass' | 'shot' | 'deflection' | 'loose' | 'saved' | 'outOfPlay'

export interface MatchPlayerState {
  playerId: string
  name: string
  team: MatchTeam
  position: Position
  role: PlayerRole
  x: number
  y: number
  baseX: number
  baseY: number
  targetX: number
  targetY: number
  hasBall: boolean
  attack: number
  defense: number
  speed: number
  stamina: number
  technique: number
  mental: number
  condition: number
  fatigue: number
  currentStamina: number
  vx: number
  vy: number
  decisionCooldown: number
  markingPlayerId?: string
  actionState: PlayerActionState
  intent?: TeamIntentType
  focusPlayerId?: string
  focusBall?: boolean
  desiredPosition?: PitchPosition
  receivePoint?: PitchPosition
  runDirection?: PitchPosition
  actionStartedAt?: number
  actionStartPosition?: PitchPosition
  reactionCooldown?: number
}

export interface BallState extends PitchPosition {
  ownerPlayerId: string | null
  ownerTeam: MatchTeam | null
  isLoose: boolean
  targetX?: number
  targetY?: number
  vx: number
  vy: number
  mode: BallMode
  lastTouchPlayerId?: string
  lastTouchTeam?: MatchTeam
  intendedReceiverId?: string
  kickStartedAtSec?: number
  kickFrom?: PitchPosition
  kickType?: 'pass' | 'throughPass' | 'cross' | 'shoot' | 'clear'
  shooterPlayerId?: string
  travelDistance?: number
}

export interface AiMatchState {
  matchId: string
  half: Exclude<MatchHalf, 'fullTime'>
  minute: number
  second: number
  stepIndex: number
  homeScore: number
  awayScore: number
  possessionTeam: MatchTeam
  players: MatchPlayerState[]
  ball: BallState
  events: MatchEvent[]
  currentSequence: number
  tacticId: TacticId
  lastPasserId: string | null
  lastPassTeam: MatchTeam | null
}

export interface AiDecision {
  type: Extract<AiActionType, 'pass' | 'dribble' | 'shoot' | 'hold'>
  playerId: string
  targetPlayerId?: string
  targetPosition?: PitchPosition
}

export interface TeamAiContext {
  team: MatchTeam
  tacticId: TacticId
  attackDirection: 1 | -1
  ownGoal: PitchPosition
  opponentGoal: PitchPosition
}

export type BallMotionType = 'pass' | 'shoot'

export interface BallMotion {
  type: BallMotionType
  team: MatchTeam
  actorPlayerId: string
  targetPlayerId?: string
  receiverPlayerId?: string
  goalkeeperPlayerId?: string
  from: PitchPosition
  to: PitchPosition
  elapsed: number
  duration: number
  willScore?: boolean
}

export interface DribbleMotion {
  playerId: string
  from: PitchPosition
  to: PitchPosition
  elapsed: number
  duration: number
  success: boolean
  defenderPlayerId?: string
}

export interface MatchWorldState extends AiMatchState {
  timeSec: number
  frames: MatchFrame[]
  frameEventIds: string[]
  ballMotion: BallMotion | null
  dribbleMotion: DribbleMotion | null
  counterTeam: MatchTeam | null
  looseBallTicks: number
  activeSequence?: PlaySequence
  completedSequences: PlaySequence[]
  sequenceTargets: Record<string,PitchPosition>
  nextSequenceTimeSec: number
  teamIntents: Record<MatchTeam,TeamIntent>
  recordedActions: PlayAction[]
  lastEventState?: string
}
