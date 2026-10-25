import { Link } from 'react-router'
import { Bug } from 'lucide-react'
import { getLastCorrelationId } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { APP_NAME, ROUTES } from '../../config/constants'
import { Button, Card } from '../../components/ui'

export default function ServerError() {
  const { isAuthenticated } = useAuth()
  const correlationId = getLastCorrelationId()

  const diagnostics = [
    `application: ${APP_NAME}`,
    `route: ${window.location.pathname}`,
    `user agent: ${navigator.userAgent}`,
    correlationId ? `last correlation id: ${correlationId}` : 'last correlation id: (none recorded)',
    `time: ${new Date().toISOString()}`,
  ].join('\n')

  const copyDiagnostics = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(diagnostics)
    } catch {
      // Clipboard permission can be denied; the text is on screen anyway.
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-lg space-y-4">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <Bug className="mb-3 h-10 w-10 text-fault-500" aria-hidden="true" />
          <h1 className="text-lg font-semibold text-slate-900">Something went wrong</h1>
          <p className="mt-2 text-sm text-slate-600">
            The server could not complete the last request. Nothing was half-written: every write in X-Trena is a single
            database transaction, so a failed request leaves no partial state.
          </p>
          {correlationId ? (
            <p className="mt-3 rounded bg-slate-900 px-3 py-2 font-mono text-xs text-slate-100">
              correlation id: {correlationId}
            </p>
          ) : null}
          <div className="mt-5 flex gap-2">
            <Link to={isAuthenticated ? ROUTES.dashboard : ROUTES.login}>
              <Button>Back to start</Button>
            </Link>
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Reload
            </Button>
          </div>
        </div>

        <Card title="Diagnostics" description="Copy this into a bug report.">
          <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-slate-50 p-3 font-mono text-[11px] text-slate-700">
            {diagnostics}
          </pre>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => void copyDiagnostics()}>
            Copy diagnostics
          </Button>
        </Card>
      </div>
    </div>
  )
}
