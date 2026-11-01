import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { lessonApi } from '../../api/phaseAApi'
import { quizApi } from '../../api/phaseBApi'
import { subjectArtwork } from '../../components/subjectVisual'
import { Notice, formatDate, messageOf } from '../../components/WorkspaceUi'
import LessonBody from '../../components/LessonBody'
import type { Lesson, LessonResource } from '../../types/phaseA'
import type { Quiz } from '../../types/phaseB'
import { ReportForm } from '../phaseB/StudentPages'
import './student-lesson-detail.css'

function fileSize(size: number | null) {
  if (size == null) return ''
  return size < 1024 * 1024 ? `${Math.round(size / 1024)} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export default function StudentLessonPage() {
  const id = Number(useParams().id)
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [relatedQuizzes, setRelatedQuizzes] = useState<Quiz[]>([])
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewId, setPreviewId] = useState<number | null>(null)

  useEffect(() => {
    if (!Number.isInteger(id) || id <= 0) return
    let active = true
    setLesson(null)
    setRelatedQuizzes([])
    setPreviewId(null)
    setLoading(true)
    setError('')
    void Promise.allSettled([lessonApi.studentOne(id), quizApi.studentList()]).then(([lessonResult, quizResult]) => {
      if (!active) return
      if (lessonResult.status === 'fulfilled') setLesson(lessonResult.value)
      else setError(messageOf(lessonResult.reason))
      if (quizResult.status === 'fulfilled') setRelatedQuizzes(quizResult.value.filter((quiz) => quiz.lessonId === id))
      setLoading(false)
    })
    return () => { active = false }
  }, [id])

  const resources = lesson?.resources ?? []
  const videos = resources.filter((item) => item.resourceType === 'VIDEO_LINK')
  const otherResources = resources.filter((item) => item.resourceType !== 'VIDEO_LINK')
  const firstPdf = resources.find((item) => item.resourceType === 'FILE' && item.mimeType === 'application/pdf')
  useEffect(() => {
    const resourceId = previewId ?? firstPdf?.id
    if (!resourceId) { setPreviewUrl(null); return }
    let active = true
    let url: string | null = null
    setPreviewUrl(null)
    void lessonApi.preview(resourceId).then((blob) => {
      if (!active) return
      url = URL.createObjectURL(blob)
      setPreviewUrl(url)
    }).catch((cause) => { if (active) setError(messageOf(cause)) })
    return () => { active = false; if (url) URL.revokeObjectURL(url) }
  }, [firstPdf?.id, previewId])

  async function complete() {
    setBusy(true); setError(''); setSuccess('')
    try {
      await lessonApi.complete(id)
      setLesson((current) => current ? { ...current, completed: true } : null)
      setSuccess('Đã đánh dấu hoàn thành bài học.')
    } catch (cause) { setError(messageOf(cause)) } finally { setBusy(false) }
  }

  async function download(resourceId: number, filename: string) {
    setError('')
    try { await lessonApi.download(resourceId, filename) }
    catch (cause) { setError(messageOf(cause)) }
  }

  if (!Number.isInteger(id) || id <= 0) return <Notice message="Mã bài học không hợp lệ." />
  const art = subjectArtwork(lesson?.subjectName)

  function resourceRow(item: LessonResource) {
    return <article className="student-lesson-detail__resource" key={item.id}>
      <span className="student-lesson-detail__resource-icon" aria-hidden="true">{item.resourceType === 'FILE' ? '▤' : '↗'}</span>
      <div className="student-lesson-detail__resource-copy"><strong>{item.title}</strong><small>{item.resourceType === 'FILE' ? [item.originalName, fileSize(item.sizeBytes)].filter(Boolean).join(' · ') : item.externalUrl}</small><ReportForm targetType="LESSON_RESOURCE" targetId={item.id} /></div>
      <div className="student-lesson-detail__resource-actions">{item.resourceType === 'FILE'
        ? <>{item.mimeType === 'application/pdf' && <button type="button" onClick={() => { setPreviewId(item.id); document.getElementById('lesson-preview')?.scrollIntoView({ behavior: 'smooth' }) }}>Xem PDF</button>}<button type="button" onClick={() => void download(item.id, item.originalName ?? 'tai-lieu')}>Tải xuống</button></>
        : <a href={item.externalUrl ?? '#'} target="_blank" rel="noopener noreferrer">Mở liên kết ↗</a>}</div>
    </article>
  }

  return <div className="student-lesson-detail">
    <nav className="student-lesson-detail__breadcrumb" aria-label="Đường dẫn"><Link to="/student/lessons">Bài học</Link><span>›</span><span>{lesson?.subjectName ?? 'Đang tải...'}</span><span>›</span><strong>{lesson?.title ?? 'Chi tiết'}</strong></nav>
    {error && <Notice message={error} />}{success && <Notice tone="success" message={success} />}
    {loading && <div className="student-lesson-detail__loading">Đang tải bài học...</div>}
    {lesson && <>
      <header className="student-lesson-detail__hero">
        <div className="student-lesson-detail__hero-copy"><span className="student-lesson-detail__eyebrow">{lesson.subjectName ?? 'Bài học'}{lesson.topicName ? ` · ${lesson.topicName}` : ''}</span><h1>{lesson.title}</h1><p>{lesson.summary || 'Khám phá nội dung và tài liệu của bài học này.'}</p><div className="student-lesson-detail__tags"><span>{lesson.visibility === 'PUBLIC' ? 'Bài học công khai' : 'Bài học của lớp'}</span>{lesson.publishedAt && <span>Cập nhật {formatDate(lesson.updatedAt || lesson.publishedAt)}</span>}</div></div>
        <img src={art.image} alt="" />
      </header>
      <div className="student-lesson-detail__columns">
        <main className="student-lesson-detail__main">
          <section className="student-lesson-detail__panel student-lesson-detail__intro"><h2><span>▣</span> Giới thiệu bài học</h2><p>{lesson.summary || 'Xem nội dung bài học và các tài liệu được giáo viên chia sẻ.'}</p></section>
          <section className="student-lesson-detail__panel" id="lesson-content"><div className="student-lesson-detail__panel-heading"><h2><span>▤</span> Nội dung bài học</h2>{lesson.completed && <span className="student-lesson-detail__complete-chip">✓ Đã học</span>}</div><LessonBody body={lesson.body?.trim() || 'Bài học này được trình bày qua các tài liệu và liên kết đính kèm.'} /></section>
          {firstPdf && <section className="student-lesson-detail__panel" id="lesson-preview"><div className="student-lesson-detail__panel-heading"><h2><span>▣</span> Xem tài liệu PDF</h2><span className="student-lesson-detail__muted">{resources.find((item) => item.id === (previewId ?? firstPdf.id))?.title}</span></div>{previewUrl ? <iframe className="student-lesson-detail__pdf" title="Xem trước tài liệu PDF" src={previewUrl} /> : <div className="student-lesson-detail__pdf-loading">Đang tải bản xem trước...</div>}</section>}
          <section className="student-lesson-detail__panel" id="lesson-resources"><h2><span>♧</span> Tài liệu đính kèm <small>({otherResources.length})</small></h2>{otherResources.length ? <div className="student-lesson-detail__resource-list">{otherResources.map(resourceRow)}</div> : <p className="student-lesson-detail__muted">Bài học chưa có tài liệu đính kèm.</p>}</section>
        </main>
        <aside className="student-lesson-detail__aside">
          {videos.length > 0 && <section className="student-lesson-detail__panel"><h2><span>▶</span> Video tham khảo</h2><div className="student-lesson-detail__video-list">{videos.map((video) => <article className="student-lesson-detail__video" key={video.id}><span className="student-lesson-detail__video-art"><span>▶</span></span><strong>{video.title}</strong><a href={video.externalUrl ?? '#'} target="_blank" rel="noopener noreferrer">Xem video ↗</a><ReportForm targetType="LESSON_RESOURCE" targetId={video.id} /></article>)}</div></section>}
          {relatedQuizzes.length > 0 && <section className="student-lesson-detail__panel"><h2><span>✎</span> Luyện tập liên quan</h2><div className="student-lesson-detail__quiz-list">{relatedQuizzes.map((quiz) => <article key={quiz.id}><strong>{quiz.title}</strong><p>{quiz.questionCount ?? '—'} câu hỏi{quiz.timeLimitMinutes ? ` · ${quiz.timeLimitMinutes} phút` : ''}</p><Link to={`/student/quizzes/${quiz.id}`}>Mở đề trắc nghiệm →</Link></article>)}</div></section>}
          <section className="student-lesson-detail__panel student-lesson-detail__progress"><h2><span>◷</span> Tiến độ của bạn</h2><p>{lesson.completed ? 'Bạn đã đánh dấu hoàn thành bài học này.' : 'Sau khi học xong, hãy đánh dấu hoàn thành để theo dõi tiến độ.'}</p><button type="button" disabled={busy || lesson.completed} onClick={() => void complete()}>{lesson.completed ? '✓ Đã hoàn thành' : busy ? 'Đang lưu...' : 'Đánh dấu đã học →'}</button></section>
          <section className="student-lesson-detail__panel student-lesson-detail__report"><h2>Báo cáo nội dung</h2><ReportForm targetType="LESSON" targetId={id} /></section>
        </aside>
      </div>
    </>}
  </div>
}
