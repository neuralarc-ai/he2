import { createClient } from '@/lib/supabase/client'

export type UploadOptions = {
  bucket: string
  folder?: string
  upsert?: boolean
  allowedExt?: string[]
}

const DEFAULT_ALLOWED_EXT = ['pdf', 'doc', 'docx']
const MIME_BY_EXT: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

export async function uploadKbFile(file: File, opts: UploadOptions) {
  const { bucket, folder = '', upsert = false, allowedExt = DEFAULT_ALLOWED_EXT } = opts

  if (!file) throw new Error('No file provided')
  if (!bucket) throw new Error('Bucket name is required')

  const originalName = file.name || 'unnamed'
  const ext = (originalName.split('.').pop() || '').toLowerCase()
  if (!allowedExt.includes(ext)) {
    throw new Error(`Unsupported file extension .${ext}. Allowed: ${allowedExt.join(', ')}`)
  }

  const sanitizedFolder = folder.trim().replace(/^\/+|\/+$/g, '')
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const unique = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2)
  const path = `${sanitizedFolder ? sanitizedFolder + '/' : ''}${timestamp}-${unique}.${ext}`

  const contentType = file.type || MIME_BY_EXT[ext] || 'application/octet-stream'

  const supabase = createClient()

  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert,
    contentType,
  })

  if (error) {
    const ctx = { bucket, path, name: originalName, size: file.size, type: file.type || contentType, ext, upsert }
    throw new Error(`Supabase upload failed: ${error.message}. Context: ${JSON.stringify(ctx)}`)
  }

  const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(path)

  return {
    bucket,
    path: data?.path ?? path,
    publicUrl: publicUrlData.publicUrl,
    contentType,
  }
}


