import { Link } from 'react-router'
import { useAuth } from '../../lib/auth'
import { ROUTES, ROLE_LABELS } from '../../config/constants'
import { PageHeader } from '../../components/PageHeader'
import { Badge } from '../../components/ui'

export default function Home() {
  const { user, hasPermission } = useAuth()
  const permissionCount = user?.permissions?.length ?? 0

  return (
    <>
      <PageHeader
        title={`Welcome, ${user?.fullName ?? 'operator'}`}
        subtitle="X-Trena WMS — M1: Identity & Access"
        crumbs={[{ label: 'X-Trena WMS' }, { label: 'Dashboard' }]}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold text-slate-900">Signed in as</h2>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Username</dt>
              <dd className="font-medium text-slate-900">{user?.username}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Role</dt>
              <dd>{user ? <Badge tone="info">{ROLE_LABELS[user.roleCode]}</Badge> : null}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Permissions</dt>
              <dd className="font-medium text-slate-900">{permissionCount}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold text-slate-900">M1 — available now</h2>
          <ul className="space-y-1 text-sm text-slate-600">
            <li>Login · refresh · logout · session restore</li>
            <li>Route guards (auth + permission)</li>
            {hasPermission('users.read') ? (
              <li>
                <Link className="text-brand-600 underline underline-offset-2" to={ROUTES.adminUsers}>
                  User list + detail
                </Link>
              </li>
            ) : null}
          </ul>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-semibold text-slate-900">Coming next</h2>
          <p className="text-sm text-slate-600">
            M2 — master data, locations, user management CRUD and roles. Backend slices and pages arrive together.
          </p>
        </section>
      </div>
    </>
  )
}
