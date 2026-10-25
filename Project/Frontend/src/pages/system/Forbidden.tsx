import { Link, useLocation } from 'react-router'
import { ShieldOff } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { ROUTES } from '../../config/constants'
import { Alert, Button } from '../../components/ui'

interface LocationState {
  required?: string
  from?: string
}

export default function Forbidden() {
  const { user } = useAuth()
  const location = useLocation()
  const state = (location.state as LocationState | null) ?? {}
  // ★ M1: no picking screen yet, so every role lands on the M1 dashboard.
  const home = ROUTES.dashboard

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-lg">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <ShieldOff className="mb-3 h-10 w-10 text-warn-500" aria-hidden="true" />
          <h1 className="text-lg font-semibold text-slate-900">You do not have access to that screen</h1>
          <p className="mt-2 text-sm text-slate-600">
            You are signed in as <strong>{user?.username}</strong> with the role{' '}
            <strong>{user?.roleCode}</strong>. That role does not include the permission this screen needs.
          </p>

          {state.required ? (
            <div className="mt-4">
              <Alert tone="warning" title="Missing permission">
                <code className="font-mono text-xs">{state.required}</code>
                {state.from ? (
                  <p className="mt-1 text-xs">
                    Requested by <code className="font-mono">{state.from}</code>
                  </p>
                ) : null}
              </Alert>
            </div>
          ) : null}

          <p className="mt-4 text-sm text-slate-600">
            If you believe you should have this access, ask an administrator to review your role. Access is decided by
            the server, so this screen cannot be bypassed.
          </p>

          <div className="mt-6 flex gap-2">
            <Link to={home}>
              <Button>Back to start</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
