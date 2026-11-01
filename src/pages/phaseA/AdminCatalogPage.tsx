import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation } from 'react-router-dom'
import { catalogApi } from '../../api/phaseAApi'
import type { Subject, Topic } from '../../types/phaseA'
import { Empty, Notice, PageHeader, Panel, StatusPill, messageOf } from '../../components/WorkspaceUi'

export default function AdminCatalogPage() {
  const location = useLocation()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [topics, setTopics] = useState<Topic[]>([])
  const [subjectQuery, setSubjectQuery] = useState('')
  const [topicQuery, setTopicQuery] = useState('')
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null)
  const [subjectId, setSubjectId] = useState<number | null>(null)
  const [subjectForm, setSubjectForm] = useState({ code: '', name: '' })
  const [topicId, setTopicId] = useState<number | null>(null)
  const [topicForm, setTopicForm] = useState({ code: '', name: '', parentTopicId: '', sortOrder: '0' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  useEffect(() => { setSubjectQuery(new URLSearchParams(location.search).get('q') ?? '') }, [location.search])

  const loadSubjects = useCallback(async () => {
    const rows = await catalogApi.adminSubjects()
    setSubjects(rows)
    setSelectedSubject((current) => current ?? rows.find((item) => item.status === 'ACTIVE')?.id ?? null)
  }, [])

  useEffect(() => { void loadSubjects().catch((cause) => setError(messageOf(cause))) }, [loadSubjects])
  useEffect(() => {
    if (selectedSubject === null) { setTopics([]); return }
    let active = true
    catalogApi.adminTopics(selectedSubject).then((rows) => { if (active) setTopics(rows) })
      .catch((cause) => { if (active) setError(messageOf(cause)) })
    return () => { active = false }
  }, [selectedSubject])

  async function reloadTopics() {
    if (selectedSubject !== null) setTopics(await catalogApi.adminTopics(selectedSubject))
  }

  async function saveSubject(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setSuccess('')
    try {
      const input = { code: subjectForm.code.trim(), name: subjectForm.name.trim() }
      const row = subjectId ? await catalogApi.updateSubject(subjectId, input) : await catalogApi.createSubject(input)
      await loadSubjects(); setSelectedSubject(row.id); setSubjectId(null); setSubjectForm({ code: '', name: '' })
      setSuccess('Đã lưu môn học.')
    } catch (cause) { setError(messageOf(cause)) } finally { setBusy(false) }
  }

  async function saveTopic(event: FormEvent) {
    event.preventDefault()
    if (selectedSubject === null) return
    setBusy(true); setError(''); setSuccess('')
    try {
      const input = { subjectId: selectedSubject, code: topicForm.code.trim(), name: topicForm.name.trim(),
        parentTopicId: topicForm.parentTopicId ? Number(topicForm.parentTopicId) : null, sortOrder: Number(topicForm.sortOrder) }
      if (topicId) await catalogApi.updateTopic(topicId, input)
      else await catalogApi.createTopic(input)
      await reloadTopics(); setTopicId(null); setTopicForm({ code: '', name: '', parentTopicId: '', sortOrder: '0' })
      setSuccess('Đã lưu chủ đề.')
    } catch (cause) { setError(messageOf(cause)) } finally { setBusy(false) }
  }

  async function archiveSubject(id: number) {
    if (!window.confirm('Lưu trữ môn học và toàn bộ chủ đề của môn này?')) return
    setBusy(true); setError('')
    try { await catalogApi.archiveSubject(id); await loadSubjects(); await reloadTopics(); setSuccess('Đã lưu trữ môn học.') }
    catch (cause) { setError(messageOf(cause)) } finally { setBusy(false) }
  }

  async function archiveTopic(id: number) {
    if (!window.confirm('Lưu trữ chủ đề này và các chủ đề con?')) return
    setBusy(true); setError('')
    try { await catalogApi.archiveTopic(id); await reloadTopics(); setSuccess('Đã lưu trữ chủ đề.') }
    catch (cause) { setError(messageOf(cause)) } finally { setBusy(false) }
  }

  function editSubject(item: Subject) { setSubjectId(item.id); setTopicId(null); setSubjectForm({ code: item.code, name: item.name }) }
  function editTopic(item: Topic) { setTopicId(item.id); setTopicForm({ code: item.code, name: item.name, parentTopicId: item.parentTopicId?.toString() ?? '', sortOrder: String(item.sortOrder) }) }
  const shownSubjects = subjects.filter((item) => `${item.code} ${item.name}`.toLocaleLowerCase('vi').includes(subjectQuery.trim().toLocaleLowerCase('vi')))
  const shownTopics = topics.filter((item) => `${item.code} ${item.name}`.toLocaleLowerCase('vi').includes(topicQuery.trim().toLocaleLowerCase('vi')))
  const selectedSubjectActive = subjects.find((item) => item.id === selectedSubject)?.status === 'ACTIVE'

  return <>
    <PageHeader eyebrow="QUẢN TRỊ NỘI DUNG" title="Môn học & chủ đề" description="Tạo cấu trúc kiến thức để giáo viên gắn bài học vào đúng chủ đề." />
    {error && <Notice message={error} />}{success && <Notice tone="success" message={success} />}
    <div className="workspace-two-col">
      <Panel title="Môn học">
        <div className="catalog-search"><input type="search" aria-label="Tìm môn học" placeholder="Tìm môn học theo tên hoặc mã..." value={subjectQuery} onChange={(event) => setSubjectQuery(event.target.value)} /><span>{subjects.length} môn</span></div>
        <div className="stack-list">{shownSubjects.length ? shownSubjects.map((item) => <div className="catalog-row" key={item.id}>
          <button type="button" onClick={() => { setSelectedSubject(item.id); setTopicId(null) }}
            className={`catalog-item${selectedSubject === item.id ? ' catalog-item--active' : ''}`}>
            <span><strong>{item.name}</strong><small>{item.code}</small></span><StatusPill status={item.status} />
          </button><button className="text-button" type="button" onClick={() => { setSelectedSubject(item.id); editSubject(item) }}>Sửa</button>{item.status === 'ACTIVE' && <button className="text-button text-button--danger" type="button" disabled={busy} onClick={() => void archiveSubject(item.id)}>Lưu trữ</button>}
        </div>) : <Empty title={subjects.length ? 'Không tìm thấy môn phù hợp' : 'Chưa có môn học'} />}</div>
        <form className="workspace-form workspace-form--border" onSubmit={saveSubject}>
          <h3>{subjectId ? 'Sửa môn học' : 'Thêm môn học'}</h3>
          <div className="form-grid"><label>Mã môn<input required maxLength={50} value={subjectForm.code} onChange={(event) => setSubjectForm({ ...subjectForm, code: event.target.value })} placeholder="MATH" /></label>
          <label>Tên môn<input required maxLength={150} value={subjectForm.name} onChange={(event) => setSubjectForm({ ...subjectForm, name: event.target.value })} placeholder="Toán học" /></label></div>
          <div className="button-row"><button className="button button--primary" disabled={busy}>Lưu môn học</button>{subjectId && <button className="button button--soft" type="button" onClick={() => { setSubjectId(null); setSubjectForm({ code: '', name: '' }) }}>Hủy sửa</button>}</div>
        </form>
      </Panel>
      <Panel title="Chủ đề" action={selectedSubject ? <span className="muted-text">{subjects.find((item) => item.id === selectedSubject)?.name}</span> : undefined}>
        {selectedSubject === null ? <Empty title="Chọn một môn học" /> : <>
          <div className="catalog-search"><input type="search" aria-label="Tìm chủ đề" placeholder="Tìm chủ đề theo tên hoặc mã..." value={topicQuery} onChange={(event) => setTopicQuery(event.target.value)} /><span>{topics.length} chủ đề</span></div>
          <div className="stack-list">{shownTopics.length ? shownTopics.map((item) => <div className="topic-item" key={item.id}>
            <div><strong>{item.parentTopicId ? '↳ ' : ''}{item.name}</strong><small>{item.code} · {item.parentTopicId ? `Thuộc ${topics.find((parent) => parent.id === item.parentTopicId)?.name ?? 'chủ đề cha'} · ` : ''}Thứ tự {item.sortOrder}</small></div><StatusPill status={item.status} />
            <div className="item-actions"><button className="text-button" type="button" onClick={() => editTopic(item)}>Sửa</button>
              {item.status === 'ACTIVE' && <button className="text-button text-button--danger" type="button" disabled={busy} onClick={() => void archiveTopic(item.id)}>Lưu trữ</button>}</div>
          </div>) : <Empty title={topics.length ? 'Không tìm thấy chủ đề phù hợp' : 'Chưa có chủ đề'} detail={topics.length ? 'Hãy đổi từ khóa tìm kiếm.' : 'Hãy tạo chủ đề đầu tiên cho môn này.'} />}</div>
          {!selectedSubjectActive && <Notice tone="info" message="Môn học này đã lưu trữ. Chọn một môn đang hoạt động để tạo hoặc sửa chủ đề." />}
          <form className="workspace-form workspace-form--border" onSubmit={saveTopic}>
            <h3>{topicId ? 'Sửa chủ đề' : 'Thêm chủ đề'}</h3>
            <div className="form-grid"><label>Mã chủ đề<input required maxLength={80} value={topicForm.code} onChange={(event) => setTopicForm({ ...topicForm, code: event.target.value })} placeholder="ALGEBRA" /></label>
            <label>Tên chủ đề<input required maxLength={150} value={topicForm.name} onChange={(event) => setTopicForm({ ...topicForm, name: event.target.value })} placeholder="Đại số" /></label>
            <label>Chủ đề cha<select value={topicForm.parentTopicId} onChange={(event) => setTopicForm({ ...topicForm, parentTopicId: event.target.value })}><option value="">Không có</option>{topics.filter((item) => item.id !== topicId && item.status === 'ACTIVE').map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
            <label>Thứ tự<input type="number" min="0" required value={topicForm.sortOrder} onChange={(event) => setTopicForm({ ...topicForm, sortOrder: event.target.value })} /></label></div>
            <div className="button-row"><button className="button button--primary" disabled={busy || !selectedSubjectActive}>Lưu chủ đề</button>{topicId && <button className="button button--soft" type="button" onClick={() => { setTopicId(null); setTopicForm({ code: '', name: '', parentTopicId: '', sortOrder: '0' }) }}>Hủy sửa</button>}</div>
          </form>
        </>}
      </Panel>
    </div>
  </>
}
