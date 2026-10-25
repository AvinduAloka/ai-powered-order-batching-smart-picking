import { useMemo, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from 'lucide-react'
import { IconButton, Select } from './ui'
import { EmptyState, ErrorState, LoadingState } from './States'
import { cn, formatInt } from '../lib/utils'
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '../config/constants'
import type { PagedResult } from '../types'

export interface Column<T> {
  /** Stable key. Also the sort field name unless `sortName` is given. */
  key: string
  header: ReactNode
  render: (row: T) => ReactNode
  sortName?: string
  align?: 'left' | 'right' | 'center'
  /** Hidden below `md`; the class name is applied to both th and td. */
  className?: string
  /** Hide this column entirely on small screens (responsive column budget). */
  hideOnMobile?: boolean
}

export interface DataTableProps<T> {
  caption: string
  columns: Column<T>[]
  result: PagedResult<T> | undefined
  isLoading: boolean
  error: unknown
  pageNumber: number
  pageSize: number
  sort?: string
  onPageChange: (pageNumber: number) => void
  onPageSizeChange: (pageSize: number) => void
  onSortChange?: (sort: string) => void
  onRetry?: () => void
  rowKey: (row: T) => string | number
  onRowClick?: (row: T) => void
  emptyTitle?: string
  emptyDescription?: ReactNode
  emptyAction?: ReactNode
  /** Rendered as a right-aligned header control, e.g. a filter reset button. */
  toolbar?: ReactNode
}

export function DataTable<T>({
  caption,
  columns,
  result,
  isLoading,
  error,
  pageNumber,
  pageSize,
  sort,
  onPageChange,
  onPageSizeChange,
  onSortChange,
  onRetry,
  rowKey,
  onRowClick,
  emptyTitle,
  emptyDescription,
  emptyAction,
  toolbar,
}: DataTableProps<T>) {
  const [announce, setAnnounce] = useState<string>('')

  const totalCount = result?.totalCount ?? 0
  const totalPages = result?.totalPages ?? 0
  const from = totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1
  const to = Math.min(pageNumber * pageSize, totalCount)

  const visibleColumns = useMemo(
    () => columns.map((c) => ({ ...c, cellClass: cn(c.align === 'right' && 'text-right', c.align === 'center' && 'text-center', c.hideOnMobile && 'hidden md:table-cell') })),
    [columns],
  )

  if (isLoading) return <LoadingState />
  if (error) return <ErrorState error={error} onRetry={onRetry} />
  if (!result || result.items.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
  }

  return (
    <div>
      {toolbar ? <div className="mb-3 flex flex-wrap items-center justify-end gap-2">{toolbar}</div> : null}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-slate-50">
            <tr>
              {visibleColumns.map((column) => {
                const sortName = column.sortName ?? column.key
                const isSorted = sort === sortName || sort === `-${sortName}`
                const isDesc = sort === `-${sortName}`
                const canSort = Boolean(onSortChange) && Boolean(sortName)
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={isSorted ? (isDesc ? 'descending' : 'ascending') : 'none'}
                    className={cn(
                      'whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600',
                      column.align === 'right' && 'text-right',
                      column.align === 'center' && 'text-center',
                      column.hideOnMobile && 'hidden md:table-cell',
                    )}
                  >
                    {canSort ? (
                      <button
                        type="button"
                        onClick={() => {
                          const next = isSorted && !isDesc ? `-${sortName}` : sortName
                          onSortChange?.(next)
                          setAnnounce(`Sorted by ${column.header} ${next.startsWith('-') ? 'descending' : 'ascending'}`)
                        }}
                        className="inline-flex items-center gap-1 hover:text-slate-900"
                      >
                        {column.header}
                        {isSorted ? (
                          isDesc ? (
                            <ArrowDown className="h-3 w-3" aria-hidden="true" />
                          ) : (
                            <ArrowUp className="h-3 w-3" aria-hidden="true" />
                          )
                        ) : null}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {result.items.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={
                  onRowClick
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          onRowClick(row)
                        }
                      }
                    : undefined
                }
                tabIndex={onRowClick ? 0 : undefined}
                role={onRowClick ? 'link' : undefined}
                className={cn('hover:bg-slate-50', onRowClick && 'cursor-pointer')}
              >
                {visibleColumns.map((column) => (
                  <td key={column.key} className={cn('px-3 py-2 align-middle text-slate-800', column.cellClass)}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-3 py-2">
        <div className="flex items-center gap-3 text-xs text-slate-600">
          <span className="tabular-nums">
            {totalCount === 0 ? 'No records' : `Showing ${formatInt(from)}-${formatInt(to)} of ${formatInt(totalCount)}`}
          </span>
          <label className="flex items-center gap-1">
            <span>Rows</span>
            <Select
              className="h-7 w-16 py-0 text-xs"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label="Rows per page"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </Select>
          </label>
        </div>
        <div className="flex items-center gap-1">
          <IconButton
            label="Previous page"
            disabled={pageNumber <= 1}
            onClick={() => onPageChange(pageNumber - 1)}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </IconButton>
          <span className="px-2 text-xs tabular-nums text-slate-600">
            Page {formatInt(pageNumber)} of {formatInt(Math.max(totalPages, 1))}
          </span>
          <IconButton
            label="Next page"
            disabled={totalPages === 0 || pageNumber >= totalPages}
            onClick={() => onPageChange(pageNumber + 1)}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </IconButton>
        </div>
      </nav>

      {/* Live region: a screen reader hears the page change without focus moving. */}
      <p className="sr-only" role="status" aria-live="polite">
        {announce || `Showing ${from} to ${to} of ${totalCount}`}
      </p>
    </div>
  )
}

/** Convenience default for the common `id` primary key. */
export const byId = <T extends { [key: string]: unknown }>(row: T, field = 'id'): string | number => {
  const value = row[field]
  return typeof value === 'number' || typeof value === 'string' ? value : JSON.stringify(row)
}

export { DEFAULT_PAGE_SIZE }
