export type RoleSlug =
  | 'super-admin'
  | 'admin-bagian'
  | 'karyawan'
  | 'hrd'
  | 'direktur'

export interface Role {
  id: number
  name: string
  slug: RoleSlug
}

export interface Department {
  id: number
  name: string
  manager_user_id: number | null
  manager?: User | null
}

export interface User {
  id: number
  name: string
  email: string
  employee_id: string | null
  phone: string | null
  avatar_url: string | null
  joined_at: string | null
  is_active: boolean
  department_id: number | null
  role_id: number | null
  department?: Department | null
  role?: Role | null
}
