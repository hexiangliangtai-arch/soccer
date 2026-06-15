import type { MatchPlayerState, MatchWorldState, PlayerRole, PlayerZone, TacticalPhase, ZoneFlexLevel } from '../types/aiMatch'
import type { MatchTeam, PitchPosition } from '../types/game'
import { clamp, distance, getAttackDirection, getDefendingGoalPosition, getGoalPosition } from './pitchMath'

const zoneSize:Record<PlayerRole,{x:number;y:number}>={
  GK:{x:5,y:12},CB:{x:10,y:13},FB:{x:16,y:10},WB:{x:22,y:9},
  DM:{x:13,y:14},CM:{x:16,y:16},AM:{x:17,y:16},WG:{x:20,y:10},ST:{x:15,y:15},
}

export function createPlayerZone(role:PlayerRole,center:PitchPosition):PlayerZone {
  const size=zoneSize[role]
  return {
    minX:clamp(center.x-size.x,2,98),maxX:clamp(center.x+size.x,2,98),
    minY:clamp(center.y-size.y,3,97),maxY:clamp(center.y+size.y,3,97),
    centerX:center.x,centerY:center.y,
  }
}

function moveZone(zone:PlayerZone,dx:number,dy:number,stretchX=1,stretchY=1):PlayerZone {
  const halfX=Math.min(45,(zone.maxX-zone.minX)*.5*stretchX)
  const halfY=Math.min(45,(zone.maxY-zone.minY)*.5*stretchY)
  const centerX=clamp(zone.centerX+dx,2+halfX,98-halfX)
  const centerY=clamp(zone.centerY+dy,3+halfY,97-halfY)
  return {minX:centerX-halfX,maxX:centerX+halfX,minY:centerY-halfY,maxY:centerY+halfY,centerX,centerY}
}

function scoreDiff(world:MatchWorldState,team:MatchTeam) {
  return team==='home'?world.homeScore-world.awayScore:world.awayScore-world.homeScore
}

function latestEventIs(world:MatchWorldState,types:string[],seconds=14) {
  const latest=[...world.events].reverse().find((event)=>types.includes(event.type))
  if(!latest)return false
  return world.timeSec-(latest.minute*60+latest.second)<=seconds
}

export function detectTacticalPhase(world:MatchWorldState,team:MatchTeam):TacticalPhase {
  const ownsBall=world.ball.ownerTeam===team
  const direction=getAttackDirection(team,world.half)
  const ownGoal=getDefendingGoalPosition(team,world.half)
  const attackGoal=getGoalPosition(team,world.half)
  const ownGoalDanger=Math.abs(world.ball.x-ownGoal.x)<27
  const attackGoalPressure=Math.abs(world.ball.x-attackGoal.x)<25
  const late=world.minute>=75
  const difference=scoreDiff(world,team)
  const tactic=team==='home'?world.tacticId:'balanced'
  const brokenPlay=['loose','deflection'].includes(world.ball.mode)
  const setPieceLike=brokenPlay||world.ball.kickType==='cross'||latestEventIs(world,['cross','chance'],12)

  if(brokenPlay)return 'looseBall'
  if(!ownsBall&&ownGoalDanger&&setPieceLike)return 'setPieceDefense'
  if(ownsBall&&attackGoalPressure&&setPieceLike)return 'setPieceAttack'
  if(late&&difference<0)return 'allOutAttack'
  if(late&&difference>0)return 'protectLead'
  if(!ownsBall&&ownGoalDanger)return 'deepDefense'
  if(ownsBall&&(world.counterTeam===team||world.teamIntents[team]?.type==='counter'))return 'counter'
  if(!ownsBall&&tactic==='pressing'&&Math.abs(world.ball.x-ownGoal.x)>42)return 'highPress'
  if(!ownsBall&&(tactic==='defensive'||world.teamIntents[team]?.type==='defensiveBlock')&&direction*(world.ball.x-ownGoal.x)<58)return 'deepDefense'
  if(ownsBall)return 'attack'
  if(world.ball.ownerTeam&&world.ball.ownerTeam!==team)return 'defense'
  return 'normal'
}

function flexForPhase(phase:TacticalPhase,role:PlayerRole):ZoneFlexLevel {
  if(role==='GK')return 'strict'
  if(['setPieceAttack','setPieceDefense','allOutAttack','looseBall'].includes(phase))return 'free'
  if(['deepDefense','counter','protectLead','highPress'].includes(phase))return 'wide'
  return 'normal'
}

function attackingCenterBack(player:MatchPlayerState,world:MatchWorldState,limit:number) {
  return world.players.filter((item)=>item.team===player.team&&item.role==='CB').sort((a,b)=>a.playerId.localeCompare(b.playerId)).slice(0,limit).some((item)=>item.playerId===player.playerId)
}

export function createDynamicZone(player:MatchPlayerState,world:MatchWorldState,phase=detectTacticalPhase(world,player.team)):PlayerZone {
  const base=player.baseZone??createPlayerZone(player.role,{x:player.baseX,y:player.baseY})
  const direction=getAttackDirection(player.team,world.half)
  const attacking=player.team===world.ball.ownerTeam
  const ballSlide=(world.ball.y-50)*(attacking?.16:.3)
  let push=0;let lateral=ballSlide;let stretchX=1;let stretchY=1

  if(phase==='attack')push=player.role==='ST'?10:player.role==='WG'||player.role==='WB'?8:player.role==='FB'||player.role==='AM'?6:4
  if(phase==='defense')push=player.role==='ST'?-7:player.role==='WG'||player.role==='AM'?-9:-6
  if(phase==='counter') {push=player.role==='ST'||player.role==='WG'?18:player.role==='AM'||player.role==='CM'?11:player.role==='WB'?9:2;stretchX=1.35}
  if(phase==='highPress') {push=player.role==='ST'||player.role==='WG'?12:player.position==='MF'||player.role==='AM'?8:3;stretchX=1.25}
  if(phase==='deepDefense') {push=player.role==='ST'?-24:player.position==='MF'?-18:player.role==='CB'?-7:-12;stretchX=1.25;stretchY=.78;lateral*=1.25}
  if(phase==='protectLead') {push=player.role==='ST'?-20:player.position==='MF'?-15:player.role==='CB'?-6:-10;stretchX=1.15;stretchY=.82;lateral*=1.15}
  if(phase==='allOutAttack') {push=player.role==='CB'?(attackingCenterBack(player,world,2)?30:10):player.role==='GK'?0:player.position==='DF'?18:player.position==='MF'?17:13;stretchX=1.45;stretchY=1.08}
  if(phase==='setPieceAttack') {push=player.role==='CB'?(attackingCenterBack(player,world,2)?48:8):player.role==='GK'?0:player.position==='MF'?16:player.role==='ST'?10:20;stretchX=player.role==='CB'?1.45:1.2;stretchY=1.15;lateral*=.35}
  if(phase==='setPieceDefense') {push=player.role==='ST'?-29:player.position==='MF'?-23:player.role==='CB'?-9:-15;stretchX=1.2;stretchY=.72;lateral*=.75}
  if(phase==='looseBall') {push=direction*(world.ball.x-base.centerX)*.22;stretchX=1.65;stretchY=1.35;lateral=(world.ball.y-base.centerY)*.32}

  if(player.role==='GK') {
    const ownGoal=getDefendingGoalPosition(player.team,world.half)
    const center={...base,centerX:ownGoal.x+direction*7,centerY:clamp(50+(world.ball.y-50)*.22,39,61)}
    return moveZone(center,0,0,.72,.7)
  }
  if(['FB','WB','WG'].includes(player.role)) {
    stretchX*=attacking?1.28:1.08
    stretchY*=.92
    if(attacking&&phase!=='setPieceAttack')lateral*=.45
  }
  if(['CB','DM'].includes(player.role))stretchY*=1.08
  return moveZone(base,direction*push,lateral,stretchX,stretchY)
}

export function createEmergencyZone(player:MatchPlayerState,world:MatchWorldState,phase:TacticalPhase,dynamic:PlayerZone):PlayerZone|undefined {
  const direction=getAttackDirection(player.team,world.half)
  const ownGoal=getDefendingGoalPosition(player.team,world.half)
  const attackGoal=getGoalPosition(player.team,world.half)
  if(['deepDefense','protectLead','setPieceDefense'].includes(phase)) {
    const depth=player.role==='CB'?9:player.position==='MF'?17:player.role==='ST'?28:13
    const center={...dynamic,centerX:clamp(ownGoal.x+direction*depth,4,96),centerY:clamp(50+(world.ball.y-50)*.42,18,82)}
    return moveZone(center,0,0,phase==='setPieceDefense'?.72:.9,phase==='setPieceDefense'?.68:.82)
  }
  if(phase==='setPieceAttack'&&player.role==='CB'&&attackingCenterBack(player,world,2)) {
    const lane=(player.playerId.charCodeAt(player.playerId.length-1)%2===0?-1:1)
    const center={...dynamic,centerX:attackGoal.x-direction*12,centerY:50+lane*10}
    return moveZone(center,0,0,.7,.72)
  }
  if(phase==='allOutAttack'&&player.role==='CB'&&attackingCenterBack(player,world,1)) {
    const center={...dynamic,centerX:attackGoal.x-direction*22,centerY:clamp(50+(world.ball.y-50)*.35,25,75)}
    return moveZone(center,0,0,.9,.9)
  }
  return undefined
}

export function updatePlayerZone(player:MatchPlayerState,world:MatchWorldState,knownPhase?:TacticalPhase):PlayerZone {
  const phase=knownPhase??detectTacticalPhase(world,player.team)
  const dynamic=createDynamicZone(player,world,phase)
  const emergency=createEmergencyZone(player,world,phase,dynamic)
  player.tacticalPhase=phase
  player.zoneFlex=flexForPhase(phase,player.role)
  player.dynamicZone=dynamic
  player.emergencyZone=emergency
  return emergency??dynamic
}

function clampToZone(point:PitchPosition,zone:PlayerZone):PitchPosition {
  return {x:clamp(point.x,zone.minX,zone.maxX),y:clamp(point.y,zone.minY,zone.maxY)}
}

function candidateScore(player:MatchPlayerState,point:PitchPosition,world:MatchWorldState) {
  const teammates=world.players.filter((item)=>item.team===player.team&&item.playerId!==player.playerId)
  const nearestMate=Math.min(...teammates.map((item)=>distance(item,point)),30)
  const nearestTarget=Math.min(...teammates.map((item)=>distance({x:item.targetX,y:item.targetY},point)),30)
  const direction=getAttackDirection(player.team,world.half)
  const attacking=player.team===world.ball.ownerTeam
  const ballDistance=distance(point,world.ball)
  const phase=player.tacticalPhase??'normal'
  const idealBallDistance=player.actionState==='support'?10:phase==='deepDefense'?13:player.role==='ST'?20:16
  const spacing=Math.min(nearestMate,13)*1.5-(nearestMate<4.2?(4.2-nearestMate)*9:0)
  const ballFit=-Math.abs(ballDistance-idealBallDistance)*.16
  const roleProgress=attacking?(point.x-player.x)*direction*.08:0
  const laneBonus=['WG','FB','WB'].includes(player.role)?Math.abs(point.y-50)*.045:0
  const targetCrowding=nearestTarget<4?(4-nearestTarget)*4:0
  return spacing+ballFit+roleProgress+laneBonus-targetCrowding
}

export function chooseZoneTarget(player:MatchPlayerState,world:MatchWorldState):PitchPosition {
  const zone=player.currentZone??updatePlayerZone(player,world)
  const refreshOffset=[...player.playerId].reduce((sum,char)=>sum+char.charCodeAt(0),0)%60
  const stateJustChanged=player.actionStartedAt===world.timeSec
  if(!stateJustChanged&&world.stepIndex>0&&(world.stepIndex+refreshOffset)%60!==0&&Number.isFinite(player.targetX)&&Number.isFinite(player.targetY)) {
    return clampToZone({x:player.targetX,y:player.targetY},zone)
  }
  const desired=player.desiredPosition?clampToZone(player.desiredPosition,zone):undefined
  const phase=world.timeSec/8+player.playerId.length*1.7
  const candidates:PitchPosition[]=[
    {x:zone.centerX,y:zone.centerY},
    {x:zone.minX+(zone.maxX-zone.minX)*.2,y:zone.minY+(zone.maxY-zone.minY)*.25},
    {x:zone.maxX-(zone.maxX-zone.minX)*.2,y:zone.maxY-(zone.maxY-zone.minY)*.25},
    {x:zone.minX+(zone.maxX-zone.minX)*.7,y:zone.minY+(zone.maxY-zone.minY)*.3},
    {x:zone.centerX+Math.sin(phase)*(zone.maxX-zone.minX)*.36,y:zone.centerY+Math.cos(phase*.83)*(zone.maxY-zone.minY)*.38},
  ]
  if(desired)candidates.push(desired)
  let best=clampToZone(candidates[0],zone);let bestScore=candidateScore(player,best,world)
  for(let index=1;index<candidates.length;index++) {
    const point=clampToZone(candidates[index],zone);const score=candidateScore(player,point,world)
    if(score>bestScore){best=point;bestScore=score}
  }
  return best
}

export function separateTeammates(players:MatchPlayerState[]) {
  const result=players.map((player)=>({...player}))
  for(const team of ['home','away'] as const) {
    const teammates=result.filter((player)=>player.team===team)
    for(let first=0;first<teammates.length;first++)for(let second=first+1;second<teammates.length;second++) {
      const a=teammates[first];const b=teammates[second]
      const gap=distance(a,b)
      if(gap>=3.4)continue
      const dx=a.x-b.x;const dy=a.y-b.y
      const signX=dx===0?(a.playerId<b.playerId?-1:1):Math.sign(dx)
      const signY=dy===0?(a.playerId<b.playerId?1:-1):Math.sign(dy)
      const shift=(3.4-gap)*.2
      a.x=clamp(a.x+signX*shift*.45,a.currentZone?.minX??2,a.currentZone?.maxX??98)
      b.x=clamp(b.x-signX*shift*.45,b.currentZone?.minX??2,b.currentZone?.maxX??98)
      a.y=clamp(a.y+signY*shift,a.currentZone?.minY??3,a.currentZone?.maxY??97)
      b.y=clamp(b.y-signY*shift,b.currentZone?.minY??3,b.currentZone?.maxY??97)
    }
  }
  return result
}
