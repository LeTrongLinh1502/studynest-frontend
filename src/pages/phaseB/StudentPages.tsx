import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { attemptApi, reportApi } from '../../api/phaseBApi'
import type { Attempt, AttemptResult } from '../../types/phaseB'
import { Notice, PageHeader, Panel, formatDate, messageOf } from '../../components/WorkspaceUi'

export function ReportForm({ targetType, targetId }: { targetType: 'QUIZ' | 'LESSON' | 'QUESTION' | 'LESSON_RESOURCE'; targetId: number }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [category, setCategory] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('')
    try { await reportApi.create(targetType, targetId, category ? `${category}: ${reason.trim()}` : reason.trim()); setReason(''); setCategory(''); setOpen(false); setSuccess('Đã gửi báo cáo cho quản trị viên.') }
    catch (e) { setError(messageOf(e)) } finally { setBusy(false) }
  }
  return <div className="report-form">{success && <Notice tone="success" message={success} />}<button type="button" className="text-button" onClick={() => setOpen(true)}>Báo cáo nội dung</button>{open && createPortal(<div className="report-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false) }}><section className="report-dialog" role="dialog" aria-modal="true" aria-label="Báo cáo nội dung"><div className="report-dialog__heading"><div><p className="page-eyebrow">PHẢN HỒI CỘNG ĐỒNG</p><h2>Báo cáo nội dung</h2></div><button className="text-button" type="button" onClick={() => setOpen(false)} aria-label="Đóng">✕</button></div><p className="muted-text">Nội dung: {targetType} #{targetId}. Quản trị viên sẽ xem xét báo cáo của bạn.</p>{error && <Notice message={error} />}<form className="workspace-form" onSubmit={submit}><div className="report-reasons" role="group" aria-label="Loại vấn đề">{['Nội dung sai', 'Tài liệu lỗi', 'Không phù hợp', 'Khác'].map((item) => <button key={item} className={category === item ? 'is-active' : ''} type="button" onClick={() => setCategory(item)}>{item}</button>)}</div><label>Mô tả vấn đề<textarea minLength={10} maxLength={1900} required rows={5} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Mô tả cụ thể vấn đề để quản trị viên kiểm tra..." /></label><div className="button-row"><button type="button" className="button button--soft" onClick={() => setOpen(false)}>Hủy</button><button className="button button--primary" disabled={busy}>{busy ? 'Đang gửi...' : 'Gửi báo cáo'}</button></div></form></section></div>, document.body)}</div>
}

export function StudentAttemptPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [attempt, setAttempt] = useState<Attempt | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [saving, setSaving] = useState<number[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { void attemptApi.one(id).then((a) => { if (a.status === 'SUBMITTED') navigate(`/student/attempts/${id}/result`, { replace: true }); else setAttempt(a) }).catch((e) => setError(messageOf(e))) }, [id, navigate])
  useEffect(() => {
    if (!attempt?.deadlineAt) return
    const tick = () => setRemaining(Math.max(0, Math.ceil((new Date(attempt.deadlineAt!).getTime() - Date.now()) / 1000)))
    tick(); const timer = window.setInterval(tick, 1000); return () => window.clearInterval(timer)
  }, [attempt?.deadlineAt])
  useEffect(() => { if (remaining === 0 && attempt) void attemptApi.result(id).then(() => navigate(`/student/attempts/${id}/result`, { replace: true })).catch((e) => setError(messageOf(e))) }, [remaining, attempt, id, navigate])
  async function answer(questionId: number, optionId: number) {
    if (!attempt || saving.includes(questionId)) return
    setSaving((old) => [...old, questionId]); setError('')
    try {
      const response = await attemptApi.answer(id, questionId, optionId)
      if (response.status === 'SUBMITTED') { navigate(`/student/attempts/${id}/result`, { replace: true }); return }
      setAttempt((old) => old ? { ...old, questions: old.questions?.map((q) => q.id === questionId ? { ...q, selectedOptionIds: [optionId] } : q) } : old)
    } catch (e) { setError(messageOf(e)) } finally { setSaving((old) => old.filter((q) => q !== questionId)) }
  }
  async function toggleFlag(questionId: number, flagged: boolean) {
    if (!attempt || busy) return
    setError('')
    try {
      await attemptApi.flag(id, questionId, flagged)
      setAttempt((old) => old ? { ...old, questions: old.questions?.map((q) => q.id === questionId ? { ...q, flagged } : q) } : old)
    } catch (e) { setError(messageOf(e)) }
  }
  async function submit() {
    if (!window.confirm('Nộp bài ngay? Sau khi nộp, bạn sẽ không sửa được đáp án.')) return
    setBusy(true); setError('')
    try { await attemptApi.submit(id); navigate(`/student/attempts/${id}/result`, { replace: true }) }
    catch (e) { setError(messageOf(e)) } finally { setBusy(false) }
  }
  const count = attempt?.questions?.filter((q) => q.selectedOptionIds?.length).length ?? 0
  const questions = attempt?.questions ?? []
  const safeIndex = Math.min(currentIndex, Math.max(0, questions.length - 1))
  const active = questions[safeIndex]
  return <>
    <PageHeader eyebrow={`LƯỢT LÀM ${attempt?.attemptNo ?? ''}`} title={attempt?.quizTitle ?? 'Đang tải bài...'} description={attempt ? `Đã trả lời ${count}/${questions.length} câu. Đáp án được lưu khi chọn.` : undefined} action={<span className={`quiz-timer${remaining !== null && remaining < 60 ? ' quiz-timer--urgent' : ''}`}>{remaining === null ? 'Không giới hạn giờ' : `${Math.floor(remaining / 60).toString().padStart(2, '0')}:${(remaining % 60).toString().padStart(2, '0')}`}</span>} />
    {error && <Notice message={error} />}
    {active && <div className="attempt-layout">
      <div className="attempt-layout__main"><Panel className="quiz-question" title={`Câu ${safeIndex + 1} / ${questions.length} · ${active.points} điểm`}>
        <div className="attempt-progress"><span style={{ width: `${((safeIndex + 1) / questions.length) * 100}%` }} /></div>
        <h3>{active.stem}</h3>
        <div className="quiz-choices">{active.options.map((option) => <label className={`quiz-choice${active.selectedOptionIds?.includes(option.id) ? ' quiz-choice--selected' : ''}`} key={option.id}><input type="radio" name={`question-${active.id}`} checked={active.selectedOptionIds?.includes(option.id) ?? false} disabled={saving.includes(active.id) || busy} onChange={() => void answer(active.id, option.id)} />{option.content}</label>)}</div>
        {saving.includes(active.id) && <small className="muted-text">Đang lưu đáp án...</small>}
        <div className="attempt-controls"><button type="button" className="button button--soft" disabled={safeIndex === 0} onClick={() => setCurrentIndex(safeIndex - 1)}>← Câu trước</button><button type="button" className={`button ${active.flagged ? 'button--danger' : 'button--soft'}`} onClick={() => void toggleFlag(active.id, !active.flagged)}>{active.flagged ? 'Bỏ đánh dấu' : 'Đánh dấu xem lại'}</button><button type="button" className="button button--primary" disabled={safeIndex === questions.length - 1} onClick={() => setCurrentIndex(safeIndex + 1)}>Câu tiếp →</button></div>
      </Panel></div>
      <Panel title="Điều hướng câu hỏi" className="attempt-layout__nav"><div className="attempt-question-grid">{questions.map((q, index) => <button key={q.id} type="button" title={q.flagged ? 'Đã đánh dấu' : q.selectedOptionIds?.length ? 'Đã trả lời' : 'Chưa trả lời'} className={`${index === safeIndex ? 'is-active ' : ''}${q.flagged ? 'is-flagged ' : ''}${q.selectedOptionIds?.length ? 'is-answered' : ''}`} onClick={() => setCurrentIndex(index)}>{index + 1}</button>)}</div><p className="muted-text">{count} đã trả lời · {questions.filter((q) => q.flagged).length} cần xem lại</p><button className="button button--primary" type="button" disabled={busy || saving.length > 0} onClick={() => void submit()}>{busy ? 'Đang nộp...' : 'Nộp bài'}</button></Panel>
    </div>}
  </>
}

export function StudentResultPage() {
  const id = Number(useParams().id)
  const location = useLocation()
  const [result, setResult] = useState<AttemptResult | null>(null)
  const [error, setError] = useState('')
  useEffect(() => { void attemptApi.result(id).then(setResult).catch((e) => setError(messageOf(e))) }, [id])
  useEffect(() => {
    if (!result?.available || !location.hash) return
    document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [result, location.hash])
  const percent = result?.maxScore ? Math.round((Number(result.score ?? 0) / Number(result.maxScore)) * 100) : 0
  const correct = result?.questions?.filter((q) => q.isCorrect).length ?? 0
  return <>
    <PageHeader eyebrow="KẾT QUẢ LÀM BÀI" title={result?.quizTitle ?? 'Đang tải kết quả...'} action={<Link className="button button--soft" to="/student/results">← Kết quả luyện tập</Link>} />
    {error && <Notice message={error} />}
    {result && <>{result.available ? <>
      <div className="workspace-two-col workspace-two-col--wide"><Panel title="Kết quả của bạn"><div className="result-overview"><div className="result-ring" style={{ background: `conic-gradient(#4e5fe7 ${percent}%, #e7ecf7 0)` }}><span><strong>{percent}%</strong><small>Hoàn thành</small></span></div><div><p className="page-eyebrow">ĐIỂM BÀI LÀM</p><h2>{result.score}/{result.maxScore}</h2><p className="muted-text">{correct}/{result.questions?.length ?? 0} câu đúng · Nộp {formatDate(result.submittedAt)}</p></div></div></Panel><Panel title="Ôn tập tiếp"><div className="analytics-progress-row"><div><strong>{result.topicName ?? 'Chủ đề của đề'}</strong><small>Mức đạt {percent}% theo điểm bài làm</small></div><div className="analytics-progress"><span style={{ width: `${percent}%` }} /></div></div><p className="muted-text">Xem lại các câu sai và phần giải thích để củng cố kiến thức.</p>{result.lessonId ? <Link className="button button--primary" to={`/student/lessons/${result.lessonId}`}>Mở bài học liên quan →</Link> : <Link className="button button--soft" to="/student/lessons">Khám phá bài học →</Link>}</Panel></div>
      <Panel title="Xem lại từng câu">{result.questions?.map((q, index) => <div className="quiz-question result-question" id={`question-${q.id}`} key={q.id}><div className="result-question__heading"><h3>Câu {index + 1}. {q.stem}</h3><span className={q.isCorrect ? 'result-correct' : 'result-incorrect'}>{q.isCorrect ? 'Đúng' : 'Sai hoặc chưa trả lời'} · {q.pointsEarned}/{q.points} điểm</span></div><div className="quiz-choices">{q.options.map((o) => <div className={`quiz-choice${o.isCorrect ? ' quiz-choice--correct' : ''}${q.selectedOptionIds?.includes(o.id) ? ' quiz-choice--selected' : ''}`} key={o.id}>{o.content}{o.isCorrect ? ' ✓ Đáp án đúng' : ''}{q.selectedOptionIds?.includes(o.id) ? ' · Bạn đã chọn' : ''}</div>)}</div>{q.explanation && <p><strong>Giải thích:</strong> {q.explanation}</p>}{q.sourceQuestionId && <ReportForm targetType="QUESTION" targetId={q.sourceQuestionId} />}</div>)}</Panel>
    </> : <Panel title="Đã nộp bài"><p>{result.status !== 'SUBMITTED' ? 'Bài chưa được nộp.' : result.resultPolicy === 'AFTER_DUE' ? 'Kết quả sẽ hiển thị sau hạn nộp của lớp.' : 'Giáo viên đang ẩn kết quả của đề này.'}</p><p>Nộp lúc {formatDate(result.submittedAt)}</p></Panel>}<ReportForm targetType="QUIZ" targetId={result.quizId} /></>}
  </>
}

