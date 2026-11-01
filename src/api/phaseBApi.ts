import { get, post, put, patch, remove } from './httpClient'
import type { Attempt, AttemptResult, AttemptSummary, AuditEvent, ClassAnalytics, ContentReport, Difficulty, Question, Quiz, QuizAssignment, QuizResults, ResultPolicy, Visibility } from '../types/phaseB'

export interface QuestionInput { topicId: number; difficulty: Difficulty; stem: string; explanation: string; options: { content: string; isCorrect: boolean }[] }
export type QuestionDraftInput = Omit<QuestionInput, 'topicId'>
export interface BatchQuestionInput { topicId: number; questions: QuestionDraftInput[] }
export interface QuizInput { topicId: number; lessonId: number | null; title: string; description: string; timeLimitMinutes: number | null; maxAttempts: number; resultPolicy: ResultPolicy; visibility: Visibility; questions: { questionId: number; points: number }[] }

export const questionApi = {
  mine: (topicId?: number) => get<Question[]>(`/api/teacher/questions${topicId ? `?topicId=${topicId}` : ''}`),
  one: (id: number) => get<Question>(`/api/teacher/questions/${id}`),
  create: (body: QuestionInput) => post<Question>('/api/teacher/questions', body),
  createBatch: (body: BatchQuestionInput) => post<Question[]>('/api/teacher/questions/batch', body),
  update: (id: number, body: QuestionInput) => put<Question>(`/api/teacher/questions/${id}`, body),
  archive: (id: number) => remove(`/api/teacher/questions/${id}`),
}
export const quizApi = {
  teacherMine: () => get<Quiz[]>('/api/teacher/quizzes'),
  teacherOne: (id: number) => get<Quiz>(`/api/teacher/quizzes/${id}`),
  create: (body: QuizInput) => post<Quiz>('/api/teacher/quizzes', body),
  update: (id: number, body: QuizInput) => put<Quiz>(`/api/teacher/quizzes/${id}`, body),
  publish: (id: number) => post<Quiz>(`/api/teacher/quizzes/${id}/publish`),
  archive: (id: number) => remove(`/api/teacher/quizzes/${id}`),
  studentList: () => get<Quiz[]>('/api/quizzes'),
  studentOne: (id: number) => get<Quiz>(`/api/quizzes/${id}`),
  assignments: () => get<QuizAssignment[]>('/api/quizzes/assignments/my'),
  results: (id: number) => get<QuizResults>(`/api/teacher/quizzes/${id}/results`),
  classAnalytics: (id: number) => get<ClassAnalytics>(`/api/teacher/classes/${id}/analytics`),
}
export const attemptApi = {
  start: (quizId: number) => post<Attempt>(`/api/quizzes/${quizId}/attempts`),
  mine: () => get<Attempt[]>('/api/attempts/my'),
  myResults: () => get<AttemptSummary[]>('/api/attempts/my/results'),
  one: (id: number) => get<Attempt>(`/api/attempts/${id}`),
  answer: (id: number, questionId: number, optionId: number) => put<{ status: string }>(`/api/attempts/${id}/answers/${questionId}`, { optionIds: [optionId] }),
  flag: (id: number, questionId: number, flagged: boolean) => put<{ quizQuestionId: number; flagged: boolean }>(`/api/attempts/${id}/flags/${questionId}`, { flagged }),
  submit: (id: number) => post<AttemptResult>(`/api/attempts/${id}/submit`),
  result: (id: number) => get<AttemptResult>(`/api/attempts/${id}/result`),
}
export const reportApi = {
  create: (targetType: ContentReport['targetType'], targetId: number, reason: string) => post<ContentReport>('/api/content-reports', { targetType, targetId, reason }),
  mine: () => get<ContentReport[]>('/api/content-reports/my'),
  all: (status?: string) => get<ContentReport[]>(`/api/admin/content-reports${status ? `?status=${status}` : ''}`),
  review: (id: number, decision: 'HIDE' | 'CLOSE', resolutionNote: string) => patch<ContentReport>(`/api/admin/content-reports/${id}`, { decision, resolutionNote }),
  audit: () => get<AuditEvent[]>('/api/admin/audit-events'),
}
