/**
 * /api/cpanel/media
 *
 * POST (multipart, field "file", optional "name"): uploads an image and
 * returns { url }. The name (e.g. a chosen file name) goes in front of its id.
 */

import { NextResponse } from 'next/server';
import { requireContentSession } from '@/lib/workstation/api-auth';
import { saveUpload } from '@/lib/site/media';

export async function POST(request: Request) {
  const auth = await requireContentSession();
  if (auth.error) return auth.error;

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Choose an image to upload.' }, { status: 400 });
  }
  try {
    const name = form?.get('name');
    return NextResponse.json({ url: await saveUpload(file, typeof name === 'string' ? name : file.name) }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Upload failed.' }, { status: 400 });
  }
}
