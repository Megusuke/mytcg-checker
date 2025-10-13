import { useId } from 'react'

type Tab = { key: string; label: string }
type Props = {
  tabs: Tab[]
  value: string
  onChange: (key: string) => void
}

export function Tabs({ tabs, value, onChange }: Props) {
  const id = useId()
  return (
    <div>
      <div role="tablist" aria-label="sections" className="tabs-bar">
        {tabs.map((t) => {
          const selected = t.key === value
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={selected}
              aria-controls={`${id}-${t.key}`}
              id={`${id}-${t.key}-tab`}
              className={`tab ${selected ? 'active' : ''}`}
              onClick={() => onChange(t.key)}
            >
              {t.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
