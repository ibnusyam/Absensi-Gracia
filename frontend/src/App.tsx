import { Navigate, Route, Routes } from 'react-router-dom'
import { useIsMobile } from '@/hooks/useIsMobile'
import { AppLayout } from '@/components/layout/AppLayout'
import { MobileLayout } from '@/components/layout/MobileLayout'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { routePaths } from '@/routes/routePaths'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage'
import { MobileHomePage } from '@/features/dashboard/pages/MobileHomePage'
import { AttendancePage } from '@/features/attendance/pages/AttendancePage'
import { MobileAttendancePage } from '@/features/attendance/pages/MobileAttendancePage'
import { AttendanceReportPage } from '@/features/attendanceReport/pages/AttendanceReportPage'
import { MobileAttendanceReportPage } from '@/features/attendanceReport/pages/MobileAttendanceReportPage'
import { LeavePage } from '@/features/leave/pages/LeavePage'
import { MobileLeavePage } from '@/features/leave/pages/MobileLeavePage'
import { OvertimePage } from '@/features/overtime/pages/OvertimePage'
import { MobileOvertimePage } from '@/features/overtime/pages/MobileOvertimePage'
import { RequestsPage } from '@/features/requests/pages/RequestsPage'
import { MobileRequestsPage } from '@/features/requests/pages/MobileRequestsPage'
import { RequestDetailPage } from '@/features/requests/pages/RequestDetailPage'
import { MobileRequestDetailPage } from '@/features/requests/pages/MobileRequestDetailPage'
import { RecapPage } from '@/features/recap/pages/RecapPage'
import { MobileRecapPage } from '@/features/recap/pages/MobileRecapPage'
import { AttendanceRecapPage } from '@/features/recap/pages/AttendanceRecapPage'
import { MobileAttendanceRecapPage } from '@/features/recap/pages/MobileAttendanceRecapPage'
import { ApprovalPage } from '@/features/approval/pages/ApprovalPage'
import { MobileApprovalPage } from '@/features/approval/pages/MobileApprovalPage'
import { UsersPage } from '@/features/users/pages/UsersPage'
import { MobileUsersPage } from '@/features/users/pages/MobileUsersPage'
import { UserDetailPage } from '@/features/users/pages/UserDetailPage'
import { MobileUserDetailPage } from '@/features/users/pages/MobileUserDetailPage'
import { UserFormPage } from '@/features/users/pages/UserFormPage'
import { MobileUserFormPage } from '@/features/users/pages/MobileUserFormPage'

function App() {
  const isMobile = useIsMobile()

  return (
    <Routes>
      {/* Public */}
      <Route path={routePaths.login} element={<LoginPage />} />

      {/* Authenticated */}
      <Route element={<ProtectedRoute />}>
        <Route element={isMobile ? <MobileLayout /> : <AppLayout />}>
          <Route index element={isMobile ? <MobileHomePage /> : <DashboardPage />} />
          <Route
            path={routePaths.attendance}
            element={isMobile ? <MobileAttendancePage /> : <AttendancePage />}
          />
          <Route element={<ProtectedRoute roles={['super-admin', 'hrd', 'direktur', 'admin-bagian']} />}>
            <Route
              path={routePaths.attendanceReport}
              element={isMobile ? <MobileAttendanceReportPage /> : <AttendanceReportPage />}
            />
          </Route>
          <Route
            path={routePaths.leave}
            element={isMobile ? <MobileLeavePage /> : <LeavePage />}
          />
          <Route
            path={routePaths.overtime}
            element={isMobile ? <MobileOvertimePage /> : <OvertimePage />}
          />
          <Route
            path={routePaths.users}
            element={isMobile ? <MobileUsersPage /> : <UsersPage />}
          />
          {/* Create / edit employee — managers only */}
          <Route element={<ProtectedRoute roles={['super-admin', 'hrd']} />}>
            <Route
              path={routePaths.userNew}
              element={isMobile ? <MobileUserFormPage mode="create" /> : <UserFormPage mode="create" />}
            />
            <Route
              path={routePaths.userEdit}
              element={isMobile ? <MobileUserFormPage mode="edit" /> : <UserFormPage mode="edit" />}
            />
          </Route>
          <Route
            path={routePaths.userDetail}
            element={isMobile ? <MobileUserDetailPage /> : <UserDetailPage />}
          />

          {/* Monitoring: all employees' submissions */}
          <Route element={<ProtectedRoute roles={['super-admin', 'hrd', 'direktur']} />}>
            <Route
              path={routePaths.requests}
              element={isMobile ? <MobileRequestsPage /> : <RequestsPage />}
            />
            <Route
              path={routePaths.requestLeaveDetail}
              element={
                isMobile ? <MobileRequestDetailPage kind="leave" /> : <RequestDetailPage kind="leave" />
              }
            />
            <Route
              path={routePaths.requestOvertimeDetail}
              element={
                isMobile ? (
                  <MobileRequestDetailPage kind="overtime" />
                ) : (
                  <RequestDetailPage kind="overtime" />
                )
              }
            />
            <Route
              path={routePaths.attendanceRecap}
              element={isMobile ? <MobileAttendanceRecapPage /> : <AttendanceRecapPage />}
            />
            <Route
              path={routePaths.recap}
              element={isMobile ? <MobileRecapPage /> : <RecapPage />}
            />
          </Route>

          {/* HRD / Direktur only */}
          <Route element={<ProtectedRoute roles={['hrd', 'direktur']} />}>
            <Route
              path={routePaths.approvals}
              element={isMobile ? <MobileApprovalPage /> : <ApprovalPage />}
            />
          </Route>
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to={routePaths.dashboard} replace />} />
    </Routes>
  )
}

export default App
