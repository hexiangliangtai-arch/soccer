import { tactics } from '../data/tactics'
import type { FormationId, LineupAssignment, MatchEvent, MatchHalf, MatchState, OpponentTeam, Player, TacticId } from '../types/game'
import { createCommentary } from './eventCommentary'
import { simulateAiHalf } from './aiMatchEngine'
import { simulateContinuousHalf, type ContinuousHalfResult } from './continuousMatchEngine'
import { generateAttackSequence } from './matchEventGenerator'
import { createSeededRandom, randomBetween, randomInt } from './random'

function average(players: Player[], key: keyof Player) {
  const values = players.map((player) => Number(player[key])).filter(Number.isFinite)
  return values.reduce((sum,value)=>sum+value,0) / Math.max(1,values.length)
}

function teamMetrics(players: Player[], tacticId: TacticId) {
  const tactic = tactics.find((item) => item.id === tacticId) ?? tactics[0]
  const fw = players.filter((player)=>player.position==='FW')
  const mf = players.filter((player)=>player.position==='MF')
  const df = players.filter((player)=>player.position==='DF' || player.position==='GK')
  const readiness = Math.max(0.72, Math.min(1.08, 0.74 + average(players,'condition')/320 - average(players,'fatigue')/360))
  let specialAttack = 1
  if (tacticId === 'counter') specialAttack += Math.max(0, average(fw,'speed')-70)/180
  if (tacticId === 'possession') specialAttack += Math.max(0, (average(mf,'technique')+average(mf,'mental'))/2-70)/220
  if (tacticId === 'pressing') specialAttack += Math.max(0, average(players,'stamina')-72)/220
  return {
    attack:(average(fw.length?fw:players,'attack')*0.54 + average(mf.length?mf:players,'technique')*0.28 + average(players,'mental')*0.18) * tactic.attack * specialAttack * readiness,
    defense:(average(df.length?df:players,'defense')*0.65 + average(players,'mental')*0.2 + average(players,'stamina')*0.15) * tactic.defense * readiness,
    control:(average(mf.length?mf:players,'technique')*0.55 + average(players,'stamina')*0.25 + average(players,'mental')*0.2) * tactic.control * readiness,
    tactic,
  }
}

export function createMatch(players: Player[], lineupIds: string[], opponent: OpponentTeam, tactic: TacticId, roundLabel: string, seed = Date.now(),setup?:{formationId:FormationId;lineupAssignments:LineupAssignment[]}): MatchState {
  const lineup = players.filter((player)=>lineupIds.includes(player.id))
  if (lineup.length !== 11) throw new Error('試合開始には有効なスタメン11人が必要です')
  const id = `match-${seed}-${opponent.id}`
  const start: MatchEvent = { id:`${id}-e0`, matchId:id, sequence:0, minute:0, second:0, half:'first', type:'matchStart', team:'home', durationMs:1400, description:createCommentary({type:'matchStart',half:'first',minute:0,team:'home',opponentName:opponent.name}) }
  return { id, seed, opponent, roundLabel, lineupIds:[...lineupIds], firstHalfTactic:tactic, phase:'preMatch', score:{home:0,away:0}, events:[start],formationId:setup?.formationId,lineupAssignments:setup?.lineupAssignments.map((assignment)=>({...assignment})) }
}

export function simulateHalf(match: MatchState, allPlayers: Player[], tacticId: TacticId): MatchState {
  const half: Exclude<MatchHalf,'fullTime'> = match.phase === 'preMatch' ? 'first' : 'second'
  const startMinute = half === 'first' ? 4 : 49
  const endMinute = half === 'first' ? 44 : 89
  const seedOffset = half === 'first' ? 17 : 7919
  const random = createSeededRandom(match.seed + seedOffset + tacticId.length * 101)
  const players = allPlayers.filter((player)=>match.lineupIds.includes(player.id))
  const home = teamMetrics(players,tacticId)
  const opponent = match.opponent.strength
  const possession = Math.max(0.3,Math.min(0.7, 0.5 + (home.control-opponent)/180))
  let additions: MatchEvent[]
  let continuous: ContinuousHalfResult | undefined
  try {
    continuous=simulateContinuousHalf(match,allPlayers,tacticId)
    additions=continuous.events
  } catch {
    // Preserve completed seasons if the experimental sequence layer cannot simulate this match.
    try {
      additions=simulateAiHalf(match,allPlayers,tacticId)
    } catch {
      // Last-resort compatibility path for old saves and malformed AI state.
      const sequenceCount = randomInt(random,7,10)
      additions=[]
      let sequence = match.events.length
      const minutes = Array.from({length:sequenceCount},()=>randomInt(random,startMinute,endMinute)).sort((a,b)=>a-b)
      minutes.forEach((minute) => {
        const team = random.next() < possession ? 'home' : 'away'
        const attackValue = team === 'home' ? home.attack : opponent * randomBetween(random,0.92,1.08)
        const defenseValue = team === 'home' ? opponent : home.defense
        const chance = Math.max(0.08,Math.min(0.46,0.2 + (attackValue-defenseValue)/175))
        const generated = generateAttackSequence({match,players,half,minute,team,random,tactic:home.tactic},sequence,chance)
        additions.push(...generated)
        sequence += generated.length
      })
      const boundaryType = half === 'first' ? 'halfTime' : 'matchEnd'
      const boundaryMinute = half === 'first' ? 45 : 90
      additions.push({
        id:`${match.id}-e${sequence}`, matchId:match.id, sequence, minute:boundaryMinute, second:0, half,
        type:boundaryType, team:'home', durationMs:boundaryType==='matchEnd'?1800:1500, description:createCommentary({type:boundaryType,half,minute:boundaryMinute,team:'home',opponentName:match.opponent.name}),
      })
    }
  }
  const events = [...match.events,...additions]
  const score = events.reduce((value,item) => {
    if (item.type === 'goal') value[item.team]++
    return value
  },{home:0,away:0})
  let shootoutWinner = match.shootoutWinner
  if (half === 'second' && match.roundLabel.startsWith('県大会') && score.home === score.away) {
    shootoutWinner = random.next() < Math.max(0.35,Math.min(0.65,0.5+(home.tactic.control-1)*0.2)) ? 'home' : 'away'
    const shootoutEvent:MatchEvent={
      id:`${match.id}-e${events.length}`, matchId:match.id, sequence:events.length, minute:90, second:0, half:'fullTime',
      type:'penaltyShootout', team:shootoutWinner,
      durationMs:1800,
      description:`90分を終えて同点。PK戦の末、${shootoutWinner==='home'?'青葉高校':match.opponent.name}が勝ち上がりました。`,
    }
    events.push(shootoutEvent)
    const finalFrame=continuous?.frames[continuous.frames.length-1]
    if(finalFrame)finalFrame.eventIds=[...(finalFrame.eventIds??[]),shootoutEvent.id]
  }
  return {
    ...match, events, score, shootoutWinner,
    frames:continuous?[...(match.frames??[]),...continuous.frames]:match.frames,
    framePlayerIds:continuous?.framePlayerIds??match.framePlayerIds,
    framePlayerTeams:continuous?.framePlayerTeams??match.framePlayerTeams,
    secondHalfTactic: half === 'second' ? tacticId : match.secondHalfTactic,
    phase: half === 'first' ? 'halfTime' : 'finished',
  }
}

export function applyMatchFatigue(players: Player[], match: MatchState): Player[] {
  return players.map((player) => match.lineupIds.includes(player.id) ? {
    ...player,
    fatigue:player.fatigue,
    condition:player.condition,
  } : player)
}
