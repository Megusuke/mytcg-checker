import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
type Toast = { id:number; text:string; type?:'ok'|'error' }
const Ctx = createContext<(t: Omit<Toast,'id'>)=>void>(()=>{})

export function useToast(){ return useContext(Ctx) }

export const Toaster: React.FC = ({ children }) => {
  const [list, setList] = useState<Toast[]>([])
  const idRef = useRef(1)
  const push = (t: Omit<Toast,'id'>) => {
    const id = idRef.current++
    setList(prev => [...prev, { id, ...t }])
    setTimeout(()=> setList(prev => prev.filter(x=>x.id!==id)), 3500)
  }
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="toast-wrap">
        {list.map(t=>(
          <div key={t.id} className={`toast ${t.type ?? ''}`}>{t.text}</div>
        ))}
      </div>
    </Ctx.Provider>
  )
}
