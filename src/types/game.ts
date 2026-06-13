export type Position = 'GK' | 'DF' | 'MF' | 'FW'
export type GrowthType = 'rapid' | 'steady' | 'lateBloomer'
export type AbilityKey = 'attack' | 'defense' | 'speed' | 'stamina' | 'technique' | 'mental'
export type InjuryStatus = 'healthy' | 'injured'

export interface Player {
  id: string
  name: string
  grade: 1 | 2 | 3
  position: Position
  attack: number
  defense: number
  speed: number
  stamina: number
  technique: number
  mental: number
  condition: number
  fatigue: number
  injury: { status: InjuryStatus; recoveryWeeks: number }
  growthType: GrowthType
  trait?: string
  stats: {
    appearances: number
    goals: number
    assists: number
  }
}

export type TrainingId = 'shooting' | 'defending' | 'running' | 'scrimmage' | 'meeting' | 'rest'

export interface TrainingMenu {
  id: TrainingId
  name: string
  icon: string
  description: string
  effects: Partial<Record<AbilityKey, number>>
  fatigue: number
  condition: number
  injuryChance: number
  favoredPositions?: Position[]
}

export type TacticId = 'balanced' | 'attacking' | 'defensive' | 'counter' | 'possession' | 'pressing'
export type FormationId = '4-4-2' | '4-3-3' | '4-2-3-1' | '3-5-2' | '3-4-2-1'

export interface FormationSlot {
  slotId: string
  label: string
  preferredPosition: Position
  x: number
  y: number
}

export interface LineupAssignment {
  slotId: string
  playerId: string | null
}

export interface FormationDefinition {
  id: FormationId
  name: string
  description: string
  slots: FormationSlot[]
}

export interface Tactic {
  id: TacticId
  name: string
  shortName: string
  description: string
  attack: number
  defense: number
  control: number
  fatigue: number
}

export type MatchHalf = 'first' | 'second' | 'fullTime'
export type MatchTeam = 'home' | 'away'
export type MatchEventType =
  | 'matchStart' | 'halfTime' | 'matchEnd' | 'pass' | 'dribble'
  | 'chance' | 'shoot' | 'goal' | 'save' | 'foul' | 'counter' | 'pressure'
  | 'penaltyShootout'

export interface PitchPosition { x: number; y: number }

export interface MatchEvent {
  id: string
  matchId: string
  sequence: number
  minute: number
  second: number
  half: MatchHalf
  type: MatchEventType
  team: MatchTeam
  playerId?: string
  targetPlayerId?: string
  assistPlayerId?: string
  position?: PitchPosition
  targetPosition?: PitchPosition
  result?: 'success' | 'failed' | 'goal' | 'saved' | 'blocked'
  durationMs?: number
  description: string
}

export interface OpponentTeam {
  id: string
  name: string
  strength: number
  style: string
}

export interface MatchScore { home: number; away: number }

export interface MatchState {
  id: string
  seed: number
  opponent: OpponentTeam
  roundLabel: string
  lineupIds: string[]
  firstHalfTactic: TacticId
  secondHalfTactic?: TacticId
  phase: 'preMatch' | 'halfTime' | 'finished'
  score: MatchScore
  events: MatchEvent[]
  shootoutWinner?: MatchTeam
  formationId?: FormationId
  lineupAssignments?: LineupAssignment[]
}

export interface MatchRecord {
  id: string
  week: number
  opponent: string
  roundLabel: string
  score: MatchScore
  result: 'win' | 'draw' | 'loss'
  events: MatchEvent[]
  scorers: string[]
  goals: GoalRecord[]
  homeLineupSnapshot?: LineupSnapshotPlayer[]
  awayLineupSnapshot?: LineupSnapshotPlayer[]
  firstHalfTactic?: TacticId
  secondHalfTactic?: TacticId
  seed?: number
  formationId?: FormationId
  lineupAssignments?: LineupAssignment[]
}

export interface LineupSnapshotPlayer {
  id: string
  name: string
  position: Position
  team: MatchTeam
  grade?: 1 | 2 | 3
}

export interface ReplayPlayer extends LineupSnapshotPlayer {
  x: number
  y: number
  label: string
}

export interface ReplayFrame {
  sequence: number
  minute: number
  second: number
  half: MatchHalf
  eventType: MatchEventType
  description: string
  durationMs: number
  ballPosition: PitchPosition
  players: ReplayPlayer[]
  activePlayerId?: string
  targetPlayerId?: string
  assistPlayerId?: string
  team: MatchTeam
}

export interface GoalRecord {
  minute: number
  half: MatchHalf
  team: MatchTeam
  scorerId?: string
  assistPlayerId?: string
  scorerName: string
  assistName?: string
}

export interface TournamentState {
  active: boolean
  roundIndex: number
  eliminated: boolean
  champion: boolean
}

export interface GameState {
  version: 1
  teamName: string
  week: number
  players: Player[]
  lineupIds: string[]
  selectedFormation: FormationId
  lineupAssignments: LineupAssignment[]
  tacticId: TacticId
  weekActionCompleted: boolean
  currentMatch: MatchState | null
  matchHistory: MatchRecord[]
  tournament: TournamentState
  logs: string[]
  seasonComplete: boolean
}
