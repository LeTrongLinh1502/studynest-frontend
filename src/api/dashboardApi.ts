import { get } from './httpClient'

export interface StudentDashboard {
  role: 'STUDENT'
  summary: { classCount: number; completedLessons: number; submittedAttempts: number; averagePercent: number | null }
  suggestedLessons: { id: number; title: string; summary: string | null; topicId: number }[]
  recentAttempts: { id: number; quizTitle: string; status: 'IN_PROGRESS' | 'SUBMITTED'; startedAt: string; submittedAt: string | null }[]
  activityDays: { day: string }[]
}

export interface TeacherDashboard {
  role: 'TEACHER'
  summary: { classCount: number; publishedLessons: number; publishedQuizzes: number; questionCount: number }
  classes: { id: number; name: string; joinCode: string; studentCount: number }[]
  lessons: { id: number; title: string; status: string; updatedAt: string }[]
  quizzes: { id: number; title: string; status: string; createdAt: string }[]
}

export interface AdminDashboard {
  role: 'ADMIN'
  summary: { userCount: number; classCount: number; pendingApplications: number; pendingReports: number }
  applications: { id: number; fullName: string; email: string; createdAt: string }[]
  reports: { id: number; targetType: string; targetId: number; reason: string; createdAt: string }[]
  activity: { day: string; total: number }[]
}

export type DashboardData = StudentDashboard | TeacherDashboard | AdminDashboard
export const dashboardApi = { get: () => get<DashboardData>('/api/dashboard') }
