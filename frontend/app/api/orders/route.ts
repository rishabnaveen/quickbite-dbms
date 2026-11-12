import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('studentId') || undefined;
  const stallId = searchParams.get('stallId') || undefined;

  const orders = db.getOrders(studentId, stallId);
  return NextResponse.json({ orders });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { studentId, stallId, items, instructions } = body;

    if (!studentId || !stallId || !items || !Array.isArray(items)) {
      return NextResponse.json(
        { success: false, message: 'Invalid request body. Required fields: studentId, stallId, items[]' },
        { status: 400 }
      );
    }

    const result = db.placeOrder({
      studentId,
      stallId,
      items,
      instructions
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
