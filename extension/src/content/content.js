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
    console.log('[EzFill] Fill triggered. Fields:', scanFields().map(f => f.label))
    return true
  }

})

console.log('[EzFill] Content script active:', window.location.href)
