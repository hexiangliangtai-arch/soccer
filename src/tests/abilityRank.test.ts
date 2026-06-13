import { describe,expect,it } from 'vitest'
import { getAbilityRank } from '../components/AbilityRankBadge'

describe('getAbilityRank',()=>{
  it.each([
    [100,'S'],[90,'S'],[89,'A'],[80,'A'],[79,'B'],[70,'B'],[69,'C'],[60,'C'],
    [59,'D'],[50,'D'],[49,'E'],[40,'E'],[39,'F'],[20,'F'],[19,'G'],[0,'G'],
  ] as const)('converts %i to %s',(value,rank)=>expect(getAbilityRank(value)).toBe(rank))
})
