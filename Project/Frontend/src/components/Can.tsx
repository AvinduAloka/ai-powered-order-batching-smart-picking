/**
 * Render children only when the caller holds the permission.
 *
 * PRESENTATION ONLY. doc 12 section 9.7: every key is re-checked server-side by
 * `[Authorize(...)]`. Hiding a button is good manners and good clarity, not a
 * security control - and this component's comment says so, because the next
 * developer to read it will be looking for a security boundary.
 */
import type { ReactNode } from 'react'
import { useAuth } from '../lib/auth'
import type { Permission } from '../config/constants'

export function Can({
  permission,
  anyOf,
  children,
  fallback = null,
}: {
  permission?: Permission
  anyOf?: Permission[]
  children: ReactNode
  fallback?: ReactNode
}) {
  const { hasPermission, hasAnyPermission } = useAuth()

  if (permission && hasPermission(permission)) return <>{children}</>
  if (anyOf && anyOf.length > 0 && hasAnyPermission(anyOf)) return <>{children}</>
  return <>{fallback}</>
}

/**
 * Same check, but inverted, and it says WHY.
 *
 * An employee genuinely works with products and the location tree, so hiding the
 * page entirely would be hostile. Showing the read-only data with a one-line
 * explanation is the correct behaviour.
 */
export function CanReadOnly({
  permission,
  reason,
  children,
}: {
  permission: Permission
  reason: string
  children: ReactNode
}) {
  const { hasPermission } = useAuth()
  if (hasPermission(permission)) return <>{children}</>
  return (
    <div className="rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-inset ring-slate-200">
      {reason}
    </div>
  )
}
