import { isMatchWeek } from '../data/calendar'
import { trainingMenus } from '../data/training'
import { useGame } from '../state/GameContext'

const abilityLabels:Record<string,string>={attack:'攻撃',defense:'守備',speed:'速度',stamina:'体力',technique:'技術',mental:'精神'}

export function TrainingPanel() {
  const {state,dispatch}=useGame(); const blocked=isMatchWeek(state.week)
  if (blocked) return <div className="home-match-prompt"><span className="section-kicker">MATCH WEEK</span><h3>今週は試合です</h3><p>スタメンと戦術を確認して、試合へ進んでください。</p></div>
  return <div className="home-training"><div className="home-section-title"><div><span className="section-kicker">THIS WEEK</span><h3>今週の練習</h3></div><p>1つ選ぶと自動で次週へ進みます。</p></div><div className="home-training-grid">{trainingMenus.map((menu)=><article key={menu.id}><i>{menu.icon}</i><div><h4>{menu.name}</h4><p>{menu.description}</p><small>{Object.entries(menu.effects).map(([key,value])=>`${abilityLabels[key]}+${value}`).join(' / ')||`疲労${menu.fatigue}`}</small></div><button disabled={state.weekActionCompleted} onClick={()=>dispatch({type:'TRAIN',trainingId:menu.id,seed:Date.now()})}>実行</button></article>)}</div></div>
}
