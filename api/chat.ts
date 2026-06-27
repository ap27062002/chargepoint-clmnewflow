// Vercel serverless function — live Claude for the CLM agent.
// Set ANTHROPIC_API_KEY (and optionally ANTHROPIC_MODEL) in the Vercel project to activate.
// Returns { error: 'no_key' } when unconfigured so the client gracefully falls back to the
// deterministic engine. Not typechecked by the app's tsc (outside /src).

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' })
    return
  }
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) {
    res.status(200).json({ error: 'no_key' })
    return
  }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const message: string = body.message || ''
    const context: string = body.context || ''
    const model = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest'

    const system = [
      "You are ChargePoint Legal's AI Contract Lifecycle Management (CLM) agent.",
      'You assist attorneys with NDA/contract review, redline analysis, and the playbook. You never approve terms, send documents externally, or sign — those are human decisions. Mark uncertainty plainly. Be concise and practical.',
      'Use ONLY the context below for deal specifics; if something is not in context, say so.',
      '',
      'CONTEXT:',
      context,
    ].join('\n')

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 800,
        system,
        messages: [{ role: 'user', content: message }],
      }),
    })

    if (!r.ok) {
      const detail = await r.text()
      res.status(200).json({ error: 'upstream', status: r.status, detail: detail.slice(0, 400) })
      return
    }
    const j: any = await r.json()
    const text = j?.content?.[0]?.text || 'I could not generate a response.'
    res.status(200).json({ text, model })
  } catch (e: any) {
    res.status(200).json({ error: 'call_failed', detail: String(e?.message || e) })
  }
}
