import type { AbilityKey, Player } from '../types/game'

const abilities: {key:AbilityKey;label:string}[] = [
  {key:'attack',label:'攻撃'}, {key:'defense',label:'守備'}, {key:'speed',label:'スピード'},
  {key:'stamina',label:'スタミナ'}, {key:'technique',label:'テクニック'}, {key:'mental',label:'メンタル'},
]

function point(index: number, value: number, radius = 76) {
  const angle = (-90+index*60)*Math.PI/180
  const distance = radius*value/100
  return `${110+Math.cos(angle)*distance},${110+Math.sin(angle)*distance}`
}

export function RadarChart({player}:{player:Player}) {
  const polygon = abilities.map((ability,index)=>point(index,player[ability.key])).join(' ')
  return <svg className="radar-chart" viewBox="0 0 220 220" role="img" aria-label={`${player.name}の能力六角形グラフ`}>
    {[100,75,50,25].map((level)=><polygon key={level} className="radar-grid" points={abilities.map((_,index)=>point(index,level)).join(' ')}/>) }
    {abilities.map((_,index)=><line key={index} className="radar-axis" x1="110" y1="110" x2={point(index,100).split(',')[0]} y2={point(index,100).split(',')[1]}/>) }
    <polygon className="radar-value" points={polygon}/>
    {abilities.map((ability,index)=>{const [x,y]=point(index,124,82).split(',').map(Number);return <text key={ability.key} x={x} y={y} textAnchor="middle" dominantBaseline="middle">{ability.label}</text>})}
  </svg>
}
