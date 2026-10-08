/**
 * /api/site/media/[name]
 *
 * GET: an image uploaded in the C-panel. File names are random and never
 * reused, so responses can be cached for a long time.
 */

import { readUpload } from '@/lib/site/media';

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const file = readUpload(name);
  if (!file) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(file.bytes), {
    headers: {
      'Content-Type': file.contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
