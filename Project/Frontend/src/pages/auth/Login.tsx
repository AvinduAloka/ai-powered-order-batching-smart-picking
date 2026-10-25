import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { Eye, EyeOff, Lock, User } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { normaliseProblem, type NormalisedProblem } from '../../lib/problem'
import { get } from '../../lib/api'
import { APP_NAME, APP_SUBTITLE, ROUTES } from '../../config/constants'
import type { MetaTimeDto } from '../../types'
import { Button, Checkbox, Field, Input, Alert } from '../../components/ui'

interface LocationState {
  from?: string
}

export default function Login() {
  const { login, isAuthenticated, isInitialising } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [problem, setProblem] = useState<NormalisedProblem | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [clockSkewMs, setClockSkewMs] = useState<number | null>(null)

  const from = (location.state as LocationState | null)?.from

  /*
   * doc 04 section 15.4: `GET /meta/time` is anonymous and returns the server
   * clock. If the browser clock is minutes out, every rowversion/ETag the
   * operator sees will be in the future, so a warning is cheaper than a
   * mysterious 409 later. A failure here is not an error: it just means we
   * cannot tell, so we say nothing.
   */
  useEffect(() => {
    let cancelled = false
    get<MetaTimeDto>('/meta/time')
      .then((data) => {
        if (cancelled) return
        const skew = Date.now() - new Date(data.serverTimeUtc).getTime()
        if (Number.isFinite(skew) && Math.abs(skew) > 60_000) setClockSkewMs(skew)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  // Already signed in? Do not make the operator press Login again.
  useEffect(() => {
    if (!isInitialising && isAuthenticated) {
      navigate(from ?? ROUTES.dashboard, { replace: true })
    }
  }, [isAuthenticated, isInitialising, from, navigate])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    if (submitting) return

    const errors: Record<string, string> = {}
    if (username.trim().length === 0) errors.username = 'Enter your username.'
    else if (username.trim().length < 3) errors.username = 'Username must be at least 3 characters.'
    if (password.length === 0) errors.password = 'Enter your password.'

    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setSubmitting(true)
    setProblem(null)
    try {
      await login({ username: username.trim(), password }, rememberMe)
      navigate(from ?? ROUTES.dashboard, { replace: true })
    } catch (error) {
      const normalised = normaliseProblem(error)
      setProblem(normalised)
      setFieldErrors(
        Object.fromEntries(Object.entries(normalised.fieldErrors).map(([key, value]) => [key, value[0] ?? ''])),
      )
      // A locked account should not keep the password in the field for a retry.
      if (normalised.code === 'auth.account_locked') setPassword('')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isInitialising && isAuthenticated) {
    return <Navigate to={from ?? ROUTES.dashboard} replace />
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-brand-600 text-lg font-bold text-white">
            X
          </div>
          <h1 className="text-lg font-semibold text-slate-900">{APP_NAME}</h1>
          <p className="text-sm text-slate-500">{APP_SUBTITLE}</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} noValidate>
            {problem ? (
              <div className="mb-4">
                <Alert tone={problem.status === 401 ? 'error' : 'warning'} title={problem.message}>
                  {problem.correlationId ? (
                    <p className="mt-1 font-mono text-[11px] opacity-80">Correlation id: {problem.correlationId}</p>
                  ) : null}
                </Alert>
              </div>
            ) : null}

            {clockSkewMs !== null ? (
              <div className="mb-4">
                <Alert tone="warning" title="This computer's clock is more than a minute away from the server">
                  Optimistic concurrency uses timestamps. Fix the clock before signing in if you see
                  "someone else changed this record" repeatedly.
                </Alert>
              </div>
            ) : null}

            <Field label="Username" required error={fieldErrors.username}>
              {({ id, describedBy, invalid }) => (
                <div className="relative">
                  <User
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <Input
                    id={id}
                    name="username"
                    autoComplete="username"
                    className="pl-9"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    invalid={invalid}
                    aria-describedby={describedBy}
                    autoFocus
                    maxLength={64}
                  />
                </div>
              )}
            </Field>

            <Field label="Password" required error={fieldErrors.password}>
              {({ id, describedBy, invalid }) => (
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <Input
                    id={id}
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className="pl-9 pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    invalid={invalid}
                    aria-describedby={describedBy}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((shown) => !shown)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                  </button>
                </div>
              )}
            </Field>

            <Checkbox
              label="Remember me"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              title="Keep the session on this computer instead of only in this browser tab."
            />

            <Button type="submit" size="lg" fullWidth loading={submitting} className="mt-5">
              {submitting ? 'Signing in' : 'Login'}
            </Button>

            <p className="mt-5 rounded bg-slate-50 px-3 py-2 text-center text-xs text-slate-500">
              Locked accounts: contact administrator.
            </p>
          </form>
        </div>

        <p className="mt-4 text-center text-[11px] text-slate-400">
          ITE3962 / ITE3965 &middot; E2529106
        </p>
      </div>
    </div>
  )
}
