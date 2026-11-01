import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { classApi, lessonApi } from '../../api/phaseAApi'
import { quizApi } from '../../api/phaseBApi'
import { useAuth } from '../../auth/useAuth'
import { Notice, formatDate, messageOf } from '../../components/WorkspaceUi'
import { subjectArtwork } from '../../components/subjectVisual'
import type { ClassAssignment, Lesson, StudyClass } from '../../types/phaseA'
import type { QuizAssignment } from '../../types/phaseB'
import heroArt from '../../interface/tongquan_hocsinh/dashboard-hero-art.png'
import './student-classes.css'

type Data = { classes: StudyClass[]; lessons: Lesson[]; assignments: ClassAssignment[]; quizzes: QuizAssignment[] }
const available = (opens: string, closes: string | null, now: number) =>
  new Date(opens).getTime() <= now && (!closes || now < new Date(closes).getTime())
const progressOf = (item: StudyClass) => {
  const total = (item.lessonCount ?? 0) + (item.quizCount ?? 0)
  return total ? Math.min(100, Math.round(((item.completedLessons ?? 0) + (item.submittedQuizzes ?? 0)) / total * 100)) : 0
}

export default function StudentClassesPage() {
  const { user } = useAuth()
  const [data, setData] = useState<Data | null>(null)
  const [openClassId, setOpenClassId] = useState<number | null>(null)
  const [joinCode, setJoinCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function load() {
    const [classes, lessons, assignments, quizzes] = await Promise.all([
      classApi.studentMine(), lessonApi.studentList(), classApi.studentAssignments(), quizApi.assignments(),
    ])
    setData({ classes, lessons, assignments, quizzes })
  }
  useEffect(() => {
    let active = true
    Promise.all([classApi.studentMine(), lessonApi.studentList(), classApi.studentAssignments(), quizApi.assignments()])
      .then(([classes, lessons, assignments, quizzes]) => { if (active) setData({ classes, lessons, assignments, quizzes }) })
      .catch((cause) => { if (active) setError(messageOf(cause)) })
    return () => { active = false }
  }, [])

  async function join(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setSuccess('')
    try {
      const classroom = await classApi.join(joinCode.trim().toUpperCase())
      await load()
      setJoinCode(''); setOpenClassId(classroom.id)
      setSuccess(`Bạn đã tham gia lớp ${classroom.name}.`)
    } catch (cause) { setError(messageOf(cause)) }
    finally { setBusy(false) }
  }

  if (!data) return <div className="student-classes student-classes--loading">{error ? <Notice message={error} /> : <div className="student-classes__loading">Đang tải lớp học của bạn...</div>}</div>

  const { classes, lessons, assignments, quizzes } = data
  const now = Date.now()
  const lessonById = new Map(lessons.map((lesson) => [lesson.id, lesson]))
  const ready = assignments.filter((item) => item.lessonId && available(item.availableAt, item.dueAt, now))
  const next = ready.find((item) => !lessonById.get(item.lessonId!)?.completed) ?? ready[0]
  const firstName = user?.fullName.trim().split(/\s+/).at(-1) || 'bạn'

  return <div className="student-classes">
    <div className="student-classes__heading"><p>KHÔNG GIAN HỌC TẬP</p><h1>Lớp của tôi</h1><span>Học cùng lớp, theo dõi tiến độ và mở nhanh nội dung giáo viên giao.</span></div>
    {error && <Notice message={error} />}{success && <Notice tone="success" message={success} />}
    <section className="student-classes__hero" aria-labelledby="student-classes-welcome">
      <div className="student-classes__hero-copy"><span>HÀNH TRÌNH HỌC TẬP</span><h2 id="student-classes-welcome">Xin chào {firstName},<br /><em>cùng học tiếp nhé!</em></h2><p>{classes.length ? `Bạn đang tham gia ${classes.length} lớp học. Mở bài được giao và tiếp tục theo nhịp học của mình.` : 'Nhập mã lớp từ giáo viên để bắt đầu học cùng bạn bè.'}</p><Link className="student-classes__primary" to={next ? `/student/lessons/${next.lessonId}` : classes.length ? '/student/lessons' : '#student-classes-join'}>{next ? lessonById.get(next.lessonId!)?.completed ? 'Xem lại bài học' : 'Học tiếp' : classes.length ? 'Khám phá bài học' : 'Tham gia lớp'} <span aria-hidden="true">→</span></Link></div>
      <img src={heroArt} alt="" />
      {next && <div className="student-classes__next-lesson"><span>{lessonById.get(next.lessonId!)?.completed ? 'BÀI HỌC ĐÃ HỌC' : 'BÀI HỌC TIẾP THEO'}</span><strong>{next.lessonTitle ?? `Bài học #${next.lessonId}`}</strong><small>{next.className}</small></div>}
    </section>

    <div className="student-classes__main-grid">
      <section className="student-classes__class-panel" aria-labelledby="student-classes-list-title">
        <div className="student-classes__section-heading"><div><span className="student-classes__section-icon" aria-hidden="true">▦</span><h2 id="student-classes-list-title">Lớp đang học <small>({classes.length})</small></h2></div></div>
        {classes.length ? <div className="student-classes__list">{classes.map((item) => {
          const classLessons = assignments.filter((assignment) => assignment.classId === item.id)
          const classQuizzes = quizzes.filter((quiz) => quiz.classId === item.id)
          const art = subjectArtwork(item.name, ...classLessons.map((assignment) => lessonById.get(assignment.lessonId!)?.subjectName), ...classQuizzes.map((quiz) => quiz.subjectName))
          const progress = progressOf(item), expanded = openClassId === item.id, detailId = `student-class-${item.id}`
          return <article className={`student-classes__class student-classes__class--${art.theme}${expanded ? ' student-classes__class--expanded' : ''}`} key={item.id}>
            <div className="student-classes__class-row"><div className="student-classes__class-art"><img src={art.image} alt="" /></div><div className="student-classes__class-copy"><span className="student-classes__subject">{art.label}</span><h3>{item.name}</h3><p>Giáo viên: {item.teacherName ?? `#${item.teacherId}`}</p><div className="student-classes__progress-label"><span>Tiến độ lớp</span><strong>{progress}%</strong></div><div className="student-classes__progress-track" role="progressbar" aria-label={`Tiến độ ${item.name}`} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress}%` }} /></div></div><button type="button" className="student-classes__open-button" aria-expanded={expanded} aria-controls={detailId} onClick={() => setOpenClassId(expanded ? null : item.id)}>{expanded ? 'Thu gọn' : 'Vào lớp'} <span aria-hidden="true">{expanded ? '⌃' : '→'}</span></button></div>
            {expanded && <div className="student-classes__class-details" id={detailId}>
              {item.description && <p className="student-classes__description">{item.description}</p>}
              <div className="student-classes__detail-meta"><span>{item.memberCount ?? 0} học sinh</span><span>{item.lessonCount ?? 0} bài học</span><span>{item.quizCount ?? 0} đề luyện tập</span></div>
              <div className="student-classes__detail-grid"><div><h4>Bài học được giao</h4>{classLessons.length ? classLessons.map((assignment) => {
                const active = available(assignment.availableAt, assignment.dueAt, now)
                return <div className="student-classes__detail-item" key={assignment.id}><span className="student-classes__item-icon student-classes__item-icon--lesson" aria-hidden="true">▤</span><div><strong>{assignment.lessonTitle ?? `Bài học #${assignment.lessonId}`}</strong><small>{active ? lessonById.get(assignment.lessonId!)?.completed ? 'Đã học' : 'Có thể học' : new Date(assignment.availableAt).getTime() > now ? `Mở ${formatDate(assignment.availableAt)}` : 'Đã hết hạn'}</small></div>{active && assignment.lessonId && <Link to={`/student/lessons/${assignment.lessonId}`}>Mở bài →</Link>}</div>
              }) : <p className="student-classes__empty-detail">Chưa có bài học được giao.</p>}</div><div><h4>Đề được giao</h4>{classQuizzes.length ? classQuizzes.map((quiz) => {
                const active = available(quiz.availableAt, quiz.dueAt, now), remaining = Math.max(0, quiz.maxAttempts - quiz.attemptCount)
                return <div className="student-classes__detail-item" key={quiz.id}><span className="student-classes__item-icon student-classes__item-icon--quiz" aria-hidden="true">▤</span><div><strong>{quiz.quizTitle}</strong><small>{!active ? new Date(quiz.availableAt).getTime() > now ? `Mở ${formatDate(quiz.availableAt)}` : 'Đã hết hạn' : remaining ? `${remaining} lượt làm còn lại` : 'Hết lượt làm'}</small></div>{active && <Link to={`/student/quizzes/${quiz.quizId}`}>Xem đề →</Link>}</div>
              }) : <p className="student-classes__empty-detail">Chưa có đề được giao cho lớp này.</p>}</div></div>
            </div>}
          </article>
        })}</div> : <div className="student-classes__empty"><span aria-hidden="true">▦</span><strong>Bạn chưa tham gia lớp nào</strong><p>Nhập mã lớp giáo viên cung cấp để nhận bài học và đề luyện tập.</p></div>}
      </section>

      <aside className="student-classes__join" id="student-classes-join"><div className="student-classes__join-icon" aria-hidden="true">＋</div><h2>Tham gia lớp học</h2><p>Nhập mã 8 ký tự giáo viên cung cấp để vào lớp mới.</p><form onSubmit={join}><label htmlFor="student-class-code">Mã tham gia</label><input id="student-class-code" required minLength={8} maxLength={8} pattern="[A-Z0-9]{8}" title="Mã lớp gồm 8 chữ cái hoặc chữ số" value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="Ví dụ: ABCD2345" autoComplete="off" /><button type="submit" disabled={busy}>{busy ? 'Đang tham gia...' : 'Tham gia lớp'} <span aria-hidden="true">→</span></button></form></aside>
    </div>

    <div className="student-classes__bottom-grid"><section className="student-classes__bottom-card" aria-labelledby="student-classes-lessons-title"><div className="student-classes__section-heading"><div><span className="student-classes__section-icon student-classes__section-icon--mint" aria-hidden="true">▤</span><h2 id="student-classes-lessons-title">Bài học được giao <small>({assignments.length})</small></h2></div><Link to="/student/lessons">Xem tất cả →</Link></div>{assignments.length ? <div className="student-classes__assignment-list">{assignments.slice(0, 3).map((assignment) => {
      const active = available(assignment.availableAt, assignment.dueAt, now)
      return <div className="student-classes__assignment" key={assignment.id}><span className="student-classes__item-icon student-classes__item-icon--lesson" aria-hidden="true">▤</span><div><strong>{assignment.lessonTitle ?? `Bài học #${assignment.lessonId}`}</strong><small>{assignment.className}{assignment.dueAt ? ` · Hạn học ${formatDate(assignment.dueAt)}` : ''}</small></div>{active && assignment.lessonId ? <Link to={`/student/lessons/${assignment.lessonId}`}>Mở bài →</Link> : <span className="student-classes__muted">{new Date(assignment.availableAt).getTime() > now ? 'Chưa mở' : 'Đã hết hạn'}</span>}</div>
    })}</div> : <div className="student-classes__empty-small"><strong>Chưa có bài học được giao</strong><span>Bài mới từ giáo viên sẽ xuất hiện ở đây.</span></div>}</section>
    <section className="student-classes__bottom-card" aria-labelledby="student-classes-quizzes-title">
      <div className="student-classes__section-heading"><div><span className="student-classes__section-icon student-classes__section-icon--purple" aria-hidden="true">▤</span><h2 id="student-classes-quizzes-title">Đề được giao <small>({quizzes.length})</small></h2></div><Link to="/student/quizzes">Xem tất cả →</Link></div>
      {quizzes.length ? <div className="student-classes__assignment-list">{quizzes.slice(0, 3).map((quiz) => {
        const active = available(quiz.availableAt, quiz.dueAt, now)
        return <div className="student-classes__assignment" key={quiz.id}><span className="student-classes__item-icon student-classes__item-icon--quiz" aria-hidden="true">▤</span><div><strong>{quiz.quizTitle}</strong><small>{quiz.className}{quiz.dueAt ? ` · Hạn ${formatDate(quiz.dueAt)}` : ''}</small></div>{active ? <Link to={`/student/quizzes/${quiz.quizId}`}>Xem đề →</Link> : <span className="student-classes__muted">{new Date(quiz.availableAt).getTime() > now ? 'Chưa mở' : 'Đã hết hạn'}</span>}</div>
      })}</div> : <div className="student-classes__empty-small student-classes__empty-small--quiz"><span aria-hidden="true">✦</span><strong>Chưa có đề được giao</strong><small>Khi giáo viên giao đề, bạn sẽ thấy ở đây.</small></div>}
    </section></div>
  </div>
}
