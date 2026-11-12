import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stallId = searchParams.get('stallId') || undefined;
  
  const stalls = db.getStalls();
  const items = db.getMenuItems(stallId);

  return NextResponse.json({ stalls, items });
}
