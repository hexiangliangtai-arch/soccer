import type { MatchPlayerState } from '../types/aiMatch'
import type { MatchHalf, MatchTeam, PitchPosition, TacticId } from '../types/game'
import type { RandomSource } from './random'
import { clamp, distance, getAttackDirection, getGoalPosition, pointOf } from './pitchMath'

export interface PassResolution { success:boolean; receiver:MatchPlayerState; interceptor?:MatchPlayerState }
export interface DribbleResolution { success:boolean; defender?:MatchPlayerState }
export interface ShootResolution { goal:boolean; goalkeeper:MatchPlayerState }
export interface PressureResolution { won:boolean }

function opponentsOf(player: MatchPlayerState,players: MatchPlayerState[]) {
  return players.filter((item)=>item.team!==player.team)
}

function nearestOpponentDistance(point:PitchPosition,team:MatchTeam,players:MatchPlayerState[]) {
  return Math.min(...players.filter((player)=>player.team!==team).map((player)=>distance(player,point)),30)
}

export function choosePassTarget(owner: MatchPlayerState,players: MatchPlayerState[],tacticId:TacticId,random:RandomSource,half:Exclude<MatchHalf,'fullTime'>='first') {
  const direction=getAttackDirection(owner.team,half)
  const candidates=players.filter((player)=>player.team===owner.team&&player.playerId!==owner.playerId&&player.role!=='GK')
  const scored=candidates.map((player)=>{
    const passDistance=distance(owner,player)
    const progress=(player.x-owner.x)*direction
    const safety=nearestOpponentDistance(player,owner.team,players)
    const roleBonus=player.role==='ST'?5:player.role==='AM'||player.role==='WG'?3:0
    const possessionBonus=tacticId==='possession'&&passDistance<24?9:0
    const counterBonus=tacticId==='counter'&&progress>8?10:0
    const defensivePenalty=tacticId==='defensive'&&progress>18?-8:0
    return {player,score:progress*.45+safety*.5-passDistance*.18+roleBonus+possessionBonus+counterBonus+defensivePenalty+random.next()*5}
  }).sort((a,b)=>b.score-a.score)
  return scored[0]?.player
}

export function calculatePassSuccess(passer:MatchPlayerState,target:MatchPlayerState,players:MatchPlayerState[]) {
  const passDistance=distance(passer,target)
  const pressure=opponentsOf(passer,players).filter((player)=>distance(player,passer)<10).length
  const lanePressure=opponentsOf(passer,players).filter((player)=>distance(player,target)<9).length
  return clamp(.48+(passer.technique+passer.mental-120)/220-passDistance/180-pressure*.07-lanePressure*.055,.22,.94)
}

export function calculateInterceptionChance(defender:MatchPlayerState|undefined,target:MatchPlayerState) {
  if (!defender) return 0
  return clamp(.18+(defender.defense+defender.speed-120)/240-distance(defender,target)/130,.08,.72)
}

export function resolvePass(passer:MatchPlayerState,target:MatchPlayerState,players:MatchPlayerState[],random:RandomSource,controlMultiplier=1):PassResolution {
  const defenders=opponentsOf(passer,players).sort((a,b)=>distance(a,target)-distance(b,target))
  const interceptor=defenders[0]
  const successChance=clamp(calculatePassSuccess(passer,target,players)*(1-calculateInterceptionChance(interceptor,target)*.34)*controlMultiplier,.12,.97)
  return random.next()<successChance?{success:true,receiver:target}:{success:false,receiver:target,interceptor}
}

export function resolveDribble(player:MatchPlayerState,target:PitchPosition,players:MatchPlayerState[],random:RandomSource):DribbleResolution {
  const defender=opponentsOf(player,players).sort((a,b)=>distance(a,target)-distance(b,target))[0]
  const defending=defender?defender.defense*.55+defender.speed*.25+defender.mental*.2:55
  const attacking=player.technique*.5+player.speed*.35+player.mental*.15
  const closeDefenderPenalty=nearestOpponentDistance(target,player.team,players)<5?.08:0
  const chance=clamp(.58+(attacking-defending)/180-closeDefenderPenalty,.25,.88)
  return random.next()<chance?{success:true}:{success:false,defender}
}

export function calculateShotSuccess(shooter:MatchPlayerState,goalkeeper:MatchPlayerState,attackMultiplier=1,defenseMultiplier=1,half:Exclude<MatchHalf,'fullTime'>='first') {
  const goal=getGoalPosition(shooter.team,half)
  const goalDistance=distance(shooter,goal)
  const finishing=(shooter.attack*.58+shooter.technique*.27+shooter.mental*.15)*attackMultiplier
  const keeping=(goalkeeper.defense*.65+goalkeeper.mental*.25+goalkeeper.condition*.1)*defenseMultiplier
  return clamp(.12+(finishing-keeping)/190+(34-goalDistance)/135,.035,.58)
}

export function resolveShoot(shooter:MatchPlayerState,goalkeeper:MatchPlayerState,random:RandomSource,attackMultiplier=1,defenseMultiplier=1,half:Exclude<MatchHalf,'fullTime'>='first'):ShootResolution {
  return {goal:random.next()<calculateShotSuccess(shooter,goalkeeper,attackMultiplier,defenseMultiplier,half),goalkeeper}
}

export function resolvePressure(defender:MatchPlayerState,owner:MatchPlayerState,random:RandomSource,pressingBonus=0):PressureResolution {
  const defending=defender.defense*.45+defender.speed*.25+defender.mental*.2+defender.currentStamina*.1+pressingBonus
  const control=owner.technique*.5+owner.speed*.2+owner.mental*.2+owner.currentStamina*.1
  return {won:random.next()<clamp(.24+(defending-control)/170,.08,.62)}
}

export function resolveLooseBall(players:MatchPlayerState[],point:PitchPosition,random:RandomSource) {
  const nearest=[...players].sort((a,b)=>distance(a,point)-distance(b,point)).slice(0,4)
  const weighted=nearest.map((player)=>({player,weight:Math.max(1,player.speed*.5+player.mental*.3+player.currentStamina*.2-distance(player,point)*2)}))
  const total=weighted.reduce((sum,item)=>sum+item.weight,0)
  let roll=random.next()*total
  for (const item of weighted) { roll-=item.weight; if (roll<=0) return item.player }
  return weighted[0]?.player
}

export function forwardDribbleTarget(player:MatchPlayerState,random:RandomSource,tacticId:TacticId,half:Exclude<MatchHalf,'fullTime'>='first'):PitchPosition {
  const direction=getAttackDirection(player.team,half)
  const boost=tacticId==='counter'||tacticId==='attacking'?14:tacticId==='defensive'?7:10
  return {x:clamp(player.x+direction*(boost+random.next()*4),4,96),y:clamp(player.y+(random.next()-.5)*12,6,94)}
}
