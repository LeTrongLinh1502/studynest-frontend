import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { attemptApi, quizApi } from '../../api/phaseBApi'
import type { Attempt, Quiz } from '../../types/phaseB'
import { Notice, Panel, formatDate, messageOf } from '../../components/WorkspaceUi'
import { ReportForm } from './StudentPages'

export function StudentQuizDetailPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!Number.isInteger(id) || id <= 0) return
    let active = true
    Promise.all([quizApi.studentOne(id), attemptApi.mine()])
      .then(([row, history]) => { if (active) { setQuiz(row); setAttempts(history.filter((attempt) => attempt.quizId === id)) } })
      .catch((cause) => { if (active) setError(messageOf(cause)) })
    return () => { active = false }
  }, [id])
  async function start() {
    setBusy(true); setError('')
    try {
      const attempt = await attemptApi.start(id)
      navigate(attempt.status === 'SUBMITTED' ? `/student/attempts/${attempt.id}/result` : `/student/attempts/${attempt.id}`)
    } catch (cause) { setError(messageOf(cause)) } finally { setBusy(false) }
  }
  if (!Number.isInteger(id) || id <= 0) return <Notice message="Mã đề không hợp lệ." />
  const isClosed = Boolean(quiz?.dueAt && new Date(quiz.dueAt).getTime() <= Date.now())
  const used = quiz?.attemptCount ?? 0
  const remaining = Math.max(0, (quiz?.maxAttempts ?? 0) - used)
  const inProgress = attempts.find((attempt) => attempt.status === 'IN_PROGRESS')
  const lastSubmitted = attempts.find((attempt) => attempt.status === 'SUBMITTED')
  const canStart = !isClosed && (remaining > 0 || Boolean(inProgress))
  return <>
    <nav className="quiz-detail-breadcrumb" aria-label="Đường dẫn"><Link to="/dashboard">Trang chủ</Link><span>›</span><Link to="/student/quizzes">Luyện đề</Link><span>›</span><span>{quiz?.title ?? 'Chi tiết đề'}</span></nav>
    {error && <Notice message={error} />}
    {quiz && <>
      <div className="quiz-detail-hero"><p className="page-eyebrow">ĐỀ TRẮC NGHIỆM</p><h1>{quiz.title}</h1><div className="quiz-catalog-card__tags"><span>{quiz.subjectName ?? 'Môn học'}</span><span>{quiz.topicName ?? 'Chủ đề'}</span><span>{quiz.visibility === 'PUBLIC' ? 'Công khai' : 'Theo lớp'}</span></div><p>Giáo viên: {quiz.teacherName ?? '—'}</p></div>
      <div className="workspace-two-col workspace-two-col--wide">
        <div className="workspace-column"><Panel title="Thông tin đề trắc nghiệm"><h3>Mô tả đề</h3><p>{quiz.description || 'Giáo viên chưa thêm mô tả cho đề này.'}</p>{quiz.lessonId && <div className="quiz-detail-related"><h3>Bài học liên quan</h3><Link className="button button--soft" to={`/student/lessons/${quiz.lessonId}`}>Xem bài học →</Link></div>}<div className="quiz-detail-instructions"><h3>Hướng dẫn làm bài</h3><ol><li>Đọc kỹ câu hỏi và chọn một đáp án.</li><li>Đáp án được lưu khi bạn chọn.</li><li>Kiểm tra lại trước khi nộp bài.</li><li>Đồng hồ bắt đầu khi mở lượt làm mới.</li></ol></div></Panel><Panel title="Báo cáo nội dung"><ReportForm targetType="QUIZ" targetId={id} /></Panel></div>
        <Panel title="Thông tin làm bài" className="quiz-detail-facts"><div><span>Số câu hỏi</span><strong>{quiz.questionCount ?? quiz.questions?.length ?? 0} câu</strong></div><div><span>Thời gian làm bài</span><strong>{quiz.timeLimitMinutes ? `${quiz.timeLimitMinutes} phút` : 'Không giới hạn'}</strong></div><div><span>Số lượt làm tối đa</span><strong>{quiz.maxAttempts} lượt</strong></div><div><span>Hạn nộp bài</span><strong>{formatDate(quiz.dueAt)}</strong></div><div><span>Hiển thị kết quả</span><strong>{quiz.resultPolicy === 'AFTER_SUBMIT' ? 'Ngay khi nộp' : quiz.resultPolicy === 'AFTER_DUE' ? 'Sau hạn nộp' : 'Theo giáo viên'}</strong></div><div><span>Số lượt đã bắt đầu</span><strong>{used} / {quiz.maxAttempts}</strong></div>{canStart ? <button className="button button--primary" type="button" onClick={() => void start()} disabled={busy}>{busy ? 'Đang mở...' : inProgress ? 'Tiếp tục làm bài' : 'Bắt đầu làm bài'}</button> : lastSubmitted ? <Link className="button button--primary" to={`/student/attempts/${lastSubmitted.id}/result`}>Xem lượt đã nộp</Link> : <button className="button button--soft" type="button" disabled>{isClosed ? 'Đề đã đóng' : 'Đã hết lượt làm'}</button>}{isClosed && <p className="muted-text">Hạn làm bài đã qua. Bạn có thể xem lại lượt đã nộp.</p>}</Panel>
      </div>
    </>}
  </>
}
