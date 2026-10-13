// Vocabulary shared by the three enquiry forms and the /api/inquiry endpoint.
//
// The forms post stable slugs rather than the visible label, so a Romanian
// visitor and an English one produce the same payload and Ioana reads one
// consistent email either way. Labels here are the English rendering used in
// the notification; the visitor never sees them.

export const SOURCES = Object.freeze({
  homepage: 'Homepage — register interest',
  projects: 'Landmark 4 — residence enquiry',
  contact: 'Contact page',
})

export const INTERESTS = Object.freeze({
  // homepage
  'landmark-4': 'Landmark 4 · Tower residences',
  'future-project': 'A future Landmark project',
  // projects — the five real typologies
  'studio-2': 'Studio · 2 rooms',
  'apt-2': 'Apartment · 2 rooms',
  'apt-3': 'Apartment · 3 rooms',
  'duplex-4': 'Duplex · 4 rooms',
  'duplex-5': 'Duplex · 5 rooms',
  // contact
  'tower-residence': 'Landmark 4 · Tower residence',
  'penthouse-duplex': 'Landmark 4 · Penthouse duplex',
  // shared
  undecided: 'Undecided — please advise',
})

export const REASONS = Object.freeze({
  viewing: 'Book a viewing',
  enquiry: 'Residence enquiry',
  site: 'Site visit',
  press: 'Press & media',
})

export const CHANNELS = Object.freeze({
  email: 'Email',
  phone: 'Phone',
  whatsapp: 'WhatsApp',
  any: 'Any of the above',
})

export const TIMES = Object.freeze({
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Early evening',
})

export const LANGUAGES = Object.freeze({ ro: 'Romanian', en: 'English' })

export const LOCALES = Object.freeze(['en', 'ro'])

// Field length ceilings. Mirrored by `maxlength` in the markup, re-checked
// server-side because markup is advisory.
export const LIMITS = Object.freeze({
  name: 80,
  email: 254,
  phone: 40,
  message: 500,
})
