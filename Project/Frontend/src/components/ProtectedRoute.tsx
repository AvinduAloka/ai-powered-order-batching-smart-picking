import { Navigate, Outlet, useLocation } from 'react-router'
import type { ReactNode } from 'react'
import { useAuth } from '../lib/auth'
import { ROUTES } from '../config/constants'
import type { Permission } from '../config/constants'
import { Spinner } from './ui'

export interface GuardProps {
  permission?: Permission
  children?: ReactNode
}

export function ProtectedRoute({ permission, children }: GuardProps) {
  const { isAuthenticated, isInitialising, hasPermission } = useAuth()
  const location = useLocation()

  if (isInitialising) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="h-6 w-6" />
        <span className="sr-only">Checking your session</span>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} replace state={{ from: location.pathname + location.search }} />
  }

  if (permission && !hasPermission(permission)) {
    return <Navigate to={ROUTES.forbidden} replace state={{ required: permission, from: location.pathname }} />
  }

  return <>{children ?? <Outlet />}</>
}

/** Used by the Roles screen to decide which write controls to disable. */
export function useGuardState(permission: Permission): { allowed: boolean } {
  const { hasPermission } = useAuth()
  return { allowed: hasPermission(permission) }
}