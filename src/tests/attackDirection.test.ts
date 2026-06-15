import { describe,expect,it } from 'vitest'
import { detectMovingBallContact } from '../game/contactEngine'
import type { MatchWorldState } from '../types/aiMatch'

const random={next:()=>.99}

function shotWorld(half:'first'|'second',team:'home'|'away',x:number) {
  return {
    half,timeSec:60,homeScore:0,awayScore:0,players:[],possessionTeam:team,tacticId:'balanced',
    ball:{x,y:50,vx:0,vy:0,mode:'shot',lastTouchTeam:team,lastTouchPlayerId:`${team}-shooter`,ownerTeam:team},
  } as unknown as MatchWorldState
}

describe('half-specific goal lines',()=>{
  it('scores home shots on the right in the first half and on the left in the second',()=>{
    const first=shotWorld('first','home',101)
    const second=shotWorld('second','home',-1)
    expect(detectMovingBallContact(first,{x:99,y:50},{x:101,y:50},random)).toBe(true)
    expect(detectMovingBallContact(second,{x:1,y:50},{x:-1,y:50},random)).toBe(true)
    expect(first.homeScore).toBe(1)
    expect(second.homeScore).toBe(1)
  })

  it('scores away shots on the opposite goal in each half',()=>{
    const first=shotWorld('first','away',-1)
    const second=shotWorld('second','away',101)
    detectMovingBallContact(first,{x:1,y:50},{x:-1,y:50},random)
    detectMovingBallContact(second,{x:99,y:50},{x:101,y:50},random)
    expect(first.awayScore).toBe(1)
    expect(second.awayScore).toBe(1)
  })
})
