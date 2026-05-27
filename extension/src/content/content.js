/**
 * EzFill - Content Script
 * Runs on every HTTPS page. Responsible for:
 * 1. Detecting job application pages (proactively, not just when popup asks)
 * 2. Watching fields as the user fills them — captures label + answer locally
 * 3. Filling fields with matched answers when triggered
 * 4. Scanning fields for the review phase
 */

// ── Job Application Detection ─────────────────────────────────────────────────

const JOB_APP_URL_PATTERNS = [
  /greenhouse\.io\/jobs/,
  /lever\.co\/.*\/apply/,
  /myworkdayjobs\.com/,
  /jobs\.ashbyhq\.com/,
  /apply\.workable\.com/,
  /jobs\.smartrecruiters\.com/,
  /linkedin\.com\/jobs\/apply/,
  /boards\.greenhouse\.io/,
  /jobs\.lever\.co/,
  /app\.joinhandshake\.com\/jobs/,
]

const PAGE_KEYWORDS = [
  'submit application',
  'apply now',
  'upload resume',
  'work authorization',
  'years of experience',
  'cover letter',
  'equal opportunity',
  'voluntary self-identification',
]

function isJobApplicationPage() {
  const url  = window.location.href.toLowerCase()
  if (JOB_APP_URL_PATTERNS.some((p) => p.test(url))) return true
  const text = document.body.innerText.toLowerCase()
  return PAGE_KEYWORDS.filter((kw) => text.includes(kw)).length >= 2
}

// ── Label Detection ───────────────────────────────────────────────────────────

function getLabelFor(el) {
  if (el.id) {
    const lbl = document.querySelector(`label[for="${el.id}"]`)
    if (lbl) return lbl.innerText.trim()
  }
  const parentLabel = el.closest('label')
  if (parentLabel) return parentLabel.innerText.replace(el.value || '', '').trim()
  if (el.getAttribute('aria-label')) return el.getAttribute('aria-label').trim()
  if (el.placeholder) return el.placeholder.trim()
  const prev = el.previousElementSibling
  if (prev && prev.innerText) return prev.innerText.trim()
  return ''
}

// ── Field Scanner ─────────────────────────────────────────────────────────────

function scanFields() {
  const inputs = document.querySelectorAll('input, textarea, select')
  const fields = []
  inputs.forEach((el) => {
    if (['hidden', 'submit', 'button', 'file', 'image'].includes(el.type)) return
    const label = getLabelFor(el)
    if (!label) return
    fields.push({
      label,
      type: el.tagName === 'SELECT' ? 'select'
          : el.type === 'checkbox'  ? 'checkbox'
          : el.type === 'radio'     ? 'radio'
          : 'text',
      options: el.tagName === 'SELECT'
        ? Array.from(el.options).map((o) => o.text.trim()).filter(Boolean)
        : [],
    })
  })
  return fields
}

// ── Field Watcher — Learn Mode ────────────────────────────────────────────────
// Watches every field the user fills in. When they leave a field (blur),
// captures label + value and sends to service worker to save locally.

const watchedFields = new WeakSet()

function attachWatcher(el) {
  if (watchedFields.has(el)) return
  if (['hidden', 'submit', 'button', 'file', 'image'].includes(el.type)) return
  watchedFields.add(el)

  el.addEventListener('blur', () => {
    const label = getLabelFor(el)
    let   value = ''

    if (el.type === 'checkbox') {
      value = el.checked ? 'Yes' : 'No'
    } else if (el.tagName === 'SELECT') {
      value = el.options[el.selectedIndex]?.text?.trim() || ''
    } else {
      value = el.value?.trim() || ''
    }

    if (!label || !value) return

    chrome.runtime.sendMessage({
      type:      'FIELD_FILLED',
      label,
      value,
      fieldType: el.tagName === 'SELECT' ? 'select'
               : el.type === 'checkbox'  ? 'checkbox'
               : el.type === 'radio'     ? 'radio'
               : 'text',
    })
  })
}

function watchAllFields() {
  document.querySelectorAll('input, textarea, select').forEach(attachWatcher)

  // Workday, Greenhouse, Lever load fields dynamically — watch for new ones
  const observer = new MutationObserver(() => {
    document.querySelectorAll('input, textarea, select').forEach(attachWatcher)
  })
  observer.observe(document.body, { childList: true, subtree: true })
}

// ── Fill Application ──────────────────────────────────────────────────────────
// Fills all matched fields using answers from chrome.storage.local.
// The actual answers never left the device — this is purely local lookup.

function setNativeValue(el, value) {
  // React-controlled inputs ignore el.value = x directly.
  // We need to fire through the native setter to trigger React's onChange.
  const proto  = el.tagName === 'TEXTAREA'
    ? window.HTMLTextAreaElement.prototype
    : window.HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
  if (setter) setter.call(el, value)
  else el.value = value
  el.dispatchEvent(new Event('input',  { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
}

function fillField(el, value) {
  if (el.tagName === 'SELECT') {
    const lv     = value.toLowerCase()
    const option = Array.from(el.options).find((o) =>
      o.text.toLowerCase() === lv || o.text.toLowerCase().includes(lv)
    )
    if (option) {
      el.value = option.value
      el.dispatchEvent(new Event('change', { bubbles: true }))
    }
  } else if (el.type === 'checkbox') {
    const shouldCheck = ['yes', 'true', '1'].includes(value.toLowerCase())
    if (el.checked !== shouldCheck) el.click()
  } else if (el.type === 'radio') {
    const siblings = document.querySelectorAll(`input[type="radio"][name="${el.name}"]`)
    siblings.forEach((radio) => {
      if (getLabelFor(radio).toLowerCase().includes(value.toLowerCase())) radio.click()
    })
  } else {
    setNativeValue(el, value)
  }
}

async function fillApplication() {
  const storage = await new Promise((resolve) =>
    chrome.storage.local.get(['user', 'answers'], resolve)
  )
  const { user, answers } = storage
  if (!user || !answers || Object.keys(answers).length === 0) {
    console.log('[EzFill] No answers saved yet — fill this application to start learning.')
    return
  }

  const inputs = Array.from(document.querySelectorAll('input, textarea, select'))
    .filter((el) => !['hidden', 'submit', 'button', 'file', 'image'].includes(el.type))

  let filled = 0

  for (const el of inputs) {
    const label = getLabelFor(el)
    if (!label) continue

    // Ask service worker to match this label against stored questions
    const match = await new Promise((resolve) =>
      chrome.runtime.sendMessage(
        { type: 'MATCH_QUESTION', userId: user.google_id, question: label },
        resolve
      )
    )

    if (!match?.matched || !match?.question_id) continue

    const saved = answers[match.question_id]
    if (!saved?.answer) continue

    fillField(el, saved.answer)
    filled++
    console.log(`[EzFill] Filled "${label}" → "${saved.answer}" (confidence: ${match.confidence})`)
  }

  console.log(`[EzFill] Done — filled ${filled} of ${inputs.length} fields.`)
}

// ── Proactive Detection on Page Load ─────────────────────────────────────────

function init() {
  if (!isJobApplicationPage()) return

  // Tell service worker this is a job app page → it will badge the icon
  chrome.runtime.sendMessage({ type: 'JOB_APP_DETECTED' })

  // Start watching fields immediately
  watchAllFields()

  console.log('[EzFill] Job application detected — field watcher active')
}

// Run on load, and again after dynamic content settles
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}

// ── Message Listener ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {

  if (message.type === 'CHECK_PAGE') {
    sendResponse({ isJobApplication: isJobApplicationPage() })
    return true
  }

  if (message.type === 'SCAN_FIELDS') {
    sendResponse({ fields: scanFields() })
    return true
  }

  if (message.type === 'START_FILL') {
    fillApplication()
    return true
  }

})

console.log('[EzFill] Content script active:', window.location.href)
