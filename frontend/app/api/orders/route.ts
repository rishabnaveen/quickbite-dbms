import { NextResponse } from 'next/server';
import { getOrders, placeOrder } from '@/lib/mysql-repository';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('studentId') || undefined;
  const stallId = searchParams.get('stallId') || undefined;

  try {
    const orders = await getOrders(studentId, stallId);
    return NextResponse.json({ orders });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Unable to load orders' },
      { status: 500 }
    );
  }
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

    const result = await placeOrder({
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
