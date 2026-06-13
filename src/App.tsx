import { useState } from 'react'
import { Header } from './components/Header'
import { Nav, type ScreenId } from './components/Nav'
import { HomeScreen } from './screens/HomeScreen'
import { MatchScreen } from './screens/MatchScreen'
import { RecordsScreen } from './screens/RecordsScreen'
import { SquadScreen } from './screens/SquadScreen'
import { ReplayScreen } from './screens/ReplayScreen'
import { TacticsScreen } from './screens/TacticsScreen'

export default function App() {
  const [screen,setScreen]=useState<ScreenId>('home')
  const [selectedReplayMatchId,setSelectedReplayMatchId]=useState<string|null>(null)
  const [replayReturnScreen,setReplayReturnScreen]=useState<ScreenId>('records')
  const openReplay=(matchId:string,returnScreen:ScreenId)=>{setSelectedReplayMatchId(matchId);setReplayReturnScreen(returnScreen);setScreen('replay')}
  const changeScreen=(next:ScreenId)=>setScreen(next)
  return <><Header/><Nav active={screen} onChange={changeScreen}/><main>{screen==='home'&&<HomeScreen goTo={setScreen}/>} {screen==='squad'&&<SquadScreen/>} {screen==='tactics'&&<TacticsScreen/>} {screen==='match'&&<MatchScreen onReplay={(id)=>openReplay(id,'match')} onOpenTactics={()=>setScreen('tactics')}/>} {screen==='records'&&<RecordsScreen onReplay={(id)=>openReplay(id,'records')}/>} {screen==='replay'&&<ReplayScreen matchId={selectedReplayMatchId} onBack={()=>setScreen(replayReturnScreen)}/>}</main><footer><span>AOBA FOOTBALL CLUB</span><p>PLAY FOR THE TEAM. GROW FOR TOMORROW.</p></footer></>
}
