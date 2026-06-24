export const routePaths = {
  login: '/login',
  dashboard: '/',
  attendance: '/attendance',
  attendanceReport: '/attendance-report',
  leave: '/leave',
  overtime: '/overtime',
  requests: '/requests',
  requestLeaveDetail: '/requests/leave/:id',
  requestOvertimeDetail: '/requests/overtime/:id',
  attendanceRecap: '/attendance-recap',
  recap: '/recap',
  approvals: '/approvals',
  users: '/users',
  userNew: '/users/new',
  userDetail: '/users/:id',
  userEdit: '/users/:id/edit',
} as const

export type RoutePath = (typeof routePaths)[keyof typeof routePaths]

/** Build the concrete path to a user's detail page. */
export const userDetailPath = (id: number | string) => `/users/${id}`

/** Build the concrete path to a user's edit page. */
export const userEditPath = (id: number | string) => `/users/${id}/edit`

/** Build the concrete path to a leave request's detail page. */
export const requestLeaveDetailPath = (id: number | string) => `/requests/leave/${id}`

/** Build the concrete path to an overtime request's detail page. */
export const requestOvertimeDetailPath = (id: number | string) => `/requests/overtime/${id}`
