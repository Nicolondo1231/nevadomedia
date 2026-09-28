export type UserRole = 'admin' | 'operator'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
}

/** Sections an operator may open. Finance and anything money-bearing is absent. */
export const OPERATOR_SECTIONS = [
  'command-center',
  'client-tracker',
  'content-performance',
  'content-pipeline',
  'calls',
  'team',
] as const
