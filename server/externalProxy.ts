/**
 * Proxy for the ttruthdesk.claims external API.
 *
 * Mounts at /api/external/trpc/* and forwards all requests to
 * https://ttruthdesk.claims/api/trpc/* server-side, avoiding CORS
 * and sandbox network restrictions in the browser.
 */
import type { Express, Request, Response } from 'express'

const UPSTREAM = 'https://ttruthdesk.claims/api/trpc'

export function registerExternalProxy(app: Express): void {
  // Handle GET (queries with ?input=...)
  app.get('/api/external/trpc/:procedure', async (req: Request, res: Response) => {
    const { procedure } = req.params
    const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''
    const url = `${UPSTREAM}/${procedure}${qs}`
    try {
      const upstream = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
      })
      const body = await upstream.text()
      res.status(upstream.status)
        .set('Content-Type', upstream.headers.get('content-type') ?? 'application/json')
        .send(body)
    } catch (err) {
      console.error('[ExternalProxy] GET error:', err)
      res.status(502).json({ error: 'upstream_error', message: String(err) })
    }
  })

  // Handle POST (mutations)
  app.post('/api/external/trpc/:procedure', async (req: Request, res: Response) => {
    const { procedure } = req.params
    const url = `${UPSTREAM}/${procedure}`
    try {
      const upstream = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      })
      const body = await upstream.text()
      res.status(upstream.status)
        .set('Content-Type', upstream.headers.get('content-type') ?? 'application/json')
        .send(body)
    } catch (err) {
      console.error('[ExternalProxy] POST error:', err)
      res.status(502).json({ error: 'upstream_error', message: String(err) })
    }
  })

  console.log('[ExternalProxy] Proxy mounted at /api/external/trpc/* → ttruthdesk.claims')
}
