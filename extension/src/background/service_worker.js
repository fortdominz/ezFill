/**
 * EzFill - Background Service Worker
 * The message hub of the extension. Responsible for:
 * 1. Google OAuth login flow (chrome.identity)
 * 2. Relaying messages between popup and content script
 * 3. Making API calls to the FastAPI backend
 * 4. Storing/retrieving user session from chrome.storage
 */

const BACKEND = 'http://localhost:8000' // swap to Render URL on deployment

// ── Google Auth ───────────────────────────────────────────────────────────────

async function startGoogleAuth() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, async (token) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message))
        return
      }

      try {
        // 1. Get user info from Google using the access token
        const googleRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const googleUser = await googleRes.json()

        // 2. Send to backend — creates or finds the user in MongoDB
        const backendRes = await fetch(`${BACKEND}/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            google_id: googleUser.sub,
            email:     googleUser.email,
            name:      googleUser.name,
            picture:   googleUser.picture,
          }),
        })
        const user = await backendRes.json()

        // 3. Store user locally so popup reads it on every open
        await chrome.storage.local.set({ user })
        resolve(user)
      } catch (err) {
        reject(err)
      }
    })
  })
}

// ── Question Matching ─────────────────────────────────────────────────────────

async function matchQuestion(userId, question) {
  const res = await fetch(`${BACKEND}/match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, question }),
  })
  return res.json()
}

// ── Message Listener ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {

  if (message.type === 'START_AUTH') {
    startGoogleAuth()
      .then((user) => sendResponse({ success: true, user }))
      .catch((err)  => sendResponse({ success: false, error: err.message }))
    return true  // keep channel open for async response
  }

  if (message.type === 'SIGN_OUT') {
    chrome.identity.clearAllCachedAuthTokens(() => {
      chrome.storage.local.remove('user', () => {
        sendResponse({ success: true })
      })
    })
    return true
  }

  if (message.type === 'MATCH_QUESTION') {
    matchQuestion(message.userId, message.question)
      .then((result) => sendResponse(result))
      .catch((err)   => sendResponse({ matched: false, error: err.message }))
    return true
  }

})

console.log('[EzFill] Service worker started')
