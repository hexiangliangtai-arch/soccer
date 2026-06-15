import type { AiMatchState, MatchPlayerState } from '../types/aiMatch'
import type { MatchEvent, MatchEventType, MatchTeam, PitchPosition } from '../types/game'

const durations:Partial<Record<MatchEventType,number>>={pass:850,throughPass:950,cross:1050,dribble:1000,counter:950,pressure:850,intercept:950,tackle:950,looseBall:750,recover:800,clear:950,chance:950,shoot:900,goal:1700,save:1200,miss:950,block:1000,foul:1100,halfTime:1500,matchEnd:1800}

export interface EventInput {
  type:MatchEventType
  team:MatchTeam
  player?:MatchPlayerState
  target?:MatchPlayerState
  position?:PitchPosition
  targetPosition?:PitchPosition
  result?:MatchEvent['result']
  assist?:MatchPlayerState
  description?:string
}

function description(state:AiMatchState,input:EventInput) {
  const actor=input.player?.name??(input.team==='home'?'青葉高校':'相手チーム')
  const target=input.target?.name??'味方'
  const time=state.half==='first'?`前半${state.minute}分`:`後半${Math.max(1,state.minute-45)}分`
  switch(input.type) {
    case 'pass': return input.result==='failed'?`${time}、${actor}のパスは相手に読まれた。`:`${time}、${actor}から${target}へパスが通る。`
    case 'throughPass': return `${time}、${actor}が${target}の走りへスルーパスを送る！`
    case 'cross': return `${time}、${actor}がゴール前へクロスを入れる。`
    case 'dribble': return input.result==='failed'?`${time}、${actor}のドリブルは止められた。`:`${time}、${actor}がドリブルで前進する。`
    case 'counter': return `${time}、${actor}が奪った勢いのまま速攻へ！`
    case 'pressure': return input.result==='success'?`${time}、${actor}が鋭い寄せでボールを奪った。`:`${time}、${actor}が激しくプレッシャーをかける。`
    case 'intercept': return `${time}、${actor}がパスコースを読んでインターセプト！`
    case 'tackle': return `${time}、${actor}がタックルでボールをこぼさせた。`
    case 'looseBall': return `${time}、ボールがこぼれた。両チームが回収へ向かう。`
    case 'recover': return `${time}、${actor}がこぼれ球を回収する。`
    case 'clear': return `${time}、${actor}が危険を察知して大きくクリア。`
    case 'chance': return `${time}、${actor}がゴール前で決定機を迎える！`
    case 'shoot': return `${time}、${actor}がシュート！`
    case 'goal': return input.assist?`${time}、${input.assist.name}のラストパスから${actor}がゴール！`:`${time}、${actor}が自ら持ち込みゴール！`
    case 'save': return `${time}、${actor}がシュートをセーブ！`
    case 'miss': return `${time}、シュートはわずかにゴールを外れた。`
    case 'block': return `${time}、${actor}が身体を投げ出してシュートをブロック！`
    case 'halfTime': return `${time}、前半終了。選手たちがベンチへ戻ります。`
    case 'matchEnd': return '試合終了。両チーム、力を出し切りました。'
    default:return `${time}、試合が動きます。`
  }
}

export function createAiEvent(state:AiMatchState,input:EventInput):MatchEvent {
  const event:MatchEvent={
    id:`${state.matchId}-e${state.currentSequence}`,matchId:state.matchId,sequence:state.currentSequence,
    minute:state.minute,second:state.second,half:state.half,type:input.type,team:input.team,
    playerId:input.player?.playerId,targetPlayerId:input.target?.playerId,assistPlayerId:input.assist?.playerId,
    position:input.position??(input.player?{x:input.player.x,y:input.player.y}:undefined),
    targetPosition:input.targetPosition??(input.target?{x:input.target.x,y:input.target.y}:undefined),
    result:input.result,durationMs:durations[input.type],description:input.description??description(state,input),
  }
  state.currentSequence++
  state.events.push(event)
  return event
}
