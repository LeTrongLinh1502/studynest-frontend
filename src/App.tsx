import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/useAuth'
import ProtectedRoute from './auth/ProtectedRoute'
import PublicOnlyRoute from './auth/PublicOnlyRoute'
import RoleRoute from './auth/RoleRoute'
import WorkspaceLayout from './components/WorkspaceLayout'
import DashboardPage from './pages/RoleDashboardPage'
import ForbiddenPage from './pages/ForbiddenPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import AdminCatalogPage from './pages/phaseA/AdminCatalogPage'
import AdminApplicationsPage from './pages/phaseA/AdminApplicationsPage'
import TeacherClassesPage from './pages/phaseA/TeacherClassesPage'
import TeacherClassDetailPage from './pages/phaseA/TeacherClassDetailPage'
import TeacherLessonsPage from './pages/phaseA/TeacherLessonListPage'
import LessonEditorPage from './pages/phaseA/LessonEditorPage'
import StudentClassesPage from './pages/phaseA/StudentClassesPage'
import StudentLessonsPage from './pages/phaseA/StudentLessonsPage'
import StudentLessonPage from './pages/phaseA/StudentLessonPage'
import StudentTeacherApplicationPage from './pages/phaseA/StudentTeacherApplicationPage'
import { TeacherQuestionsPage, TeacherQuizEditorPage, TeacherQuizResultsPage, TeacherClassAnalyticsPage } from './pages/phaseB/TeacherPages'
import TeacherQuizListPage from './pages/phaseB/TeacherQuizListPage'
import { StudentAttemptPage, StudentResultPage } from './pages/phaseB/StudentPages'
import { StudentQuizDetailPage } from './pages/phaseB/StudentQuizPages'
import StudentPracticePage from './pages/phaseB/StudentPracticePage'
import StudentResultsPage from './pages/phaseB/StudentResultsPage'
import { AdminReportsPage, AdminAuditPage } from './pages/phaseB/AdminPages'
import './App.css'
import './workspace.css'
import './interface-upgrade.css'
import './auth-mockup.css'
import './workspace-header.css'

function HomeRedirect() {
  const { isAuthenticated } = useAuth()
  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />
}

function App() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<WorkspaceLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/forbidden" element={<ForbiddenPage />} />
          <Route element={<RoleRoute role="ADMIN" />}>
            <Route path="/admin/catalog" element={<AdminCatalogPage />} />
            <Route path="/admin/teacher-applications" element={<AdminApplicationsPage />} />
            <Route path="/admin/content-reports" element={<AdminReportsPage />} />
            <Route path="/admin/audit-events" element={<AdminAuditPage />} />
          </Route>
          <Route element={<RoleRoute role="TEACHER" />}>
            <Route path="/teacher/classes" element={<TeacherClassesPage />} />
            <Route path="/teacher/classes/:id" element={<TeacherClassDetailPage />} />
            <Route path="/teacher/lessons" element={<TeacherLessonsPage />} />
            <Route path="/teacher/lessons/new" element={<LessonEditorPage />} />
            <Route path="/teacher/lessons/:id" element={<LessonEditorPage />} />
            <Route path="/teacher/questions" element={<TeacherQuestionsPage />} />
            <Route path="/teacher/quizzes" element={<TeacherQuizListPage />} />
            <Route path="/teacher/quizzes/new" element={<TeacherQuizEditorPage />} />
            <Route path="/teacher/quizzes/:id" element={<TeacherQuizEditorPage />} />
            <Route path="/teacher/quizzes/:id/results" element={<TeacherQuizResultsPage />} />
            <Route path="/teacher/classes/:id/analytics" element={<TeacherClassAnalyticsPage />} />
          </Route>
          <Route element={<RoleRoute role="STUDENT" />}>
            <Route path="/student/classes" element={<StudentClassesPage />} />
            <Route path="/student/lessons" element={<StudentLessonsPage />} />
            <Route path="/student/lessons/:id" element={<StudentLessonPage />} />
            <Route path="/student/teacher-application" element={<StudentTeacherApplicationPage />} />
            <Route path="/student/quizzes" element={<StudentPracticePage />} />
            <Route path="/student/results" element={<StudentResultsPage />} />
            <Route path="/student/quizzes/:id" element={<StudentQuizDetailPage />} />
            <Route path="/student/attempts/:id" element={<StudentAttemptPage />} />
            <Route path="/student/attempts/:id/result" element={<StudentResultPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  )
}

export default App
