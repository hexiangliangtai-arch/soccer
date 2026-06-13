import { getOverallRating } from '../game/playerRating'
import { createSeededRandom, pickOne, randomInt, type RandomSource } from '../game/random'
import type { AbilityKey, GrowthType, Player, Position } from '../types/game'

const familyNames = [
  '佐藤','鈴木','高橋','田中','伊藤','渡辺','山本','中村','小林','加藤',
  '吉田','山田','佐々木','山口','松本','井上','木村','林','清水','斎藤',
  '阿部','森','池田','橋本','石川','前田','藤田','岡田','後藤','長谷川',
  '村上','近藤','石井','坂本','遠藤','青木','藤井','西村','福田','太田',
  '三浦','藤原','岡本','松田','中川','中野','原田','小野','田村','竹内',
  '金子','和田','中山','石田','上田','森田','原','柴田','酒井','工藤',
  '横山','宮崎','宮本','内田','高木','安藤','谷口','大野','丸山','今井',
  '河野','藤本','村田','武田','上野','杉山','増田','小島','小山','平野',
  '菅原','久保','松井','千葉','岩崎','桜井','木下','野口','松尾','菊地',
  '野村','新井','渡部','佐野','杉本','大西','古川','浜田','市川','小松',
  '高田','水野','島田','山内','西田','菊池','北村','五十嵐','川口','平田',
  '川崎','飯田','吉川','本田','沢田','久保田','辻','関','土屋','樋口',
  '川上','永井','松岡','田口','山中','森本','矢野','大塚','今村','川村',
  '片山','山下','堀','服部','望月','熊谷','永田','荒木','大石','星野',
  '須藤','黒田','西川','岩田','川島','泉','奥村','土井','松下','浅野',
  '大島','広瀬','尾崎','平井','早川','横田','鎌田','小池','石原','栗原',
  '宮田','福島','大橋','篠原','小西','松原','白石','青山','岡崎','岩本',
  '斉藤','川田','奥田','植田','飯塚','本間','牧野','森下','堀内','町田',
  '筒井','亀井','沢村','稲垣','川端','萩原','奈良','細川','津田','中田',
  '安田','大久保','田辺','川原','吉岡','森川','岸本','長田','榎本','三宅',
  '大谷','黒木','堤','中西','落合','秋山','関口','塚本','高山','富田',
  '西山','川野','河合','国分','村井','大川','神田','飯島','坂口','岡野',
  '江口','福井','長尾','吉村','徳永','宮下','堀田','西尾','笠原','内藤',
  '田島','中井','金井','三上','大場','矢島','若林','片岡','小泉','平山',
  '大森','岡部','馬場','浅井','川本','小原','塩田','高野','宮川','植松',
  '宇野','長岡','宮原','石塚','柏木','島崎','瀬戸','高島','相馬','成田',
  '浦田','赤松','寺田','奥山','矢口','小沢','藤川','長野','庄司','畠山',
  '宮城','川合','坪井','高瀬','新田','金田','寺島','相沢','米田','滝沢',
  '日高','大竹','深沢','戸田','香川','稲葉','八木','岩瀬','笹川','児玉',
  '大沢','浜口','沖田','柳田','小川','谷','水谷','藤岡','梅田','伴',
]

const givenNames = [
  '蓮','翔太','悠斗','陽翔','湊','大翔','樹','蒼','颯太','陸',
  '悠真','拓海','海斗','大地','健太','直樹','優斗','晴人','翼','律',
  '颯','仁','誠','陽介','拓斗','一真','智也','航','圭介','亮',
  '大輝','颯真','朝陽','陽太','結翔','悠人','陽向','颯汰','蒼空','新',
  '琉生','旭','奏太','瑛太','遼','駿','駿介','隼人','遼太郎','雄大',
  '和真','達也','直人','和也','大樹','祐介','俊介','裕太','洋平','啓太',
  '雄太','慎也','浩介','隆太','康平','祐樹','俊輔','和樹','大介','貴大',
  '亮太','亮介','圭太','祐太','智樹','慎太郎','健介','健一','健人','健吾',
  '健斗','拓也','拓真','拓馬','拓郎','直也','直哉','直斗','尚也','尚人',
  '雅人','真人','達哉','達郎','達樹','雄介','雄一','雄二','祐一','祐二',
  '浩太','浩二','浩平','浩輝','康介','康太','康裕','康誠','隆之','隆史',
  '隆平','隆志','智之','智大','智哉','智紀','智宏','和人','和彦','和貴',
  '和哉','和希','大和','大智','大貴','大河','大雅','大成','大悟','大夢',
  '太一','太郎','太雅','太陽','太輝','太志','一樹','一輝','一也','一希',
  '一馬','一成','一平','一翔','颯介','颯人','颯希','颯馬','颯一郎','蒼太',
  '蒼真','蒼生','蒼大','蒼人','蒼馬','悠太','悠介','悠生','悠希','悠馬',
  '悠一','悠平','翔','翔真','翔大','翔平','翔馬','翔一','翔也','陽斗',
  '陽大','陽生','陽希','陽一','陽平','海','海翔','海里','海成','海人',
  '海生','海聖','陸斗','陸人','陸也','陸生','陸真','陸翔','空','空良',
  '空大','空翔','空也','空真','樹生','樹希','樹人','樹也','樹一','樹真',
  '湊人','湊斗','湊介','湊太','湊生','湊一','蓮斗','蓮人','蓮也','蓮真',
  '蓮生','蓮太郎','律希','律人','律樹','律真','律生','律也','仁志','仁也',
  '仁人','仁太','仁平','仁成','誠人','誠也','誠司','誠一','誠太','誠吾',
  '駿太','駿也','駿斗','駿平','駿一','駿太郎','隼','隼斗','隼也','隼太',
  '隼平','隼輝','慧','慧太','慧人','慧介','慧悟','慧一','瑛','瑛人',
  '瑛介','瑛斗','瑛士','瑛大','奏','奏人','奏斗','奏介','奏汰','奏真',
  '慶','慶太','慶介','慶人','慶吾','慶一','凌','凌太','凌介','凌平',
  '凌也','凌真','玲','玲央','玲人','玲司','玲斗','玲生','龍','龍太',
  '龍也','龍之介','龍平','龍生','虎太郎','虎之介','虎徹','虎太','虎生','虎雅',
  '創','創太','創介','創人','創士','創真','岳','岳人','岳斗','岳志',
]

const positionCounts: Record<Position, number> = { GK:2, DF:7, MF:7, FW:4 }
const gradePool: Player['grade'][] = [1,1,1,1,1,1,2,2,2,2,2,2,2,3,3,3,3,3,3,3]
const growthTypes: GrowthType[] = ['rapid','steady','steady','steady','lateBloomer']
const abilityKeys: AbilityKey[] = ['attack','defense','speed','stamina','technique','mental']

const abilityRanges: Record<Position, Record<AbilityKey, [number,number]>> = {
  GK: { attack:[12,28], defense:[65,86], speed:[38,61], stamina:[58,78], technique:[48,70], mental:[67,88] },
  DF: { attack:[30,58], defense:[61,84], speed:[52,78], stamina:[65,86], technique:[45,69], mental:[61,83] },
  MF: { attack:[51,75], defense:[45,70], speed:[57,81], stamina:[67,87], technique:[64,87], mental:[61,84] },
  FW: { attack:[67,89], defense:[22,47], speed:[65,91], stamina:[59,82], technique:[62,85], mental:[57,82] },
}

function shuffle<T>(items: T[], random: RandomSource) {
  const result = [...items]
  for (let index=result.length-1;index>0;index--) {
    const swapIndex = randomInt(random,0,index)
    ;[result[index],result[swapIndex]] = [result[swapIndex],result[index]]
  }
  return result
}

function createUniqueNames(count: number, random: RandomSource) {
  const names = new Set<string>()
  while (names.size < count) names.add(`${pickOne(random,familyNames)} ${pickOne(random,givenNames)}`)
  return [...names]
}

export function generateInitialPlayers(seed = Date.now()): Player[] {
  const random = createSeededRandom(seed)
  const positionList = (Object.entries(positionCounts) as [Position,number][]).flatMap(([position,count])=>Array<Position>(count).fill(position))
  const positions = shuffle(positionList,random)
  const grades = shuffle(gradePool,random)
  const names = createUniqueNames(positions.length,random)
  return positions.map((position,index) => {
    const ranges = abilityRanges[position]
    const abilities = Object.fromEntries(abilityKeys.map((key)=>[key,randomInt(random,...ranges[key])])) as Record<AbilityKey,number>
    return {
      id:`p${String(index+1).padStart(2,'0')}`,
      name:names[index],
      grade:grades[index],
      position,
      ...abilities,
      condition:100,
      fatigue:0,
      injury:{status:'healthy',recoveryWeeks:0},
      growthType:pickOne(random,growthTypes),
      stats:{appearances:0,goals:0,assists:0},
    }
  })
}

export function generateDefaultLineup(players: Player[]) {
  const best = (position: Position, count: number) => players.filter((player)=>player.position===position).sort((a,b)=>getOverallRating(b)-getOverallRating(a)).slice(0,count).map((player)=>player.id)
  return [...best('GK',1),...best('DF',4),...best('MF',4),...best('FW',2)]
}
