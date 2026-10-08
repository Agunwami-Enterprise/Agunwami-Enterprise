/**
 * /api/cpanel/media
 *
 * POST (multipart, field "file"): uploads an image and returns { url }.
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
    return NextResponse.json({ url: await saveUpload(file) }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Upload failed.' }, { status: 400 });
  }
}
