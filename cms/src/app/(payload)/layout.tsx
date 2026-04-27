/* THIS FILE IS GENERATED FROM Payload's official template.
 * Provides the root layout for both the /admin UI and /api routes. */

import type { ServerFunctionClient } from 'payload'
import { RootLayout } from '@payloadcms/next/layouts'
import config from '@payload-config'
import { handleServerFunctions } from '@payloadcms/next/utilities'
import { importMap } from './admin/importMap.js'

import './custom.scss'

type Args = {
  children: React.ReactNode
}

const serverFunction: ServerFunctionClient = async function (args) {
  'use server'
  return handleServerFunctions({
    ...args,
    config,
    importMap,
  })
}

const Layout = ({ children }: Args) => (
  <RootLayout
    config={config}
    importMap={importMap}
    serverFunction={serverFunction}
  >
    {children}
  </RootLayout>
)

export default Layout
