export type ScreenId = 'home'|'squad'|'tactics'|'match'|'records'|'replay'
const items: {id:ScreenId;label:string;number:string}[] = [
  {id:'home',label:'ホーム',number:'01'}, {id:'squad',label:'選手',number:'02'},
  {id:'tactics',label:'スタメン・戦術',number:'03'}, {id:'match',label:'試合',number:'04'}, {id:'records',label:'記録',number:'05'},
]
export function Nav({active,onChange}:{active:ScreenId;onChange:(id:ScreenId)=>void}) {
  return <nav className="main-nav">{items.map((item)=><button key={item.id} className={active===item.id?'active':''} onClick={()=>onChange(item.id)}><i>{item.number}</i>{item.label}</button>)}</nav>
}
