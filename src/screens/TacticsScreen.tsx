import { useState } from 'react'
import { formations, getFormation } from '../data/formations'
import { validateLineup } from '../game/lineupValidation'
import { useGame } from '../state/GameContext'
import type { FormationId } from '../types/game'
import { DraggablePlayerCard } from '../components/tactics/DraggablePlayerCard'
import { FormationBoard } from '../components/tactics/FormationBoard'
import { TacticSelector } from '../components/tactics/TacticSelector'
import { PlayerDetailModal } from '../components/PlayerDetailModal'

export function TacticsScreen() {
  const {state,dispatch}=useGame(); const [selectedSlotId,setSelectedSlotId]=useState<string|null>(null); const [selectedPlayerId,setSelectedPlayerId]=useState<string|null>(null)
  const validation=validateLineup(state.lineupIds,state.players); const assignedIds=new Set(state.lineupIds)
  const selectedFormation=getFormation(state.selectedFormation)
  const assign=(slotId:string,playerId:string)=>{dispatch({type:'ASSIGN_PLAYER',slotId,playerId});setSelectedSlotId(null)}
  return <section className="page-section tactics-screen"><div className="page-heading"><div><span className="section-kicker">LINEUP & TACTICS</span><h2>スタメン・戦術</h2><p>配置した11人と戦術が、そのまま次の試合へ反映されます。</p></div><div className={`lineup-status ${validation.valid?'ok':'bad'}`}><b>{state.lineupIds.length}<small>/11</small></b><span>{validation.valid?'準備完了':'編成を確認'}</span></div></div>
    <div className="tactics-settings"><label htmlFor="formation-select">フォーメーション<select id="formation-select" value={state.selectedFormation} onChange={(event)=>{dispatch({type:'SET_FORMATION',formationId:event.target.value as FormationId});setSelectedSlotId(null)}}>{formations.map((formation)=><option key={formation.id} value={formation.id}>{formation.name}</option>)}</select><small>{selectedFormation.description}</small></label><div><span>チーム戦術</span><TacticSelector value={state.tacticId} onChange={(tacticId)=>dispatch({type:'SET_TEAM_TACTIC',tacticId})}/></div></div>
    {!validation.valid&&<div className="alert">{validation.errors.join('　')}</div>}
    <div className="tactics-workspace"><FormationBoard formationId={state.selectedFormation} assignments={state.lineupAssignments} players={state.players} selectedSlotId={selectedSlotId} onSelectSlot={setSelectedSlotId} onAssign={assign} onClear={(slotId)=>dispatch({type:'ASSIGN_PLAYER',slotId,playerId:null})}/><aside className="tactics-player-list"><div><h3>選手リスト</h3><p>{selectedSlotId?'選手を選ぶか、スロットへドラッグ':'スロットを選択して配置'}</p></div>{state.players.map((player)=><DraggablePlayerCard key={player.id} player={player} isAssigned={assignedIds.has(player.id)} onSelect={()=>{if(selectedSlotId)assign(selectedSlotId,player.id)}} onOpenDetails={()=>setSelectedPlayerId(player.id)}/>)}</aside></div>
    {selectedPlayerId&&<PlayerDetailModal player={state.players.find((player)=>player.id===selectedPlayerId)!} onClose={()=>setSelectedPlayerId(null)}/>} 
  </section>
}
