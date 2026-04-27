import type { CollectionConfig } from 'payload'
import { authenticated, authenticatedOrPublishedPost } from '../access/authenticated'

export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'status', 'publishedAt'],
    livePreview: {
      url: ({ data, locale }) =>
        `${process.env.SITE_URL || 'http://localhost:5173'}${
          locale?.code === 'ro' ? '/ro' : ''
        }/media/${data?.slug || ''}`,
    },
  },
  access: {
    create: authenticated,
    delete: authenticated,
    read: authenticatedOrPublishedPost,
    update: authenticated,
  },
  versions: {
    drafts: {
      autosave: { interval: 800 },
    },
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      localized: true,
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      admin: { description: 'Lowercase, hyphenated, derived from EN title.' },
      hooks: {
        beforeValidate: [
          ({ value, data }) => {
            if (value) return value
            const title = data?.title?.en || ''
            return title
              .toLowerCase()
              .trim()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-+|-+$/g, '')
          },
        ],
      },
    },
    {
      name: 'excerpt',
      type: 'textarea',
      localized: true,
      maxLength: 280,
      admin: { description: 'One-paragraph summary. Max 280 characters per locale.' },
      required: true,
    },
    {
      name: 'heroImage',
      type: 'upload',
      relationTo: 'media',
      // Optional — articles can render without a hero image (placeholder is
      // shown instead). Editors should add one for any post that's going
      // to a featured slot or shared on social.
    },
    {
      name: 'body',
      type: 'richText',
      localized: true,
      required: true,
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      required: true,
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'authors',
      required: true,
    },
    {
      name: 'tag',
      type: 'select',
      options: ['milestone', 'craft', 'progress', 'people', 'press', 'timelapse', 'market'],
      admin: { description: 'Drives the filter pills on /media.' },
    },
    {
      name: 'publishedAt',
      type: 'date',
      required: true,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
    },
    {
      name: 'seo',
      type: 'group',
      fields: [
        { name: 'metaTitle', type: 'text', localized: true },
        { name: 'metaDescription', type: 'textarea', localized: true, maxLength: 200 },
        { name: 'ogImage', type: 'upload', relationTo: 'media' },
      ],
    },
  ],
  timestamps: true,
}
