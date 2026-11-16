import { NextResponse } from 'next/server';
import { getStalls, getMenuItems } from '@/lib/mysql-repository';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stallId = searchParams.get('stallId') || undefined;
  
  try {
    const [stalls, items] = await Promise.all([getStalls(), getMenuItems(stallId)]);
    return NextResponse.json({ stalls, items });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Unable to load menu.' },
      { status: 500 }
    );
  }
}
