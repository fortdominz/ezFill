/**
 * EzFill - Background Service Worker
 * Handles: OAuth, field capture → local storage, badge, matching, data deletion.
 *
 * Privacy model:
 *   - Answers stored in chrome.storage.local only (never sent to server)
 *   - Backend receives: question TEXT only (for embedding/matching)
 *   - Backend never sees: the user's actual answers
 */

const BACKEND = 'http://localhost:8000'

// ── Google Auth ───────────────────────────────────────────────────────────────

async function startGoogleAuth() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, async (token) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
        return
      }
      try {
        const googleRes  = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const googleUser = await googleRes.json()

        const backendRes = await fetch(`${BACKEND}/auth/google`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            google_id: googleUser.sub,
            email:     googleUser.email,
            name:      googleUser.name,
            picture:   googleUser.picture,
          }),
        })
        const user = await backendRes.json()
        await chrome.storage.local.set({ user })
        resolve(user)
      } catch (err) {
        reject(err)
      }
    })
  })
}

// ── Field Capture → Local Storage ────────────────────────────────────────────

async function handleFieldFilled(label, value, fieldType) {
  const { user } = await chrome.storage.local.get(['user'])
  if (!user) return  // Not signed in

  const { consent } = await chrome.storage.local.get(['consent'])
  if (!consent) return  // No consent given yet

  try {
    // 1. Send question TEXT to backend — backend stores it, returns stable question_id
    //    The actual ANSWER never leaves this device
    const res = await fetch(`${BACKEND}/questions`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ user_id: user.google_id, question: label }),
    })
    const { question_id } = await res.json()

    // 2. Save answer locally using question_id as key
    const { answers = {} } = await chrome.storage.local.get(['answers'])
    answers[question_id] = {
      question:  label,
      answer:    value,
      fieldType,
      savedAt:   new Date().toISOString(),
    }
    await chrome.storage.local.set({ answers })

    console.log(`[EzFill] Saved locally: "${label}" → "${value}"`)
  } catch (err) {
    console.error('[EzFill] Failed to save field:', err)
  }
}

// ── Delete All Data ───────────────────────────────────────────────────────────

async function deleteAllData() {
  const { user } = await chrome.storage.local.get(['user'])

  // 1. Clear everything from local storage
  await chrome.storage.local.clear()

  // 2. Delete from backend (user record + question patterns)
  if (user?.google_id) {
    await fetch(`${BACKEND}/auth/user/${user.google_id}`, { method: 'DELETE' })
  }

  // 3. Clear cached OAuth token
  await new Promise((resolve) => chrome.identity.clearAllCachedAuthTokens(resolve))
}

// ── Badge ─────────────────────────────────────────────────────────────────────

function setBadge(tabId, { text, color }) {
  chrome.action.setBadgeText({ text, tabId })
  chrome.action.setBadgeBackgroundColor({ color, tabId })
}

// ── Message Listener ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  if (message.type === 'START_AUTH') {
    startGoogleAuth()
      .then((user) => sendResponse({ success: true, user }))
      .catch((err)  => sendResponse({ success: false, error: err.message }))
    return true
  }

  if (message.type === 'SIGN_OUT') {
    chrome.identity.clearAllCachedAuthTokens(() => {
      chrome.storage.local.remove(['user', 'consent'], () => {
        sendResponse({ success: true })
      })
    })
    return true
  }

  if (message.type === 'JOB_APP_DETECTED') {
    // Content script found a job application page — badge the icon
    chrome.storage.local.get(['answers'], ({ answers = {} }) => {
      const hasProfile = Object.keys(answers).length > 0
      setBadge(sender.tab.id, {
        text:  hasProfile ? '✓' : '!',
        color: hasProfile ? '#22c55e' : '#f59e0b',
      })
    })
    return true
  }

  if (message.type === 'FIELD_FILLED') {
    handleFieldFilled(message.label, message.value, message.fieldType)
    return true
  }

  if (message.type === 'MATCH_QUESTION') {
    const { userId, question } = message
    fetch(`${BACKEND}/match`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ user_id: userId, question }),
    })
      .then((r) => r.json())
      .then((result) => sendResponse(result))
      .catch(() => sendResponse({ matched: false }))
    return true
  }

  if (message.type === 'DELETE_ALL_DATA') {
    deleteAllData()
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }))
    return true
  }

})

console.log('[EzFill] Service worker started')
