export type UserRole = 'admin' | 'operator'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
}
