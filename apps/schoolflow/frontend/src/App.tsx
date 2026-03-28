import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './store/auth'
import { useParentPortalStore } from './store/parentPortal'
import LoginPage from './pages/auth/LoginPage'
import Layout from './components/layout/Layout'
import DashboardPage from './pages/dashboard/DashboardPage'
import StudentsPage from './pages/students/StudentsPage'
import ClassesPage from './pages/classes/ClassesPage'
import GradesPage from './pages/grades/GradesPage'
import FeesPage from './pages/fees/FeesPage'
import TakeAttendancePage from './pages/attendance/TakeAttendancePage'
import AttendanceHistoryPage from './pages/attendance/AttendanceHistoryPage'
import AttendanceReportsPage from './pages/attendance/AttendanceReportsPage'
import TimeSlotsPage from './pages/timetable/TimeSlotsPage'
import ClassTimetablePage from './pages/timetable/ClassTimetablePage'
import TeacherTimetablePage from './pages/timetable/TeacherTimetablePage'

// Parent Portal
import PortalLoginPage from './pages/portal/PortalLoginPage'
import PortalLayout from './components/portal/PortalLayout'
import PortalDashboardPage from './pages/portal/PortalDashboardPage'
import ChildrenPage from './pages/portal/ChildrenPage'
import ChildDetailPage from './pages/portal/ChildDetailPage'
import GradesPagePortal from './pages/portal/GradesPage'
import AttendancePagePortal from './pages/portal/AttendancePage'
import TimetablePagePortal from './pages/portal/TimetablePage'
import FeesPagePortal from './pages/portal/FeesPage'
import MessagesPage from './pages/portal/MessagesPage'
import NotificationsPage from './pages/portal/NotificationsPage'
import ProfilePage from './pages/portal/ProfilePage'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = useAuthStore(s => s.user)
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function RequirePortalAuth({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useParentPortalStore(s => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/portal/login" replace />
  return <>{children}</>
}

export default function App() {
  const init = useAuthStore(s => s.init)
  const initPortalAuth = useParentPortalStore(s => s.initAuth)
  
  useEffect(() => { init() }, [init])
  useEffect(() => { initPortalAuth() }, [initPortalAuth])
  
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        {/* Admin Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="students" element={<StudentsPage />} />
          <Route path="classes" element={<ClassesPage />} />
          <Route path="grades" element={<GradesPage />} />
          <Route path="fees" element={<FeesPage />} />
          <Route path="attendance" element={<TakeAttendancePage />} />
          <Route path="attendance/history" element={<AttendanceHistoryPage />} />
          <Route path="attendance/reports" element={<AttendanceReportsPage />} />
          <Route path="timetable/slots" element={<TimeSlotsPage />} />
          <Route path="timetable/class" element={<ClassTimetablePage />} />
          <Route path="timetable/teacher" element={<TeacherTimetablePage />} />
        </Route>

        {/* Parent Portal Routes */}
        <Route path="/portal/login" element={<PortalLoginPage />} />
        <Route path="/portal" element={<RequirePortalAuth><PortalLayout /></RequirePortalAuth>}>
          <Route index element={<PortalDashboardPage />} />
          <Route path="children" element={<ChildrenPage />} />
          <Route path="children/:id" element={<ChildDetailPage />} />
          <Route path="grades" element={<GradesPagePortal />} />
          <Route path="attendance" element={<AttendancePagePortal />} />
          <Route path="timetable" element={<TimetablePagePortal />} />
          <Route path="fees" element={<FeesPagePortal />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
