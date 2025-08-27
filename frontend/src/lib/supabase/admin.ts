import { createClient as createAdminClient } from '@supabase/supabase-js'

function resolveEnv(nameVariants: string[]): string | undefined {
  for (const name of nameVariants) {
    const val = process.env[name]
    if (val && String(val).trim().length > 0) return val
  }
  return undefined
}

export function createAdmin() {
  const url = resolveEnv(['SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL'])
  const serviceKey = resolveEnv(['SUPABASE_SERVICE_ROLE_KEY', 'SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_KEY'])

  if (!url || !serviceKey) {
    const details = {
      hasUrl: Boolean(url),
      hasService: Boolean(serviceKey),
      triedUrlVars: ['SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL'],
      triedServiceVars: ['SUPABASE_SERVICE_ROLE_KEY', 'SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_KEY'],
    }
    throw new Error(`Missing Supabase env vars for admin client: ${JSON.stringify(details)}`)
  }
  return createAdminClient(url, serviceKey)
}


