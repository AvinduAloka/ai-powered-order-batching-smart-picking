import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, CheckCircle2, Info, Loader2, X, XCircle } from 'lucide-react'
import { cn } from '../lib/utils'
import type { BadgeTone } from '../config/constants'

/* ================================================================== */
/* Button                                                              */
/* ================================================================== */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link'
export type ButtonSize = 'sm' | 'md' | 'lg'

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 disabled:bg-slate-300',
  secondary:
    'bg-white text-slate-800 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 disabled:text-slate-400',
  ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 disabled:text-slate-400',
  danger: 'bg-fault-500 text-white hover:bg-fault-700 disabled:bg-slate-300',
  link: 'bg-transparent text-brand-600 underline underline-offset-2 hover:text-brand-700 p-0 h-auto',
}

const BUTTON_SIZE: Record<ButtonSize, string> = {
  // `lg` is 48px tall, above the 44px WCAG 2.5.5 target minimum: W-12 and W-21
  // are used on a warehouse floor with gloves on.
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  /** Rendered before the label. Ignored while `loading` is true. */
  icon?: ReactNode
  fullWidth?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      // A loading button is also a disabled button: without this, a double
      // click could post a receipt line twice.
      disabled={disabled === true || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors',
        'disabled:cursor-not-allowed',
        BUTTON_VARIANT[variant],
        BUTTON_SIZE[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : icon}
      {children}
    </button>
  )
}

/** Square icon-only button. `label` is mandatory: no unlabeled icon buttons. */
export function IconButton({
  label,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-600',
        'hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

/* ================================================================== */
/* Form controls                                                       */
/* ================================================================== */

const CONTROL_BASE =
  'block w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 ' +
  'placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 ' +
  'focus:ring-brand-500 disabled:bg-slate-100 disabled:text-slate-500'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
  hint?: string
}

export function Input({ className, invalid = false, hint, ...rest }: InputProps) {
  return (
    <>
      <input
        aria-invalid={invalid || undefined}
        className={cn(CONTROL_BASE, 'h-10', invalid && 'border-fault-500 focus:border-fault-500 focus:ring-fault-500', className)}
        {...rest}
      />
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </>
  )
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean
}

export function Select({ className, invalid = false, children, ...rest }: SelectProps) {
  return (
    <select
      aria-invalid={invalid || undefined}
      className={cn(CONTROL_BASE, 'h-10 pr-8', invalid && 'border-fault-500', className)}
      {...rest}
    >
      {children}
    </select>
  )
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
}

export function Textarea({ className, invalid = false, ...rest }: TextareaProps) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={cn(CONTROL_BASE, 'min-h-[88px] py-2', invalid && 'border-fault-500', className)}
      {...rest}
    />
  )
}

export function Checkbox({
  label,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const id = useId()
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <input
        id={id}
        type="checkbox"
        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        {...rest}
      />
      <label htmlFor={id} className="text-sm text-slate-700 select-none">
        {label}
      </label>
    </div>
  )
}

export function Label({ htmlFor, children, required }: { htmlFor: string; children: ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-slate-700">
      {children}
      {required ? <span className="ml-0.5 text-fault-500">*</span> : null}
    </label>
  )
}

/**
 * Label + control + error, wired together.
 *
 * The error is linked with `aria-describedby` and announced through the
 * container's `role="alert"`, so a screen reader hears the message as soon as
 * validation fails rather than only when the field is next focused.
 */
export function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string
  required?: boolean
  error?: string | undefined
  hint?: string
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode
}) {
  const id = useId()
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined

  return (
    <div className="mb-4">
      <Label htmlFor={id} required={required}>
        {label}
      </Label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {hint ? (
        <p id={hintId} className="mt-1 text-xs text-slate-500">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="mt-1 flex items-start gap-1 text-xs text-fault-500">
          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  )
}

/* ================================================================== */
/* Card                                                                */
/* ================================================================== */

export function Card({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section className={cn('rounded-lg border border-slate-200 bg-white shadow-sm', className)}>
      {title || actions ? (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
          <div>
            {title ? <h2 className="text-sm font-semibold text-slate-900">{title}</h2> : null}
            {description ? <p className="mt-0.5 text-xs text-slate-500">{description}</p> : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className={cn('p-4', bodyClassName)}>{children}</div>
    </section>
  )
}

export function PageSection({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('space-y-4', className)}>{children}</div>
}

/* ================================================================== */
/* Badge                                                               */
/* ================================================================== */

const BADGE_TONE: Record<BadgeTone, string> = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
  ok: 'bg-ok-50 text-ok-700 ring-ok-500/30',
  warn: 'bg-warn-50 text-warn-700 ring-warn-500/30',
  fault: 'bg-fault-50 text-fault-700 ring-fault-500/30',
  info: 'bg-brand-50 text-brand-700 ring-brand-500/30',
  ext: 'bg-ext-50 text-ext-700 ring-ext-500/30',
}

export function Badge({
  tone = 'neutral',
  children,
  className,
  title,
}: {
  tone?: BadgeTone
  children: ReactNode
  className?: string
  title?: string
}) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        BADGE_TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

/* ================================================================== */
/* Spinner and progress                                                */
/* ================================================================== */

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-brand-600', className)} aria-hidden="true" />
}

export function ProgressBar({ percent, label }: { percent: number; label?: string }) {
  const clamped = Math.max(0, Math.min(100, Number.isNaN(percent) ? 0 : percent))
  return (
    <div>
      {label ? (
        <div className="mb-1 flex justify-between text-xs text-slate-600">
          <span>{label}</span>
          <span className="tabular-nums">{Math.round(clamped)}%</span>
        </div>
      ) : null}
      <div
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Progress'}
        className="h-2 w-full overflow-hidden rounded-full bg-slate-200"
      >
        <div className="h-full rounded-full bg-brand-600 transition-[width] duration-300" style={{ width: `${clamped}%` }} />
      </div>
    </div>
  )
}

/* ================================================================== */
/* Modal                                                               */
/* ================================================================== */

export interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  /** `lg` for the confirm-a-batch flows on W-09, W-12 and W-24. */
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const MODAL_SIZE: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export function Modal({ open, onClose, title, description, children, footer, size = 'md' }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Escape closes, and the body must not scroll behind the dialog.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:p-8">
      {/* Backdrop click closes; a click that started inside the panel does not. */}
      <div
        className="fixed inset-0"
        aria-hidden="true"
        onClick={onClose}
        onMouseDown={(e) => e.stopPropagation()}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          'relative z-10 w-full animate-fade-in rounded-lg bg-white shadow-xl focus:outline-none',
          MODAL_SIZE[size],
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            {description ? <p className="mt-0.5 text-sm text-slate-500">{description}</p> : null}
          </div>
          <IconButton label="Close" onClick={onClose}>
            <X className="h-4 w-4" aria-hidden="true" />
          </IconButton>
        </header>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer ? <footer className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">{footer}</footer> : null}
      </div>
    </div>,
    document.body,
  )
}

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: ReactNode
  confirmLabel?: string
  tone?: 'primary' | 'danger'
  loading?: boolean
  /**
   * When set, the operator must type this exact string before Confirm enables.
   * Used for irreversible actions: delete a user, rotate an API key.
   */
  requireText?: string
}

/**
 * Confirm dialog with an optional type-to-confirm gate.
 *
 * The body is a separate component that only exists while the dialog is open, so
 * the typed text starts empty on every open. Clearing it from an effect that
 * watched `open` is what react-hooks/set-state-in-effect forbids: a setState in
 * an effect body costs an extra render for state that is knowable at mount.
 */
export function ConfirmDialog({ open, ...rest }: ConfirmDialogProps) {
  if (!open) return null
  return <ConfirmDialogBody {...rest} />
}

function ConfirmDialogBody({
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  tone = 'primary',
  loading = false,
  requireText,
}: Omit<ConfirmDialogProps, 'open'>) {
  const [typed, setTyped] = useState('')

  const canConfirm = !loading && (requireText ? typed.trim() === requireText : true)

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant={tone} onClick={onConfirm} disabled={!canConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-sm text-slate-700">
        <div>{message}</div>
        {requireText ? (
          <div>
            <Label htmlFor="confirm-text" required>
              Type <code className="rounded bg-slate-100 px-1 font-mono">{requireText}</code> to continue
            </Label>
            <Input
              id="confirm-text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
            />
          </div>
        ) : null}
      </div>
    </Modal>
  )
}

/* ================================================================== */
/* Toast                                                               */
/* ================================================================== */

export type ToastTone = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: number
  tone: ToastTone
  title: string
  body?: string
  /** 0 keeps the toast until it is dismissed. Used for blockers. */
  durationMs: number
}

interface ToastContextValue {
  push: (toast: Omit<Toast, 'id' | 'durationMs'> & { durationMs?: number }) => number
  success: (title: string, body?: string) => number
  error: (title: string, body?: string) => number
  info: (title: string, body?: string) => number
  warning: (title: string, body?: string) => number
  dismiss: (id: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const TOAST_ICON: Record<ToastTone, ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4 text-ok-500" aria-hidden="true" />,
  error: <XCircle className="h-4 w-4 text-fault-500" aria-hidden="true" />,
  info: <Info className="h-4 w-4 text-brand-500" aria-hidden="true" />,
  warning: <AlertCircle className="h-4 w-4 text-warn-500" aria-hidden="true" />,
}

const TOAST_CLASS: Record<ToastTone, string> = {
  success: 'ring-ok-500/40',
  error: 'ring-fault-500/40',
  info: 'ring-brand-500/40',
  warning: 'ring-warn-500/40',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id))
  }, [])

  const push = useCallback<ToastContextValue['push']>((toast) => {
    const id = nextId.current++
    setToasts((current) => [...current, { ...toast, id, durationMs: toast.durationMs ?? 5000 }])
    if (toast.durationMs !== 0) {
      window.setTimeout(() => dismiss(id), toast.durationMs ?? 5000)
    }
    return id
  }, [dismiss])

  const value = useMemo<ToastContextValue>(
    () => ({
      push,
      dismiss,
      success: (title, body) => push({ tone: 'success', title, body }),
      error: (title, body) => push({ tone: 'error', title, body, durationMs: 9000 }),
      info: (title, body) => push({ tone: 'info', title, body }),
      warning: (title, body) => push({ tone: 'warning', title, body, durationMs: 8000 }),
    }),
    [push, dismiss],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2 no-print"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={cn(
              'pointer-events-auto flex items-start gap-2 rounded-lg bg-white px-4 py-3 shadow-lg ring-1',
              TOAST_CLASS[toast.tone],
            )}
          >
            <span className="mt-0.5 shrink-0">{TOAST_ICON[toast.tone]}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900">{toast.title}</p>
              {toast.body ? <p className="mt-0.5 text-xs text-slate-600">{toast.body}</p> : null}
            </div>
            <IconButton label="Dismiss notification" onClick={() => dismiss(toast.id)}>
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </IconButton>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (ctx === null) throw new Error('useToast must be used inside <ToastProvider>. Check main.tsx.')
  return ctx
}

/* ================================================================== */
/* Small layout helpers                                                */
/* ================================================================== */

export function Toolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-wrap items-center gap-2', className)}>{children}</div>
}

export function StatCard({
  label,
  value,
  sub,
  tone = 'neutral',
  icon,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
  tone?: BadgeTone
  icon?: ReactNode
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        {icon ? <span className="text-slate-400">{icon}</span> : null}
      </div>
      <p
        className={cn(
          'mt-2 text-2xl font-semibold tabular-nums',
          tone === 'ok' && 'text-ok-700',
          tone === 'warn' && 'text-warn-700',
          tone === 'fault' && 'text-fault-700',
          tone === 'neutral' && 'text-slate-900',
        )}
      >
        {value}
      </p>
      {sub ? <p className="mt-1 text-xs text-slate-500">{sub}</p> : null}
    </div>
  )
}

export function Alert({
  tone = 'info',
  title,
  children,
  action,
}: {
  tone?: 'info' | 'success' | 'warning' | 'error'
  title?: string
  /** Optional: a one-line alert is written as `<Alert title={...} />`. */
  children?: ReactNode
  action?: ReactNode
}) {
  const map = {
    info: 'bg-brand-50 text-brand-900 ring-brand-500/30',
    success: 'bg-ok-50 text-ok-700 ring-ok-500/30',
    warning: 'bg-warn-50 text-warn-700 ring-warn-500/30',
    error: 'bg-fault-50 text-fault-700 ring-fault-500/30',
  } as const
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={cn('rounded-md px-4 py-3 text-sm ring-1 ring-inset', map[tone])}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {title ? <p className="font-medium">{title}</p> : null}
          <div className={cn(title && 'mt-0.5')}>{children}</div>
        </div>
        {action}
      </div>
    </div>
  )
}
