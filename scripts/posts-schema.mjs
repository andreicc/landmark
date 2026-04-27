// Hand-rolled validators for CMS payloads.
// Phase 4 (build-time fetch) imports these; same shape will be re-expressed
// in Zod inside the build pipeline once Payload is live.
//
// Localized strings are objects of shape { en: string, ro?: string }.
// `ro` is optional — if missing, the EN locale is used as fallback at render time.

const VALID_STATUS = ['draft', 'published']

function isObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

function isLocalizedString({ value, key, errors, maxLength, required = true }) {
  if (!isObject(value)) {
    errors.push(`${key} must be an object { en, ro? }`)
    return
  }
  if (required && (typeof value.en !== 'string' || value.en.length === 0)) {
    errors.push(`${key}.en is required and must be a non-empty string`)
  } else if (typeof value.en !== 'string') {
    errors.push(`${key}.en must be a string`)
  }
  if (value.ro !== undefined && typeof value.ro !== 'string') {
    errors.push(`${key}.ro must be a string when provided`)
  }
  if (maxLength != null) {
    if (typeof value.en === 'string' && value.en.length > maxLength) {
      errors.push(`${key}.en must not exceed ${maxLength} characters`)
    }
    if (typeof value.ro === 'string' && value.ro.length > maxLength) {
      errors.push(`${key}.ro must not exceed ${maxLength} characters`)
    }
  }
}

function isISODate(s) {
  if (typeof s !== 'string') return false
  const d = new Date(s)
  return !Number.isNaN(d.getTime()) && /^\d{4}-\d{2}-\d{2}T/.test(s)
}

export function validatePost(post) {
  const errors = []
  if (!isObject(post)) return { valid: false, errors: ['post must be an object'] }

  if (typeof post.id !== 'string' || post.id.length === 0) errors.push('id is required')
  if (typeof post.slug !== 'string' || !/^[a-z0-9-]+$/.test(post.slug)) {
    errors.push('slug must be a kebab-case string')
  }

  isLocalizedString({ value: post.title, key: 'title', errors })
  isLocalizedString({ value: post.excerpt, key: 'excerpt', errors, maxLength: 280 })

  // heroImage is optional. If present and the upload object exists, url
  // should be a string when set. Posts without a hero render without the
  // image (renderArticle and the index card both guard on heroUrl).
  if (post.heroImage != null) {
    if (!isObject(post.heroImage)) {
      errors.push('heroImage must be an object when provided')
    } else {
      if (post.heroImage.url !== undefined && typeof post.heroImage.url !== 'string') {
        errors.push('heroImage.url must be a string when provided')
      }
      if (post.heroImage.alt !== undefined) {
        isLocalizedString({ value: post.heroImage.alt, key: 'heroImage.alt', errors, required: false })
      }
    }
  }

  isLocalizedString({ value: post.body, key: 'body', errors })

  if (!isObject(post.category)) errors.push('category is required')
  else if (typeof post.category.slug !== 'string') errors.push('category.slug is required')

  if (!isObject(post.author)) errors.push('author is required')
  else if (typeof post.author.name !== 'string') errors.push('author.name is required')

  if (!isISODate(post.publishedAt)) errors.push('publishedAt must be an ISO 8601 timestamp')

  if (!VALID_STATUS.includes(post.status)) {
    errors.push(`status must be one of: ${VALID_STATUS.join(', ')}`)
  }

  return { valid: errors.length === 0, errors }
}

export function validateAuthor(author) {
  const errors = []
  if (!isObject(author)) return { valid: false, errors: ['author must be an object'] }
  if (typeof author.name !== 'string' || author.name.length === 0) errors.push('name is required')
  if (typeof author.slug !== 'string' || !/^[a-z0-9-]+$/.test(author.slug)) {
    errors.push('slug must be kebab-case')
  }
  if (author.bio !== undefined) {
    isLocalizedString({ value: author.bio, key: 'bio', errors, required: false })
  }
  if (author.role !== undefined && typeof author.role !== 'string') {
    errors.push('role must be a string when provided')
  }
  return { valid: errors.length === 0, errors }
}

export function validateCategory(cat) {
  const errors = []
  if (!isObject(cat)) return { valid: false, errors: ['category must be an object'] }
  if (typeof cat.slug !== 'string' || !/^[a-z0-9-]+$/.test(cat.slug)) {
    errors.push('slug must be kebab-case')
  }
  isLocalizedString({ value: cat.name, key: 'name', errors })
  if (cat.description !== undefined) {
    isLocalizedString({ value: cat.description, key: 'description', errors, required: false })
  }
  return { valid: errors.length === 0, errors }
}
