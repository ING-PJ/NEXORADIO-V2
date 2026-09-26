import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await fetch('http://127.0.0.1:8000/status', { cache: 'no-store' });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({
      status: 'offline',
      isBroadcasting: false,
      listenersCount: 1248,
      port: 8000,
      upstreamIcecast: false,
    });
  }
}
