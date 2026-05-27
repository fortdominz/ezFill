import { useState, useEffect } from 'react'

const s = {
  wrap:       { padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' },
  header:     { display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #222', paddingBottom: '12px' },
  logo:       { fontSize: '18px', fontWeight: '700', color: '#fff', letterSpacing: '-0.5px' },
  accent:     { color: '#6366f1' },
  statusRow:  { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#888' },
  dot: (on)  => ({ width: '8px', height: '8px', borderRadius: '50%', background: on ? '#22c55e' : '#555' }),
  card:       { background: '#1a1a1a', border: '1px solid #222', borderRadius: '8px', padding: '12px' },
  cardLabel:  { fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' },
  cardValue:  { fontSize: '14px', color: '#f0f0f0', fontWeight: '500' },
  btn:        { width: '100%', padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600', background: '#6366f1', color: '#fff' },
  btnGhost:   { width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #333', cursor: 'pointer', fontSize: '12px', fontWeight: '500', background: 'transparent', color: '#888', marginTop: '4px' },
  empty:      { fontSize: '13px', color: '#666', textAlign: 'center', padding: '8px 0' },
  userRow:    { display: 'flex', alignItems: 'center', gap: '8px' },
  avatar:     { width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' },
  userName:   { fontSize: '13px', color: '#ccc', fontWeight: '500' },
  spinner:    { fontSize: '13px', color: '#666', textAlign: 'center', padding: '8px 0' },
}

export default function Popup() {
  const [pageStatus, setPageStatus]   = useState('checking') // checking | detected | not-detected
  const [isLoggedIn, setIsLoggedIn]   = useState(false)
  const [user, setUser]               = useState(null)
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError]     = useState(null)

  useEffect(() => {
    // Check if this page is a job application
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return
      chrome.tabs.sendMessage(tabs[0].id, { type: 'CHECK_PAGE' }, (res) => {
        if (chrome.runtime.lastError) { setPageStatus('not-detected'); return }
        setPageStatus(res?.isJobApplication ? 'detected' : 'not-detected')
      })
    })

    // Check stored auth state
    chrome.storage.local.get(['user'], (res) => {
      if (res.user) {
        setUser(res.user)
        setIsLoggedIn(true)
      }
    })
  }, [])

  function handleLogin() {
    setAuthLoading(true)
    setAuthError(null)
    chrome.runtime.sendMessage({ type: 'START_AUTH' }, (res) => {
      setAuthLoading(false)
      if (res?.success) {
        setUser(res.user)
        setIsLoggedIn(true)
      } else {
        setAuthError(res?.error || 'Sign in failed. Try again.')
      }
    })
  }

  function handleSignOut() {
    chrome.runtime.sendMessage({ type: 'SIGN_OUT' }, () => {
      setUser(null)
      setIsLoggedIn(false)
    })
  }

  function handleFill() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'START_FILL' })
      window.close()
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

      {/* Not logged in */}
      {!isLoggedIn && (
        <div style={s.card}>
          <div style={s.cardLabel}>Get started</div>
          <div style={s.cardValue}>Sign in to use EzFill</div>
          {authError && (
            <div style={{ fontSize: '12px', color: '#f87171', marginTop: '8px' }}>{authError}</div>
          )}
          <button style={{ ...s.btn, marginTop: '10px', opacity: authLoading ? 0.6 : 1 }}
            onClick={handleLogin}
            disabled={authLoading}
          >
            {authLoading ? 'Signing in...' : 'Sign in with Google'}
          </button>
        </div>
      )}

      {/* Logged in + application detected */}
      {isLoggedIn && detected && (
        <>
          <div style={s.card}>
            <div style={s.cardLabel}>Signed in as</div>
            <div style={s.userRow}>
              {user?.picture && <img src={user.picture} alt="" style={s.avatar} />}
              <div style={s.userName}>{user?.name || user?.email}</div>
            </div>
          </div>
          <div style={s.card}>
            <div style={s.cardLabel}>Ready</div>
            <div style={s.cardValue}>Job application found on this page</div>
          </div>
          <button style={s.btn} onClick={handleFill}>Fill Application</button>
          <button style={s.btnGhost} onClick={handleSignOut}>Sign out</button>
        </>
      )}

      {/* Logged in + not an application */}
      {isLoggedIn && pageStatus === 'not-detected' && (
        <>
          <div style={s.card}>
            <div style={s.cardLabel}>Signed in as</div>
            <div style={s.userRow}>
              {user?.picture && <img src={user.picture} alt="" style={s.avatar} />}
              <div style={s.userName}>{user?.name || user?.email}</div>
            </div>
          </div>
          <div style={s.empty}>Navigate to a job application to use EzFill.</div>
          <button style={s.btnGhost} onClick={handleSignOut}>Sign out</button>
        </>
      )}

    </div>
  )
}
