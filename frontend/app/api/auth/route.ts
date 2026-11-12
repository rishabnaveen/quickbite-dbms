import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const users = db.getAllUsers().map(u => ({
    userId: u.userId,
    name: `${u.firstName} ${u.lastName}`,
    email: u.email,
    role: u.role,
    walletBalance: u.walletBalance,
    stallId: u.stallId
  }));
  return NextResponse.json({ users });
}
