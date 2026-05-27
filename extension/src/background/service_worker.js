/**
 * EzFill - Background Service Worker
 * The message hub of the extension. Responsible for:
 * 1. Google OAuth login flow
 * 2. Relaying messages between popup and content script
 * 3. Making API calls to the FastAPI backend
 * 4. Storing/retrieving user session from chrome.storage
 */

const API_BASE = 'http://localhost:8000' // swap to Render URL on deployment

// ── Auth ──────────────────────────────────────────────────────────────────────

async function startGoogleAuth() {
  // Uses chrome.identity to trigger Google OAuth popup
  // Requires 'identity' permission and OAuth2 client ID in manifest
  // Placeholder until OAuth is fully wired up
  console.log('[EzFill] Auth flow triggered — OAuth not yet configured')

  // Stub: save a fake user so UI can be tested
  await chrome.storage.local.set({
    user: { email: 'test@example.com', name: 'Test User' }
  })
  console.log('[EzFill] Stub user saved for testing')
}

// ── API Helpers ───────────────────────────────────────────────────────────────

async function matchQuestion(questionText) {
  try {
    const res = await fetch(`${API_BASE}/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: questionText }),
    })
    if (!res.ok) return null
    return await res.json() // { matched_question, answer, confidence }
  } catch (err) {
    console.error('[EzFill] Match API error:', err)
    return null
  }
}

// ── Message Listener ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {

  if (message.type === 'START_AUTH') {
    startGoogleAuth().then(() => sendResponse({ ok: true }))
    return true
  }

  if (message.type === 'MATCH_QUESTION') {
    matchQuestion(message.question).then((result) => sendResponse(result))
    return true
  }

})

console.log('[EzFill] Service worker started')
