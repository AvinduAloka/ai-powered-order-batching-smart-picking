import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api, getAccessToken, isRemembered, setAccessToken } from './api'
import { ROLE_PERMISSIONS, type Permission } from '../config/constants'
import type { AuthUser, LoginRequest, LoginResponse } from '../types'

export interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  /** True while the initial token check is running, to avoid a login flash. */
  isInitialising: boolean
  login: (request: LoginRequest, rememberMe: boolean) => Promise<void>
  logout: () => Promise<void>
  /** Presentation-only check. Enforcement is server-side (doc 12 section 9.7). */
  hasPermission: (permission: Permission) => boolean
  hasAnyPermission: (permissions: Permission[]) => boolean
  /** Convenience for W-20: an EMPLOYEE may only ever address their own rows. */
  isEmployee: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Resolve the effective permission set.
 *
 * The server sends `user.permissions`. If, for any reason, that array is empty
 * (a token minted before a permission change, say), we fall back to the role
 * table in constants.ts so the UI degrades to the documented lattice rather than
 * to "sees nothing". The fallback can only ever *hide* controls, never invent
 * access the API will not grant.
 */
function resolvePermissions(user: AuthUser): ReadonlySet<Permission> {
  if (user.permissions && user.permissions.length > 0) {
    return new Set(user.permissions as Permission[])
  }
  return new Set(ROLE_PERMISSIONS[user.roleCode] ?? [])
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isInitialising, setIsInitialising] = useState<boolean>(() => getAccessToken() !== null)

  /**
   * On mount, if a token survived a reload, re-establish the user object.
   * The token alone is not enough: `user` drives the sidebar and the guards.
   * The JWT payload is NOT decoded for this, because a client-side decode of an
   * unverified token would be a security anti-pattern (doc 12 section 11).
   */
  useEffect(() => {
    let cancelled = false
    // `isInitialising` was initialised from the same token check above, so when
    // there is no token it is already false and there is nothing to restore.
    // Writing it here would be a setState in an effect body, which
    // react-hooks/set-state-in-effect (React Compiler) rejects.
    if (!getAccessToken()) return
    api
      .get<AuthUser>('/auth/me')
      .then((me) => {
        // `api` is the axios instance, so this is the envelope; the guards
        // and the sidebar read the user object itself.
        if (!cancelled) setUser(me.data)
      })
      .catch(() => {
        // The interceptor already attempted one refresh. A failure here means
        // the session is over.
        if (!cancelled) setAccessToken(null, false)
      })
      .finally(() => {
        if (!cancelled) setIsInitialising(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (request: LoginRequest, rememberMe: boolean) => {
    const response = await api.post<LoginResponse>('/auth/login', request)
    // The response sets the refresh cookie via withCredentials; we only keep
    // the access token.
    setAccessToken(response.data.accessToken, rememberMe)
    setUser(response.data.user)
  }, [])

  const logout = useCallback(async () => {
    try {
      // Tells the server to revoke the refresh cookie. A failure here must not
      // trap the operator in the application.
      await api.post('/auth/logout')
    } catch {
      // Ignored on purpose.
    } finally {
      setAccessToken(null, false)
      setUser(null)
    }
  }, [])

  const permissionSet = useMemo(() => (user ? resolvePermissions(user) : new Set<Permission>()), [user])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isInitialising,
      login,
      logout,
      hasPermission: (permission) => permissionSet.has(permission),
      hasAnyPermission: (permissions) => permissions.some((p) => permissionSet.has(p)),
      isEmployee: user?.roleCode === 'EMPLOYEE',
    }),
    [user, isInitialising, login, logout, permissionSet],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (ctx === null) {
    throw new Error('useAuth must be used inside <AuthProvider>. Check main.tsx.')
  }
  return ctx
}

/**
 * The current access token, for the rare component that must read it
 * imperatively (printing a label, exporting a file). Prefer an API helper from
 * api.ts, which already attaches the header.
 *
 * The token can only change at login and at logout, and both of those change
 * `user` - so depending on `user` is a complete and correct invalidation signal.
 */
export function useAccessToken(): string | null {
  const { user } = useAuth()
  return useMemo(() => (user ? getAccessToken() : null), [user])
}

/** Read the token once, at call time, for imperative helpers. */
export function currentAccessToken(): string | null {
  return getAccessToken()
}

/** True when the token was stored with "Remember me". */
export function accessTokenIsRemembered(): boolean {
  return isRemembered()
}
