import { useState, useEffect } from 'react'

const s = {
  page:        { maxWidth: '680px', margin: '0 auto', padding: '40px 24px' },
  header:      { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' },
  logo:        { fontSize: '22px', fontWeight: '700', color: '#fff', letterSpacing: '-0.5px' },
  accent:      { color: '#6366f1' },
  subtitle:    { fontSize: '13px', color: '#666', marginTop: '4px' },
  count:       { fontSize: '13px', color: '#888', background: '#1a1a1a', border: '1px solid #222', borderRadius: '20px', padding: '4px 12px' },
  empty:       { textAlign: 'center', color: '#555', fontSize: '14px', padding: '60px 0' },
  card:        { background: '#1a1a1a', border: '1px solid #222', borderRadius: '10px', padding: '16px', marginBottom: '10px', display: 'flex', alignItems: 'flex-start', gap: '12px' },
  cardBody:    { flex: 1, minWidth: 0 },
  question:    { fontSize: '13px', color: '#666', marginBottom: '6px', lineHeight: '1.4' },
  answer:      { fontSize: '15px', color: '#f0f0f0', fontWeight: '500', lineHeight: '1.4' },
  answerInput: { fontSize: '15px', color: '#f0f0f0', fontWeight: '500', background: '#111', border: '1px solid #6366f1', borderRadius: '6px', padding: '6px 10px', width: '100%', outline: 'none' },
  actions:     { display: 'flex', gap: '8px', flexShrink: 0 },
  btnEdit:     { padding: '6px 12px', borderRadius: '6px', border: '1px solid #333', background: 'transparent', color: '#888', fontSize: '12px', cursor: 'pointer', fontWeight: '500' },
  btnSave:     { padding: '6px 12px', borderRadius: '6px', border: 'none', background: '#6366f1', color: '#fff', fontSize: '12px', cursor: 'pointer', fontWeight: '600' },
  btnDelete:   { padding: '6px 10px', borderRadius: '6px', border: '1px solid #7f1d1d', background: 'transparent', color: '#f87171', fontSize: '12px', cursor: 'pointer' },
  meta:        { fontSize: '11px', color: '#555', marginTop: '6px' },
  saved:       { fontSize: '11px', color: '#22c55e', marginTop: '4px' },
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function AnswerCard({ id, data, onUpdate, onDelete }) {
  const [editing,   setEditing]   = useState(false)
  const [draft,     setDraft]     = useState(data.answer)
  const [justSaved, setJustSaved] = useState(false)

  function save() {
    if (!draft.trim()) return
    onUpdate(id, draft.trim())
    setEditing(false)
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 2000)
  }

  function cancel() {
    setDraft(data.answer)
    setEditing(false)
  }

  return (
    <div style={s.card}>
      <div style={s.cardBody}>
        <div style={s.question}>{data.question}</div>
        {editing ? (
          <input
            style={s.answerInput}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel() }}
            autoFocus
          />
        ) : (
          <div style={s.answer}>{data.answer}</div>
        )}
        {justSaved && <div style={s.saved}>Saved ✓</div>}
        {!editing && data.savedAt && (
          <div style={s.meta}>Saved {formatDate(data.savedAt)}</div>
        )}
      </div>

      <div style={s.actions}>
        {editing ? (
          <>
            <button style={s.btnSave}   onClick={save}>Save</button>
            <button style={s.btnEdit}   onClick={cancel}>Cancel</button>
          </>
        ) : (
          <>
            <button style={s.btnEdit}   onClick={() => setEditing(true)}>Edit</button>
            <button style={s.btnDelete} onClick={() => onDelete(id)}>✕</button>
          </>
        )}
      </div>
    </div>
  )
}

export default function Review() {
  const [answers, setAnswers] = useState({})
  const [loaded,  setLoaded]  = useState(false)

  useEffect(() => {
    chrome.storage.local.get(['answers'], (res) => {
      setAnswers(res.answers || {})
      setLoaded(true)
    })
  }, [])

  function handleUpdate(id, newAnswer) {
    const updated = { ...answers, [id]: { ...answers[id], answer: newAnswer } }
    setAnswers(updated)
    chrome.storage.local.set({ answers: updated })
  }

  function handleDelete(id) {
    if (!window.confirm(`Delete answer for: "${answers[id]?.question}"?`)) return
    const updated = { ...answers }
    delete updated[id]
    setAnswers(updated)
    chrome.storage.local.set({ answers: updated })
  }

  const list = Object.entries(answers)

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <div style={s.logo}>Ez<span style={s.accent}>Fill</span></div>
          <div style={s.subtitle}>Review your saved answers — edit or delete anything before your next fill</div>
        </div>
        {list.length > 0 && (
          <div style={s.count}>{list.length} answer{list.length !== 1 ? 's' : ''}</div>
        )}
      </div>

      {!loaded && <div style={s.empty}>Loading...</div>}

      {loaded && list.length === 0 && (
        <div style={s.empty}>
          No answers saved yet.<br />
          Fill a job application and EzFill will learn your answers automatically.
        </div>
      )}

      {list.map(([id, data]) => (
        <AnswerCard
          key={id}
          id={id}
          data={data}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      ))}
    </div>
  )
}
