// Toast
import { useUIStore } from '../../store/index.js'

export function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts)
  const removeToast = useUIStore((s) => s.removeToast)

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`} onClick={() => removeToast(t.id)}>
          <span>
            {t.type === 'success' && '✓ '}
            {t.type === 'error' && '✕ '}
            {t.type === 'warning' && '⚠ '}
          </span>
          {t.message}
        </div>
      ))}
    </div>
  )
}
