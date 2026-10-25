import { Suspense, lazy, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router'
import { AppLayout } from './components/AppLayout'
import { ProtectedRoute, type GuardProps } from './components/ProtectedRoute'
import { LoadingState } from './components/States'
import { useAuth } from './lib/auth'
import { ROUTES } from './config/constants'
import { api } from './lib/api'

/*
 * Route-level code splitting (doc 06 §8): the login screen must not download
 * the users screen. Every page is its own chunk.
 */
const Login = lazy(() => import('./pages/auth/Login'))
const Home = lazy(() => import('./pages/system/Home'))
const Users = lazy(() => import('./pages/admin/Users'))
const NotFound = lazy(() => import('./pages/system/NotFound'))
const Forbidden = lazy(() => import('./pages/system/Forbidden'))
const ServerError = lazy(() => import('./pages/system/ServerError'))

/** Wrap a guard so every protected route reads the same way. */
function guard(permission?: GuardProps['permission']) {
  return <ProtectedRoute permission={permission} />
}

export default function App() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  /*
   * One anonymous probe on boot. It proves the Vite proxy is wired, which is
   * the single most common first-run failure. M1 uses /meta/time because it is
   * the anonymous endpoint that exists; /meta/health arrives with the platform.
   * Failure is logged, never shown: the operator still needs the login screen.
   */
  useEffect(() => {
    api
      .get('/meta/time')
      .catch(() => {
        console.warn('[X-Trena] API probe failed. Is the backend running?')
      })
  }, [])

  /*
   * One Suspense boundary above every route. Each page is a lazy() chunk, so
   * the boundary is not optional: without it React throws on the first
   * navigation rather than showing a fallback.
   */
  return (
    <Suspense fallback={<LoadingState label="Loading screen" />}>
      <Routes>
        {/* W-01. Rendered outside AppLayout: there is no shell until signed in. */}
        <Route path={ROUTES.login} element={<Login />} />

        {/* Unnumbered supporting screens, also outside the shell. */}
        <Route path={ROUTES.forbidden} element={<Forbidden />} />
        <Route path={ROUTES.error} element={<ServerError />} />

        <Route
          path="/"
          element={
            isAuthenticated ? (
              <AppLayout />
            ) : (
              <Navigate to={ROUTES.login} replace state={{ from: location.pathname + location.search }} />
            )
          }
        >
          <Route index element={<Navigate to={ROUTES.dashboard} replace />} />

          {/* M1 — Identity & Access */}
          {/* Dashboard = M1 Home (no permission key: every role needs a landing
              page; the *content* is permission-filtered inside Home.tsx). */}
          <Route path="dashboard" element={guard()}>
            <Route index element={<Home />} />
          </Route>

          <Route path="admin">
            <Route path="users" element={guard('users.read')}>
              <Route index element={<Users />} />
            </Route>
          </Route>

          {/* Signed-in but unknown path → 404 inside the shell. */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
