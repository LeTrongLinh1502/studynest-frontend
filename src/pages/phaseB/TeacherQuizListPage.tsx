import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { catalogApi } from '../../api/phaseAApi'
import { quizApi } from '../../api/phaseBApi'
import type { Subject, Topic } from '../../types/phaseA'
import type { Quiz } from '../../types/phaseB'
import { Empty, Notice, PageHeader, Panel, StatusPill, formatDate, messageOf } from '../../components/WorkspaceUi'

export default function TeacherQuizListPage() {
  const location = useLocation()
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [subjectId, setSubjectId] = useState('')
  const [topicId, setTopicId] = useState('')
  const [status, setStatus] = useState('ALL')
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  useEffect(() => { setQuery(new URLSearchParams(location.search).get('q') ?? '') }, [location.search])

  useEffect(() => {
    let active = true
    Promise.all([quizApi.teacherMine(), catalogApi.subjects()]).then(([quizRows, subjectRows]) => {
      if (active) { setQuizzes(quizRows); setSubjects(subjectRows); setLoading(false) }
    }).catch((cause) => { if (active) { setError(messageOf(cause)); setLoading(false) } })
    return () => { active = false }
  }, [])
  useEffect(() => {
    if (!subjectId) { setTopics([]); return }
    let active = true
    catalogApi.topics(Number(subjectId)).then((rows) => { if (active) setTopics(rows) })
      .catch((cause) => { if (active) setError(messageOf(cause)) })
    return () => { active = false }
  }, [subjectId])
  async function archive(id: number) {
    if (!window.confirm('Lưu trữ đề này và hủy các bài đã giao?')) return
    setBusy(true); setError('')
    try { await quizApi.archive(id); setQuizzes(await quizApi.teacherMine()) }
    catch (cause) { setError(messageOf(cause)) } finally { setBusy(false) }
  }
  const shown = quizzes.filter((quiz) => (!subjectId || quiz.subjectId === Number(subjectId))
    && (!topicId || quiz.topicId === Number(topicId))
    && (status === 'ALL' || quiz.status === status)
    && `${quiz.title} ${quiz.description ?? ''} ${quiz.topicName ?? ''}`.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')))

  return <>
    <PageHeader eyebrow="BỘ ĐỀ" title="Bộ đề trắc nghiệm" description="Tạo, quản lý và giao bài kiểm tra cho học sinh." />
    {error && <Notice message={error} />}
    <div className="teacher-quiz-filters"><input type="search" aria-label="Tìm đề" placeholder="Tìm kiếm theo tên đề..." value={query} onChange={(event) => setQuery(event.target.value)} /><select aria-label="Lọc môn học" value={subjectId} onChange={(event) => { setSubjectId(event.target.value); setTopicId('') }}><option value="">Tất cả môn</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select><select aria-label="Lọc chủ đề" value={topicId} disabled={!subjectId} onChange={(event) => setTopicId(event.target.value)}><option value="">Tất cả chủ đề</option>{topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}</select><select aria-label="Lọc trạng thái" value={status} onChange={(event) => setStatus(event.target.value)}><option value="ALL">Tất cả trạng thái</option><option value="DRAFT">Bản nháp</option><option value="PUBLISHED">Đã xuất bản</option><option value="ARCHIVED">Đã lưu trữ</option></select><Link className="button button--primary" to="/teacher/quizzes/new">+ Tạo đề</Link></div>
    <Panel title={`Danh sách đề (${shown.length})`} action={<Link className="text-button" to="/teacher/questions">Ngân hàng câu hỏi →</Link>}>
      {loading ? <p className="muted-text">Đang tải bộ đề...</p> : shown.length ? <div className="teacher-quiz-table"><div className="teacher-quiz-table__head"><span>Tên đề</span><span>Môn học / Chủ đề</span><span>Số câu</span><span>Thời gian</span><span>Hiển thị</span><span>Lượt tối đa</span><span>Trạng thái</span><span>Ngày tạo</span><span>Thao tác</span></div>{shown.map((quiz) => <div className="teacher-quiz-table__row" key={quiz.id}><div><strong>{quiz.title}</strong><small>{quiz.description || 'Chưa có mô tả'}</small></div><div><strong>{quiz.subjectName || '—'}</strong><small>{quiz.topicName || '—'}</small></div><span>{quiz.questionCount ?? 0} câu</span><span>{quiz.timeLimitMinutes ? `${quiz.timeLimitMinutes} phút` : 'Không giới hạn'}</span><span>{quiz.visibility === 'PUBLIC' ? 'Công khai' : 'Theo lớp'}</span><span>{quiz.maxAttempts}</span><StatusPill status={quiz.status} /><span>{formatDate(quiz.createdAt)}</span><div className="teacher-quiz-table__actions"><Link className="text-button" to={`/teacher/quizzes/${quiz.id}`}>{quiz.status === 'DRAFT' ? 'Chỉnh sửa' : 'Xem'}</Link><Link className="text-button" to={`/teacher/quizzes/${quiz.id}/results`}>Kết quả</Link>{quiz.status !== 'ARCHIVED' && <button type="button" className="text-button text-button--danger" disabled={busy} onClick={() => void archive(quiz.id)}>Lưu trữ</button>}</div></div>)}</div> : <Empty title="Không có đề phù hợp" detail="Hãy đổi bộ lọc hoặc tạo đề mới." />}
    </Panel>
  </>
}
