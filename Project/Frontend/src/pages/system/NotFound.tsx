import { Link } from 'react-router'
import { Compass } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { APP_NAME, ROUTES } from '../../config/constants'
import { Button } from '../../components/ui'

export default function NotFound() {
  const { isAuthenticated } = useAuth()

  const home = isAuthenticated ? ROUTES.dashboard : ROUTES.login

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-md text-center">
        <Compass className="mx-auto mb-4 h-12 w-12 text-slate-300" aria-hidden="true" />
        <p className="font-mono text-3xl font-bold text-slate-300">404</p>
        <h1 className="mt-2 text-lg font-semibold text-slate-900">That screen does not exist</h1>
        <p className="mt-2 text-sm text-slate-600">
          The address may have been mistyped, or the screen may have been renamed. Nothing was changed.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link to={home}>
            <Button>Back to start</Button>
          </Link>
        </div>
        <p className="mt-8 text-[11px] text-slate-400">{APP_NAME}</p>
      </div>
    </div>
  )
}
