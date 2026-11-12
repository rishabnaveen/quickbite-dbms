import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id;
    const body = await request.json();
    const { status, actingRole, actingStallId } = body;

    if (!status || !actingRole) {
      return NextResponse.json(
        { success: false, message: 'Missing parameters: status and actingRole are required.' },
        { status: 400 }
      );
    }

    const result = db.updateOrderStatus(orderId, status, actingRole, actingStallId);

    if (!result.success) {
      return NextResponse.json(result, { status: 403 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
