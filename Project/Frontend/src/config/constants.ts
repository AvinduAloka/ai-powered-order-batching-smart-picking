/**
 * Routes, permission keys and navigation — M1 subset.
 *
 * 40 permission keys doc 12 §9.3 catalogue එකේ 25 rows realise කරනවා — UI
 * එකක් branch වෙන්නේ **action** එකකින්, catalogue row එකකින් නෙවෙයි.
 *
 * ★ M1: NAV_GROUPS එකේ M1 links විතරය්. M2 එකේදී code.md §5.3a එකේ full
 *   NAV_GROUPS list එක මේකට replace කරන්න.
 */
import type { RoleCode } from '../types'

/* ------------------------------------------------------------------ */
/* Application identity                                                */
/* ------------------------------------------------------------------ */

export const APP_NAME = 'X-Trena WMS'
export const APP_SUBTITLE = 'Warehouse Management System'

/* ------------------------------------------------------------------ */
/* Routes — single source of truth                                     */
/* ------------------------------------------------------------------ */

/**
 * M2-M9 paths දැනටමත් මේකේ තියෙනවා (link එකක් හදන්න ඕන වුණාම use කරන්න).
 * M1 එකේ **register වෙලා තියෙන්නේ** App.tsx §8.1 එකේ routes විතරය්.
 */
export const ROUTES = {
  login: '/login',
  forbidden: '/forbidden',
  error: '/error',

  dashboard: '/dashboard',

  adminUsers: '/admin/users',
  adminRoles: '/admin/roles',
  adminEmployees: '/admin/employees',

  masterProducts: '/master/products',
  masterCategoriesSuppliers: '/master/categories-suppliers',

  locationsTree: '/locations/tree',
  locationsCarts: '/locations/carts',

  receipts: '/inbound/receipts',
  receiptNew: '/inbound/receipts/new',
  receiptDetail: (id: number | string) => `/inbound/receipts/${id}`,
  discrepancies: '/inbound/discrepancies',
  recommendations: (receiptId: number | string) => `/inbound/recommendations/${receiptId}`,
  putAway: (receiptId: number | string) => `/inbound/put-away/${receiptId}`,

  inventoryStock: '/inventory/stock',
  inventoryLedger: '/inventory/ledger',

  orders: '/orders',
  orderNew: '/orders/new',
  orderDetail: (id: number | string) => `/orders/${id}`,
  orderValidation: (id: number | string) => `/orders/${id}/validation`,

  optimizationRuns: '/optimization/runs',
  optimizationRunDetail: (id: number | string) => `/optimization/runs/${id}`,

  pickingTasks: '/picking/tasks',
  pickingBatch: (id: number | string) => `/picking/batches/${id}`,
  pickingConsolidated: (id: number | string) => `/picking/batches/${id}/consolidated`,

  sorting: (batchId: number | string) => `/sorting/${batchId}`,

  packing: '/packing',

  reports: (reportKey: string) => `/reports/${reportKey}`,

  notifications: '/notifications',

  integrationOrders: '/integration/orders',
  integrationApiClients: '/integration/api-clients',

  about: '/about',
} as const

/* ------------------------------------------------------------------ */
/* Permissions                                                         */
/* ------------------------------------------------------------------ */

export const PERMISSIONS = [
  'users.read',
  'users.write',
  'users.delete',
  'roles.read',
  'roles.write',
  'roles.delete',
  'apiClients.manage',
  'masterData.read',
  'masterData.write',
  'locations.read',
  'locations.write',
  'carts.read',
  'carts.write',
  'employees.read',
  'employees.write',
  'workload.view',
  'orders.read',
  'orders.write',
  'orders.delete',
  'orders.validate',
  'optimization.run',
  'optimization.read',
  'optimization.assign',
  'discrepancies.read',
  'discrepancies.resolve',
  'receipts.read',
  'receipts.write',
  'receipts.verify',
  'recommendations.read',
  'recommendations.decide',
  'putaway.confirm',
  'inventory.read',
  'inventory.adjust',
  'inventory.reserve',
  'picking.view',
  'picking.record',
  'allocation.execute',
  'shipment.execute',
  'reports.view',
  'dashboard.view',
] as const

export type Permission = (typeof PERMISSIONS)[number]

/** Roles screen (W-03) + nav filter grouping — M2 එකේ පාවිච්චියට. */
export const PERMISSION_DOMAINS = [
  'users',
  'roles',
  'apiClients',
  'masterData',
  'locations',
  'carts',
  'employees',
  'workload',
  'orders',
  'optimization',
  'discrepancies',
  'receipts',
  'recommendations',
  'putaway',
  'inventory',
  'picking',
  'allocation',
  'shipment',
  'reports',
  'dashboard',
] as const

export const ROLE_CODES: readonly RoleCode[] = ['ADMIN', 'MANAGER', 'EMPLOYEE'] as const

export const ROLE_LABELS: Record<RoleCode, string> = {
  ADMIN: 'Administrator',
  MANAGER: 'Manager',
  EMPLOYEE: 'Employee',
}

const EMPLOYEE_PERMISSIONS: readonly Permission[] = [
  'masterData.read',
  'locations.read',
  'carts.read',
  'orders.read',
  'optimization.read',
  'discrepancies.read',
  'receipts.read',
  'receipts.write',
  'receipts.verify',
  'recommendations.read',
  'recommendations.decide',
  'putaway.confirm',
  'inventory.read',
  'inventory.reserve',
  'picking.view',
  'picking.record',
  'allocation.execute',
  'shipment.execute',
]

const MANAGER_ONLY_PERMISSIONS: readonly Permission[] = [
  'masterData.write',
  'locations.write',
  'carts.write',
  'employees.read',
  'employees.write',
  'workload.view',
  'orders.write',
  'orders.delete',
  'orders.validate',
  'optimization.run',
  'optimization.assign',
  'discrepancies.resolve',
  'inventory.adjust',
  'reports.view',
  'dashboard.view',
]

export const ROLE_PERMISSIONS: Record<RoleCode, readonly Permission[]> = {
  EMPLOYEE: EMPLOYEE_PERMISSIONS,
  MANAGER: [...EMPLOYEE_PERMISSIONS, ...MANAGER_ONLY_PERMISSIONS],
  ADMIN: [
    ...EMPLOYEE_PERMISSIONS,
    ...MANAGER_ONLY_PERMISSIONS,
    'users.read',
    'users.write',
    'users.delete',
    'roles.read',
    'roles.write',
    'roles.delete',
    'apiClients.manage',
  ],
}


// Navigation
export interface NavItem {
  label: string
  path: string
  permission?: Permission
  icon: string
}

export interface NavGroup {
  heading: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    heading: 'Overview',
    items: [{ label: 'Dashboard', path: ROUTES.dashboard, icon: 'gauge' }],
  },
  {
    heading: 'Administration',
    items: [{ label: 'Users', path: ROUTES.adminUsers, permission: 'users.read', icon: 'users' }],
  },
]

//Paging                                                              
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const
export const DEFAULT_PAGE_SIZE = 25
export const SEARCH_DEBOUNCE_MS = 300

// api.ts timeout budget — solver client
export const SOLVER_CLIENT_TIMEOUT_MS = 5000

// Badge tones
export type BadgeTone = 'neutral' | 'ok' | 'warn' | 'fault' | 'info' | 'ext'