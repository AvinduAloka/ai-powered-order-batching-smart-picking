import { useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { ChevronDown, LogOut, Menu } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { NAV_GROUPS, ROUTES, type NavItem } from '../config/constants'
import { SWAGGER_URL } from '../lib/api'
import { cn, initials } from '../lib/utils'
import { Badge, IconButton } from './ui'

function NavIcon({ name }: { name: string }) {
  // Small inline map rather than a component per item — keeps the bundle small.
  const paths: Record<string, string> = {
    gauge: 'M12 14l4-4M4 20a8 8 0 1116 0',
    users:
      'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm14 10v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8',
  }
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] ?? paths.gauge} />
    </svg>
  )
}

function SidebarLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  return (
    <NavLink
      to={item.path}
      end={item.path === ROUTES.dashboard}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
          isActive ? 'bg-brand-600 text-white' : 'text-slate-200 hover:bg-slate-800 hover:text-white',
        )
      }
    >
      <NavIcon name={item.icon} />
      <span className="truncate">{item.label}</span>
    </NavLink>
  )
}

export function AppLayout() {
  const { user, logout, hasPermission } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Both panels remember the route they were opened on and derive closed as
  // soon as the route changes. Deriving this from `location` replaces the
  // effect that called two setters on every navigation, which
  // react-hooks/set-state-in-effect (React Compiler) rejects: a setState in an
  // effect body causes a second render for information we already have.
  const [drawerRoute, setDrawerRoute] = useState<string | null>(null)
  const [menuRoute, setMenuRoute] = useState<string | null>(null)
  const mobileNavOpen = drawerRoute === location.pathname
  const menuOpen = menuRoute === location.pathname

  const groups = useMemo(
    () =>
      NAV_GROUPS.map((group) => ({
        ...group,
        // permission නැති item එකක් sidebar එකේ පෙන්නන්නේ නෑ.
        items: group.items.filter((item) => {
          if (item.permission && !hasPermission(item.permission)) return false
          return true
        }),
      })).filter((group) => group.items.length > 0),
    [hasPermission],
  )

  const handleLogout = async (): Promise<void> => {
    await logout()
    navigate(ROUTES.login, { replace: true })
  }

  const sidebar = (
    <nav className="flex h-full flex-col bg-slate-900" aria-label="Main navigation">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-slate-800 px-4">
        <span className="grid h-8 w-8 place-items-center rounded bg-brand-600 text-sm font-bold text-white">X</span>
        <span className="text-sm font-semibold text-white">X-Trena WMS</span>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-2 py-3">
        {groups.map((group) => (
          <div key={group.heading}>
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {group.heading}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <SidebarLink key={item.path} item={item} onNavigate={() => setDrawerRoute(null)} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="shrink-0 space-y-2 border-t border-slate-800 p-3">
        {/* Hidden rather than broken when the variable is unset (doc 04 §19.2). */}
        {SWAGGER_URL ? (
          <a
            href={SWAGGER_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="block rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            API documentation
          </a>
        ) : null}
      </div>
    </nav>
  )

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 lg:block no-print">{sidebar}</aside>

      {/* Mobile drawer */}
      {mobileNavOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden no-print">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setDrawerRoute(null)} aria-hidden="true" />
          <div className="absolute inset-y-0 left-0 w-64 shadow-xl">{sidebar}</div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3 no-print sm:px-4">
          <IconButton label="Open navigation" className="lg:hidden" onClick={() => setDrawerRoute(location.pathname)}>
            <Menu className="h-5 w-5" aria-hidden="true" />
          </IconButton>

          <div className="flex-1" />

          {/* User menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuRoute(menuOpen ? null : location.pathname)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              className="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-slate-100"
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">
                {initials(user?.fullName ?? '?')}
              </span>
              <span className="hidden text-left sm:block">
                <span className="block text-xs font-medium text-slate-900">{user?.fullName}</span>
                <span className="block text-[11px] text-slate-500">{user?.roleCode}</span>
              </span>
              <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden="true" />
            </button>

            {menuOpen ? (
              <div
                role="menu"
                className="absolute right-0 top-full z-40 mt-1 w-56 rounded-md border border-slate-200 bg-white py-1 shadow-lg"
              >
                <div className="border-b border-slate-100 px-3 py-2">
                  <p className="text-sm font-medium text-slate-900">{user?.fullName}</p>
                  <p className="text-xs text-slate-500">@{user?.username}</p>
                  <Badge className="mt-1.5">{user?.roleCode}</Badge>
                </div>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void handleLogout()}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        </header>

        <main className="flex-1 p-3 sm:p-4 lg:p-6">
          <Outlet />
        </main>

        <footer className="shrink-0 border-t border-slate-200 px-4 py-2 text-center text-[11px] text-slate-400 no-print">
          X-Trena WMS - University of Moratuwa, ITE3962 / ITE3965 - E2529106
        </footer>
      </div>
    </div>
  )
}
