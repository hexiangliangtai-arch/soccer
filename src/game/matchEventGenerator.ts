import type { MatchEvent, MatchHalf, MatchState, MatchTeam, Player, Tactic } from '../types/game'
import type { RandomSource } from './random'
import { createCommentary } from './eventCommentary'
import { pickOne, randomInt } from './random'

interface EventContext {
  match: MatchState
  players: Player[]
  half: Exclude<MatchHalf, 'fullTime'>
  minute: number
  team: MatchTeam
  random: RandomSource
  tactic: Tactic
}

const coords = (random: RandomSource, attackingX: number) => ({ x:Math.max(0,Math.min(100,attackingX + randomInt(random,-7,7))), y:randomInt(random,12,88) })

const durationByType: Partial<Record<MatchEvent['type'],number>> = {pass:900,dribble:1100,counter:950,pressure:900,chance:1200,shoot:1000,goal:1800,save:1300,foul:1200}

function awayPlayerId(type: MatchEvent['type'],sequence: number) {
  if (type==='save') return 'away-gk-1'
  if (type==='pass'||type==='pressure') return `away-mf-${sequence%4+1}`
  return `away-fw-${sequence%2+1}`
}

function preferredPlayer(players: Player[], positions: Player['position'][], random: RandomSource) {
  const pool = players.filter((player) => positions.includes(player.position))
  return pickOne(random, pool.length ? pool : players)
}

function event(context: EventContext, type: MatchEvent['type'], sequence: number, player?: Player, target?: Player, result?: MatchEvent['result'], x = 50, assist?: Player, actorId?: string, targetId?: string): MatchEvent {
  const { match, half, minute, team, random } = context
  const second = randomInt(random,0,59)
  return {
    id:`${match.id}-e${sequence}`, matchId:match.id, sequence, minute, second, half, type, team,
    playerId:player?.id ?? actorId ?? (team === 'away' ? awayPlayerId(type,sequence) : undefined),
    targetPlayerId:target?.id ?? targetId,
    assistPlayerId:assist?.id,
    position:coords(random, team === 'home' ? x : 100-x),
    targetPosition:coords(random, team === 'home' ? Math.min(100,x+18) : Math.max(0,82-x)),
    result,
    durationMs:durationByType[type],
    description:createCommentary({ type, half, minute, team, player, target, assist, opponentName:match.opponent.name, result }),
  }
}

export function generateAttackSequence(context: EventContext, startSequence: number, scoringChance: number): MatchEvent[] {
  const { players, random, team, tactic } = context
  const events: MatchEvent[] = []
  const home = team === 'home'
  const midfielder = home ? preferredPlayer(players,['MF','DF'],random) : undefined
  const attacker = home ? preferredPlayer(players,['FW','MF'],random) : undefined
  const keeper = home ? preferredPlayer(players,['GK'],random) : undefined
  const awayMidfielderId = home ? undefined : `away-mf-${startSequence%4+1}`
  const awayAttackerId = home ? undefined : `away-fw-${startSequence%2+1}`
  const assistPool = home ? players.filter((player)=>player.id!==attacker?.id&&(player.position==='MF'||player.position==='FW')) : []
  const assist = home && assistPool.length && random.next() >= 0.2 ? pickOne(random,assistPool) : undefined
  const buildupType = tactic.id === 'counter' ? 'counter' : tactic.id === 'pressing' ? 'pressure' : random.next() < 0.6 ? 'pass' : 'dribble'
  events.push(event(context,buildupType,startSequence,midfielder,attacker,'success',38,undefined,awayMidfielderId,awayAttackerId))
  if (random.next() < 0.22) return events
  events.push(event(context,'chance',startSequence+1,attacker,undefined,'success',72,undefined,awayAttackerId))
  if (random.next() < 0.14) {
    events.push(event(context,'foul',startSequence+2,attacker,undefined,'failed',78,undefined,awayAttackerId))
    return events
  }
  events.push(event(context,'shoot',startSequence+2,attacker,undefined,'success',86,undefined,awayAttackerId))
  if (random.next() < scoringChance) {
    events.push(event(context,'goal',startSequence+3,attacker,undefined,'goal',96,assist,awayAttackerId))
  } else {
    const defendingContext = { ...context, team:home ? 'away' as const : 'home' as const }
    events.push(event(defendingContext,'save',startSequence+3,home ? undefined : keeper,undefined,'saved',2,undefined,home?'away-gk-1':undefined))
  }
  return events
}
