import type { ReactNode } from 'react'
import { AlertCircle, Inbox, RotateCw } from 'lucide-react'
import { Button, Spinner } from './ui'
import { normaliseProblem, type NormalisedProblem } from '../lib/problem'
import { cn } from '../lib/utils'

export function LoadingState({ label = 'Loading', rows = 5 }: { label?: string; rows?: number }) {
  return (
    <div className="p-4" role="status" aria-live="polite">
      <div className="mb-4 flex items-center gap-2 text-sm text-slate-600">
        <Spinner className="h-4 w-4" />
        <span>{label}...</span>
      </div>
      {/* Skeletons match the loaded row height, so the layout does not jump. */}
      <div className="space-y-2" aria-hidden="true">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="h-9 animate-pulse rounded bg-slate-100" />
        ))}
      </div>
    </div>
  )
}

export function EmptyState({
  title = 'Nothing to show',
  description,
  action,
  icon,
}: {
  title?: string
  description?: ReactNode
  action?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <span className="mb-3 text-slate-300">{icon ?? <Inbox className="h-10 w-10" aria-hidden="true" />}</span>
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {description ? <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

/**
 * The error state.
 *
 * The operator sees the human sentence. The correlation id is shown too, because
 * that is the one string a user can hand to a developer - and without it a
 * support conversation has nothing to start from.
 */
export function ErrorState({
  error,
  onRetry,
  compact = false,
  className,
}: {
  error: unknown
  onRetry?: () => void
  compact?: boolean
  className?: string
}) {
  const problem: NormalisedProblem = normaliseProblem(error)

  return (
    <div
      role="alert"
      className={cn('rounded-md bg-fault-50 px-4 py-3 text-sm text-fault-700 ring-1 ring-inset ring-fault-500/30', className)}
    >
      <div className="flex items-start gap-2">
        <AlertCircle className={cn('shrink-0', compact ? 'mt-0.5 h-4 w-4' : 'mt-0.5 h-5 w-5')} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-medium">{problem.message}</p>
          {problem.detail && problem.detail !== problem.message ? (
            <p className="mt-1 text-xs text-fault-700/80">{problem.detail}</p>
          ) : null}
          <p className="mt-1 font-mono text-[11px] text-fault-700/70">
            {problem.status > 0 ? `${problem.status} ` : ''}
            {problem.code}
            {problem.correlationId ? ` - correlation id ${problem.correlationId}` : ''}
          </p>
          {onRetry && problem.retryable ? (
            <Button variant="secondary" size="sm" className="mt-3" icon={<RotateCw className="h-3.5 w-3.5" />} onClick={onRetry}>
              Try again
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/**
 * Picks the right state for a TanStack Query result, so no screen has to
 * re-implement the three-way branch (and forget one of the branches).
 */
export function QueryState<T>({
  isLoading,
  error,
  data,
  isEmpty,
  onRetry,
  loadingLabel,
  emptyTitle,
  emptyDescription,
  emptyAction,
  children,
}: {
  isLoading: boolean
  error: unknown
  data: T | undefined
  isEmpty?: (data: T) => boolean
  onRetry?: () => void
  loadingLabel?: string
  emptyTitle?: string
  emptyDescription?: ReactNode
  emptyAction?: ReactNode
  children: (data: T) => ReactNode
}) {
  if (isLoading) return <LoadingState label={loadingLabel} />
  if (error) return <ErrorState error={error} onRetry={onRetry} />
  if (data === undefined || data === null) return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
  if (isEmpty?.(data)) return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
  return <>{children(data)}</>
}
