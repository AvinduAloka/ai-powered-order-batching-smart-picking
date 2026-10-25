import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Eye } from 'lucide-react'
import { get } from '../../lib/api'
import { normaliseProblem } from '../../lib/problem'
import { formatDateTime } from '../../lib/utils'
import { APP_NAME, ROUTES } from '../../config/constants'
import type { PagedResult, UserListResponse, UserRow } from '../../types'
import { Alert, Badge, Button, Field, Input, Modal, Toolbar } from '../../components/ui'
import { PageHeader } from '../../components/PageHeader'
import { DataTable, type Column } from '../../components/DataTable'
import { LoadingState } from '../../components/States'

const USERS_KEY = ['users'] as const
const SEARCH_DEBOUNCE_MS = 300

export default function Users() {
  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [search, setSearch] = useState('')
  const [effectiveSearch, setEffectiveSearch] = useState('')
  const [detailId, setDetailId] = useState<string | null>(null)

  // 300 ms debounce — keystroke එකකට request එකක් යවන්නේ නෑ.
  useEffect(() => {
    const handle = window.setTimeout(() => {
      setEffectiveSearch(search.trim())
      setPageNumber(1)
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(handle)
  }, [search])

  const list = useQuery<UserListResponse>({
    queryKey: [...USERS_KEY, pageNumber, pageSize, effectiveSearch],
    queryFn: ({ signal }) =>
      get<UserListResponse>('/users', {
        // ★ M1 params: q / page / size (pageNumber, pageSize නෙවෙයි)
        params: { page: pageNumber, size: pageSize, q: effectiveSearch || undefined },
        signal,
      }),
    // පරණ page එක screen එකේ තියෙන්න දෙනවා — spinner එකට 25 rows blank කරන්නේ නෑ.
    placeholderData: (previous) => previous,
  })

  /**
   * ★ M1 adapter: backend = { total, page, size, rows }; DataTable = PagedResult<T>.
   * The whole difference lives in this one useMemo — M2 backend envelope
   * එක align වුණාම මේක delete කරන්න.
   */
  const result: PagedResult<UserRow> | undefined = useMemo(() => {
    const data = list.data
    if (!data) return undefined
    return {
      items: data.rows,
      pageNumber: data.page,
      pageSize: data.size,
      totalCount: data.total,
      totalPages: Math.max(1, Math.ceil(data.total / data.size)),
    }
  }, [list.data])

  const detail = useQuery<UserRow>({
    queryKey: [...USERS_KEY, 'detail', detailId],
    queryFn: ({ signal }) => get<UserRow>(`/users/${detailId}`, { signal }),
    enabled: detailId !== null,
  })

  const columns: Column<UserRow>[] = [
    {
      key: 'username',
      header: 'Username',
      render: (row) => (
        <button
          type="button"
          className="font-medium text-brand-600 hover:underline"
          onClick={() => setDetailId(row.id)}
        >
          {row.username}
        </button>
      ),
    },
    {
      key: 'fullName',
      header: 'Name',
      hideOnMobile: true,
      render: (row) => <span className="text-slate-700">{row.fullName}</span>,
    },
    {
      key: 'email',
      header: 'Email',
      hideOnMobile: true,
      render: (row) =>
        row.email ? <span className="text-slate-600">{row.email}</span> : <span className="text-slate-400">&mdash;</span>,
    },
    {
      key: 'roles',
      header: 'Roles',
      render: (row) => (
        <span className="flex flex-wrap gap-1">
          {row.roles.length === 0 ? (
            <span className="text-slate-400">&mdash;</span>
          ) : (
            row.roles.map((role) => (
              <Badge key={role} tone={role === 'ADMIN' ? 'ext' : 'info'}>
                {role}
              </Badge>
            ))
          )}
        </span>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (row) =>
        row.isActive ? <Badge tone="ok">Active</Badge> : <Badge tone="neutral">Inactive</Badge>,
    },
    {
      key: 'lastLoginAtUtc',
      header: 'Last login',
      hideOnMobile: true,
      render: (row) =>
        row.lastLoginAtUtc ? (
          <span className="text-xs text-slate-600">{formatDateTime(row.lastLoginAtUtc)}</span>
        ) : (
          <span className="text-xs text-slate-400">Never</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <Button variant="ghost" size="sm" onClick={() => setDetailId(row.id)} aria-label={`View ${row.username}`}>
          <Eye className="h-4 w-4" aria-hidden="true" />
        </Button>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Users"
        subtitle="M1 read-only view: GET /users (paged, searchable) + GET /users/{id}. Create, edit, delete, reset-password and unlock arrive with M2."
        crumbs={[{ label: APP_NAME, to: ROUTES.dashboard }, { label: 'Admin' }, { label: 'Users' }]}
        actions={<Badge tone="neutral">Read only · M1</Badge>}
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Field label="Search">
          {({ id }) => (
            <Input
              id={id}
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="username, name or email"
              className="w-64"
            />
          )}
        </Field>
      </div>

      <DataTable<UserRow>
        caption="X-Trena users"
        columns={columns}
        result={result}
        isLoading={list.isLoading}
        error={list.error}
        pageNumber={pageNumber}
        pageSize={pageSize}
        onPageChange={setPageNumber}
        onPageSizeChange={(size) => {
          setPageSize(size)
          setPageNumber(1)
        }}
        onRetry={() => void list.refetch()}
        rowKey={(row) => row.id}
        emptyTitle="No users match this search"
        emptyDescription="Clear the search box. (Creating users arrives with M2.)"
      />

      {/* Detail — GET /users/{id}. M1 එකේ list row එකේම fields තියෙනවා; endpoint
          එක වෙනම call කරන නිසා FR-010 read slice එක demo වෙනවා. */}
      <Modal
        open={detailId !== null}
        onClose={() => setDetailId(null)}
        title={detail.data ? `User ${detail.data.username}` : 'User'}
        description="GET /users/{id}"
        footer={
          <Button variant="secondary" onClick={() => setDetailId(null)}>
            Close
          </Button>
        }
      >
        {detail.isLoading ? <LoadingState label="Loading user" rows={3} /> : null}
        {detail.error ? <Alert tone="error" title={normaliseProblem(detail.error).message} /> : null}
        {detail.data ? (
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-slate-500">User id</dt>
              <dd className="break-all font-mono text-xs">{detail.data.id}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Username</dt>
              <dd className="font-medium text-slate-900">{detail.data.username}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Full name</dt>
              <dd>{detail.data.fullName}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Email</dt>
              <dd>{detail.data.email ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Roles</dt>
              <dd className="flex flex-wrap gap-1">
                {detail.data.roles.map((role) => (
                  <Badge key={role} tone={role === 'ADMIN' ? 'ext' : 'info'}>
                    {role}
                  </Badge>
                ))}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Employee id</dt>
              <dd>{detail.data.employeeId ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">State</dt>
              <dd>{detail.data.isActive ? <Badge tone="ok">Active</Badge> : <Badge tone="neutral">Inactive</Badge>}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Last login</dt>
              <dd>{detail.data.lastLoginAtUtc ? formatDateTime(detail.data.lastLoginAtUtc) : 'Never'}</dd>
            </div>
          </dl>
        ) : null}
      </Modal>

      <Toolbar>
        <span className="text-xs text-slate-500">
          {list.data?.total ?? 0} user(s) &middot; GET /users
        </span>
      </Toolbar>
    </>
  )
}
