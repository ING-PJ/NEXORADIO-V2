import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const streamUrl = process.env.NEXT_PUBLIC_STREAM_URL;

  // If NEXT_PUBLIC_STREAM_URL points to an external icecast or http url, redirect or proxy
  if (streamUrl && streamUrl.startsWith('http')) {
    try {
      const response = await fetch(streamUrl);
      return new Response(response.body, {
        headers: {
          'Content-Type': response.headers.get('content-type') || 'audio/webm; codecs=opus',
          'Cache-Control': 'no-cache, no-store',
          'Connection': 'keep-alive',
        },
      });
    } catch {
      // Fallback below
    }
  }

  // Otherwise proxy from the local bridge server at port 8000
  try {
    const bridgeUrl = `http://127.0.0.1:8000/live`;
    const response = await fetch(bridgeUrl);
    return new Response(response.body, {
      headers: {
        'Content-Type': response.headers.get('content-type') || 'audio/webm; codecs=opus',
        'Cache-Control': 'no-cache, no-store',
        'Connection': 'keep-alive',
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'El servidor de streaming bridge no se encuentra activo aún en el puerto 8000.' },
      { status: 503 }
    );
  }
}
