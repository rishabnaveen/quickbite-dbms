import { NextResponse } from 'next/server';
import { getUsers } from '@/lib/mysql-repository';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rawUsers = await getUsers();
    const users = rawUsers.map(u => ({
      userId: u.userId,
      name: `${u.firstName} ${u.lastName}`,
      email: u.email,
      role: u.role,
      walletBalance: u.walletBalance,
      stallId: u.stallId
    }));
    return NextResponse.json({ users });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
