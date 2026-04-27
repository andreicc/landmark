/* THIS FILE IS GENERATED FROM Payload's official template.
 * Provides the root layout for both the /admin UI and /api routes.
 *
 * NOTE: live-preview server-function wiring is intentionally omitted —
 * the API surface for handleServerFunctions varies across Payload 3.x
 * minor releases. Re-add when wiring live preview in a later phase. */

import { RootLayout } from '@payloadcms/next/layouts'
import config from '@payload-config'
import { importMap } from './admin/importMap.js'

import './custom.scss'

type Args = {
  children: React.ReactNode
}

const Layout = ({ children }: Args) => (
  <RootLayout config={config} importMap={importMap}>
    {children}
  </RootLayout>
)

export default Layout
