import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { dashboardApi } from '../api/dashboardApi'
import type { DashboardData } from '../api/dashboardApi'
import { useAuth } from '../auth/useAuth'
import { Empty, Notice, PageHeader, Panel, StatusPill, formatDate, messageOf } from '../components/WorkspaceUi'
import StudentDashboardPage from './StudentDashboardPage'

function Metric({ label, value, to }: { label: string; value: string | number; to: string }) {
  return <Link to={to} className="metric-card metric-card--visual"><span>{label}</span><strong>{value}</strong><small>Xem chi tiết →</small></Link>
}

export default function RoleDashboardPage() {
  const { user } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    if (user?.role === 'STUDENT') return
    let active = true
    void dashboardApi.get().then((value) => { if (active) setData(value) }).catch((cause) => { if (active) setError(messageOf(cause)) })
    return () => { active = false }
  }, [user?.role])
  if (!user) return null
  if (user.role === 'STUDENT') return <StudentDashboardPage />
  const firstName = user.fullName.trim().split(/\s+/).at(-1)
  if (!data) return <><PageHeader eyebrow="TỔNG QUAN" title={`Chào ${firstName}`} />{error ? <Notice message={error} /> : <Panel><p className="muted-text">Đang tải tổng quan...</p></Panel>}</>

  if (data.role === 'TEACHER') return <>
    <PageHeader eyebrow="KHÔNG GIAN GIẢNG DẠY" title={`Chào ${firstName}`} description="Quản lý lớp, bài học và bộ đề ở một nơi." action={<div className="button-row"><Link className="button button--soft" to="/teacher/questions">+ Câu hỏi</Link><Link className="button button--primary" to="/teacher/lessons/new">+ Bài học</Link></div>} />
    <div className="metric-grid metric-grid--four"><Metric label="Lớp hoạt động" value={data.summary.classCount} to="/teacher/classes" /><Metric label="Bài đã xuất bản" value={data.summary.publishedLessons} to="/teacher/lessons" /><Metric label="Đề đã xuất bản" value={data.summary.publishedQuizzes} to="/teacher/quizzes" /><Metric label="Câu hỏi" value={data.summary.questionCount} to="/teacher/questions" /></div>
    <div className="workspace-two-col workspace-two-col--wide"><Panel title="Lớp học gần đây" action={<Link className="text-button" to="/teacher/classes">Xem tất cả →</Link>}>{data.classes.length ? data.classes.map((item) => <Link className="dashboard-row" key={item.id} to={`/teacher/classes/${item.id}`}><span><strong>{item.name}</strong><small>{item.studentCount} học sinh · Mã {item.joinCode}</small></span><b>Quản lý →</b></Link>) : <Empty title="Chưa có lớp học" />}</Panel><Panel title="Bài học gần đây">{data.lessons.length ? data.lessons.map((item) => <Link className="dashboard-row" key={item.id} to={`/teacher/lessons/${item.id}`}><span><strong>{item.title}</strong><small>{formatDate(item.updatedAt)}</small></span><StatusPill status={item.status} /></Link>) : <Empty title="Chưa có bài học" />}</Panel></div>
    <Panel title="Bộ đề gần đây" action={<Link className="text-button" to="/teacher/quizzes">Xem tất cả →</Link>}>{data.quizzes.length ? data.quizzes.map((item) => <Link className="dashboard-row" key={item.id} to={`/teacher/quizzes/${item.id}`}><span><strong>{item.title}</strong><small>{formatDate(item.createdAt)}</small></span><StatusPill status={item.status} /></Link>) : <Empty title="Chưa có bộ đề" />}</Panel>
  </>

  if (data.role !== 'ADMIN') return null
  return <>
    <PageHeader eyebrow="QUẢN TRỊ HỆ THỐNG" title="Tổng quan StudyNest" description="Các mục cần xử lý và hoạt động gần đây." />
    <div className="metric-grid metric-grid--four"><Metric label="Tài khoản hoạt động" value={data.summary.userCount} to="/admin/teacher-applications" /><Metric label="Lớp hoạt động" value={data.summary.classCount} to="/admin/catalog" /><Metric label="Đơn giáo viên chờ duyệt" value={data.summary.pendingApplications} to="/admin/teacher-applications" /><Metric label="Báo cáo chờ xử lý" value={data.summary.pendingReports} to="/admin/content-reports" /></div>
    <div className="workspace-two-col workspace-two-col--wide"><Panel title="Đơn giáo viên chờ duyệt" action={<Link className="text-button" to="/admin/teacher-applications">Xem tất cả →</Link>}>{data.applications.length ? data.applications.map((item) => <Link className="dashboard-row" key={item.id} to="/admin/teacher-applications"><span><strong>{item.fullName}</strong><small>{item.email} · {formatDate(item.createdAt)}</small></span><b>Xem →</b></Link>) : <Empty title="Không có đơn chờ duyệt" />}</Panel><Panel title="Báo cáo chờ xử lý" action={<Link className="text-button" to="/admin/content-reports">Xem tất cả →</Link>}>{data.reports.length ? data.reports.map((item) => <Link className="dashboard-row" key={item.id} to="/admin/content-reports"><span><strong>{item.targetType} #{item.targetId}</strong><small>{item.reason}</small></span><b>Xử lý →</b></Link>) : <Empty title="Không có báo cáo chờ xử lý" />}</Panel></div>
    <Panel title="Thao tác trong 7 ngày qua">{data.activity.length ? <div className="activity-bars activity-bars--admin">{data.activity.map((item) => <div key={item.day}><span className="activity-bars__bar activity-bars__bar--active" style={{ height: `${Math.max(15, Math.min(100, item.total * 12))}%` }} /><small>{item.day.slice(5)}</small></div>)}</div> : <Empty title="Chưa có thao tác được ghi nhận" />}</Panel>
  </>
}
