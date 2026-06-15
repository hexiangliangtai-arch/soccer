import type { MatchPlayerState, MatchWorldState } from '../types/aiMatch'
import type { PlaySequence, PlaySequenceType, TeamIntentType } from '../types/playSequence'
import type { RandomSource } from './random'

const intentByLegacyType:Record<PlaySequenceType,TeamIntentType>={
  buildUp:'buildUp',counter:'counter',sideAttack:'sideAttack',centralAttack:'centralAttack',
  dribbleBreak:'centralAttack',pressingWin:'pressing',turnover:'counter',clearance:'clearDanger',
}

const descriptions:Record<TeamIntentType,string>={
  keepPossession:'ボールを保持する',buildUp:'後方から組み立てる',sideAttack:'サイドを使う',
  centralAttack:'中央を攻略する',counter:'素早く攻める',pressing:'前から奪いに行く',
  defensiveBlock:'守備ブロックを整える',clearDanger:'危険を回避する',
}

// Compatibility entry point. It now creates only a team intention and never a
// future list of player or ball commands.
export function buildPlaySequence(
  world:MatchWorldState,
  type:PlaySequenceType,
  owner:MatchPlayerState,
  random:RandomSource,
):PlaySequence {
  const intent=intentByLegacyType[type]
  const tempo=intent==='counter'||intent==='pressing'?'fast':intent==='keepPossession'||intent==='defensiveBlock'?'slow':'normal'
  const preferredZone=intent==='sideAttack'?(random.next()<.5?'left':'right'):intent==='centralAttack'?'center':undefined
  return {
    id:`${world.matchId}-intent-${owner.team}-${world.currentSequence}-${world.stepIndex}`,
    type:intent,team:owner.team,startedAtSec:world.timeSec,preferredZone,
    riskLevel:intent==='counter'||intent==='centralAttack'?.78:intent==='clearDanger'?.18:.45,
    tempo,sequenceType:type,startTimeSec:world.timeSec,endTimeSec:world.timeSec+15,
    actions:[],currentActionIndex:0,description:descriptions[intent],
  }
}
