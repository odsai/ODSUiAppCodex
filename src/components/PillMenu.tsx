// Floating pill menu
import React, { useState, useRef, useEffect } from 'react'
import { FiGrid } from 'react-icons/fi'
import type { Route } from '../store/appStore'

const clampToViewport = (x:number,y:number,w:number,h:number,pad=8)=>{
  const maxX=Math.max(pad,window.innerWidth-w-pad)
  const maxY=Math.max(pad,window.innerHeight-h-pad)
  return {x:Math.min(Math.max(x,pad),maxX),y:Math.min(Math.max(y,pad),maxY)}
}

const items: { label: string; icon: string; to: Route | '/dashboard' }[] = [
  { label: 'Dashboard', icon: '🏠', to: '/dashboard' },
  { label: 'OWUI', icon: '🤖', to: '/ai' },
  { label: 'Penpot', icon: '🎨', to: '/penpot' },
  { label: 'Flowise', icon: '🌊', to: '/flowise' },
  { label: 'Excalidraw', icon: '✏️', to: '/excalidraw' },
  { label: 'ComfyUI', icon: '🎭', to: '/comfyui' },
  { label: 'Groups', icon: '👥', to: '/groups' },
  { label: 'Settings', icon: '⚙️', to: '/settings' },
]

export default function PillMenu({
  setRoute,
  onDashboard,
}: {
  setRoute: (r: Route) => void
  onDashboard: () => void
}) {
  const [pinMode,setPinMode]=useState('none')
  const [hovering,setHovering]=useState(false)
  const [pos,setPos]=useState({x:40,y:320})
  const drag=useRef(false);const start=useRef({x:0,y:0});const off=useRef({x:0,y:0});const moved=useRef(false)

  const FAB=56,PILLW=64,PILLPAD=8,ITEMS=40,GAP=10,TH=5
  const stackH=PILLPAD*2+items.length*ITEMS+(items.length-1)*GAP
  const openH=stackH+FAB+8

  const onDown=(e:any)=>{drag.current=true;moved.current=false;start.current={x:e.clientX,y:e.clientY};off.current={x:e.clientX-pos.x,y:e.clientY-pos.y}}
  const onMove=(e:any)=>{if(!drag.current)return;const nx=e.clientX-off.current.x,ny=e.clientY-off.current.y;if(Math.hypot(e.clientX-start.current.x,e.clientY-start.current.y)>TH)moved.current=true;setPos(clampToViewport(nx,ny,FAB,FAB))}
  const onUp=()=>{if(!drag.current)return;drag.current=false;const toLeft=pos.x<=window.innerWidth/2;const tx=toLeft?12:Math.max(12,window.innerWidth-(FAB+12));setPos(p=>({...p,x:tx}))}

  useEffect(()=>{window.addEventListener('mousemove',onMove);window.addEventListener('mouseup',onUp);return()=>{window.removeEventListener('mousemove',onMove);window.removeEventListener('mouseup',onUp)}},[pos])

  const handleFab=()=>{if(moved.current){moved.current=false;return};setPinMode(p=>p==='none'?(hovering?'open':'closed'):p==='open'?'closed':'open')}
  const effective=pinMode==='open'||(pinMode==='none'&&hovering)
  const onSideLeft = pos.x <= window.innerWidth/2

  return (
    <div
      className="fixed z-50 select-none"
      style={{ left: pos.x, top: pos.y }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div
        className="absolute left-1/2 -translate-x-1/2 rounded-full border bg-white/85 backdrop-blur shadow overflow-visible"
        style={{ width: PILLW, height: effective ? openH : FAB }}
        aria-hidden={!effective}
      >
        {effective && (
          <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{ top: FAB + 8, padding: PILLPAD, width: '100%', display: 'grid', gap: GAP }}
            role="menu"
            aria-orientation="vertical"
          >
            {items.map((it) => (
              <div key={it.to} className="relative group grid place-items-center">
                <button
                  aria-label={it.label}
                  onClick={() => {
                    if (it.to === '/dashboard') onDashboard()
                    else setRoute(it.to as Route)
                    setPinMode('open')
                  }}
                  className="h-10 w-10 rounded-full border bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  {it.icon}
                </button>
                {/* Tooltip */}
                <span
                  className="pointer-events-none absolute whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-xs text-white opacity-0 shadow transition-opacity group-hover:opacity-100"
                  style={{
                    left: onSideLeft ? 'calc(100% + 8px)' : undefined,
                    right: onSideLeft ? undefined : 'calc(100% + 8px)',
                  }}
                >
                  {it.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      <button
        aria-label="Open menu"
        onMouseDown={onDown}
        onClick={handleFab}
        className="relative grid h-14 w-14 place-items-center rounded-full text-white shadow-2xl cursor-pointer bg-brand"
      >
        <FiGrid size={24} />
      </button>
    </div>
  )
}
