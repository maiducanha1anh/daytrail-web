import { type KeyboardEvent, type ReactNode, useEffect, useRef } from 'react'

export function DialogFrame({ children, labelledBy, onClose, wide = false }: {
  children: ReactNode
  labelledBy: string
  onClose: () => void
  wide?: boolean
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => { document.body.style.overflow = previousOverflow }
  }, [])

  function trapFocus(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
      return
    }
    if (event.key !== 'Tab') return
    const focusable = panelRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])')
    if (!focusable?.length) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <div ref={panelRef} className={`dialog-panel${wide ? ' dialog-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={labelledBy} onKeyDown={trapFocus}>
      <button ref={closeRef} className="dialog-close" type="button" onClick={onClose} aria-label="Đóng">×</button>
      {children}
    </div>
  </div>
}
