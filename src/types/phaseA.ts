export type Role = 'ADMIN' | 'TEACHER' | 'STUDENT'
export type RecordStatus = 'ACTIVE' | 'ARCHIVED'

export interface Subject { id: number; code: string; name: string; status: RecordStatus; createdAt: string }
export interface Topic { id: number; subjectId: number; parentTopicId: number | null; code: string; name: string; sortOrder: number; status: RecordStatus }
export interface TeacherApplication {
  id: number; userId: number; fullName?: string; email?: string; reason: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED'; reviewedBy: number | null; reviewNote: string | null
  createdAt: string; reviewedAt: string | null
}
export interface StudyClass {
  id: number; teacherId: number; teacherName?: string; name: string; description: string | null
  joinCode?: string; status: RecordStatus; createdAt: string; joinedAt?: string
  memberCount?: number; lessonCount?: number; quizCount?: number; completedLessons?: number; submittedQuizzes?: number
}
export interface ClassMember {
  id: number; classId: number; studentId: number; fullName: string; email: string
  status: 'ACTIVE' | 'REMOVED'; joinedAt: string
}
export interface LessonResource {
  id: number; lessonId: number; resourceType: 'FILE' | 'VIDEO_LINK' | 'EXTERNAL_LINK'
  title: string; externalUrl: string | null; originalName: string | null; mimeType: string | null
  sizeBytes: number | null; sortOrder: number; createdAt: string
}
export interface Lesson {
  id: number; teacherId: number; topicId: number; title: string; summary: string | null; body: string | null
  subjectId?: number; subjectName?: string; topicName?: string; fileCount?: number; videoCount?: number
  visibility: 'PUBLIC' | 'CLASS'; status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  publishedAt: string | null; createdAt: string; updatedAt: string; resources?: LessonResource[]; completed?: boolean
}
export interface ClassAssignment {
  id: number; classId: number; className?: string; targetType?: 'LESSON' | 'QUIZ'; targetId?: number
  lessonId?: number; lessonTitle?: string; quizTitle?: string; assignedBy?: number; availableAt: string
  dueAt: string | null; status: 'ACTIVE' | 'CANCELLED'; createdAt: string
}
