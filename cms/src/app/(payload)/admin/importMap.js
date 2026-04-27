// Hand-written import map. Payload's `generate:importmap` CLI is normally
// what produces this file, but it depends on env vars being readable at
// build time (config eval reads BLOB_READ_WRITE_TOKEN) and on the prebuild
// script actually running. To keep the admin boot deterministic, we register
// the components we know we need by hand. Add to this map when you add a
// plugin that ships client components.

import { VercelBlobClientUploadHandler as VercelBlobClientUploadHandler_landmark } from '@payloadcms/storage-vercel-blob/client'

export const importMap = {
  '@payloadcms/storage-vercel-blob/client#VercelBlobClientUploadHandler':
    VercelBlobClientUploadHandler_landmark,
}
