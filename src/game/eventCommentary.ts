import type { MatchEventType, MatchHalf, MatchTeam, Player } from '../types/game'

const timeLabel = (half: MatchHalf, minute: number) => half === 'first' ? `前半${minute}分` : `後半${Math.max(1, minute-45)}分`

export function createCommentary(input: {
  type: MatchEventType; half: MatchHalf; minute: number; team: MatchTeam; player?: Player; target?: Player; assist?: Player; opponentName: string; result?: string
}) {
  const { type, half, minute, team, player, target, assist, opponentName } = input
  const time = timeLabel(half, minute)
  const name = team === 'home' ? (player?.name ?? '青葉高校') : opponentName
  switch (type) {
    case 'matchStart': return 'キックオフ。青葉高校、勝負の一戦が始まります！'
    case 'halfTime': return `${time}、前半終了。選手たちがベンチへ戻ります。`
    case 'matchEnd': return '試合終了。両チーム、力を出し切りました。'
    case 'pass': return `${time}、${name}から${target?.name ?? '前線'}へ鋭いパス。`
    case 'dribble': return `${time}、${name}がボールを運び、一人かわした！`
    case 'counter': return `${time}、${name}が一気にカウンターへ！`
    case 'pressure': return `${time}、${name}が激しく寄せてボールを奪う。`
    case 'chance': return `${time}、${name}に決定機！ ゴール前へ迫る。`
    case 'shoot': return `${time}、${name}がシュート！`
    case 'goal': return assist ? `${time}、${assist.name}のラストパスから${name}がゴール！` : `${time}、ゴール！ ${name}がネットを揺らした！`
    case 'save': return `${time}、${name}がビッグセーブ！`
    case 'foul': return `${time}、${name}のプレーに笛。フリーキックです。`
    default: return `${time}、試合が動きます。`
  }
}
