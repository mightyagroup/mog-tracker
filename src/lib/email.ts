// Lightweight email sender. Uses Resend if RESEND_API_KEY is set, otherwise
// logs the intended send to the server console so nothing is silently lost.
// Resend free tier = 100 emails/day which is more than enough for alerts + digest.

type EmailInput = {
  to: string | string[]
  subject: string
  html: string
  from?: string
}

export async function sendEmail(input: EmailInput): Promise<{ ok: boolean; id?: string; error?: string; mode: 'resend' | 'logged' }> {
  const apiKey = process.env.RESEND_API_KEY
  const from = input.from || process.env.RESEND_FROM_EMAIL || 'MOG Tracker <noreply@mightyoakgroup.com>'

  if (!apiKey) {
    console.log('[email:logged]', {
      to: input.to,
      subject: input.subject,
      preview: input.html.slice(0, 140).replace(/\s+/g, ' '),
    })
    return { ok: true, mode: 'logged' }
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(input.to) ? input.to : [input.to],
        subject: input.subject,
        html: input.html,
      }),
    })
    const text = await res.text()
    let json: Record<string, unknown> = {}
    try { json = JSON.parse(text) } catch {}
    if (!res.ok) {
      return { ok: false, mode: 'resend', error: (json.message as string) || text.slice(0, 200) }
    }
    return { ok: true, mode: 'resend', id: json.id as string | undefined }
  } catch (e) {
    return { ok: false, mode: 'resend', error: e instanceof Error ? e.message : String(e) }
  }
}

// Small HTML helpers so email templates stay readable.
// No backticks inside — keeps the source LLM-shipping-friendly.
export function emailLayout(title: string, bodyHtml: string): string {
  return (
    '<!doctype html><html><head><meta charset="utf-8"/><title>' + title + '</title></head>\n' +
    '<body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#F3F4F6;color:#111827">\n' +
    '<div style="max-width:640px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB">\n' +
    '  <div style="background:#1F2937;color:#D4AF37;padding:16px 24px;font-weight:bold;font-size:18px">Mighty Oak Group — Tracker</div>\n' +
    '  <div style="padding:24px">' + bodyHtml + '</div>\n' +
    '  <div style="padding:16px 24px;background:#F9FAFB;color:#6B7280;font-size:12px;border-top:1px solid #E5E7EB">Automated message from MOG Tracker. Reply to admin@mightyoakgroup.com.</div>\n' +
    '</div></body></html>'
  )
}
