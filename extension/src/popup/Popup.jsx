import { useState, useEffect } from 'react'

const s = {
  wrap:        { padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' },
  header:      { display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #222', paddingBottom: '12px' },
  logo:        { fontSize: '18px', fontWeight: '700', color: '#fff', letterSpacing: '-0.5px' },
  accent:      { color: '#6366f1' },
  statusRow:   { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#888' },
  dot: (on)   => ({ width: '8px', height: '8px', borderRadius: '50%', background: on ? '#22c55e' : '#555' }),
  card:        { background: '#1a1a1a', border: '1px solid #222', borderRadius: '8px', padding: '12px' },
  cardLabel:   { fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' },
  cardValue:   { fontSize: '14px', color: '#f0f0f0', fontWeight: '500' },
  btn:         { width: '100%', padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600', background: '#6366f1', color: '#fff' },
  btnGhost:    { width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #333', cursor: 'pointer', fontSize: '12px', fontWeight: '500', background: 'transparent', color: '#888' },
  btnDanger:   { width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #7f1d1d', cursor: 'pointer', fontSize: '12px', fontWeight: '500', background: 'transparent', color: '#f87171' },
  empty:       { fontSize: '13px', color: '#666', textAlign: 'center', padding: '8px 0' },
  userRow:     { display: 'flex', alignItems: 'center', gap: '8px' },
  avatar:      { width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' },
  userName:    { fontSize: '13px', color: '#ccc', fontWeight: '500' },
  consentText: { fontSize: '12px', color: '#999', lineHeight: '1.6' },
  consentItem: { display: 'flex', gap: '8px', marginBottom: '6px' },
  dot2:        { color: '#6366f1', flexShrink: 0 },
  checkRow:    { display: 'flex', alignItems: 'flex-start', gap: '8px', marginTop: '10px', cursor: 'pointer' },
  checkbox:    { marginTop: '2px', accentColor: '#6366f1', flexShrink: 0 },
  checkLabel:  { fontSize: '12px', color: '#aaa', lineHeight: '1.5' },
  learnCard:   { background: '#1a1a1a', border: '1px solid #6366f133', borderRadius: '8px', padding: '12px' },
  learnTitle:  { fontSize: '13px', color: '#a5b4fc', fontWeight: '600', marginBottom: '4px' },
  learnBody:   { fontSize: '12px', color: '#888', lineHeight: '1.6' },
  statRow:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  statNum:     { fontSize: '20px', fontWeight: '700', color: '#6366f1' },
  statLabel:   { fontSize: '11px', color: '#666' },
}

export default function Popup() {
  const [pageStatus,   setPageStatus]   = useState('checking')
  const [isLoggedIn,   setIsLoggedIn]   = useState(false)
  const [user,         setUser]         = useState(null)
  const [hasConsent,   setHasConsent]   = useState(false)
  const [agreed,       setAgreed]       = useState(false)
  const [answerCount,  setAnswerCount]  = useState(0)
  const [authLoading,  setAuthLoading]  = useState(false)
  const [authError,    setAuthError]    = useState(null)
  const [deleting,     setDeleting]     = useState(false)

  useEffect(() => {
    // Check page
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return
      chrome.tabs.sendMessage(tabs[0].id, { type: 'CHECK_PAGE' }, (res) => {
        if (chrome.runtime.lastError) { setPageStatus('not-detected'); return }
        setPageStatus(res?.isJobApplication ? 'detected' : 'not-detected')
      })
    })

    // Load stored state
    chrome.storage.local.get(['user', 'consent', 'answers'], (res) => {
      if (res.user) { setUser(res.user); setIsLoggedIn(true) }
      if (res.consent) setHasConsent(true)
      setAnswerCount(Object.keys(res.answers || {}).length)
    })
  }, [])

  function handleLogin() {
    setAuthLoading(true)
    setAuthError(null)
    chrome.runtime.sendMessage({ type: 'START_AUTH' }, (res) => {
      setAuthLoading(false)
      if (res?.success) { setUser(res.user); setIsLoggedIn(true) }
      else setAuthError(res?.error || 'Sign in failed. Try again.')
    })
  }

  function handleConsent() {
    chrome.storage.local.set({ consent: true })
    setHasConsent(true)
  }

  function handleSignOut() {
    chrome.runtime.sendMessage({ type: 'SIGN_OUT' }, () => {
      setUser(null); setIsLoggedIn(false); setHasConsent(false)
    })
  }

  function handleFill() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'START_FILL' })
      window.close()
    })
  }

  function handleReview() {
    chrome.tabs.create({ url: chrome.runtime.getURL('review.html') })
    window.close()
  }

  function handleDeleteData() {
    if (!window.confirm('Delete all your EzFill data? This cannot be undone.')) return
    setDeleting(true)
    chrome.runtime.sendMessage({ type: 'DELETE_ALL_DATA' }, () => {
      setDeleting(false)
      setUser(null); setIsLoggedIn(false)
      setHasConsent(false); setAnswerCount(0)
    })
  }

  const detected = pageStatus === 'detected'

  return (
    <div style={s.wrap}>

      {/* Header */}
      <div style={s.header}>
        <div style={s.logo}>Ez<span style={s.accent}>Fill</span></div>
        <div style={s.statusRow}>
          <div style={s.dot(detected)} />
          {pageStatus === 'checking'     && 'Checking page...'}
          {pageStatus === 'detected'     && 'Application detected'}
          {pageStatus === 'not-detected' && 'Not an application'}
        </div>
      </div>

      {/* Not signed in */}
      {!isLoggedIn && (
        <div style={s.card}>
          <div style={s.cardLabel}>Get started</div>
          <div style={s.cardValue}>Sign in to use EzFill</div>
          {authError && <div style={{ fontSize: '12px', color: '#f87171', marginTop: '6px' }}>{authError}</div>}
          <button style={{ ...s.btn, marginTop: '10px', opacity: authLoading ? 0.6 : 1 }}
            onClick={handleLogin} disabled={authLoading}>
            {authLoading ? 'Signing in...' : 'Sign in with Google'}
          </button>
        </div>
      )}

      {/* Signed in — consent needed */}
      {isLoggedIn && !hasConsent && (
        <div style={s.card}>
          <div style={s.cardLabel}>Before we start</div>
          <div style={{ ...s.consentText, marginBottom: '4px' }}>Here's what EzFill stores:</div>
          <div style={s.consentItem}><span style={s.dot2}>●</span><span>Your name & email — on our server (for your account)</span></div>
          <div style={s.consentItem}><span style={s.dot2}>●</span><span>Your job application answers — <strong style={{ color: '#a5b4fc' }}>on this device only</strong>, never sent to us</span></div>
          <div style={s.consentItem}><span style={s.dot2}>●</span><span>Question patterns (not answers) — on our server, to power smart matching</span></div>
          <div style={s.consentItem}><span style={s.dot2}>●</span><span>You can delete everything anytime</span></div>
          <label style={s.checkRow}>
            <input type="checkbox" style={s.checkbox}
              checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            <span style={s.checkLabel}>I understand and agree to EzFill collecting this data</span>
          </label>
          <button style={{ ...s.btn, marginTop: '12px', opacity: agreed ? 1 : 0.4 }}
            onClick={handleConsent} disabled={!agreed}>
            Continue
          </button>
        </div>
      )}

      {/* Signed in + consent + on a job app */}
      {isLoggedIn && hasConsent && detected && (
        <>
          <div style={s.card}>
            <div style={s.cardLabel}>Signed in as</div>
            <div style={s.userRow}>
              {user?.picture && <img src={user.picture} alt="" style={s.avatar} />}
              <div style={s.userName}>{user?.name || user?.email}</div>
            </div>
          </div>

          {answerCount === 0 ? (
            <div style={s.learnCard}>
              <div style={s.learnTitle}>Learning mode</div>
              <div style={s.learnBody}>
                Fill this application normally — EzFill will save your answers automatically.
                Next time, it will fill for you.
              </div>
            </div>
          ) : (
            <>
              <div style={s.card}>
                <div style={s.statRow}>
                  <div>
                    <div style={s.statNum}>{answerCount}</div>
                    <div style={s.statLabel}>answers saved</div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#22c55e' }}>Ready to fill</div>
                </div>
              </div>
              <button style={s.btn}      onClick={handleFill}>Fill Application</button>
              <button style={s.btnGhost} onClick={handleReview}>Review Answers</button>
            </>
          )}

          <button style={s.btnGhost}  onClick={handleSignOut}>Sign out</button>
          <button style={s.btnDanger} onClick={handleDeleteData} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete my data'}
          </button>
        </>
      )}

      {/* Signed in + consent + not on a job app */}
      {isLoggedIn && hasConsent && !detected && (
        <>
          <div style={s.card}>
            <div style={s.cardLabel}>Signed in as</div>
            <div style={s.userRow}>
              {user?.picture && <img src={user.picture} alt="" style={s.avatar} />}
              <div style={s.userName}>{user?.name || user?.email}</div>
            </div>
          </div>
          {answerCount > 0 && (
            <div style={s.card}>
              <div style={s.statRow}>
                <div>
                  <div style={s.statNum}>{answerCount}</div>
                  <div style={s.statLabel}>answers saved</div>
                </div>
                <button style={{ ...s.btnGhost, width: 'auto', padding: '4px 10px' }}
                  onClick={handleReview}>Review</button>
              </div>
            </div>
          )}
          <div style={s.empty}>Navigate to a job application to use EzFill.</div>
          <button style={s.btnGhost}  onClick={handleSignOut}>Sign out</button>
          <button style={s.btnDanger} onClick={handleDeleteData} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete my data'}
          </button>
        </>
      )}

    </div>
  )
}
