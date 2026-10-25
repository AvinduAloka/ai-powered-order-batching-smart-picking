import { Component, type ErrorInfo, type ReactNode } from 'react'
import { getLastCorrelationId } from '../lib/api'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[X-Trena] unhandled render error', error, info.componentStack)
  }

  private handleReset = (): void => {
    this.setState({ error: null })
  }

  private handleReload = (): void => {
    window.location.assign('/error')
  }

  render(): ReactNode {
    const { error } = this.state
    if (!error) return this.props.children

    const correlationId = getLastCorrelationId()

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">The screen could not be drawn</h1>
          <p className="mt-2 text-sm text-slate-600">
            This is a fault in the browser-side code, not in the server. Nothing was changed in the database. Reloading
            the screen usually clears it; if it does not, quote the details below.
          </p>
          <pre className="mt-4 max-h-40 overflow-auto rounded bg-slate-900 p-3 text-xs text-slate-100">
            {error.message}
          </pre>
          {correlationId ? (
            <p className="mt-2 font-mono text-[11px] text-slate-500">Last correlation id: {correlationId}</p>
          ) : null}
          <div className="mt-5 flex gap-2">
            <button
              type="button"
              onClick={this.handleReset}
              className="h-10 rounded-md bg-white px-4 text-sm font-medium text-slate-800 ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
            >
              Try this screen again
            </button>
            <button
              type="button"
              onClick={this.handleReload}
              className="h-10 rounded-md bg-brand-600 px-4 text-sm font-medium text-white hover:bg-brand-700"
            >
              Reload the application
            </button>
          </div>
        </div>
      </div>
    )
  }
}
