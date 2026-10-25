import { useEffect, useMemo, useState } from 'react'
import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { get } from '../lib/api'
import { DEFAULT_PAGE_SIZE, SEARCH_DEBOUNCE_MS } from '../config/constants'
import type { PagedResult } from '../types'

export interface PagedQueryOptions {
  /** TanStack Query key. Keep it stable and specific. */
  queryKey: readonly unknown[]
  /** Endpoint path, e.g. '/users'. */
  url: string
  /** Extra filters. `undefined` entries are dropped by buildQuery. */
  filters?: Record<string, string | number | boolean | null | undefined>
  /** Enable search with a 300 ms debounce. */
  searchParam?: string
  enabled?: boolean
}

export interface PagedQueryResult<T> {
  query: UseQueryResult<PagedResult<T>, unknown>
  pageNumber: number
  pageSize: number
  sort: string
  search: string
  /** The value that is actually sent, i.e. the debounced one. */
  effectiveSearch: string
  params: Record<string, unknown>
  setPageNumber: (page: number) => void
  setPageSize: (size: number) => void
  setSort: (sort: string) => void
  setSearch: (search: string) => void
  resetPaging: () => void
}

export function usePagedQuery<T>({
  queryKey,
  url,
  filters,
  searchParam,
  enabled = true,
}: PagedQueryOptions): PagedQueryResult<T> {
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)
  const [sort, setSort] = useState('')
  const [search, setSearch] = useState('')
  const [effectiveSearch, setEffectiveSearch] = useState('')

  // Debounce the search box. 300 ms is long enough to avoid a request per
  // keystroke and short enough to feel immediate.
  useEffect(() => {
    const handle = window.setTimeout(() => setEffectiveSearch(search), SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(handle)
  }, [search])

  // A page number is only meaningful for the filter/search/size combination it
  // was chosen under: changing a filter on page 5 would otherwise ask for a page
  // 5 that no longer exists. React's documented "adjust state during render"
  // pattern resets it: store the signature the current page belongs to and, when
  // the signature changes, update both states in the same render. That is
  // cheaper than the effect that used to call setPageNumber(1) after the fact
  // (react-hooks/set-state-in-effect).
  const filterSignature = JSON.stringify(filters ?? {})
  const activeSignature = `${filterSignature}|${pageSize}|${effectiveSearch}`
  const [pageNumber, setPageNumber] = useState(1)
  const [syncedSignature, setSyncedSignature] = useState(activeSignature)
  if (syncedSignature !== activeSignature) {
    setSyncedSignature(activeSignature)
    setPageNumber(1)
  }

  const params = useMemo<Record<string, unknown>>(() => {
    const base: Record<string, unknown> = { pageNumber, pageSize, ...(filters ?? {}) }
    if (sort) base.sort = sort
    if (searchParam && effectiveSearch) base[searchParam] = effectiveSearch
    return base
  }, [pageNumber, pageSize, filters, sort, searchParam, effectiveSearch])

  const query = useQuery<PagedResult<T>>({
    // The params are part of the key: two different filters must never share a
    // cache entry.
    queryKey: [...queryKey, params],
    queryFn: ({ signal }) => get<PagedResult<T>>(url, { params, signal }),
    enabled,
    // Keep the previous page on screen while the next one loads. On a paged
    // table, blanking 25 rows to show a spinner is the wrong trade.
    placeholderData: (previous) => previous,
  })

  return {
    query,
    pageNumber,
    pageSize,
    sort,
    search,
    effectiveSearch,
    params,
    setPageNumber,
    setPageSize,
    setSort: (next) => {
      setSort(next)
      setPageNumber(1)
    },
    setSearch,
    resetPaging: () => setPageNumber(1),
  }
}
