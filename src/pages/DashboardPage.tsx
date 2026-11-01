import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { applicationApi, catalogApi, classApi, lessonApi } from '../api/phaseAApi'
import { attemptApi, questionApi, quizApi, reportApi } from '../api/phaseBApi'
import { useAuth } from '../auth/useAuth'
import { Notice, PageHeader, Panel, messageOf } from '../components/WorkspaceUi'

type Metric = { label: string; value: number; link: string }

function DashboardPage() {
  const { user } = useAuth()
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    let active = true
    const load = async () => {
      try {
        let next: Metric[]
        if (user.role === 'ADMIN') {
          const [subjects, applications, reports] = await Promise.all([catalogApi.adminSubjects(), applicationApi.pending(), reportApi.all('PENDING')])
          next = [
            { label: 'Môn học', value: subjects.filter((item) => item.status === 'ACTIVE').length, link: '/admin/catalog' },
            { label: 'Đơn giáo viên chờ duyệt', value: applications.length, link: '/admin/teacher-applications' },
            { label: 'Báo cáo chờ xử lý', value: reports.length, link: '/admin/content-reports' },
          ]
        } else if (user.role === 'TEACHER') {
          const [classes, lessons, quizzes, questions] = await Promise.all([classApi.teacherMine(), lessonApi.teacherMine(), quizApi.teacherMine(), questionApi.mine()])
          next = [
            { label: 'Lớp đang hoạt động', value: classes.filter((item) => item.status === 'ACTIVE').length, link: '/teacher/classes' },
            { label: 'Bài học đã xuất bản', value: lessons.filter((item) => item.status === 'PUBLISHED').length, link: '/teacher/lessons' },
            { label: 'Bài nháp', value: lessons.filter((item) => item.status === 'DRAFT').length, link: '/teacher/lessons' },
            { label: 'Đề đã xuất bản', value: quizzes.filter((item) => item.status === 'PUBLISHED').length, link: '/teacher/quizzes' },
            { label: 'Câu hỏi', value: questions.length, link: '/teacher/questions' },
          ]
        } else {
          const [classes, lessons, assignments, quizzes, attempts] = await Promise.all([classApi.studentMine(), lessonApi.studentList(), classApi.studentAssignments(), quizApi.studentList(), attemptApi.mine()])
          next = [
            { label: 'Lớp đã tham gia', value: classes.length, link: '/student/classes' },
            { label: 'Bài học có thể xem', value: lessons.length, link: '/student/lessons' },
            { label: 'Bài được giao', value: assignments.length, link: '/student/classes' },
            { label: 'Đề có thể làm', value: quizzes.length, link: '/student/quizzes' },
            { label: 'Lượt đã nộp', value: attempts.filter((item) => item.status === 'SUBMITTED').length, link: '/student/quizzes' },
          ]
        }
        if (active) { setMetrics(next); setError('') }
      } catch (cause) { if (active) setError(messageOf(cause)) }
    }
    void load()
    return () => { active = false }
  }, [user])

  if (!user) return null
  const firstName = user.fullName.trim().split(/\s+/).at(-1)
  const quickLinks = user.role === 'ADMIN'
    ? [{ to: '/admin/teacher-applications', title: 'Duyệt giáo viên', detail: 'Xem đơn đăng ký và cấp quyền Teacher.' }, { to: '/admin/catalog', title: 'Quản lý danh mục', detail: 'Tạo môn học, chủ đề và sắp xếp nội dung.' }, { to: '/admin/content-reports', title: 'Kiểm duyệt nội dung', detail: 'Xử lý các báo cáo từ người học.' }]
    : user.role === 'TEACHER'
      ? [{ to: '/teacher/lessons/new', title: 'Soạn bài học', detail: 'Thêm nội dung, tài liệu và video tham khảo.' }, { to: '/teacher/classes', title: 'Quản lý lớp', detail: 'Mời học sinh và giao bài học cho lớp.' }, { to: '/teacher/quizzes/new', title: 'Tạo đề trắc nghiệm', detail: 'Ghép câu hỏi và xuất bản đề cho học sinh.' }]
      : [{ to: '/student/lessons', title: 'Khám phá bài học', detail: 'Chọn chủ đề và bắt đầu học từ tài liệu.' }, { to: '/student/classes', title: 'Lớp của tôi', detail: 'Nhập mã lớp để nhận bài được giao.' }, { to: '/student/quizzes', title: 'Làm đề trắc nghiệm', detail: 'Luyện tập và xem kết quả các đề đã nộp.' }]

  return <>
    <PageHeader eyebrow="TỔNG QUAN" title={`Chào ${firstName} 👋`} description="Mọi hoạt động học tập của bạn ở một nơi." />
    {error && <Notice message={error} />}
    <div className="metric-grid">{metrics.map((item) => <Link className="metric-card" to={item.link} key={item.label}><span>{item.label}</span><strong>{item.value}</strong><small>Xem chi tiết →</small></Link>)}</div>
    <Panel title="Bắt đầu từ đây"><div className="quick-grid">{quickLinks.map((item) => <Link className="quick-card" to={item.to} key={item.to}><span className="quick-card__icon">↗</span><strong>{item.title}</strong><p>{item.detail}</p><span className="quick-card__link">Mở trang →</span></Link>)}</div></Panel>
  </>
}

export default DashboardPage
