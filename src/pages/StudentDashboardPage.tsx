import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { dashboardApi } from '../api/dashboardApi'
import type { StudentDashboard } from '../api/dashboardApi'
import { classApi, lessonApi } from '../api/phaseAApi'
import { attemptApi, quizApi } from '../api/phaseBApi'
import { useAuth } from '../auth/useAuth'
import { Notice, formatDate, messageOf } from '../components/WorkspaceUi'
import type { ClassAssignment, Lesson, StudyClass } from '../types/phaseA'
import type { Attempt, Quiz, QuizAssignment } from '../types/phaseB'
import heroArt from '../interface/tongquan_hocsinh/dashboard-hero-art.png'
import { subjectArtwork } from '../components/subjectVisual'
import './student-dashboard.css'

type StudentHomeData = {
  dashboard: StudentDashboard
  classes: StudyClass[]
  lessons: Lesson[]
  lessonAssignments: ClassAssignment[]
  quizzes: Quiz[]
  quizAssignments: QuizAssignment[]
  attempts: Attempt[]
}

type IconName = 'arrow' | 'book' | 'check' | 'clock' | 'file' | 'graduate' | 'spark' | 'trend' | 'users'

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    arrow: <><path d="M4 12h15" /><path d="m13 6 6 6-6 6" /></>,
    book: <><path d="M12 5c-3-2-6-2-10-1v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-4-1-7-1-10 1Z" /><path d="M12 5v15" /></>,
    check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    file: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h4" /></>,
    graduate: <><path d="m2 9 10-5 10 5-10 5L2 9Z" /><path d="M6 12v5c3 2.6 9 2.6 12 0v-5M22 9v7" /></>,
    spark: <><path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z" /></>,
    trend: <><path d="M4 19v-5M9 19V9M14 19v-8M19 19V4" /></>,
    users: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a6 6 0 0 1 12 0v2M17 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5v1" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

function SectionHeading({ id, icon, title, to, action }: { id?: string; icon: IconName; title: string; to?: string; action?: string }) {
  return <div className="student-home__section-heading"><h2 id={id}><Icon name={icon} size={22} />{title}</h2>{to && <Link to={to}>{action ?? 'Xem tất cả'} <Icon name="arrow" size={16} /></Link>}</div>
}

export default function StudentDashboardPage() {
  const { user } = useAuth()
  const [data, setData] = useState<StudentHomeData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([
      dashboardApi.get(), classApi.studentMine(), lessonApi.studentList(),
      classApi.studentAssignments(), quizApi.studentList(), quizApi.assignments(), attemptApi.mine(),
    ]).then(([dashboard, classes, lessons, lessonAssignments, quizzes, quizAssignments, attempts]) => {
      if (active && dashboard.role === 'STUDENT') {
        setData({ dashboard, classes, lessons, lessonAssignments, quizzes, quizAssignments, attempts })
        setError('')
      }
    }).catch((cause) => { if (active) setError(messageOf(cause)) })
    return () => { active = false }
  }, [])

  if (!user) return null
  if (!data) return <div className="student-home student-home--loading">{error ? <Notice message={error} /> : <div className="student-home__loading-card">Đang tải không gian học tập...</div>}</div>

  const { dashboard, classes, lessons, lessonAssignments, quizzes, quizAssignments, attempts } = data
  const firstName = user.fullName.trim().split(/\s+/).at(-1) || user.fullName
  const now = Date.now()
  const availableLessons = lessons.filter((lesson) => !lesson.completed)
  const assignedLesson = lessonAssignments.find((assignment) =>
    assignment.lessonId && new Date(assignment.availableAt).getTime() <= now &&
    (!assignment.dueAt || new Date(assignment.dueAt).getTime() > now) &&
    lessons.some((lesson) => lesson.id === assignment.lessonId))
  const assignedLessonData = lessons.find((lesson) => lesson.id === assignedLesson?.lessonId)
  const featuredLesson = availableLessons.find((lesson) => lesson.id === assignedLesson?.lessonId) ?? availableLessons[0]
  const submittedAttempts = attempts.filter((attempt) => attempt.status === 'SUBMITTED')
    .sort((a, b) => new Date(b.submittedAt ?? b.startedAt).getTime() - new Date(a.submittedAt ?? a.startedAt).getTime())
  const attemptedQuizIds = new Set(attempts.map((attempt) => attempt.quizId))
  const upcomingQuizzes = quizzes.filter((quiz) => {
    // A quiz with any started or submitted attempt belongs in the attempt history, not "Sắp tới".
    if (attemptedQuizIds.has(quiz.id) || (quiz.attemptCount ?? 0) > 0) return false
    if (quiz.visibility === 'PUBLIC') return true
    return quizAssignments.some((assignment) => assignment.quizId === quiz.id &&
      new Date(assignment.availableAt).getTime() <= now &&
      (!assignment.dueAt || new Date(assignment.dueAt).getTime() > now))
  }).sort((a, b) => {
    const nearestDue = (quizId: number) => Math.min(...quizAssignments
      .filter((assignment) => assignment.quizId === quizId && assignment.dueAt && new Date(assignment.dueAt).getTime() > now)
      .map((assignment) => new Date(assignment.dueAt!).getTime()), Infinity)
    return nearestDue(a.id) - nearestDue(b.id)
  })
  const upcomingQuiz = upcomingQuizzes[0]
  const submittedQuiz = submittedAttempts[0]
  const featuredLessonPath = featuredLesson ? `/student/lessons/${featuredLesson.id}` : '/student/lessons'
  const average = dashboard.summary.averagePercent == null ? '—' : `${Number(dashboard.summary.averagePercent).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`

  return <div className="student-home">
    {error && <Notice message={error} />}
    <div className="student-home__top">
      <div className="student-home__main-column">
        <section className="student-home__hero" aria-labelledby="student-home-welcome">
          <div className="student-home__hero-copy">
            <span className="student-home__eyebrow">KHÔNG GIAN HỌC TẬP</span>
            <h1 id="student-home-welcome">Chào {firstName},<br /><span>sẵn sàng học tiếp?</span></h1>
            <p>Mỗi bài học hôm nay là một bước tiến đến mục tiêu của bạn.</p>
            <Link className="student-home__primary-button" to={featuredLessonPath}>{featuredLesson ? 'Tiếp tục học' : 'Khám phá bài học'} <Icon name="arrow" /></Link>
          </div>
          <img className="student-home__hero-art" src={heroArt} alt="" />
        </section>

        <section className="student-home__classes" aria-labelledby="student-home-classes-title">
          <SectionHeading id="student-home-classes-title" icon="users" title="Lớp học của tôi" to="/student/classes" action="Xem tất cả lớp" />
          {classes.length ? <div className="student-home__class-grid">{classes.slice(0, 2).map((item) => {
            const lessonSubjects = lessonAssignments.filter((assignment) => assignment.classId === item.id)
              .map((assignment) => lessons.find((lesson) => lesson.id === assignment.lessonId)?.subjectName)
            const quizSubjects = quizAssignments.filter((assignment) => assignment.classId === item.id)
              .map((assignment) => assignment.subjectName)
            const art = subjectArtwork(item.name, ...lessonSubjects, ...quizSubjects)
            return <article className={`student-home__class-card student-home__class-card--${art.theme}`} key={item.id}>
              <div className="student-home__class-card-body"><span>LỚP HỌC</span><h3>{item.name}</h3><p>{item.description || (item.teacherName ? `Giáo viên: ${item.teacherName}` : 'Không gian học tập của lớp bạn.')}</p></div>
              <img src={art.image} alt="" />
              <div className="student-home__class-card-footer"><span className="student-home__status"><Icon name="users" size={16} />Đang học</span><Link to="/student/classes">Vào lớp <Icon name="arrow" size={16} /></Link></div>
            </article>
          })}</div> : <div className="student-home__empty"><Icon name="users" size={26} /><strong>Bạn chưa tham gia lớp nào</strong><span>Tham gia lớp để nhận bài học và đề từ giáo viên.</span><Link to="/student/classes">Tham gia lớp <Icon name="arrow" size={16} /></Link></div>}
        </section>
      </div>

      <aside className="student-home__side-column">
        <section className="student-home__side-card" aria-labelledby="student-home-upcoming-title">
          <SectionHeading id="student-home-upcoming-title" icon="clock" title="Sắp tới" to="/student/quizzes" action="Xem tất cả" />
          {upcomingQuiz ? <div className="student-home__feature-item"><span className="student-home__feature-icon student-home__feature-icon--quiz"><Icon name="file" size={25} /></span><div><span className="student-home__tag">ĐỀ CHƯA LÀM</span><h3>{upcomingQuiz.title}</h3><p><Icon name="clock" size={16} />{upcomingQuiz.timeLimitMinutes ? `${upcomingQuiz.timeLimitMinutes} phút` : 'Không giới hạn giờ'}</p>{upcomingQuiz.subjectName && <p><Icon name="book" size={16} />{upcomingQuiz.subjectName}</p>}</div></div> : <div className="student-home__compact-empty"><Icon name="check" size={25} /><strong>Chưa có đề cần làm</strong><span>Đề mới được giao sẽ xuất hiện ở đây.</span></div>}
          {upcomingQuiz && <Link className="student-home__card-button" to={`/student/quizzes/${upcomingQuiz.id}`}>Xem đề <Icon name="arrow" size={18} /></Link>}
        </section>

        <section className="student-home__side-card" aria-labelledby="student-home-lesson-title">
          <SectionHeading id="student-home-lesson-title" icon="book" title="Bài học được giao" to="/student/classes" action="Xem tất cả" />
          {assignedLessonData ? <div className="student-home__feature-item"><span className="student-home__feature-icon student-home__feature-icon--lesson"><Icon name="book" size={25} /></span><div><h3>{assignedLessonData.title}</h3><p><Icon name="book" size={16} />{assignedLessonData.subjectName ?? assignedLesson?.className ?? 'Bài học'}</p></div></div> : <div className="student-home__compact-empty"><Icon name="book" size={25} /><strong>Chưa có bài học được giao</strong><span>Bài học của lớp sẽ xuất hiện ở đây.</span></div>}
          {assignedLessonData && <Link className="student-home__card-button" to={`/student/lessons/${assignedLessonData.id}`}>{assignedLessonData.completed ? 'Xem lại bài học' : 'Mở bài học'} <Icon name="arrow" size={18} /></Link>}
        </section>
      </aside>
    </div>

    <section className="student-home__journey" aria-labelledby="student-home-journey-title">
      <SectionHeading id="student-home-journey-title" icon="trend" title="Hành trình của bạn" />
      <div className="student-home__metric-grid">
        <Link to="/student/classes" className="student-home__metric student-home__metric--lavender"><span><Icon name="graduate" size={26} /></span><div><strong>{dashboard.summary.classCount}</strong><b>lớp học</b><small>Bạn đang tham gia</small></div></Link>
        <Link to="/student/lessons" className="student-home__metric student-home__metric--blue"><span><Icon name="book" size={26} /></span><div><strong>{dashboard.summary.completedLessons}</strong><b>bài học đã hoàn thành</b><small>Tiếp tục khám phá nhé!</small></div></Link>
        <Link to="/student/results" className="student-home__metric student-home__metric--mint"><span><Icon name="file" size={26} /></span><div><strong>{dashboard.summary.submittedAttempts}</strong><b>lượt làm đã nộp</b><small>Theo dõi kết quả của bạn</small></div></Link>
        <Link to="/student/results" className="student-home__metric student-home__metric--sky"><span><Icon name="spark" size={26} /></span><div><strong>{average}</strong><b>điểm trung bình</b><small>{dashboard.summary.averagePercent == null ? 'Chưa có điểm' : 'Từ các kết quả đã công bố'}</small></div></Link>
      </div>
    </section>

    <section className="student-home__recent" aria-labelledby="student-home-results-title">
      <SectionHeading id="student-home-results-title" icon="clock" title="Kết quả gần đây" to="/student/results" action="Xem tất cả" />
      {submittedQuiz ? <Link className="student-home__recent-row" to={`/student/attempts/${submittedQuiz.id}/result`}><span className="student-home__recent-icon"><Icon name="file" size={21} /></span><span className="student-home__recent-copy"><strong>{submittedQuiz.quizTitle}</strong><small>Đã nộp {formatDate(submittedQuiz.submittedAt ?? submittedQuiz.startedAt)}</small></span><span className="student-home__submitted"><Icon name="check" size={16} />Đã nộp</span><Icon name="arrow" size={18} /></Link> : <div className="student-home__recent-empty">Bạn chưa nộp đề nào. <Link to="/student/quizzes">Khám phá đề trắc nghiệm <Icon name="arrow" size={15} /></Link></div>}
    </section>
  </div>
}
