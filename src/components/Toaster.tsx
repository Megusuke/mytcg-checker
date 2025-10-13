import { createContext, useContext, useRef, useState, type ReactNode } from 'react'

type Toast = { id: number; text: string; type?: 'ok' | 'error' }
type PushToast = (t: Omit<Toast, 'id'>) => void

const Ctx = createContext<PushToast>(() => {})

export function useToast(): PushToast {
  return useContext(Ctx)
}

export function Toaster({ children }: { children?: ReactNode }) {
  const [list, setList] = useState<Toast[]>([])
  const idRef = useRef(1)

  const push: PushToast = (t) => {
    const id = idRef.current++
    setList((prev) => [...prev, { id, ...t }])
    // 3.5秒で自動消滅
    setTimeout(() => setList((prev) => prev.filter((x) => x.id !== id)), 3500)
  }

  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="toast-wrap">
        {list.map((t) => (
          <div key={t.id} className={`toast ${t.type ?? ''}`}>
            {t.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}
