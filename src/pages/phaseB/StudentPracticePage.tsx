import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { catalogApi } from '../../api/phaseAApi'
import { attemptApi, quizApi } from '../../api/phaseBApi'
import { subjectArtwork, subjectFamilies, subjectFamily } from '../../components/subjectVisual'
import type { SubjectSelection } from '../../components/subjectVisual'
import { Empty, Notice, formatDate, messageOf } from '../../components/WorkspaceUi'
import type { Subject, Topic } from '../../types/phaseA'
import type { Attempt, Quiz, QuizAssignment } from '../../types/phaseB'
import heroArt from '../../interface/tongquan_hocsinh/dashboard-hero-art.png'
import './student-practice.css'

type PracticeTab = 'ASSIGNED' | 'PUBLIC'
type PracticeStatus = 'ALL' | 'READY' | 'IN_PROGRESS' | 'SUBMITTED' | 'UPCOMING' | 'CLOSED'
type PracticeCard = { quiz?: Quiz; assignment?: QuizAssignment }

function cardId(card: PracticeCard) { return card.assignment?.quizId ?? card.quiz?.id ?? 0 }
function cardSubject(card: PracticeCard, subjectNames: Map<number, string>) {
  return card.assignment?.subjectName ?? card.quiz?.subjectName
    ?? subjectNames.get(card.assignment?.subjectId ?? card.quiz?.subjectId ?? -1) ?? ''
}
function remaining(card: PracticeCard) {
  return Math.max(0, (card.assignment?.maxAttempts ?? card.quiz?.maxAttempts ?? 1)
    - (card.assignment?.attemptCount ?? card.quiz?.attemptCount ?? 0))
}
function stateOf(card: PracticeCard, attempts: Attempt[]): Exclude<PracticeStatus, 'ALL'> {
  const id = cardId(card)
  const history = attempts.filter((attempt) => attempt.quizId === id)
  const now = Date.now()
  if (card.assignment && new Date(card.assignment.availableAt).getTime() > now) return 'UPCOMING'
  if (card.assignment?.dueAt && new Date(card.assignment.dueAt).getTime() <= now)
    return history.some((attempt) => attempt.status === 'SUBMITTED') ? 'SUBMITTED' : 'CLOSED'
  if (history.some((attempt) => attempt.status === 'IN_PROGRESS')) return 'IN_PROGRESS'
  if (history.some((attempt) => attempt.status === 'SUBMITTED')) return 'SUBMITTED'
  if (!remaining(card)) return 'CLOSED'
  return 'READY'
}
const stateLabels: Record<Exclude<PracticeStatus, 'ALL'>, string> = {
  READY: 'Chưa làm', IN_PROGRESS: 'Đang làm', SUBMITTED: 'Đã nộp', UPCOMING: 'Chưa mở', CLOSED: 'Đã đóng',
}

function PracticeCardView({ card, attempts, subjectNames }: { card: PracticeCard; attempts: Attempt[]; subjectNames: Map<number, string> }) {
  const id = cardId(card)
  if (!id) return null
  const state = stateOf(card, attempts)
  const subject = cardSubject(card, subjectNames)
  const art = subjectArtwork(subject)
  const inProgress = attempts.find((attempt) => attempt.quizId === id && attempt.status === 'IN_PROGRESS')
  const lastSubmitted = attempts.find((attempt) => attempt.quizId === id && attempt.status === 'SUBMITTED')
  const duePassed = Boolean(card.assignment?.dueAt && new Date(card.assignment.dueAt).getTime() <= Date.now())
  const canStart = state !== 'UPCOMING' && !duePassed && remaining(card) > 0
  const action = inProgress ? { to: `/student/attempts/${inProgress.id}`, text: duePassed ? 'Xem lượt làm' : 'Tiếp tục làm' }
    : canStart ? { to: `/student/quizzes/${id}`, text: lastSubmitted ? 'Làm lại đề' : 'Bắt đầu làm' }
      : lastSubmitted ? { to: `/student/attempts/${lastSubmitted.id}/result`, text: 'Xem kết quả' }
        : state === 'UPCOMING' ? null : { to: `/student/quizzes/${id}`, text: 'Xem chi tiết' }
  return <article className="student-practice__card">
    <div className={`student-practice__card-art student-practice__card-art--${art.theme}`}><img src={art.image} alt="" /></div>
    <div className="student-practice__card-body"><div className="student-practice__card-top"><span>{subject || 'Môn học'}</span><span className={`student-practice__state student-practice__state--${state.toLowerCase()}`}>{stateLabels[state]}</span></div><h3>{card.assignment?.quizTitle ?? card.quiz?.title}</h3><p>{card.quiz?.description || card.assignment?.topicName || card.quiz?.topicName || 'Khám phá đề luyện tập.'}</p><div className="student-practice__facts"><span>{card.assignment?.questionCount ?? card.quiz?.questionCount ?? 0} câu hỏi</span><span>{card.assignment?.timeLimitMinutes ?? card.quiz?.timeLimitMinutes ? `${card.assignment?.timeLimitMinutes ?? card.quiz?.timeLimitMinutes} phút` : 'Không giới hạn giờ'}</span><span>{remaining(card)} lượt mới còn lại</span>{card.assignment?.className && <span>Lớp {card.assignment.className}</span>}{card.assignment?.dueAt && <span>Hạn {formatDate(card.assignment.dueAt)}</span>}</div></div>
    {action ? <Link className="student-practice__action" to={action.to}>{action.text} →</Link> : <span className="student-practice__disabled">Chưa mở</span>}
  </article>
}

export default function StudentPracticePage() {
  const location = useLocation()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [assignments, setAssignments] = useState<QuizAssignment[]>([])
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [tab, setTab] = useState<PracticeTab>('ASSIGNED')
  const [selectedSubject, setSelectedSubject] = useState<SubjectSelection>('all')
  const [topicId, setTopicId] = useState('')
  const [status, setStatus] = useState<PracticeStatus>('ALL')
  const [sort, setSort] = useState<'DUE' | 'NEWEST'>('DUE')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingTopics, setLoadingTopics] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { setQuery(new URLSearchParams(location.search).get('q') ?? '') }, [location.search])

  useEffect(() => {
    let active = true
    void Promise.all([catalogApi.subjects(), quizApi.studentList(), quizApi.assignments(), attemptApi.mine()])
      .then(([subjectRows, quizRows, assignmentRows, attemptRows]) => {
        if (!active) return
        setSubjects(subjectRows); setQuizzes(quizRows); setAssignments(assignmentRows); setAttempts(attemptRows)
      }).catch((cause) => { if (active) setError(messageOf(cause)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  useEffect(() => {
    if (selectedSubject === 'all') { setTopics([]); return }
    const subjectIds = subjects.filter((item) => subjectFamily(item.name) === selectedSubject).map((item) => item.id)
    if (!subjectIds.length) { setTopics([]); return }
    let active = true
    setLoadingTopics(true)
    void Promise.all(subjectIds.map((id) => catalogApi.topics(id))).then((groups) => {
      if (active) setTopics(groups.flat())
    }).catch((cause) => { if (active) setError(messageOf(cause)) })
      .finally(() => { if (active) setLoadingTopics(false) })
    return () => { active = false }
  }, [selectedSubject, subjects])

  const subjectNames = useMemo(() => new Map(subjects.map((item) => [item.id, item.name])), [subjects])
  const assignedCards: PracticeCard[] = assignments.map((assignment) => ({ assignment, quiz: quizzes.find((quiz) => quiz.id === assignment.quizId) }))
  const publicCards: PracticeCard[] = quizzes.filter((quiz) => quiz.visibility === 'PUBLIC').map((quiz) => ({ quiz }))
  const allCards: PracticeCard[] = [...assignedCards, ...publicCards]
  const submittedQuizIds = new Set(attempts.filter((item) => item.status === 'SUBMITTED').map((item) => item.quizId))
  const urgent = assignments.filter((item) => {
    if (!item.dueAt || submittedQuizIds.has(item.quizId)) return false
    const left = new Date(item.dueAt).getTime() - Date.now()
    return left > 0 && left <= 7 * 24 * 60 * 60 * 1000 && new Date(item.availableAt).getTime() <= Date.now()
  }).sort((a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime()).slice(0, 3)
  const otherCount = allCards.filter((card) => subjectFamily(cardSubject(card, subjectNames)) === 'other').length
  const cards = tab === 'ASSIGNED' ? assignedCards : publicCards
  const shown = cards.filter((card) => {
    if (selectedSubject !== 'all' && subjectFamily(cardSubject(card, subjectNames)) !== selectedSubject) return false
    if (topicId && (card.assignment?.topicId ?? card.quiz?.topicId) !== Number(topicId)) return false
    if (status !== 'ALL' && stateOf(card, attempts) !== status) return false
    const text = `${card.assignment?.quizTitle ?? card.quiz?.title ?? ''} ${card.assignment?.topicName ?? card.quiz?.topicName ?? ''} ${cardSubject(card, subjectNames)}`.toLocaleLowerCase('vi-VN')
    return text.includes(query.trim().toLocaleLowerCase('vi-VN'))
  }).sort((a, b) => {
    if (sort === 'DUE') return (a.assignment?.dueAt ? new Date(a.assignment.dueAt).getTime() : Infinity) - (b.assignment?.dueAt ? new Date(b.assignment.dueAt).getTime() : Infinity)
    return new Date(b.assignment?.availableAt ?? b.quiz?.publishedAt ?? 0).getTime() - new Date(a.assignment?.availableAt ?? a.quiz?.publishedAt ?? 0).getTime()
  })

  function selectSubject(value: SubjectSelection) { setSelectedSubject(value); setTopicId('') }

  return <div className="student-practice">
    <header className="student-practice__header"><div><span className="student-practice__eyebrow">KHÔNG GIAN LUYỆN TẬP</span><h1>Luyện đề</h1><p>Chọn môn học, tìm đề phù hợp và bắt đầu luyện tập.</p></div><img src={heroArt} alt="" /></header>
    {error && <Notice message={error} />}
    {urgent.length > 0 && <section className="student-practice__urgent"><div className="student-practice__heading"><h2>Sắp đến hạn</h2><span>{urgent.length} đề chưa nộp</span></div><div className="student-practice__urgent-list">{urgent.map((assignment) => {
      const progress = attempts.find((item) => item.quizId === assignment.quizId && item.status === 'IN_PROGRESS')
      return <Link key={assignment.id} to={progress ? `/student/attempts/${progress.id}` : `/student/quizzes/${assignment.quizId}`}><span className="student-practice__urgent-dot" /><strong>{assignment.quizTitle}</strong><small>{assignment.subjectName} · Hạn {formatDate(assignment.dueAt)}</small><b>{progress ? 'Tiếp tục' : 'Mở đề'} →</b></Link>
    })}</div></section>}
    <section className="student-practice__subjects"><div className="student-practice__heading"><div><h2>Chọn môn học</h2><p>Chọn một môn để xem đề và lọc theo chủ đề.</p></div><button type="button" onClick={() => selectSubject('all')}>Tất cả môn →</button></div><div className="student-practice__subject-grid">{subjectFamilies.map((item) => {
      const count = new Set(allCards.filter((card) => subjectFamily(cardSubject(card, subjectNames)) === item.key).map(cardId)).size
      return <button type="button" key={item.key} aria-pressed={selectedSubject === item.key} className={`student-practice__subject${selectedSubject === item.key ? ' student-practice__subject--selected' : ''}`} onClick={() => selectSubject(item.key)}><img src={item.image} alt="" /><strong>{item.label}</strong><small>{count} đề</small></button>
    })}{otherCount > 0 && <button type="button" aria-pressed={selectedSubject === 'other'} className={`student-practice__subject${selectedSubject === 'other' ? ' student-practice__subject--selected' : ''}`} onClick={() => selectSubject('other')}><img src={heroArt} alt="" /><strong>Môn khác</strong><small>{otherCount} đề</small></button>}</div></section>
    <div className="student-practice__layout"><section className="student-practice__main"><div className="student-practice__heading"><div><h2>Đề theo môn</h2><p>{selectedSubject === 'all' ? 'Chọn môn học để thu hẹp danh sách.' : 'Các đề thuộc môn đã chọn.'}</p></div><Link to="/student/results">Xem kết quả →</Link></div><div className="student-practice__tabs" role="tablist" aria-label="Loại đề"><button type="button" role="tab" aria-selected={tab === 'ASSIGNED'} className={tab === 'ASSIGNED' ? 'is-active' : ''} onClick={() => setTab('ASSIGNED')}>Được giao ({assignments.length})</button><button type="button" role="tab" aria-selected={tab === 'PUBLIC'} className={tab === 'PUBLIC' ? 'is-active' : ''} onClick={() => setTab('PUBLIC')}>Luyện tập công khai ({publicCards.length})</button></div>{loading ? <p className="student-practice__loading">Đang tải đề...</p> : shown.length ? <div className="student-practice__list">{shown.map((card) => <PracticeCardView key={card.assignment?.id ?? card.quiz?.id} card={card} attempts={attempts} subjectNames={subjectNames} />)}</div> : <Empty title="Chưa có đề phù hợp" detail="Thử đổi môn, chủ đề hoặc bộ lọc." />}</section>
      <aside className="student-practice__filters"><h2>Bộ lọc nhanh</h2><label>Từ khóa<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên đề, chủ đề..." /></label><label>Môn học<select value={selectedSubject} onChange={(event) => selectSubject(event.target.value as SubjectSelection)}><option value="all">Tất cả môn</option>{subjectFamilies.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}{otherCount > 0 && <option value="other">Môn khác</option>}</select></label><label>Chủ đề<select value={topicId} onChange={(event) => setTopicId(event.target.value)} disabled={selectedSubject === 'all' || loadingTopics || !topics.length}><option value="">{loadingTopics ? 'Đang tải chủ đề...' : 'Tất cả chủ đề'}</option>{topics.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Trạng thái<select value={status} onChange={(event) => setStatus(event.target.value as PracticeStatus)}><option value="ALL">Tất cả</option><option value="READY">Chưa làm</option><option value="IN_PROGRESS">Đang làm</option><option value="SUBMITTED">Đã nộp</option><option value="UPCOMING">Chưa mở</option><option value="CLOSED">Đã đóng</option></select></label><label>Sắp xếp<select value={sort} onChange={(event) => setSort(event.target.value as 'DUE' | 'NEWEST')}><option value="DUE">Hạn gần nhất</option><option value="NEWEST">Mới nhất</option></select></label><p>Đề đã nộp và hết lượt làm sẽ có nút xem kết quả.</p></aside></div>
  </div>
}
