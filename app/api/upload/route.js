import { createClient } from '@supabase/supabase-js'
import { put } from '@vercel/blob'
import { NextResponse } from 'next/server'
import JSZip from 'jszip'

export const runtime = 'edge'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const formData = await request.formData()
    const siteName = formData.get('siteName')
    const zipfile = formData.get('zipfile')

    if (!siteName || !zipfile) {
      return NextResponse.json({ error: 'Missing siteName or zipfile' }, { status: 400 })
    }

    const zip = await JSZip.loadAsync(await zipfile.arrayBuffer())
    let indexUrl = ''

    const uploads = []
    zip.forEach((path, zipEntry) => {
      if (!zipEntry.dir) {
        uploads.push(
          zipEntry.async('blob').then(async (blob) => {
            const filePath = `${siteName}/${path}`

            // 1. Upload to Supabase Storage
            await supabase.storage.from('sites').upload(filePath, blob, { upsert: true })

            // 2. Upload to Vercel Blob
            const vercelPath = `sites/${siteName}/${path}`
            const vercelBlob = await put(vercelPath, blob, {
              access: 'public',
              addRandomSuffix: false
            })

            if (path === 'index.html' || path.endsWith('/index.html')) {
              indexUrl = vercelBlob.url
            }
          })
        )
      }
    })

    await Promise.all(uploads)
    if (!indexUrl) throw new Error('No index.html found in zip')

    return NextResponse.json({
      url: indexUrl,
      message: 'Uploaded to Supabase + Vercel Blob'
    })

  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
