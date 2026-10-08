import { type KeyboardEvent, type ReactNode, useEffect, useRef } from 'react'

export function DialogFrame({ children, labelledBy, onClose, wide = false }: {
  children: ReactNode
  labelledBy: string
  onClose: () => void
  wide?: boolean
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      onCloseRef.current()
    }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleEscape)
    closeRef.current?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleEscape)
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [])

  function trapFocus(event: KeyboardEvent<HTMLDivElement>) {
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
