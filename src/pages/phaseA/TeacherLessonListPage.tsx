import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { catalogApi, lessonApi } from '../../api/phaseAApi'
import type { Lesson, Subject, Topic } from '../../types/phaseA'
import { Empty, Notice, PageHeader, Panel, StatusPill, formatDate, messageOf } from '../../components/WorkspaceUi'

export default function TeacherLessonListPage() {
  const location = useLocation()
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [query, setQuery] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [topicId, setTopicId] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [sort, setSort] = useState<'LATEST' | 'OLDEST'>('LATEST')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  useEffect(() => { setQuery(new URLSearchParams(location.search).get('q') ?? '') }, [location.search])
  useEffect(() => {
    let active = true
    Promise.all([lessonApi.teacherMine(), catalogApi.subjects()]).then(([lessonRows, subjectRows]) => {
      if (active) { setLessons(lessonRows); setSubjects(subjectRows); setLoading(false) }
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
    if (!window.confirm('Lưu trữ bài học? Các bài đã giao sẽ bị hủy.')) return
    setBusy(true); setError('')
    try { await lessonApi.archive(id); setLessons(await lessonApi.teacherMine()) }
    catch (cause) { setError(messageOf(cause)) } finally { setBusy(false) }
  }
  const shown = lessons.filter((lesson) => (!subjectId || lesson.subjectId === Number(subjectId))
    && (!topicId || lesson.topicId === Number(topicId))
    && (filter === 'ALL' || lesson.status === filter)
    && `${lesson.title} ${lesson.summary ?? ''} ${lesson.topicName ?? ''}`.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')))
    .sort((a, b) => sort === 'LATEST' ? new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime() : new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime())
  return <>
    <PageHeader eyebrow="NỘI DUNG GIẢNG DẠY" title="Bài học của tôi" description="Quản lý và tổ chức bài học, tài liệu giảng dạy của bạn." action={<Link to="/teacher/lessons/new" className="button button--primary">+ Tạo bài học</Link>} />
    {error && <Notice message={error} />}
    <div className="teacher-lesson-filters"><input type="search" aria-label="Tìm bài học" placeholder="Tìm kiếm bài học..." value={query} onChange={(event) => setQuery(event.target.value)} /><select aria-label="Lọc môn học" value={subjectId} onChange={(event) => { setSubjectId(event.target.value); setTopicId('') }}><option value="">Tất cả môn học</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select><select aria-label="Lọc chủ đề" value={topicId} disabled={!subjectId} onChange={(event) => setTopicId(event.target.value)}><option value="">Tất cả chủ đề</option>{topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}</select><select aria-label="Lọc trạng thái" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="ALL">Tất cả trạng thái</option><option value="DRAFT">Bản nháp</option><option value="PUBLISHED">Đã xuất bản</option><option value="ARCHIVED">Đã lưu trữ</option></select></div>
    <Panel title={`Tổng ${shown.length} bài học`} action={<select className="teacher-lesson-sort" aria-label="Sắp xếp" value={sort} onChange={(event) => setSort(event.target.value as 'LATEST' | 'OLDEST')}><option value="LATEST">Cập nhật mới nhất</option><option value="OLDEST">Cập nhật cũ nhất</option></select>}>
      {loading ? <p className="muted-text">Đang tải bài học...</p> : shown.length ? <div className="teacher-lesson-table"><div className="teacher-lesson-table__head"><span>Bài học</span><span>Môn học</span><span>Chủ đề</span><span>Tài liệu</span><span>Trạng thái</span><span>Cập nhật lần cuối</span><span>Thao tác</span></div>{shown.map((lesson) => <div className="teacher-lesson-table__row" key={lesson.id}><div><Link className="teacher-lesson-table__title" to={`/teacher/lessons/${lesson.id}`}>{lesson.title}</Link><small>{lesson.summary || 'Chưa có mô tả'}</small></div><span className="teacher-lesson-table__subject">{lesson.subjectName || '—'}</span><span>{lesson.topicName || '—'}</span><span>{lesson.fileCount ?? 0} tài liệu · {lesson.videoCount ?? 0} video</span><StatusPill status={lesson.status} /><span>{formatDate(lesson.updatedAt)}</span><div className="teacher-lesson-table__actions"><Link className="text-button" to={`/teacher/lessons/${lesson.id}`}>{lesson.status === 'ARCHIVED' ? 'Xem' : 'Chỉnh sửa'}</Link>{lesson.status !== 'ARCHIVED' && <button className="text-button text-button--danger" type="button" disabled={busy} onClick={() => void archive(lesson.id)}>Lưu trữ</button>}</div></div>)}</div> : <Empty title="Không có bài học phù hợp" detail="Hãy đổi bộ lọc hoặc tạo bài học mới." />}
    </Panel>
  </>
}
