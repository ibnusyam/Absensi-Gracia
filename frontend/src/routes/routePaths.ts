export const routePaths = {
  login: '/login',
  dashboard: '/',
  attendance: '/attendance',
  attendanceReport: '/attendance-report',
  leave: '/leave',
  overtime: '/overtime',
  requests: '/requests',
  recap: '/recap',
  approvals: '/approvals',
  users: '/users',
  userDetail: '/users/:id',
} as const

export type RoutePath = (typeof routePaths)[keyof typeof routePaths]

/** Build the concrete path to a user's detail page. */
export const userDetailPath = (id: number | string) => `/users/${id}`
