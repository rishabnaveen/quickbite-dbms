import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dishId = searchParams.get('dishId') || undefined;

  const reviews = db.getReviews(dishId);
  return NextResponse.json({ reviews });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { dishId, dishName, userId, userName, rating, reviewTitle, comment, tags, metadata } = body;

    if (!dishId || !userId || !rating || !comment) {
      return NextResponse.json(
        { success: false, message: 'Missing required review fields' },
        { status: 400 }
      );
    }

    const newReview = db.addReview({
      dishId,
      dishName: dishName || 'Dish',
      userId,
      userName: userName || 'Student',
      rating: Number(rating),
      reviewTitle: reviewTitle || 'Quick Review',
      comment,
      tags: tags || ['Tasty'],
      metadata: metadata || { spiceLevel: 'Medium', portionSize: 'Adequate', orderChannel: 'Web' }
    });

    return NextResponse.json({ success: true, review: newReview }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
