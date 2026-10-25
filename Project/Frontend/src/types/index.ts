// list endpoints - envelope
export interface PagedResult<T> {
  items: T[]
  pageNumber: number
  pageSize: number
  totalCount: number
  totalPages: number
}

export interface ProblemDetails {
  type: string
  code?: string
  title: string
  status: number
  detail: string
  instance: string
  correlationId: string
  timestampUtc: string
  errors?: Record<string, string[]>
}

export type RoleCode = 'ADMIN' | 'MANAGER' | 'EMPLOYEE'

export interface LoginRequest {
  username: string
  password: string
}

export interface AuthUser {
  userId: string
  username: string
  fullName: string
  roleCode: RoleCode
  employeeId: number | null
  permissions: string[]
}

export interface LoginResponse {
  accessToken: string
  expiresAtUtc: string
  user: AuthUser
}

export interface MetaTimeDto {
  serverTimeUtc: string
}

export interface UserRow {
  id: string
  username: string
  fullName: string
  email: string | null
  isActive: boolean
  roles: string[]
  employeeId: number | null
  lastLoginAtUtc: string | null
}

export interface UserListResponse {
  total: number
  page: number
  size: number
  rows: UserRow[]
}