import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { lessonApi } from '../../api/phaseAApi'
import { questionApi, quizApi } from '../../api/phaseBApi'
import type { QuestionDraftInput, QuizInput } from '../../api/phaseBApi'
import type { Lesson } from '../../types/phaseA'
import type { ClassAnalytics, Question, Quiz, QuizResults } from '../../types/phaseB'
import { ApiError } from '../../api/httpClient'
import SubjectTopicFields from '../../components/SubjectTopicFields'
import { Empty, Notice, PageHeader, Panel, formatDate, messageOf } from '../../components/WorkspaceUi'

type QuestionDraft = QuestionDraftInput & { key: number }
const blankQuestion = (key: number): QuestionDraft => ({ key, difficulty: 'MEDIUM', stem: '', explanation: '', options: [{ content: '', isCorrect: true }, { content: '', isCorrect: false }, { content: '', isCorrect: false }, { content: '', isCorrect: false }] })

function QuestionCard({ draft, index, canRemove, canDuplicate, onChange, onRemove, onDuplicate }: {
  draft: QuestionDraft; index: number; canRemove: boolean; canDuplicate: boolean
  onChange: (next: QuestionDraft) => void; onRemove: () => void; onDuplicate: () => void
}) {
  const changeOption = (optionIndex: number, content: string) => onChange({ ...draft, options: draft.options.map((option, i) => i === optionIndex ? { ...option, content } : option) })
  const removeOption = (optionIndex: number) => {
    const options = draft.options.filter((_, i) => i !== optionIndex)
    if (!options.some((option) => option.isCorrect)) options[0] = { ...options[0], isCorrect: true }
    onChange({ ...draft, options })
  }
  return <section className="question-draft" aria-label={`Câu hỏi ${index + 1}`}>
    <div className="question-draft__heading"><h3>Câu {index + 1}</h3><div className="item-actions">{canDuplicate && <button type="button" className="text-button" onClick={onDuplicate}>Nhân bản</button>}{canRemove && <button type="button" className="text-button text-button--danger" onClick={onRemove}>Xóa câu</button>}</div></div>
    <label>Mức độ<select value={draft.difficulty} onChange={(event) => onChange({ ...draft, difficulty: event.target.value as QuestionDraft['difficulty'] })}><option value="EASY">Dễ</option><option value="MEDIUM">Trung bình</option><option value="HARD">Khó</option></select></label>
    <label>Nội dung câu hỏi<textarea required rows={3} value={draft.stem} onChange={(event) => onChange({ ...draft, stem: event.target.value })} /></label>
    <div className="choice-editor"><strong>Đáp án (chọn một đáp án đúng)</strong>{draft.options.map((option, optionIndex) => <div className="choice-editor__row" key={optionIndex}><input type="radio" name={`correct-${draft.key}`} checked={option.isCorrect} onChange={() => onChange({ ...draft, options: draft.options.map((item, i) => ({ ...item, isCorrect: i === optionIndex })) })} aria-label={`Câu ${index + 1}, đáp án ${optionIndex + 1} đúng`} /><input required value={option.content} onChange={(event) => changeOption(optionIndex, event.target.value)} placeholder={`Đáp án ${optionIndex + 1}`} />{draft.options.length > 2 && <button type="button" className="text-button" onClick={() => removeOption(optionIndex)}>Xóa</button>}</div>)}{draft.options.length < 8 && <button type="button" className="text-button" onClick={() => onChange({ ...draft, options: [...draft.options, { content: '', isCorrect: false }] })}>+ Thêm đáp án</button>}</div>
    <label>Giải thích sau khi làm<textarea rows={2} value={draft.explanation} onChange={(event) => onChange({ ...draft, explanation: event.target.value })} /></label>
  </section>
}

export function TeacherQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [subjectId, setSubjectId] = useState(0)
  const [topicId, setTopicId] = useState(0)
  const nextKey = useRef(2)
  const [drafts, setDrafts] = useState<QuestionDraft[]>([blankQuestion(1)])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const load = () => questionApi.mine().then(setQuestions)
  useEffect(() => { void load().catch((e) => setError(messageOf(e))) }, [])
  async function edit(id: number) {
    try {
      const q = await questionApi.one(id)
      setSelected(id); setSubjectId(q.subjectId); setTopicId(q.topicId)
      setDrafts([{ key: nextKey.current++, difficulty: q.difficulty, stem: q.stem, explanation: q.explanation ?? '', options: (q.options ?? []).map((o) => ({ content: o.content, isCorrect: Boolean(o.isCorrect) })) }])
      document.getElementById('question-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } catch (e) { setError(messageOf(e)) }
  }
  function changeDraft(key: number, next: QuestionDraft) { setDrafts((current) => current.map((item) => item.key === key ? next : item)) }
  function resetEditor() { setSelected(null); setDrafts([blankQuestion(nextKey.current++)]) }
  function addDraft() { setDrafts((current) => current.length >= 20 ? current : [...current, blankQuestion(nextKey.current++)]) }
  function duplicateDraft(key: number) {
    setDrafts((current) => {
      if (current.length >= 20) return current
      const source = current.find((item) => item.key === key)
      return source ? [...current, { ...source, key: nextKey.current++, options: source.options.map((option) => ({ ...option })) }] : current
    })
  }
  function saveError(cause: unknown): string {
    if (cause instanceof ApiError) {
      const first = Object.entries(cause.fieldErrors)[0]
      if (first) {
        const match = first[0].match(/questions\[(\d+)\]/)
        return match ? `Câu ${Number(match[1]) + 1}: ${first[1]}` : `${first[0]}: ${first[1]}`
      }
    }
    return messageOf(cause)
  }
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setSuccess('')
    try {
      if (!topicId) throw new Error('Chọn môn học và chủ đề trước khi lưu.')
      const inputs = drafts.map((draft, index) => {
        if (!draft.stem.trim()) throw new Error(`Câu ${index + 1}: nhập nội dung câu hỏi.`)
        if (draft.options.some((option) => !option.content.trim())) throw new Error(`Câu ${index + 1}: nhập đủ nội dung đáp án.`)
        if (draft.options.filter((option) => option.isCorrect).length !== 1) throw new Error(`Câu ${index + 1}: chọn đúng một đáp án chính xác.`)
        return { difficulty: draft.difficulty, stem: draft.stem.trim(), explanation: draft.explanation.trim(), options: draft.options.map((option) => ({ ...option, content: option.content.trim() })) }
      })
      if (selected) await questionApi.update(selected, { topicId, ...inputs[0] })
      else await questionApi.createBatch({ topicId, questions: inputs })
      await load(); resetEditor(); setSuccess(`Đã lưu ${selected ? 1 : inputs.length} câu hỏi.`)
    } catch (e) { setError(saveError(e)) } finally { setBusy(false) }
  }
  async function archive(id: number) {
    if (!window.confirm('Lưu trữ câu hỏi này?')) return
    setBusy(true); setError('')
    try { await questionApi.archive(id); await load() } catch (e) { setError(messageOf(e)) } finally { setBusy(false) }
  }
  const shown = questions.filter((question) => (!subjectId || question.subjectId === subjectId) && (!topicId || question.topicId === topicId))
  return <>
    <PageHeader eyebrow="NGÂN HÀNG CÂU HỎI" title="Câu hỏi trắc nghiệm" description="Soạn câu hỏi một đáp án đúng để dùng trong nhiều đề." action={<Link className="button button--soft" to="/teacher/quizzes">Xem bộ đề</Link>} />
    {error && <Notice message={error} />}{success && <Notice tone="success" message={success} />}
    <div className="workspace-two-col workspace-two-col--wide">
      <Panel title={selected ? `Sửa câu hỏi #${selected}` : `Tạo câu hỏi (${drafts.length}/20)`} className="question-editor-panel">
        <form id="question-editor" className="workspace-form" onSubmit={save}>
          <SubjectTopicFields subjectId={subjectId} topicId={topicId} onSubjectChange={(next) => { setSubjectId(next); setTopicId(0) }} onTopicChange={setTopicId} />
          {drafts.map((draft, index) => <QuestionCard key={draft.key} draft={draft} index={index} canRemove={!selected && drafts.length > 1} canDuplicate={!selected && drafts.length < 20} onChange={(next) => changeDraft(draft.key, next)} onRemove={() => setDrafts((current) => current.filter((item) => item.key !== draft.key))} onDuplicate={() => duplicateDraft(draft.key)} />)}
          <div className="button-row question-editor-actions">{!selected && <button type="button" className="button button--soft" disabled={busy || drafts.length >= 20} onClick={addDraft}>+ Thêm câu hỏi</button>}<button className="button button--primary" disabled={busy}>{busy ? 'Đang lưu...' : selected ? 'Lưu thay đổi' : `Lưu tất cả (${drafts.length})`}</button>{selected && <button type="button" className="button button--soft" onClick={resetEditor}>Tạo mới</button>}</div>
        </form>
      </Panel>
      <Panel title={`Đã tạo (${shown.length})`}>
        {shown.length ? <div className="stack-list">{shown.map((q) => <div className="topic-item" key={q.id}><div><strong>{q.stem}</strong><small>{q.topicName ?? `Chủ đề #${q.topicId}`} · {q.difficulty} · {formatDate(q.updatedAt)}</small></div><div className="item-actions"><button className="text-button" onClick={() => void edit(q.id)}>Sửa</button><button className="text-button text-button--danger" disabled={busy} onClick={() => void archive(q.id)}>Lưu trữ</button></div></div>)}</div> : <Empty title="Không có câu hỏi trong bộ lọc này" detail="Chọn chủ đề khác hoặc tạo câu hỏi mới." />}
      </Panel>
    </div>
  </>
}

export function TeacherQuizEditorPage() {
  const id = Number(useParams().id)
  const isNew = Number.isNaN(id)
  const navigate = useNavigate()
  const [subjectId, setSubjectId] = useState(0)
  const [questions, setQuestions] = useState<Question[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [form, setForm] = useState<QuizInput>({ topicId: 0, lessonId: null, title: '', description: '', timeLimitMinutes: 30, maxAttempts: 1, resultPolicy: 'AFTER_SUBMIT', visibility: 'CLASS', questions: [] })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    Promise.all([lessonApi.teacherMine(), isNew ? Promise.resolve(null) : quizApi.teacherOne(id)]).then(([ls, q]) => {
      setLessons(ls)
      if (q) { setQuiz(q); setSubjectId(q.subjectId); setForm({ topicId: q.topicId, lessonId: q.lessonId, title: q.title, description: q.description ?? '', timeLimitMinutes: q.timeLimitMinutes, maxAttempts: q.maxAttempts, resultPolicy: q.resultPolicy, visibility: q.visibility, questions: (q.questions ?? []).map((item) => ({ questionId: item.sourceQuestionId!, points: item.points })) }) }
    }).catch((e) => setError(messageOf(e)))
  }, [id, isNew])
  useEffect(() => {
    if (!form.topicId) { setQuestions([]); return }
    let active = true
    setQuestions([])
    questionApi.mine(form.topicId).then((items) => { if (active) setQuestions(items) })
      .catch((cause) => { if (active) setError(messageOf(cause)) })
    return () => { active = false }
  }, [form.topicId])
  const editable = isNew || quiz?.status === 'DRAFT'
  function changeSubject(next: number) {
    if (next === subjectId) return
    if (form.questions.length && !window.confirm('Đổi môn học sẽ bỏ các câu hỏi đã chọn và bài học liên quan. Tiếp tục?')) return
    setSubjectId(next); setForm({ ...form, topicId: 0, lessonId: null, questions: [] })
  }
  function changeTopic(next: number) {
    if (next === form.topicId) return
    if (form.questions.length && !window.confirm('Đổi chủ đề sẽ bỏ các câu hỏi đã chọn và bài học liên quan. Tiếp tục?')) return
    setForm({ ...form, topicId: next, lessonId: null, questions: [] })
  }
  function toggleQuestion(questionId: number) { setForm({ ...form, questions: form.questions.some((q) => q.questionId === questionId) ? form.questions.filter((q) => q.questionId !== questionId) : [...form.questions, { questionId, points: 1 }] }) }
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setSuccess('')
    try {
      if (!form.questions.length) throw new Error('Chọn ít nhất một câu hỏi.')
      const saved = isNew ? await quizApi.create(form) : await quizApi.update(id, form)
      setQuiz(saved); setSuccess('Đã lưu đề.'); if (isNew) navigate(`/teacher/quizzes/${saved.id}`, { replace: true })
    } catch (e) { setError(messageOf(e)) } finally { setBusy(false) }
  }
  async function publish() {
    if (!window.confirm('Xuất bản đề? Nội dung và đáp án sẽ được cố định.')) return
    setBusy(true); setError('')
    try { await quizApi.update(id, form); const saved = await quizApi.publish(id); setQuiz(saved); setSuccess('Đề đã xuất bản.') } catch (e) { setError(messageOf(e)) } finally { setBusy(false) }
  }
  return <>
    <PageHeader eyebrow="BIÊN TẬP ĐỀ" title={isNew ? 'Tạo đề trắc nghiệm' : quiz?.title ?? 'Đang tải đề...'} description="Câu hỏi được chụp lại khi tạo đề; sửa câu hỏi gốc không đổi đề đã xuất bản." action={<Link className="button button--soft" to="/teacher/quizzes">← Danh sách đề</Link>} />
    {error && <Notice message={error} />}{success && <Notice tone="success" message={success} />}
    {quiz?.status === 'PUBLISHED' && <Notice tone="info" message="Đề đã xuất bản và khóa chỉnh sửa. Có thể xem kết quả hoặc giao đề cho lớp trong trang lớp học." />}
    <form onSubmit={save}><div className="workspace-two-col workspace-two-col--wide">
      <Panel title="Thông tin đề"><div className="workspace-form">
        <label>Tên đề<input required maxLength={200} disabled={!editable} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
        <label>Mô tả<textarea rows={3} disabled={!editable} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        <SubjectTopicFields subjectId={subjectId} topicId={form.topicId} disabled={!editable} onSubjectChange={changeSubject} onTopicChange={changeTopic} />
        <label>Bài học liên quan<select disabled={!editable} value={form.lessonId ?? ''} onChange={(e) => setForm({ ...form, lessonId: e.target.value ? Number(e.target.value) : null })}><option value="">Không liên kết</option>{lessons.filter((l) => l.topicId === form.topicId && l.status !== 'ARCHIVED').map((l) => <option value={l.id} key={l.id}>{l.title}</option>)}</select></label>
        <div className="form-grid"><label>Thời gian (phút)<input type="number" min={1} max={180} disabled={!editable} value={form.timeLimitMinutes ?? ''} onChange={(e) => setForm({ ...form, timeLimitMinutes: e.target.value ? Number(e.target.value) : null })} /></label><label>Số lượt tối đa<input required type="number" min={1} max={10} disabled={!editable} value={form.maxAttempts} onChange={(e) => setForm({ ...form, maxAttempts: Number(e.target.value) })} /></label></div>
        <label>Hiển thị<select disabled={!editable} value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value as QuizInput['visibility'], resultPolicy: e.target.value === 'PUBLIC' && form.resultPolicy === 'AFTER_DUE' ? 'AFTER_SUBMIT' : form.resultPolicy })}><option value="CLASS">Chỉ lớp được giao</option><option value="PUBLIC">Công khai</option></select></label>
        <label>Hiện kết quả<select disabled={!editable} value={form.resultPolicy} onChange={(e) => setForm({ ...form, resultPolicy: e.target.value as QuizInput['resultPolicy'] })}><option value="AFTER_SUBMIT">Ngay sau khi nộp</option>{form.visibility === 'CLASS' && <option value="AFTER_DUE">Sau hạn nộp</option>}<option value="HIDDEN">Ẩn kết quả</option></select></label>
      </div></Panel>
      <Panel title={`Chọn câu hỏi (${form.questions.length})`}>
        {questions.length ? <div className="stack-list">{questions.map((q) => { const selected = form.questions.find((item) => item.questionId === q.id); return <div className="topic-item quiz-select-item" key={q.id}><label><input type="checkbox" disabled={!editable} checked={Boolean(selected)} onChange={() => toggleQuestion(q.id)} /> <strong>{q.stem}</strong><small>{q.difficulty}</small></label>{selected && <input aria-label="Điểm" title="Điểm" type="number" min="0.01" step="0.01" disabled={!editable} value={selected.points} onChange={(e) => setForm({ ...form, questions: form.questions.map((item) => item.questionId === q.id ? { ...item, points: Number(e.target.value) } : item) })} />}</div> })}</div> : <Empty title={form.topicId ? 'Chưa có câu hỏi trong chủ đề' : 'Chọn môn học và chủ đề'} detail={form.topicId ? 'Thêm câu hỏi vào ngân hàng trước khi tạo đề.' : 'Danh sách câu hỏi sẽ hiện sau khi chọn chủ đề.'} />}
        <Link className="text-button" to="/teacher/questions">Mở ngân hàng câu hỏi →</Link>
      </Panel>
    </div><div className="button-row quiz-editor-actions">{editable && <button className="button button--primary" disabled={busy}>Lưu đề</button>}{quiz?.status === 'DRAFT' && <button type="button" className="button button--soft" disabled={busy} onClick={() => void publish()}>Xuất bản đề</button>}{quiz && <Link className="button button--soft" to={`/teacher/quizzes/${quiz.id}/results`}>Xem kết quả</Link>}</div></form>
    {quiz?.questions?.length ? <Panel title="Xem trước đề">{quiz.questions.map((q, i) => <div className="quiz-question" key={q.id}><h3>Câu {i + 1}. {q.stem} <small>({q.points} điểm)</small></h3>{q.options.map((o) => <div className={`quiz-choice${o.isCorrect ? ' quiz-choice--correct' : ''}`} key={o.id}>{o.content}{o.isCorrect ? ' ✓' : ''}</div>)}</div>)}</Panel> : null}
  </>
}

export function TeacherQuizResultsPage() {
  const id = Number(useParams().id)
  const [data, setData] = useState<QuizResults | null>(null)
  const [error, setError] = useState('')
  useEffect(() => { void quizApi.results(id).then(setData).catch((e) => setError(messageOf(e))) }, [id])
  return <><PageHeader eyebrow="KẾT QUẢ BỘ ĐỀ" title={data?.quiz.title ?? 'Kết quả'} action={<Link className="button button--soft" to={`/teacher/quizzes/${id}`}>← Về đề</Link>} />{error && <Notice message={error} />}{data && <>
    <div className="metric-grid"><div className="metric-card"><span>Lượt nộp</span><strong>{data.summary.submittedCount}</strong></div><div className="metric-card"><span>Học sinh</span><strong>{data.summary.studentCount}</strong></div><div className="metric-card"><span>Điểm trung bình</span><strong>{data.summary.averagePercent == null ? '—' : `${data.summary.averagePercent}%`}</strong></div></div>
    <div className="workspace-two-col workspace-two-col--wide"><Panel title="Bài đã nộp">{data.attempts.length ? <div className="stack-list">{data.attempts.map((a) => <div className="topic-item" key={a.id}><div><strong>{a.studentName}</strong><small>{a.className ?? 'Công khai'} · Lượt {a.attemptNo} · {formatDate(a.submittedAt)}</small></div><b>{a.score}/{a.maxScore}</b></div>)}</div> : <Empty title="Chưa có bài nộp" />}</Panel>
    <Panel title="Độ chính xác theo câu hỏi">{data.questions.length ? data.questions.map((q, i) => <div className="analytics-progress-row" key={q.id}><div><strong>Câu {i + 1}. {q.stem}</strong><small>Đúng {q.correctCount}/{q.attemptCount} · Sai hoặc bỏ trống {q.incorrectCount}</small></div><div className="analytics-progress"><span style={{ width: `${q.attemptCount ? Math.round(q.correctCount / q.attemptCount * 100) : 0}%` }} /></div></div>) : <Empty title="Chưa có câu hỏi" />}</Panel></div>
  </>}</>
}

export function TeacherClassAnalyticsPage() {
  const id = Number(useParams().id)
  const [data, setData] = useState<ClassAnalytics | null>(null)
  const [error, setError] = useState('')
  useEffect(() => { void quizApi.classAnalytics(id).then(setData).catch((e) => setError(messageOf(e))) }, [id])
  const counts = Array.from({ length: 5 }, (_, bucket) => data?.distribution.find((item) => Number(item.bucket) === bucket)?.total ?? 0)
  const max = Math.max(1, ...counts)
  return <><PageHeader eyebrow="THỐNG KÊ LỚP" title={data?.classroom.name ?? 'Phân tích lớp'} action={<Link className="button button--soft" to={`/teacher/classes/${id}`}>← Về lớp</Link>} />{error && <Notice message={error} />}{data && <>
    <div className="metric-grid"><div className="metric-card"><span>Học sinh</span><strong>{data.summary.studentCount}</strong></div><div className="metric-card"><span>Đề được giao</span><strong>{data.summary.quizCount}</strong></div><div className="metric-card"><span>Bài học được giao</span><strong>{data.summary.lessonCount}</strong></div></div>
    <div className="workspace-two-col workspace-two-col--wide"><Panel title="Phân bố điểm bài nộp"><div className="score-distribution">{counts.map((count, bucket) => <div key={bucket}><strong>{count}</strong><span style={{ height: `${Math.max(4, Math.round(count / max * 100))}%` }} /><small>{bucket * 20}–{bucket === 4 ? 100 : bucket * 20 + 19}%</small></div>)}</div></Panel><Panel title="Theo chủ đề">{data.topics.length ? data.topics.map((t) => <div className="analytics-progress-row" key={t.topicId}><div><strong>{t.topicName}</strong><small>{t.submittedCount} lượt nộp · {t.averagePercent == null ? 'Chưa có điểm' : `${t.averagePercent}%`}</small></div><div className="analytics-progress"><span style={{ width: `${Number(t.averagePercent ?? 0)}%` }} /></div></div>) : <Empty title="Chưa có kết quả theo chủ đề" />}</Panel></div>
    <div className="workspace-two-col workspace-two-col--wide"><Panel title="Kết quả theo đề">{data.quizzes.length ? data.quizzes.map((q) => <div className="topic-item" key={q.quizId}><div><Link to={`/teacher/quizzes/${q.quizId}/results`}><strong>{q.title}</strong></Link><small>{q.studentCount} học sinh · {q.submittedCount} lượt nộp</small></div><b>{q.averagePercent == null ? '—' : `${q.averagePercent}%`}</b></div>) : <Empty title="Chưa giao đề nào" />}</Panel><Panel title="Tiến độ học sinh">{data.students.length ? data.students.map((s) => <div className="topic-item" key={s.studentId}><div><strong>{s.studentName}</strong><small>{s.submittedCount} lượt nộp · {s.completedLessons} bài học hoàn thành</small></div><b>{s.averagePercent == null ? '—' : `${s.averagePercent}%`}</b></div>) : <Empty title="Chưa có học sinh" />}</Panel></div>
  </>}</>
}
