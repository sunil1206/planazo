import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

/**
 * The app's one dropdown component. Native <select> popups render with the
 * OS's light theme no matter what CSS is applied (see the color-scheme note
 * in index.css) — this replaces that with a fully custom, consistently
 * themed panel. Use it for every new dropdown so the look stays the same
 * app-wide; don't reach for a bare <select> again.
 *
 * `options`: [{ value, label }]. The trigger's `style` prop is for the rare
 * case a caller wants to color-code the trigger by the current value (e.g.
 * an RSVP status pill) — pass it the same way you would to a native select.
 *
 * Renders the open panel through a portal positioned with fixed
 * coordinates, so it always floats above scrollable modals instead of
 * being clipped by their overflow.
 */
export default function Select({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  ariaLabel,
  className = '',
  compact = false,
  style,
}) {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState(null)
  const triggerRef = useRef(null)
  const panelRef = useRef(null)

  const selected = options.find(o => o.value === value)

  const updateRect = useCallback(() => {
    if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect())
  }, [])

  const close = useCallback(() => setOpen(false), [])

  const toggle = () => {
    if (!open) updateRect()
    setOpen(o => !o)
  }

  useEffect(() => {
    if (!open) return
    const onDocClick = e => {
      if (triggerRef.current?.contains(e.target)) return
      if (panelRef.current?.contains(e.target)) return
      close()
    }
    const onKey = e => { if (e.key === 'Escape') close() }
    const onReposition = () => updateRect()
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onReposition, true)
    window.addEventListener('resize', onReposition)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onReposition, true)
      window.removeEventListener('resize', onReposition)
    }
  }, [open, close, updateRect])

  const openUp = rect ? (window.innerHeight - rect.bottom < 260 && rect.top > 260) : false

  return (
    <>
      <div className={`relative inline-block ${className}`}>
        <button
          ref={triggerRef}
          type="button"
          aria-label={ariaLabel}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={toggle}
          className={`glass-input w-full flex items-center justify-between gap-2 text-left cursor-pointer
            ${compact ? 'py-1' : ''} ${open ? 'border-purple-500/55' : ''}`}
          style={style}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <span className={`shrink-0 text-white/40 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </span>
        </button>
      </div>

      {open && rect && createPortal(
        <div
          ref={panelRef}
          role="listbox"
          className="fixed z-[200] modal-panel sidebar-scroll overflow-y-auto p-1.5"
          style={{
            left: rect.left,
            width: Math.max(rect.width, 170),
            ...(openUp ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }),
            maxHeight: '260px',
            borderRadius: '16px',
            animation: 'select-panel-in 0.15s ease both',
          }}
        >
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={opt.value === value}
              onClick={() => { onChange(opt.value); close() }}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-[13px] text-left transition-colors duration-100
                ${opt.value === value ? 'bg-purple-500/16 text-white font-medium' : 'text-white/70 hover:bg-white/[0.06] hover:text-white/90'}`}
            >
              <span className="truncate">{opt.label}</span>
              {opt.value === value && (
                <span className="shrink-0 text-purple-400">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                </span>
              )}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  )
}
