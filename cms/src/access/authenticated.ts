import type { Access } from 'payload'

export const authenticated: Access = ({ req: { user } }) => Boolean(user)

export const authenticatedOrPublishedPost: Access = ({ req: { user } }) => {
  if (user) return true
  return {
    status: { equals: 'published' },
  }
}
