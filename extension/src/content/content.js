/**
 * EzFill - Content Script
 * Runs on every page. Responsible for:
 * 1. Detecting whether the page is a job application
 * 2. Scanning the page for form fields when asked
 * 3. Filling fields with answers from the user profile
 * 4. Handling the review phase (later)
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
  const url = window.location.href.toLowerCase()
  if (JOB_APP_URL_PATTERNS.some((p) => p.test(url))) return true
  const text = document.body.innerText.toLowerCase()
  return PAGE_KEYWORDS.filter((kw) => text.includes(kw)).length >= 2
}

// ── Field Scanner ─────────────────────────────────────────────────────────────

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
    // Will be wired up once backend matching is ready
    console.log('[EzFill] Fill triggered. Fields found:', scanFields().map(f => f.label))
    return true
  }

})

console.log('[EzFill] Content script active:', window.location.href)
