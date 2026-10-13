// Wires every enquiry form on the page to POST /api/inquiry.
//
// One script for all three forms (homepage, Landmark 4, contact) in both
// locales — the alternative was six near-identical inline copies of the same
// fetch-and-render-errors logic. Everything form-specific comes off data
// attributes, so the markup stays the single source of truth and translators
// never have to touch JavaScript.
//
// Required on the <form>:
//   data-lead-form="homepage|projects|contact"  which form this is
//   data-success="<id>"                         block revealed on success
//   data-error="<id>"                           block revealed on failure
//   data-sending="…"  data-offline="…"          localised UI strings
(() => {
  'use strict'

  // Used for the bot-timing signal: how long the visitor had the page open
  // before submitting. Captured at script load, not at submit.
  const loadedAt = Date.now()

  // Chip groups on the contact page map onto payload keys.
  const CHIP_GROUPS = { contact: 'channel', time: 'bestTime', lang: 'language' }

  const byId = (id) => (id ? document.getElementById(id) : null)

  function collect(form) {
    const data = new FormData(form)
    const text = (key) => {
      const value = data.get(key)
      return typeof value === 'string' ? value : ''
    }

    const chips = {}
    form.querySelectorAll('[data-group]').forEach((group) => {
      const key = CHIP_GROUPS[group.dataset.group]
      const active = group.querySelector('.chip.is-on')
      if (key && active) chips[key] = active.dataset.val
    })

    return {
      firstName: text('firstName'),
      lastName: text('lastName'),
      email: text('email'),
      phone: text('phone'),
      message: text('message'),
      interest: text('interest'),
      reason: text('reason'),
      company: text('company'),
      consent: data.get('consent') !== null,
      locale: document.documentElement.lang === 'ro' ? 'ro' : 'en',
      source: form.dataset.leadForm,
      elapsedMs: Date.now() - loadedAt,
      ...chips,
    }
  }

  // Mark the fields the server rejected, so the visitor sees which ones to fix
  // rather than only a sentence at the bottom of the form.
  function markFields(form, fields) {
    form.querySelectorAll('[data-invalid]').forEach((el) => {
      el.removeAttribute('data-invalid')
      el.removeAttribute('aria-invalid')
    })
    ;(fields || []).forEach((name) => {
      const field = form.querySelector(`[name="${name}"]`)
      if (!field) return
      field.setAttribute('data-invalid', '')
      field.setAttribute('aria-invalid', 'true')
    })
    const first = form.querySelector('[data-invalid]')
    if (first && typeof first.focus === 'function') first.focus()
  }

  function setup(form) {
    const success = byId(form.dataset.success)
    const failure = byId(form.dataset.error)
    const submit = form.querySelector('button[type=submit]')
    const submitLabel = submit ? submit.innerHTML : ''

    const showError = (message) => {
      if (!failure) return
      failure.textContent = message
      failure.classList.remove('hidden')
    }

    const busy = (on) => {
      if (!submit) return
      submit.disabled = on
      submit.innerHTML = on ? form.dataset.sending || 'Sending…' : submitLabel
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault()
      if (failure) failure.classList.add('hidden')
      busy(true)

      let result
      try {
        const response = await fetch('/api/inquiry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(collect(form)),
        })
        result = await response.json()
      } catch {
        // Offline, DNS failure, or the request never landed.
        busy(false)
        showError(form.dataset.offline || 'Network error. Please try again.')
        return
      }

      if (!result || !result.ok) {
        busy(false)
        markFields(form, result && result.data && result.data.fields)
        showError((result && result.error) || form.dataset.offline || 'Something went wrong.')
        return
      }

      if (success) {
        success.classList.remove('hidden')
        success.scrollIntoView({ block: 'nearest' })
      }
      form
        .querySelectorAll('input, textarea, select, button')
        .forEach((el) => { el.disabled = true })
    })
  }

  document.querySelectorAll('form[data-lead-form]').forEach(setup)
})()
