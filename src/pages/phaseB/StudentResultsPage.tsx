import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { attemptApi } from '../../api/phaseBApi'
import { subjectArtwork } from '../../components/subjectVisual'
import { Empty, Notice, formatDate, messageOf } from '../../components/WorkspaceUi'
import type { AttemptResult, AttemptSummary } from '../../types/phaseB'
import './student-results.css'

type ResultFilter = 'ALL' | 'AVAILABLE' | 'PENDING'
type DateFilter = 'ALL' | '7' | '30'

function percentOf(item: AttemptSummary) {
  return item.available && Number(item.maxScore) > 0
    ? Math.round(Number(item.score) / Number(item.maxScore) * 100) : null
}

function scoreOf(item: AttemptSummary) {
  const percent = percentOf(item)
  return percent == null ? 'Chờ công bố' : `${(percent / 10).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}/10`
}

export default function StudentResultsPage() {
  const location = useLocation()
  const [results, setResults] = useState<AttemptSummary[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<AttemptResult | null>(null)
  const [query, setQuery] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [dateFilter, setDateFilter] = useState<DateFilter>('ALL')
  const [resultFilter, setResultFilter] = useState<ResultFilter>('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [detailError, setDetailError] = useState('')

  useEffect(() => { setQuery(new URLSearchParams(location.search).get('q') ?? '') }, [location.search])
  useEffect(() => {
    let active = true
    void attemptApi.myResults().then((rows) => {
      if (!active) return
      setResults(rows)
      setSelectedId(rows[0]?.id ?? null)
    }).catch((cause) => { if (active) setError(messageOf(cause)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const subjects = useMemo(() => [...new Map(results.map((item) => [item.subjectId, item.subjectName])).entries()], [results])
  const cutoff = dateFilter === 'ALL' ? 0 : Date.now() - Number(dateFilter) * 24 * 60 * 60 * 1000
  const shown = results.filter((item) => {
    if (subjectId && item.subjectId !== Number(subjectId)) return false
    if (cutoff && new Date(item.submittedAt).getTime() < cutoff) return false
    if (resultFilter === 'AVAILABLE' && !item.available) return false
    if (resultFilter === 'PENDING' && item.available) return false
    const text = `${item.quizTitle} ${item.subjectName} ${item.topicName}`.toLocaleLowerCase('vi-VN')
    return text.includes(query.trim().toLocaleLowerCase('vi-VN'))
  })
  const selected = shown.find((item) => item.id === selectedId) ?? shown[0]
  useEffect(() => {
    if (!selected?.available) { setDetail(null); setDetailError(''); return }
    let active = true
    setDetail(null); setDetailError('')
    void attemptApi.result(selected.id).then((row) => { if (active) setDetail(row) })
      .catch((cause) => { if (active) setDetailError(messageOf(cause)) })
    return () => { active = false }
  }, [selected?.id, selected?.available])

  const scored = results.filter((item) => percentOf(item) != null)
  const average = scored.length ? Math.round(scored.reduce((total, item) => total + percentOf(item)!, 0) / scored.length) : null
  const best = scored.length ? Math.max(...scored.map((item) => percentOf(item)!)) : null
  const chartRows = [...shown.filter((item) => percentOf(item) != null)].slice(0, 8).reverse()
  const chartPoints = chartRows.map((item, index) =>
    `${25 + index * (550 / Math.max(1, chartRows.length - 1))},${130 - percentOf(item)! * 1.05}`).join(' ')
  const topicRows = subjectId ? shown.filter((item) => item.available) : []
  const topicGroups = [...new Map(topicRows.map((item) => [item.topicId, item.topicName])).entries()]
    .map(([id, name]) => {
      const group = topicRows.filter((item) => item.topicId === id)
      const questions = group.reduce((total, item) => total + item.questionCount, 0)
      const correct = group.reduce((total, item) => total + (item.correctCount ?? 0), 0)
      return { id, name, attempts: group.length, percent: questions ? Math.round(correct / questions * 100) : 0 }
    }).filter((item) => item.attempts >= 3)
  const wrongQuestions = detail?.available ? detail.questions?.map((question, index) => ({ question, index }))
    .filter(({ question }) => !question.isCorrect) ?? [] : []

  return <div className="student-results">
    <header className="student-results__header"><div><span className="student-results__eyebrow">HÀNH TRÌNH CỦA BẠN</span><h1>Kết quả luyện tập</h1><p>Xem lại từng lượt làm và theo dõi sự tiến bộ của bạn.</p></div><Link to="/student/quizzes">← Tiếp tục luyện đề</Link></header>
    {error && <Notice message={error} />}
    <div className="student-results__stats">
      <article><span className="student-results__stat-icon">▤</span><div><small>Lượt đã nộp</small><strong>{results.length}</strong></div></article>
      <article><span className="student-results__stat-icon student-results__stat-icon--mint">◉</span><div><small>Điểm trung bình</small><strong>{average == null ? '—' : `${(average / 10).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}/10`}</strong></div></article>
      <article><span className="student-results__stat-icon student-results__stat-icon--purple">★</span><div><small>Điểm cao nhất</small><strong>{best == null ? '—' : `${(best / 10).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}/10`}</strong></div></article>
    </div>
    <div className="student-results__layout">
      <section className="student-results__panel student-results__history">
        <div className="student-results__section-title"><div><h2>Lịch sử lượt làm</h2><p>{shown.length} lượt phù hợp</p></div></div>
        <div className="student-results__filters">
          <input type="search" aria-label="Tìm theo tên đề" placeholder="Tìm theo tên đề, chủ đề..." value={query} onChange={(event) => setQuery(event.target.value)} />
          <select aria-label="Lọc môn" value={subjectId} onChange={(event) => setSubjectId(event.target.value)}><option value="">Tất cả môn</option>{subjects.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
          <select aria-label="Lọc thời gian" value={dateFilter} onChange={(event) => setDateFilter(event.target.value as DateFilter)}><option value="ALL">Mọi thời gian</option><option value="7">7 ngày qua</option><option value="30">30 ngày qua</option></select>
          <select aria-label="Lọc trạng thái kết quả" value={resultFilter} onChange={(event) => setResultFilter(event.target.value as ResultFilter)}><option value="ALL">Tất cả kết quả</option><option value="AVAILABLE">Đã công bố</option><option value="PENDING">Chờ công bố</option></select>
        </div>
        {loading ? <p className="student-results__loading">Đang tải kết quả...</p>
          : shown.length ? <div className="student-results__list">{shown.map((item) => {
            const art = subjectArtwork(item.subjectName)
            return <button type="button" key={item.id} className={`student-results__row${selected?.id === item.id ? ' student-results__row--active' : ''}`} onClick={() => setSelectedId(item.id)}>
              <span className={`student-results__row-icon student-results__row-icon--${art.theme}`}><img src={art.image} alt="" /></span>
              <span className="student-results__row-copy"><strong>{item.quizTitle}</strong><small>{item.subjectName} · {item.topicName} · Lượt {item.attemptNo}</small><small>Nộp {formatDate(item.submittedAt)}</small></span>
              <span className={item.available ? 'student-results__score' : 'student-results__score student-results__score--pending'}>{scoreOf(item)}</span>
              <span className="student-results__row-arrow">›</span>
            </button>
        })}</div> : <Empty title={results.length ? 'Không có lượt làm phù hợp' : 'Bạn chưa nộp đề nào'} detail={results.length ? 'Thử đổi bộ lọc hoặc từ khóa tìm kiếm.' : 'Chọn một đề luyện tập để bắt đầu.'} />}
      </section>
      <aside className="student-results__panel student-results__detail">
        {selected ? <><div className="student-results__detail-title"><span className="student-results__detail-icon">▤</span><div><h2>{selected.quizTitle}</h2><p>{selected.subjectName} · {selected.topicName}</p></div></div>
          {selected.available && percentOf(selected) != null ? <>
            <div className="student-results__score-overview"><div className="student-results__ring" style={{ background: `conic-gradient(#29b991 ${percentOf(selected)}%, #e8edf6 0)` }}><span><strong>{scoreOf(selected)}</strong><small>Điểm bài làm</small></span></div><div><small>Đã nộp</small><strong>{formatDate(selected.submittedAt)}</strong><small>Câu đúng</small><strong>{selected.correctCount ?? 0}/{selected.questionCount}</strong></div></div>
            <div className="student-results__bar-label"><span>Tỷ lệ câu đúng</span><strong>{selected.questionCount ? Math.round((selected.correctCount ?? 0) / selected.questionCount * 100) : 0}%</strong></div><div className="student-results__bar"><span style={{ width: `${selected.questionCount ? Math.round((selected.correctCount ?? 0) / selected.questionCount * 100) : 0}%` }} /></div>
            <Link className="student-results__primary" to={`/student/attempts/${selected.id}/result`}>Xem đáp án từng câu →</Link>
            {detailError && <Notice message={detailError} />}
            {wrongQuestions.length > 0 && <div className="student-results__wrong"><h3>Câu cần xem lại <span>({wrongQuestions.length})</span></h3>{wrongQuestions.slice(0, 5).map(({ question, index }) => <Link key={question.id} to={`/student/attempts/${selected.id}/result#question-${question.id}`}><b>{index + 1}</b><span>{question.stem}</span><span>›</span></Link>)}</div>}
          </> : <div className="student-results__pending"><span>◷</span><h3>Chờ công bố kết quả</h3><p>{selected.resultPolicy === 'AFTER_DUE' ? 'Điểm và đáp án sẽ hiển thị sau hạn nộp của lớp.' : 'Giáo viên đang ẩn điểm và đáp án của đề này.'}</p><small>Nộp {formatDate(selected.submittedAt)}</small><Link to={`/student/attempts/${selected.id}/result`}>Xem trạng thái →</Link></div>}
        </> : <div className="student-results__detail-empty">Chọn một lượt làm để xem chi tiết.</div>}
      </aside>
    </div>
    {chartRows.length >= 3 && <section className="student-results__panel student-results__trend"><div className="student-results__section-title"><div><h2>Tiến bộ điểm số</h2><p>{subjectId ? 'Theo môn đã chọn' : 'Các lượt làm gần đây'} · chỉ tính kết quả đã công bố</p></div></div><div className="student-results__chart"><span>10</span><span>5</span><span>0</span><svg viewBox="0 0 600 150" preserveAspectRatio="none" role="img" aria-label="Biểu đồ điểm các lượt làm gần đây"><line x1="25" y1="25" x2="580" y2="25" /><line x1="25" y1="77" x2="580" y2="77" /><line x1="25" y1="130" x2="580" y2="130" /><polyline points={chartPoints} />{chartRows.map((item, index) => <circle key={item.id} cx={25 + index * (550 / Math.max(1, chartRows.length - 1))} cy={130 - percentOf(item)! * 1.05} r="4" />)}</svg></div><div className="student-results__chart-labels">{chartRows.map((item) => <span key={item.id}>{new Date(item.submittedAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</span>)}</div></section>}
    {topicGroups.length > 0 && <section className="student-results__panel student-results__topics"><div className="student-results__section-title"><div><h2>Theo chủ đề của đề</h2><p>Tổng hợp các lượt làm thuộc môn đang chọn.</p></div></div>{topicGroups.map((item) => <div key={item.id}><strong>{item.name}</strong><span>{item.attempts} lượt · {item.percent}% câu đúng</span><div className="student-results__bar"><span style={{ width: `${item.percent}%` }} /></div></div>)}</section>}
  </div>
}
