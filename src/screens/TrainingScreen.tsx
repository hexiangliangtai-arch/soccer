import { isMatchWeek } from '../data/calendar'
import { trainingMenus } from '../data/training'
import { useGame } from '../state/GameContext'

export function TrainingScreen() {
  const {state,dispatch}=useGame(); const blocked=isMatchWeek(state.week)
  return <section className="page-section"><div className="page-heading"><div><span className="section-kicker">TRAINING PLAN</span><h2>今週の練習</h2><p>選べるメニューはひとつ。選手の状態と次の試合から逆算しましょう。</p></div><div className="week-stamp">WEEK<strong>{state.week}</strong></div></div>
    {blocked&&<div className="alert">今週は試合週です。練習ではなく、試合の準備を進めてください。</div>}
    <div className="training-grid">{trainingMenus.map((menu)=><article className="training-card" key={menu.id}><div className="training-icon">{menu.icon}</div><span className="training-number">0{trainingMenus.indexOf(menu)+1}</span><h3>{menu.name}</h3><p>{menu.description}</p><div className="effect-tags">{Object.entries(menu.effects).map(([key,value])=><span key={key}>↑ {abilityLabels[key]} +{value}</span>)}<span className={menu.fatigue>10?'risk':''}>{menu.fatigue<0?'↓':'↑'} 疲労 {Math.abs(menu.fatigue)}</span></div><button disabled={blocked||state.weekActionCompleted} onClick={()=>dispatch({type:'TRAIN',trainingId:menu.id,seed:Date.now()})}>{state.weekActionCompleted?'今週は実施済み':'この練習を行う'}</button></article>)}</div>
    <section className="paper-card training-log"><span className="section-kicker">LATEST REPORT</span><h3>直近の活動ログ</h3>{state.logs.slice(0,6).map((log,i)=><p key={i}>{log}</p>)}</section>
  </section>
}
const abilityLabels:Record<string,string>={attack:'攻撃',defense:'守備',speed:'速度',stamina:'体力',technique:'技術',mental:'精神'}
