import { NextRequest, NextResponse } from 'next/server'
import { createAdmin } from '@/lib/supabase/admin'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { table, payload } = body as { table: string; payload: Record<string, any> }

    if (!table || !payload) {
      return NextResponse.json({ error: 'Missing table or payload' }, { status: 400 })
    }

    const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL)
    const hasService = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
    if (!hasUrl || !hasService) {
      return NextResponse.json(
        {
          error: 'Missing Supabase env vars for admin client',
          details: {
            hasUrl,
            hasService,
          },
        },
        { status: 500 }
      )
    }

    // Resolve account_id if missing using server-side session
    let finalPayload = { ...payload }
    if (!finalPayload.account_id) {
      const supabaseServer = await createServerSupabase()
      const { data: userRes, error: userErr } = await supabaseServer.auth.getUser()
      if (userErr || !userRes?.user) {
        return NextResponse.json({ error: 'Unable to resolve user session for account lookup' }, { status: 401 })
      }

      // Try basejump.members first
      const { data: member, error: memberErr } = await supabaseServer
        .from('basejump.members')
        .select('account_id')
        .eq('user_id', userRes.user.id)
        .limit(1)
        .maybeSingle()

      if (member && member.account_id) {
        finalPayload.account_id = member.account_id
      } else {
        // Fallback to get_accounts RPC
        const { data: accounts, error: accountsErr } = await supabaseServer.rpc('get_accounts')
        if (accountsErr || !accounts || accounts.length === 0) {
          return NextResponse.json({ error: 'Unable to resolve account_id for current user' }, { status: 400 })
        }
        // Accept common shapes: id or account_id
        finalPayload.account_id = accounts[0]?.id || accounts[0]?.account_id
        if (!finalPayload.account_id) {
          return NextResponse.json({ error: 'Account ID not present in get_accounts result' }, { status: 400 })
        }
      }
    }

    const admin = createAdmin()
    // Insert (handle name uniqueness by retrying with a suffix if needed)
    const inserted = await insertWithUniqueName(admin, table, finalPayload)

    const kbId = inserted?.id as string | undefined

    // Attempt content extraction based on content type
    try {
      const meta = (finalPayload as any)?.source_metadata || {}
      const bucket = meta.storage_bucket as string | undefined
      const path = meta.storage_path as string | undefined
      const contentType = meta.content_type as string | undefined

      if (bucket && path && contentType) {
        const text = await extractTextFromStorage(admin, bucket, path, contentType)
        if (kbId) {
          if (text) {
            const tokens = Math.floor(text.length / 4)
            await admin.from(table).update({ content: text, content_tokens: tokens }).eq('id', kbId)
          } else {
            // As a last resort, save a minimal placeholder so content is not EMPTY
            const placeholder = `File stored at ${bucket}/${path}`
            await admin.from(table).update({ content: placeholder, content_tokens: 0 }).eq('id', kbId)
          }
        }
      }
    } catch (e) {
      // Swallow extraction errors; leave content empty
    }

    return NextResponse.json({ ok: true, id: kbId })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 })
  }
}

async function extractTextFromStorage(
  admin: SupabaseClient,
  bucket: string,
  path: string,
  contentType: string
): Promise<string | null> {
  const { data, error } = await admin.storage.from(bucket).download(path)
  if (error || !data) return null
  const arrayBuffer = await data.arrayBuffer()
  const lowerPath = path.toLowerCase()

  // Plain text and markdown
  if (contentType.startsWith('text/') || lowerPath.endsWith('.txt') || lowerPath.endsWith('.md')) {
    const text = new TextDecoder('utf-8').decode(arrayBuffer)
    return text.trim().length ? text : null
  }

  // CSV
  if (contentType.includes('csv') || lowerPath.endsWith('.csv')) {
    const text = new TextDecoder('utf-8').decode(arrayBuffer)
    return text.trim().length ? text : null
  }

  // JSON
  if (contentType.includes('json') || lowerPath.endsWith('.json')) {
    try {
      const raw = new TextDecoder('utf-8').decode(arrayBuffer)
      const obj = JSON.parse(raw)
      const pretty = JSON.stringify(obj, null, 2)
      return pretty.trim().length ? pretty : null
    } catch {
      const fallback = new TextDecoder('utf-8').decode(arrayBuffer)
      return fallback.trim().length ? fallback : null
    }
  }

  // PDF (optional dependency)
  if (contentType.includes('pdf') || lowerPath.endsWith('.pdf')) {
    const buffer = Buffer.from(arrayBuffer)
    try {
      const pdfParse = (await import('pdf-parse')).default as any
      const parsed = await pdfParse(buffer)
      const text = parsed?.text || ''
      return text.trim().length ? text : null
    } catch {
      // Try alternative extractor if available (optional)
      try {
        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.js')
        const loadingTask = pdfjs.getDocument({ data: buffer })
        const pdf = await loadingTask.promise
        let fullText = ''
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i)
          const content = await page.getTextContent()
          const strings = (content.items || []).map((it: any) => it.str || '')
          fullText += strings.join(' ') + '\n'
        }
        const txt = fullText.trim()
        return txt.length ? txt : null
      } catch {
        return null
      }
    }
  }

  // Unsupported: return null to keep content empty
  return null
}

async function insertWithUniqueName(
  admin: SupabaseClient,
  table: string,
  payload: Record<string, any>
): Promise<{ id: string }> {
  const maxAttempts = 3
  let attempt = 0
  let currentPayload = { ...payload }
  while (attempt < maxAttempts) {
    const { data, error } = await admin
      .from(table)
      .insert(currentPayload)
      .select('id')
      .single()
    if (!error && data) return data as { id: string }
    // 23505 = unique_violation
    if (error && (error as any).code === '23505') {
      const originalName = (currentPayload as any).name || 'Untitled'
      const suffix = new Date().toISOString().replace(/[:.]/g, '-')
      currentPayload = { ...currentPayload, name: `${originalName} (${suffix})` }
      attempt += 1
      continue
    }
    throw new Error(error?.message || 'Insert failed')
  }
  // Final attempt without checking code
  const { data, error } = await admin
    .from(table)
    .insert(currentPayload)
    .select('id')
    .single()
  if (error || !data) throw new Error(error?.message || 'Insert failed after retries')
  return data as { id: string }
}


