import { NextResponse } from 'next/server';
import { mongoReviews } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dishId = searchParams.get('dishId') || undefined;
  const aggregate = searchParams.get('aggregate') === 'true';

  try {
    if (aggregate) {
      const summary = await mongoReviews.aggregate([]);
      return NextResponse.json({ source: 'MongoDB_Aggregation_Pipeline', summary });
    }

    const reviews = await mongoReviews.find(dishId ? { dish_id: dishId } : {});
    return NextResponse.json({
      source: 'MongoDB_Collection',
      reviews: reviews.map(r => ({
        reviewId: r.review_id,
        dishId: r.dish_id,
        dishName: r.dish_name,
        userId: r.user_id,
        userName: r.user_name,
        rating: r.rating,
        reviewTitle: r.review_title,
        comment: r.comment,
        tags: r.tags,
        helpfulVotes: r.helpful_votes,
        metadata: r.metadata,
        createdAt: r.created_at
      }))
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Error fetching reviews from MongoDB' },
      { status: 500 }
    );
  }
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

    const reviewId = `REV-${Date.now().toString().slice(-4)}`;
    const newDoc = {
      review_id: reviewId,
      dish_id: dishId,
      dish_name: dishName || 'Dish',
      user_id: userId,
      user_name: userName || 'Student',
      rating: Number(rating),
      review_title: reviewTitle || 'Quick Review',
      comment,
      tags: tags || ['Fresh', 'PES-Campus'],
      helpful_votes: 0,
      metadata: metadata || { spice_level: 'Medium' as const, portion_size: 'Generous' as const, order_channel: 'Web' as const },
      created_at: new Date().toISOString()
    };

    const res = await mongoReviews.insertOne(newDoc);

    return NextResponse.json(
      { success: true, source: 'MongoDB', insertedId: res.insertedId, review: newDoc },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
