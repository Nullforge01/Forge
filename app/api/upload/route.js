import { put } from '@vercel/blob'
import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(request) {
  try {
    const formData = await request.formData()
    const siteName = formData.get('siteName')
    const files = formData.getAll('files')

    if (!siteName || files.length === 0) {
      return NextResponse.json({ error: 'Missing siteName or files' }, { status: 400 })
    }

    let indexUrl = ''
    for (const file of files) {
      const pathname = `sites/${siteName}/${file.name}`
      const blob = await put(pathname, file, { 
        access: 'public', 
        addRandomSuffix: false 
      })
      if (file.name === 'index.html') indexUrl = blob.url
    }

    return NextResponse.json({ url: indexUrl })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
