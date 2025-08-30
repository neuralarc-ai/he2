import { NextRequest, NextResponse } from 'next/server'
import { createAdmin } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
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
          details: { hasUrl, hasService },
        },
        { status: 500 }
      )
    }

    // Resolve account_id consistently with backend using user session
    let finalPayload = { ...payload }
    const supabaseServer = await createClient()
    const { data: userRes, error: userErr } = await supabaseServer.auth.getUser()
    if (userErr || !userRes?.user) {
      return NextResponse.json({ error: 'Unable to resolve user session for account lookup' }, { status: 401 })
    }

    if (!finalPayload.account_id) {
      // Prefer the same RPC the backend uses
      let accountId: string | undefined
      try {
        const { data: defaultAccount, error: defaultErr } = await supabaseServer.rpc('get_user_default_account', {
          p_user_id: userRes.user.id,
        })
        if (!defaultErr && defaultAccount) {
          accountId = (defaultAccount as any).id || (defaultAccount as any).account_id || (defaultAccount as any)
        }
      } catch {}

      if (!accountId) {
        // Fallback: members table
        const { data: member } = await supabaseServer
          .from('basejump.members')
          .select('account_id')
          .eq('user_id', userRes.user.id)
          .limit(1)
          .maybeSingle()
        if (member?.account_id) accountId = member.account_id as string
      }

      if (!accountId) {
        // Final fallback: get_accounts RPC
        const { data: accounts } = await supabaseServer.rpc('get_accounts')
        accountId = (accounts && accounts[0] && (accounts[0].id || accounts[0].account_id)) as string | undefined
      }

      if (!accountId) {
        return NextResponse.json({ error: 'Account ID could not be resolved' }, { status: 400 })
      }

      finalPayload.account_id = accountId
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
            const placeholder = `File stored at ${bucket}/${path}`
            await admin.from(table).update({ content: placeholder, content_tokens: 0 }).eq('id', kbId)
          }
        }
      }
    } catch {}

    return NextResponse.json({ ok: true, id: kbId, account_id: finalPayload.account_id })
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

  if (contentType.startsWith('text/') || lowerPath.endsWith('.txt') || lowerPath.endsWith('.md')) {
    const text = new TextDecoder('utf-8').decode(arrayBuffer)
    return text.trim().length ? text : null
  }

  if (contentType.includes('csv') || lowerPath.endsWith('.csv')) {
    const text = new TextDecoder('utf-8').decode(arrayBuffer)
    return text.trim().length ? text : null
  }

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

  // PDF extraction omitted here
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
    if (error && (error as any).code === '23505') {
      const originalName = (currentPayload as any).name || 'Untitled'
      const suffix = new Date().toISOString().replace(/[:.]/g, '-')
      currentPayload = { ...currentPayload, name: `${originalName} (${suffix})` }
      attempt += 1
      continue
    }
    throw new Error(error?.message || 'Insert failed')
  }
  const { data, error } = await admin
    .from(table)
    .insert(currentPayload)
    .select('id')
    .single()
  if (error || !data) throw new Error(error?.message || 'Insert failed after retries')
  return data as { id: string }
}


