import type { MatchPlayerState, MatchWorldState } from '../types/aiMatch'
import type { TacticId } from '../types/game'
import type { PlaySequence, PlaySequenceType } from '../types/playSequence'
import type { RandomSource } from './random'
import { buildPlaySequence } from './sequenceBuilder'
import { getAttackDirection } from './pitchMath'

const weights:Record<TacticId,Partial<Record<PlaySequenceType,number>>>={
  balanced:{buildUp:4,sideAttack:2,centralAttack:2,counter:.5},
  possession:{buildUp:6,sideAttack:2.5,centralAttack:1.5},
  counter:{buildUp:.5,sideAttack:1,centralAttack:.5,counter:12},
  pressing:{buildUp:1.5,centralAttack:2,counter:2,pressingWin:5},
  defensive:{buildUp:1.5,counter:2,clearance:5},
  attacking:{buildUp:1.5,sideAttack:4,centralAttack:5,counter:2},
}

function chooseWeighted(entries:Array<[PlaySequenceType,number]>,random:RandomSource) {
  const total=entries.reduce((sum,[,weight])=>sum+weight,0)
  let roll=random.next()*total
  for(const [type,weight] of entries) {roll-=weight;if(roll<=0)return type}
  return entries[0]?.[0]
}

export function createPlaySequence(world:MatchWorldState,owner:MatchPlayerState,random:RandomSource):PlaySequence|null {
  const tactic:TacticId=owner.team==='home'?world.tacticId:'balanced'
  const direction=getAttackDirection(owner.team)
  const progress=direction===1?owner.x:100-owner.x
  const configured={...weights[tactic]}
  if(world.counterTeam===owner.team)configured.counter=(configured.counter??0)+2
  if(progress<25)configured.buildUp=(configured.buildUp??0)+3
  if(progress>72)configured.centralAttack=(configured.centralAttack??0)+3
  if(tactic==='defensive'&&progress<30)configured.clearance=(configured.clearance??0)+6
  const entries=Object.entries(configured).filter((entry):entry is [PlaySequenceType,number]=>Boolean(entry[1]&&entry[1]>0))
  const selected=tactic==='counter'?'counter':chooseWeighted(entries,random)
  if(!selected)return null
  return buildPlaySequence(world,selected,owner,random)
}
