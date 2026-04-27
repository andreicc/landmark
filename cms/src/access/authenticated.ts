import type { Access } from 'payload'

export const authenticated: Access = ({ req: { user } }) => Boolean(user)

// Filters by Payload's built-in draft-version field (`_status`), which is
// what the Publish button toggles. The custom `status` field on Posts.ts is
// redundant and ignored here.
export const authenticatedOrPublishedPost: Access = ({ req: { user } }) => {
  if (user) return true
  return {
    _status: { equals: 'published' },
  }
}
