import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { catalogApi, classApi, lessonApi } from '../../api/phaseAApi'
import type { LessonInput } from '../../api/phaseAApi'
import type { Lesson, LessonResource, StudyClass, Subject, Topic } from '../../types/phaseA'
import { Empty, Notice, PageHeader, Panel, StatusPill, messageOf } from '../../components/WorkspaceUi'
import LessonBody from '../../components/LessonBody'

const initialForm: LessonInput = { topicId: 0, title: '', summary: '', body: '', visibility: 'CLASS' }

export default function LessonEditorPage() {
  const param = useParams().id
  const id = !param || param === 'new' ? null : Number(param)
  const navigate = useNavigate()
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [classes, setClasses] = useState<StudyClass[]>([])
  const [subjectId, setSubjectId] = useState('')
  const [form, setForm] = useState<LessonInput>(initialForm)
  const [fileTitle, setFileTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [fileInputKey, setFileInputKey] = useState(0)
  const [uploadPercent, setUploadPercent] = useState<number | null>(null)
  const [linkForm, setLinkForm] = useState({ resourceType: 'VIDEO_LINK' as 'VIDEO_LINK' | 'EXTERNAL_LINK', title: '', externalUrl: '' })
  const [assignForm, setAssignForm] = useState({ availableAt: '', dueAt: '' })
  const [selectedClassIds, setSelectedClassIds] = useState<number[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  function insertFormatting(before: string, after = '', placeholder = 'nội dung') {
    const element = bodyRef.current
    if (!element) return
    const start = element.selectionStart
    const end = element.selectionEnd
    const selected = form.body.slice(start, end) || placeholder
    const next = form.body.slice(0, start) + before + selected + after + form.body.slice(end)
    setForm((current) => ({ ...current, body: next }))
    requestAnimationFrame(() => { element.focus(); element.setSelectionRange(start + before.length, start + before.length + selected.length) })
  }

  const loadLesson = useCallback(async (lessonId: number) => { setLesson(await lessonApi.teacherOne(lessonId)) }, [])
  useEffect(() => {
    let active = true
    Promise.all([catalogApi.subjects(), classApi.teacherMine(), id ? lessonApi.teacherOne(id) : Promise.resolve(null)])
      .then(([nextSubjects, nextClasses, nextLesson]) => {
        if (!active) return
        setSubjects(nextSubjects); setClasses(nextClasses.filter((item) => item.status === 'ACTIVE'))
        if (nextLesson) {
          setLesson(nextLesson)
          setForm({ topicId: nextLesson.topicId, title: nextLesson.title, summary: nextLesson.summary ?? '', body: nextLesson.body ?? '', visibility: nextLesson.visibility })
          Promise.all(nextSubjects.map(async (subject) => ({ subject, topics: await catalogApi.topics(subject.id) })))
            .then((groups) => { if (active) { const match = groups.find((group) => group.topics.some((topic) => topic.id === nextLesson.topicId)); if (match) setSubjectId(String(match.subject.id)) } })
            .catch((cause) => { if (active) setError(messageOf(cause)) })
        }
      }).catch((cause) => { if (active) setError(messageOf(cause)) })
    return () => { active = false }
  }, [id])

  useEffect(() => {
    if (!subjectId) { setTopics([]); return }
    let active = true
    catalogApi.topics(Number(subjectId)).then((rows) => { if (active) setTopics(rows) })
      .catch((cause) => { if (active) setError(messageOf(cause)) })
    return () => { active = false }
  }, [subjectId])

  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setSuccess('')
    try {
      const saved = id ? await lessonApi.update(id, form) : await lessonApi.create(form)
      setLesson(saved); setSuccess('Đã lưu bài học.')
      if (!id) navigate(`/teacher/lessons/${saved.id}`, { replace: true })
    } catch (cause) { setError(messageOf(cause)) } finally { setBusy(false) }
  }

  async function publish() {
    if (!id) return
    setBusy(true); setError(''); setSuccess('')
    try { await lessonApi.update(id, form); setLesson(await lessonApi.publish(id)); setSuccess('Bài học đã lưu và xuất bản.') }
    catch (cause) { setError(messageOf(cause)) } finally { setBusy(false) }
  }

  async function addFile(event: FormEvent) {
    event.preventDefault(); if (!id || !file) return
    if (file.size > 20 * 1024 * 1024) { setError('File tối đa 20 MB.'); return }
    setBusy(true); setError(''); setSuccess('')
    setUploadPercent(0)
    try { await lessonApi.addFile(id, fileTitle.trim(), file, setUploadPercent); await loadLesson(id); setFile(null); setFileInputKey((current) => current + 1); setFileTitle(''); setSuccess('Đã tải tài liệu lên.') }
    catch (cause) { setError(messageOf(cause)) } finally { setBusy(false); setUploadPercent(null) }
  }

  async function addLink(event: FormEvent) {
    event.preventDefault(); if (!id) return
    setBusy(true); setError(''); setSuccess('')
    try { await lessonApi.addLink(id, linkForm); await loadLesson(id); setLinkForm({ resourceType: 'VIDEO_LINK', title: '', externalUrl: '' }); setSuccess('Đã thêm liên kết.') }
    catch (cause) { setError(messageOf(cause)) } finally { setBusy(false) }
  }

  async function deleteResource(resourceId: number) {
    if (!id || !window.confirm('Xóa tài liệu này?')) return
    setBusy(true); setError('')
    try { await lessonApi.deleteResource(id, resourceId); await loadLesson(id); setSuccess('Đã xóa tài liệu.') }
    catch (cause) { setError(messageOf(cause)) } finally { setBusy(false) }
  }

  async function moveResource(resource: LessonResource, direction: -1 | 1) {
    if (!id || !lesson?.resources) return
    const list = [...lesson.resources]
    const current = list.findIndex((item) => item.id === resource.id)
    const target = current + direction
    if (target < 0 || target >= list.length) return
    ;[list[current], list[target]] = [list[target], list[current]]
    setBusy(true); setError('')
    try { await Promise.all(list.map((item, index) => lessonApi.updateResource(id, item.id, item.title, index))); await loadLesson(id) }
    catch (cause) { setError(messageOf(cause)) } finally { setBusy(false) }
  }

  async function assign(event: FormEvent) {
    event.preventDefault(); if (!id || selectedClassIds.length === 0) return
    setBusy(true); setError(''); setSuccess('')
    try {
      await lessonApi.assignClasses(id, selectedClassIds,
        assignForm.availableAt ? new Date(assignForm.availableAt).toISOString() : null,
        assignForm.dueAt ? new Date(assignForm.dueAt).toISOString() : null)
      setAssignForm({ availableAt: '', dueAt: '' }); setSelectedClassIds([]); setSuccess(`Đã giao bài học cho ${selectedClassIds.length} lớp.`)
    } catch (cause) { setError(messageOf(cause)) } finally { setBusy(false) }
  }

  if (id !== null && (!Number.isInteger(id) || id <= 0)) return <Notice message="Mã bài học không hợp lệ." />
  const editable = !lesson || lesson.status !== 'ARCHIVED'
  return <>
    <PageHeader eyebrow="TRÌNH SOẠN BÀI" title={id ? 'Chỉnh sửa bài học' : 'Tạo bài học mới'} description="Viết nội dung, đính kèm tài liệu và chọn cách hiển thị."
      action={<div className="button-row"><Link className="button button--soft" to="/teacher/lessons">← Danh sách</Link><button type="button" className="button button--soft" onClick={() => setShowPreview((current) => !current)}>{showPreview ? 'Ẩn xem trước' : 'Xem trước'}</button>{lesson && <StatusPill status={lesson.status} />}</div>} />
    {error && <Notice message={error} />}{success && <Notice tone="success" message={success} />}
    <div className="workspace-two-col workspace-two-col--wide">
      <div className="workspace-column">
        <Panel title="Nội dung bài học">
          <form className="workspace-form" onSubmit={save}>
            <label>Tiêu đề<input required maxLength={200} disabled={!editable} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Ví dụ: Hàm số bậc nhất" /></label>
            <div className="form-grid"><label>Môn học<select required value={subjectId} disabled={!editable} onChange={(event) => { setSubjectId(event.target.value); setForm({ ...form, topicId: 0 }) }}><option value="">Chọn môn học</option>{subjects.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
              <label>Chủ đề<select required value={form.topicId || ''} disabled={!editable || !subjectId} onChange={(event) => setForm({ ...form, topicId: Number(event.target.value) })}><option value="">Chọn chủ đề</option>{topics.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label></div>
            <label>Tóm tắt<textarea rows={3} maxLength={5000} disabled={!editable} value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} placeholder="Học sinh sẽ học được gì?" /></label>
            <div className="lesson-editing-field"><span>Nội dung bài học</span><div className="lesson-editor-toolbar" role="toolbar" aria-label="Định dạng nội dung"><button type="button" disabled={!editable} onClick={() => insertFormatting('## ', '', 'Tiêu đề')}>Tiêu đề</button><button type="button" disabled={!editable} onClick={() => insertFormatting('**', '**')}>B</button><button type="button" disabled={!editable} onClick={() => insertFormatting('*', '*')}>I</button><button type="button" disabled={!editable} onClick={() => insertFormatting('- ', '', 'Mục danh sách')}>☷ Danh sách</button><button type="button" disabled={!editable} onClick={() => insertFormatting('[', '](https://example.com)', 'Tên liên kết')}>↗ Liên kết</button></div><textarea ref={bodyRef} className="lesson-body-input" rows={13} disabled={!editable} value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} placeholder="Nhập nội dung bài học. Chọn đoạn văn rồi dùng thanh định dạng." /><small>Hỗ trợ tiêu đề, chữ đậm, chữ nghiêng, danh sách và liên kết HTTPS.</small></div>
            <fieldset className="visibility-field"><legend>Hiển thị</legend><label><input type="radio" name="visibility" checked={form.visibility === 'CLASS'} disabled={!editable} onChange={() => setForm({ ...form, visibility: 'CLASS' })} /> Chỉ học sinh thuộc lớp được giao</label><label><input type="radio" name="visibility" checked={form.visibility === 'PUBLIC'} disabled={!editable} onChange={() => setForm({ ...form, visibility: 'PUBLIC' })} /> Công khai cho mọi học sinh</label></fieldset>
            <div className="button-row"><button className="button button--primary" disabled={busy || !editable}>{busy ? 'Đang xử lý...' : 'Lưu bài học'}</button>{id && lesson?.status !== 'ARCHIVED' && <button className="button button--success" type="button" disabled={busy} onClick={() => void publish()}>Xuất bản</button>}</div>
          </form>
        </Panel>
        {id && <Panel title={`Tài liệu & liên kết (${lesson?.resources?.length ?? 0})`}>
          {lesson?.resources?.length ? <div className="stack-list">{lesson.resources.map((item, index) => <div className="resource-item" key={item.id}><span className="resource-item__icon">{item.resourceType === 'FILE' ? '▧' : '↗'}</span><div><strong>{item.title}</strong><small>{item.resourceType === 'FILE' ? `${item.originalName} · ${((item.sizeBytes ?? 0) / 1024 / 1024).toFixed(1)} MB` : item.externalUrl}</small></div><div className="item-actions"><button className="text-button" type="button" disabled={busy || index === 0 || !editable} onClick={() => void moveResource(item, -1)} aria-label={`Đưa ${item.title} lên`}>↑</button><button className="text-button" type="button" disabled={busy || index === (lesson.resources?.length ?? 0) - 1 || !editable} onClick={() => void moveResource(item, 1)} aria-label={`Đưa ${item.title} xuống`}>↓</button><button className="text-button text-button--danger" type="button" disabled={busy || !editable} onClick={() => void deleteResource(item.id)}>Xóa</button></div></div>)}</div> : <Empty title="Chưa có tài liệu" />}
          {editable && <div className="form-grid workspace-form--border"><form className="workspace-form" onSubmit={addFile}><h3>Tải tài liệu</h3><label>Tên hiển thị<input required maxLength={200} value={fileTitle} onChange={(event) => setFileTitle(event.target.value)} placeholder="Tài liệu bài giảng" /></label><label className="upload-dropzone" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); setFile(event.dataTransfer.files[0] ?? null) }}>Kéo thả PDF, DOCX, PPTX vào đây<input key={fileInputKey} type="file" accept=".pdf,.docx,.pptx" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />{file && <small>Đã chọn: {file.name}</small>}</label><small>Tối đa 20 MB/file</small>{uploadPercent !== null && <div className="upload-progress" role="status"><div style={{ width: `${uploadPercent}%` }} /><span>Đã tải {uploadPercent}%</span></div>}<button className="button button--soft" disabled={busy || !file}>Tải lên</button></form>
            <form className="workspace-form" onSubmit={addLink}><h3>Thêm liên kết</h3><label>Loại<select value={linkForm.resourceType} onChange={(event) => setLinkForm({ ...linkForm, resourceType: event.target.value as 'VIDEO_LINK' | 'EXTERNAL_LINK' })}><option value="VIDEO_LINK">Video tham khảo</option><option value="EXTERNAL_LINK">Trang web</option></select></label><label>Tiêu đề<input required maxLength={200} value={linkForm.title} onChange={(event) => setLinkForm({ ...linkForm, title: event.target.value })} /></label><label>URL HTTPS<input required type="url" pattern="https://.*" value={linkForm.externalUrl} onChange={(event) => setLinkForm({ ...linkForm, externalUrl: event.target.value })} placeholder="https://..." /></label><button className="button button--soft" disabled={busy}>Thêm liên kết</button></form></div>}
        </Panel>}
      </div>
      <div className="workspace-column">
        {showPreview && <Panel title="Xem trước cho học sinh"><div className="lesson-preview"><span className="lesson-card__type">{form.visibility === 'PUBLIC' ? 'Bài học công khai' : 'Bài học của lớp'}</span><h3>{form.title || 'Tiêu đề bài học'}</h3><p>{form.summary || 'Chưa có tóm tắt.'}</p><LessonBody body={form.body || 'Nội dung sẽ hiển thị tại đây.'} />{Boolean(lesson?.resources?.length) && <ul>{lesson?.resources?.map((item) => <li key={item.id}>{item.title}</li>)}</ul>}</div></Panel>}
        <Panel title="Quy trình xuất bản"><ol className="checklist"><li>Nhập tiêu đề và chọn chủ đề.</li><li>Viết nội dung hoặc thêm tài liệu.</li><li>Lưu bài học rồi bấm Xuất bản.</li><li>Với bài chỉ dành cho lớp, giao bài cho lớp phù hợp.</li></ol>{!id && <Notice tone="info" message="Lưu bài học trước để thêm file và link." />}</Panel>
        {id && lesson?.status === 'PUBLISHED' && <Panel title="Giao bài cho lớp">
          {classes.length ? <form className="workspace-form" onSubmit={assign}><fieldset className="visibility-field"><legend>Chọn một hoặc nhiều lớp</legend>{classes.map((item) => <label key={item.id}><input type="checkbox" checked={selectedClassIds.includes(item.id)} onChange={(event) => setSelectedClassIds((current) => event.target.checked ? [...current, item.id] : current.filter((classId) => classId !== item.id))} />{item.name}</label>)}</fieldset><label>Thời điểm mở<input type="datetime-local" value={assignForm.availableAt} onChange={(event) => setAssignForm({ ...assignForm, availableAt: event.target.value })} /></label><label>Hạn học<input type="datetime-local" value={assignForm.dueAt} onChange={(event) => setAssignForm({ ...assignForm, dueAt: event.target.value })} /></label><button className="button button--primary" disabled={busy || selectedClassIds.length === 0}>Giao cho {selectedClassIds.length || 'các'} lớp</button></form>
            : <Empty title="Chưa có lớp hoạt động" detail="Tạo lớp trước khi giao bài." />}
        </Panel>}
      </div>
    </div>
  </>
}
