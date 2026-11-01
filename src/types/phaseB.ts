export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD'
export type Visibility = 'PUBLIC' | 'CLASS'
export type ResultPolicy = 'AFTER_SUBMIT' | 'AFTER_DUE' | 'HIDDEN'

export interface Choice { id: number; content: string; isCorrect?: boolean; sortOrder: number }
export interface Question {
  id: number; teacherId: number; subjectId: number; topicId: number; topicName?: string; difficulty: Difficulty; stem: string
  explanation: string | null; status: string; options?: Choice[]; updatedAt: string
}
export interface QuizQuestion {
  id: number; sourceQuestionId?: number; stem: string; explanation?: string | null
  points: number; options: Choice[]; selectedOptionIds?: number[]; isCorrect?: boolean; pointsEarned?: number; flagged?: boolean
}
export interface Quiz {
  id: number; teacherId: number; subjectId: number; topicId: number; lessonId: number | null; title: string
  subjectName?: string; topicName?: string; teacherName?: string; questionCount?: number
  attemptCount?: number; completedAttemptCount?: number
  description: string | null; timeLimitMinutes: number | null; maxAttempts: number
  resultPolicy: ResultPolicy; visibility: Visibility; status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  publishedAt: string | null; createdAt?: string; questions?: QuizQuestion[]; assignmentId?: number | null; dueAt?: string | null
}
export interface QuizAssignment {
  id: number; classId: number; className: string; quizId: number; quizTitle: string
  topicId: number; topicName: string; subjectId: number; subjectName: string
  questionCount: number; timeLimitMinutes: number | null; maxAttempts: number; attemptCount: number
  availableAt: string; dueAt: string | null; status: string
}
export interface Attempt {
  id: number; quizId: number; quizTitle: string; attemptNo: number; status: 'IN_PROGRESS' | 'SUBMITTED'
  startedAt: string; submittedAt: string | null; deadlineAt?: string | null; questions?: QuizQuestion[]
}
export interface AttemptSummary {
  id: number; quizId: number; quizTitle: string; attemptNo: number; status: 'SUBMITTED'
  submittedAt: string; resultPolicy: ResultPolicy; available: boolean
  subjectId: number; subjectName: string; topicId: number; topicName: string
  questionCount: number; correctCount?: number; score?: number; maxScore?: number
}
export interface AttemptResult {
  attemptId: number; quizId: number; quizTitle: string; status: string; available: boolean
  resultPolicy: ResultPolicy; submittedAt: string | null; lessonId: number | null; topicId: number; topicName?: string
  score?: number; maxScore?: number; questions?: QuizQuestion[]
}
export interface QuizResults {
  quiz: Quiz; summary: { submittedCount: number; studentCount: number; averagePercent: number | null }
  attempts: { id: number; studentId: number; studentName: string; attemptNo: number; score: number; maxScore: number; className: string | null; submittedAt: string }[]
  questions: { id: number; stem: string; points: number; attemptCount: number; correctCount: number; incorrectCount: number }[]
}
export interface ClassAnalytics {
  classroom: { id: number; name: string }; summary: { studentCount: number; quizCount: number; lessonCount: number }
  quizzes: { quizId: number; title: string; submittedCount: number; studentCount: number; averagePercent: number | null }[]
  students: { studentId: number; studentName: string; submittedCount: number; averagePercent: number | null; completedLessons: number }[]
  topics: { topicId: number; topicName: string; submittedCount: number; averagePercent: number | null }[]
  distribution: { bucket: number; total: number }[]
}
export interface ContentReport {
  id: number; reporterId: number; targetType: 'QUESTION' | 'QUIZ' | 'LESSON' | 'LESSON_RESOURCE'; targetId: number
  reason: string; status: 'PENDING' | 'HIDDEN' | 'CLOSED'; reviewedBy: number | null; resolutionNote: string | null
  createdAt: string; reviewedAt: string | null
}
export interface AuditEvent { id: number; actorId: number; actorName?: string; actionCode: string; targetType: string; targetId: number | null; details: string | null; createdAt: string }
