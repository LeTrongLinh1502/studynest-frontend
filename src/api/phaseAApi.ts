import { downloadFile, get, getFileBlob, patch, post, put, remove, upload } from './httpClient'
import type { ClassAssignment, ClassMember, Lesson, LessonResource, StudyClass, Subject, TeacherApplication, Topic } from '../types/phaseA'

export interface SubjectInput { code: string; name: string }
export interface TopicInput { subjectId: number; parentTopicId: number | null; code: string; name: string; sortOrder: number }
export interface ClassInput { name: string; description: string }
export interface LessonInput { topicId: number; title: string; summary: string; body: string; visibility: 'PUBLIC' | 'CLASS' }

export const catalogApi = {
  subjects: () => get<Subject[]>('/api/subjects'),
  topics: (subjectId: number) => get<Topic[]>(`/api/subjects/${subjectId}/topics`),
  adminSubjects: () => get<Subject[]>('/api/admin/subjects'),
  adminTopics: (subjectId: number) => get<Topic[]>(`/api/admin/subjects/${subjectId}/topics`),
  createSubject: (body: SubjectInput) => post<Subject>('/api/admin/subjects', body),
  updateSubject: (id: number, body: SubjectInput) => put<Subject>(`/api/admin/subjects/${id}`, body),
  archiveSubject: (id: number) => remove(`/api/admin/subjects/${id}`),
  createTopic: (body: TopicInput) => post<Topic>('/api/admin/topics', body),
  updateTopic: (id: number, body: TopicInput) => put<Topic>(`/api/admin/topics/${id}`, body),
  archiveTopic: (id: number) => remove(`/api/admin/topics/${id}`),
}

export const applicationApi = {
  mine: () => get<TeacherApplication[]>('/api/teacher-applications/me'),
  apply: (reason: string) => post<TeacherApplication>('/api/teacher-applications', { reason }),
  pending: () => get<TeacherApplication[]>('/api/admin/teacher-applications?status=PENDING'),
  all: (status?: string) => get<TeacherApplication[]>(`/api/admin/teacher-applications${status ? `?status=${status}` : ''}`),
  review: (id: number, decision: 'APPROVED' | 'REJECTED', reviewNote: string) =>
    patch<TeacherApplication>(`/api/admin/teacher-applications/${id}`, { decision, reviewNote }),
}

export const classApi = {
  teacherMine: () => get<StudyClass[]>('/api/teacher/classes'),
  teacherOne: (id: number) => get<StudyClass>(`/api/teacher/classes/${id}`),
  create: (body: ClassInput) => post<StudyClass>('/api/teacher/classes', body),
  update: (id: number, body: ClassInput) => put<StudyClass>(`/api/teacher/classes/${id}`, body),
  archive: (id: number) => remove(`/api/teacher/classes/${id}`),
  members: (id: number) => get<ClassMember[]>(`/api/teacher/classes/${id}/members`),
  removeMember: (id: number, studentId: number) => remove(`/api/teacher/classes/${id}/members/${studentId}`),
  join: (joinCode: string) => post<StudyClass>('/api/classes/join', { joinCode }),
  studentMine: () => get<StudyClass[]>('/api/classes/my'),
  assignments: (id: number) => get<ClassAssignment[]>(`/api/teacher/classes/${id}/assignments`),
  assign: (id: number, lessonId: number, availableAt: string | null, dueAt: string | null) =>
    post<ClassAssignment>(`/api/teacher/classes/${id}/assignments`, { lessonId, availableAt, dueAt }),
  assignQuiz: (id: number, quizId: number, availableAt: string | null, dueAt: string | null) =>
    post<ClassAssignment>(`/api/teacher/classes/${id}/assignments`, { targetType: 'QUIZ', targetId: quizId, availableAt, dueAt }),
  cancelAssignment: (id: number, assignmentId: number) => remove(`/api/teacher/classes/${id}/assignments/${assignmentId}`),
  studentAssignments: () => get<ClassAssignment[]>('/api/classes/my/assignments'),
}

export const lessonApi = {
  teacherMine: () => get<Lesson[]>('/api/teacher/lessons'),
  teacherOne: (id: number) => get<Lesson>(`/api/teacher/lessons/${id}`),
  create: (body: LessonInput) => post<Lesson>('/api/teacher/lessons', body),
  update: (id: number, body: LessonInput) => put<Lesson>(`/api/teacher/lessons/${id}`, body),
  publish: (id: number) => post<Lesson>(`/api/teacher/lessons/${id}/publish`),
  assignClasses: (id: number, classIds: number[], availableAt: string | null, dueAt: string | null) =>
    post<ClassAssignment[]>(`/api/teacher/lessons/${id}/assign-classes`, { classIds, availableAt, dueAt }),
  archive: (id: number) => remove(`/api/teacher/lessons/${id}`),
  studentList: (topicId?: number) => get<Lesson[]>(`/api/lessons${topicId ? `?topicId=${topicId}` : ''}`),
  studentOne: (id: number) => get<Lesson>(`/api/lessons/${id}`),
  complete: (id: number) => post<{ completedAt: string }>(`/api/lessons/${id}/complete`),
  addLink: (id: number, body: { resourceType: 'VIDEO_LINK' | 'EXTERNAL_LINK'; title: string; externalUrl: string }) =>
    post<LessonResource>(`/api/teacher/lessons/${id}/resources/links`, body),
  addFile: (id: number, title: string, file: File, onProgress?: (percent: number) => void) => {
    const data = new FormData()
    data.append('title', title)
    data.append('file', file)
    return upload<LessonResource>(`/api/teacher/lessons/${id}/resources/files`, data, onProgress)
  },
  updateResource: (lessonId: number, resourceId: number, title: string, sortOrder: number) =>
    patch<LessonResource>(`/api/teacher/lessons/${lessonId}/resources/${resourceId}`, { title, sortOrder }),
  deleteResource: (lessonId: number, resourceId: number) => remove(`/api/teacher/lessons/${lessonId}/resources/${resourceId}`),
  download: (resourceId: number, filename: string) => downloadFile(`/api/lesson-resources/${resourceId}/download`, filename),
  preview: (resourceId: number) => getFileBlob(`/api/lesson-resources/${resourceId}/preview`),
}
