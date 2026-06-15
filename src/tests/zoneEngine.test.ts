import { describe,expect,it } from 'vitest'
import { createDynamicZone, createPlayerZone, detectTacticalPhase, separateTeammates } from '../game/zoneEngine'
import type { MatchPlayerState, MatchWorldState } from '../types/aiMatch'

describe('zone movement',()=>{
  it('gives wide roles broader working zones than goalkeepers',()=>{
    const goalkeeper=createPlayerZone('GK',{x:8,y:50})
    const wingback=createPlayerZone('WB',{x:45,y:15})
    expect(wingback.maxX-wingback.minX).toBeGreaterThan(goalkeeper.maxX-goalkeeper.minX)
    expect(goalkeeper.minX).toBeGreaterThanOrEqual(2)
    expect(goalkeeper.maxY).toBeLessThanOrEqual(97)
  })

  it('separates teammates occupying the same point while keeping them in their zones',()=>{
    const zone=createPlayerZone('CM',{x:50,y:50})
    const player=(id:string)=>({playerId:id,team:'home',x:50,y:50,currentZone:zone} as MatchPlayerState)
    const separated=separateTeammates([player('home-a'),player('home-b')])
    expect(separated[0].y).not.toBe(separated[1].y)
    separated.forEach((item)=>{
      expect(item.y).toBeGreaterThanOrEqual(zone.minY)
      expect(item.y).toBeLessThanOrEqual(zone.maxY)
    })
  })

  it('drops forwards into a deep defensive block near their own goal',()=>{
    const player={playerId:'home-st',team:'home',position:'FW',role:'ST',baseX:73,baseY:50,x:73,y:50} as MatchPlayerState
    const world={
      half:'first',minute:60,timeSec:3600,homeScore:0,awayScore:0,tacticId:'balanced',counterTeam:null,
      ball:{x:12,y:44,ownerTeam:'away',ownerPlayerId:'away-st',mode:'owned'},players:[player],events:[],teamIntents:{home:{type:'buildUp'},away:{type:'attack'}},
    } as unknown as MatchWorldState
    const phase=detectTacticalPhase(world,'home')
    const zone=createDynamicZone(player,world,phase)
    expect(phase).toBe('deepDefense')
    expect(zone.centerX).toBeLessThan(player.baseX-15)
  })

  it('sends selected center backs forward only for late all-out attack or set-piece pressure',()=>{
    const centerBack=(id:string)=>({playerId:id,team:'home',position:'DF',role:'CB',baseX:23,baseY:id==='cb-a'?40:60,x:23,y:50,baseZone:createPlayerZone('CB',{x:23,y:50})} as MatchPlayerState)
    const players=[centerBack('cb-a'),centerBack('cb-b')]
    const world={
      half:'first',minute:82,timeSec:4920,homeScore:0,awayScore:1,tacticId:'balanced',counterTeam:null,
      ball:{x:78,y:50,ownerTeam:'home',ownerPlayerId:'home-fw',mode:'owned'},players,events:[],teamIntents:{home:{type:'centralAttack'},away:{type:'defensiveBlock'}},
    } as unknown as MatchWorldState
    const phase=detectTacticalPhase(world,'home')
    expect(phase).toBe('allOutAttack')
    expect(createDynamicZone(players[0],world,phase).centerX).toBeGreaterThan(45)

    world.minute=35;world.timeSec=2100;world.homeScore=0;world.awayScore=0
    expect(detectTacticalPhase(world,'home')).toBe('attack')
    expect(createDynamicZone(players[0],world,'attack').centerX).toBeLessThan(35)
  })

  it('mirrors dynamic attacking movement with the second-half direction',()=>{
    const firstPlayer={playerId:'home-wg',team:'home',position:'FW',role:'WG',baseX:72,baseY:18,x:72,y:18} as MatchPlayerState
    const secondPlayer={...firstPlayer,baseX:28,x:28}
    const base={minute:20,timeSec:1200,homeScore:0,awayScore:0,tacticId:'balanced',counterTeam:null,events:[],teamIntents:{home:{type:'sideAttack'},away:{type:'defensiveBlock'}}}
    const first={...base,half:'first',ball:{x:60,y:20,ownerTeam:'home',ownerPlayerId:firstPlayer.playerId,mode:'owned'},players:[firstPlayer]} as unknown as MatchWorldState
    const second={...base,half:'second',minute:65,ball:{x:40,y:20,ownerTeam:'home',ownerPlayerId:secondPlayer.playerId,mode:'owned'},players:[secondPlayer]} as unknown as MatchWorldState
    expect(createDynamicZone(firstPlayer,first,'attack').centerX).toBeGreaterThan(firstPlayer.baseX)
    expect(createDynamicZone(secondPlayer,second,'attack').centerX).toBeLessThan(secondPlayer.baseX)
  })
})
