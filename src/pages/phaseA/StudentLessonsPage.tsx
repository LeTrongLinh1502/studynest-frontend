import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { catalogApi, classApi, lessonApi } from '../../api/phaseAApi'
import { subjectArtwork, subjectFamilies, subjectFamily } from '../../components/subjectVisual'
import type { SubjectSelection } from '../../components/subjectVisual'
import { Notice, formatDate, messageOf } from '../../components/WorkspaceUi'
import type { ClassAssignment, Lesson, Subject, Topic } from '../../types/phaseA'
import heroArt from '../../interface/tongquan_hocsinh/dashboard-hero-art.png'
import './student-lessons.css'

type LessonStatusFilter = 'all' | 'unread' | 'completed' | 'assigned' | 'public'

function Arrow() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6" /></svg>
}

export default function StudentLessonsPage() {
  const location = useLocation()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [assignments, setAssignments] = useState<ClassAssignment[]>([])
  const [selectedSubject, setSelectedSubject] = useState<SubjectSelection>('all')
  const [topicId, setTopicId] = useState('')
  const [statusFilter, setStatusFilter] = useState<LessonStatusFilter>('all')
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [filterError, setFilterError] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingTopics, setLoadingTopics] = useState(false)

  useEffect(() => { setQuery(new URLSearchParams(location.search).get('q') ?? '') }, [location.search])

  useEffect(() => {
    let active = true
    void Promise.allSettled([catalogApi.subjects(), lessonApi.studentList(), classApi.studentAssignments()])
      .then(([subjectResult, lessonResult, assignmentResult]) => {
        if (!active) return
        if (subjectResult.status === 'fulfilled') setSubjects(subjectResult.value)
        if (lessonResult.status === 'fulfilled') setLessons(lessonResult.value)
        if (assignmentResult.status === 'fulfilled') setAssignments(assignmentResult.value)
        const failures = [subjectResult, lessonResult, assignmentResult]
          .filter((result) => result.status === 'rejected')
          .map((result) => messageOf((result as PromiseRejectedResult).reason))
        setError(failures.join(' · '))
        setLoading(false)
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (selectedSubject === 'all') { setTopics([]); setLoadingTopics(false); return }
    const ids = subjects.filter((subject) => subjectFamily(subject.name) === selectedSubject).map((subject) => subject.id)
    if (!ids.length) { setTopics([]); setLoadingTopics(false); return }
    let active = true
    setLoadingTopics(true)
    setFilterError('')
    void Promise.all(ids.map((id) => catalogApi.topics(id)))
      .then((groups) => { if (active) setTopics(groups.flat()) })
      .catch((cause) => { if (active) { setTopics([]); setFilterError(messageOf(cause)) } })
      .finally(() => { if (active) setLoadingTopics(false) })
    return () => { active = false }
  }, [selectedSubject, subjects])

  const subjectNames = useMemo(() => new Map(subjects.map((subject) => [subject.id, subject.name])), [subjects])
  const assignedLessonIds = useMemo(() => new Set(assignments.map((assignment) => assignment.lessonId).filter((id): id is number => id != null)), [assignments])
  const categoryOf = (lesson: Lesson) => subjectFamily(lesson.subjectName ?? subjectNames.get(lesson.subjectId ?? -1))
  const otherCount = subjects.filter((subject) => subjectFamily(subject.name) === 'other').length +
    lessons.filter((lesson) => categoryOf(lesson) === 'other').length
  const normalizedQuery = query.trim().toLocaleLowerCase('vi-VN')
  const shown = lessons.filter((lesson) => {
    if (selectedSubject !== 'all' && categoryOf(lesson) !== selectedSubject) return false
    if (topicId && lesson.topicId !== Number(topicId)) return false
    if (statusFilter === 'completed' && !lesson.completed) return false
    if (statusFilter === 'unread' && lesson.completed) return false
    if (statusFilter === 'assigned' && !assignedLessonIds.has(lesson.id)) return false
    if (statusFilter === 'public' && lesson.visibility !== 'PUBLIC') return false
    if (!normalizedQuery) return true
    return [lesson.title, lesson.summary, lesson.body, lesson.subjectName, lesson.topicName]
      .some((value) => (value ?? '').toLocaleLowerCase('vi-VN').includes(normalizedQuery))
  }).sort((a, b) => {
    if (Boolean(a.completed) !== Boolean(b.completed)) return a.completed ? 1 : -1
    if (assignedLessonIds.has(a.id) !== assignedLessonIds.has(b.id)) return assignedLessonIds.has(a.id) ? -1 : 1
    return new Date(b.publishedAt ?? b.createdAt).getTime() - new Date(a.publishedAt ?? a.createdAt).getTime()
  })
  const featured = shown[0]
  const remaining = shown.slice(1)
  const availableAssignments = assignments.filter((assignment) => assignment.lessonId != null)
    .sort((a, b) => (a.dueAt ? new Date(a.dueAt).getTime() : Infinity) - (b.dueAt ? new Date(b.dueAt).getTime() : Infinity))
  const selectedLabel = selectedSubject === 'all' ? 'tất cả môn' : selectedSubject === 'other' ? 'môn khác' : subjectFamilies.find((item) => item.key === selectedSubject)?.label

  function selectSubject(value: SubjectSelection) {
    setSelectedSubject(value)
    setTopicId('')
  }

  return <div className="student-lessons">
    <header className="student-lessons__header">
      <div><span className="student-lessons__eyebrow">THƯ VIỆN KIẾN THỨC</span><h1>Thư viện bài học</h1><p>Khám phá các môn học và tìm bài học phù hợp với bạn.</p></div>
      <img src={heroArt} alt="" />
    </header>
    {error && <Notice message={error} />}{filterError && <Notice message={filterError} />}

    <section className="student-lessons__subjects" aria-labelledby="student-lessons-subjects">
      <div className="student-lessons__section-heading"><div><h2 id="student-lessons-subjects">Chọn môn học</h2><p>Chọn môn trước để xem bài học và lọc theo chủ đề.</p></div><button type="button" onClick={() => selectSubject('all')} className={selectedSubject === 'all' ? 'student-lessons__all student-lessons__all--active' : 'student-lessons__all'}>Tất cả môn <Arrow /></button></div>
      <div className="student-lessons__subject-grid">{subjectFamilies.map((subject) => {
        const count = lessons.filter((lesson) => categoryOf(lesson) === subject.key).length
        return <button type="button" key={subject.key} onClick={() => selectSubject(subject.key)} aria-pressed={selectedSubject === subject.key} className={`student-lessons__subject student-lessons__subject--${subject.key}${selectedSubject === subject.key ? ' student-lessons__subject--selected' : ''}`}>
          <span className="student-lessons__subject-art"><img src={subject.image} alt="" /></span><strong>{subject.label}</strong><small>{count} bài học</small>
        </button>
      })}{otherCount > 0 && <button type="button" onClick={() => selectSubject('other')} aria-pressed={selectedSubject === 'other'} className={`student-lessons__subject student-lessons__subject--other${selectedSubject === 'other' ? ' student-lessons__subject--selected' : ''}`}><span className="student-lessons__subject-art"><img src={heroArt} alt="" /></span><strong>Môn khác</strong><small>Xem bài học</small></button>}</div>
    </section>

    {availableAssignments.length > 0 && <section className="student-lessons__assignments" aria-labelledby="student-lessons-assignments">
      <div className="student-lessons__section-heading"><div><h2 id="student-lessons-assignments">Bài học được giao <span>{availableAssignments.length}</span></h2><p>Nội dung giáo viên đã giao cho lớp của bạn.</p></div><Link to="/student/classes">Xem tất cả <Arrow /></Link></div>
      <div className="student-lessons__assignment-list">{availableAssignments.slice(0, 3).map((assignment) => {
        const lesson = lessons.find((item) => item.id === assignment.lessonId)
        const available = new Date(assignment.availableAt).getTime() <= Date.now()
        const art = subjectArtwork(lesson?.subjectName, assignment.className)
        return <article className="student-lessons__assignment" key={assignment.id}>
          <span className={`student-lessons__assignment-art student-lessons__assignment-art--${art.theme}`}><img src={art.image} alt="" /></span>
          <div className="student-lessons__assignment-copy"><span>{lesson?.subjectName ?? assignment.className ?? 'Bài học được giao'}</span><h3>{lesson?.title ?? assignment.lessonTitle ?? `Bài học #${assignment.lessonId}`}</h3><p>Lớp {assignment.className ?? `#${assignment.classId}`}{assignment.dueAt ? ` · Hạn ${formatDate(assignment.dueAt)}` : ''}</p></div>
          {available && lesson ? <Link to={`/student/lessons/${lesson.id}`}>{lesson.completed ? 'Xem lại' : 'Mở bài học'} <Arrow /></Link> : <span className="student-lessons__not-yet">Chưa mở</span>}
        </article>
      })}</div>
    </section>}

    <div className="student-lessons__browse">
      <section className="student-lessons__featured" aria-labelledby="student-lessons-featured">
        <div className="student-lessons__section-heading"><div><h2 id="student-lessons-featured">Bài học dành cho bạn</h2><p>{shown.length ? `${shown.length} bài học trong ${selectedLabel}` : `Khám phá bài học ở ${selectedLabel}`}</p></div></div>
        {loading ? <div className="student-lessons__empty">Đang tải bài học...</div> : featured ? <article className="student-lessons__featured-card">
          <span className={`student-lessons__featured-art student-lessons__featured-art--${subjectArtwork(featured.subjectName).theme}`}><img src={subjectArtwork(featured.subjectName).image} alt="" /></span>
          <div className="student-lessons__featured-copy"><span className="student-lessons__meta">{featured.subjectName ?? 'Bài học'}{featured.topicName ? ` · ${featured.topicName}` : ''}</span><h3>{featured.title}</h3><p>{featured.summary || 'Khám phá nội dung và tài liệu của bài học.'}</p><span className="student-lessons__badge">{featured.completed ? 'Đã học' : assignedLessonIds.has(featured.id) ? 'Được giao' : 'Công khai'}</span></div>
          <Link className="student-lessons__primary" to={`/student/lessons/${featured.id}`}>{featured.completed ? 'Xem lại bài' : 'Mở bài học'} <Arrow /></Link>
        </article> : <div className="student-lessons__empty"><strong>Chưa có bài học phù hợp</strong><span>Thử đổi môn, chủ đề hoặc từ khóa tìm kiếm.</span><button type="button" onClick={() => { selectSubject('all'); setQuery(''); setStatusFilter('all') }}>Xem tất cả môn <Arrow /></button></div>}
      </section>

      <aside className="student-lessons__filters" aria-labelledby="student-lessons-filters">
        <div className="student-lessons__section-heading"><div><h2 id="student-lessons-filters">Tìm bài nhanh</h2><p>Lọc bài theo nhu cầu của bạn.</p></div></div>
        <label>Từ khóa<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên bài, chủ đề hoặc nội dung..." /></label>
        <label>Môn học<select value={selectedSubject} onChange={(event) => selectSubject(event.target.value as SubjectSelection)}><option value="all">Tất cả môn</option>{subjectFamilies.map((subject) => <option key={subject.key} value={subject.key}>{subject.label}</option>)}{otherCount > 0 && <option value="other">Môn khác</option>}</select></label>
        <label>Chủ đề<select value={topicId} onChange={(event) => setTopicId(event.target.value)} disabled={selectedSubject === 'all' || loadingTopics || !topics.length}><option value="">{loadingTopics ? 'Đang tải chủ đề...' : 'Tất cả chủ đề'}</option>{topics.map((topic) => <option key={topic.id} value={topic.id}>{subjectNames.get(topic.subjectId) ? `${subjectNames.get(topic.subjectId)} · ` : ''}{topic.name}</option>)}</select></label>
        <label>Trạng thái<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as LessonStatusFilter)}><option value="all">Tất cả</option><option value="unread">Chưa học</option><option value="completed">Đã học</option><option value="assigned">Được giao</option><option value="public">Công khai</option></select></label>
        <p className="student-lessons__hint">Chọn môn học trước để danh sách chủ đề chỉ hiện nội dung của môn đó.</p>
      </aside>
    </div>

    <section className="student-lessons__more" aria-labelledby="student-lessons-more">
      <div className="student-lessons__section-heading"><div><h2 id="student-lessons-more">Khám phá thêm</h2><p>{remaining.length ? 'Những bài học khác phù hợp với bộ lọc của bạn.' : 'Nội dung mới sẽ xuất hiện tại đây.'}</p></div></div>
      {remaining.length ? <div className="student-lessons__lesson-grid">{remaining.map((lesson) => {
        const art = subjectArtwork(lesson.subjectName)
        return <Link key={lesson.id} to={`/student/lessons/${lesson.id}`} className="student-lessons__lesson-card"><span className={`student-lessons__lesson-art student-lessons__lesson-art--${art.theme}`}><img src={art.image} alt="" /></span><span className="student-lessons__meta">{lesson.subjectName ?? 'Bài học'}{lesson.topicName ? ` · ${lesson.topicName}` : ''}</span><strong>{lesson.title}</strong><p>{lesson.summary || 'Khám phá nội dung và tài liệu của bài học.'}</p><span className="student-lessons__lesson-footer"><span>{lesson.completed ? '✓ Đã học' : assignedLessonIds.has(lesson.id) ? 'Bài được giao' : 'Bài công khai'}</span><b>Xem bài <Arrow /></b></span></Link>
      })}</div> : !loading && <div className="student-lessons__more-empty"><span className="student-lessons__more-illustration"><img src={heroArt} alt="" /></span><div><strong>Chưa có thêm bài học ở {selectedLabel}</strong><p>{shown.length ? 'Bạn có thể xem các môn học khác để khám phá thêm nội dung.' : 'Bài học mới sẽ xuất hiện khi giáo viên xuất bản hoặc giao cho lớp.'}</p><button type="button" onClick={() => { selectSubject('all'); setQuery(''); setStatusFilter('all') }}>Xem tất cả môn <Arrow /></button></div></div>}
    </section>
  </div>
}
