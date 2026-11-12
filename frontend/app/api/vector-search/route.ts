import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query, topK } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { success: false, message: 'A valid text query string is required' },
        { status: 400 }
      );
    }

    const matches = db.semanticSearch(query, topK || 3);

    return NextResponse.json({
      success: true,
      query,
      results: matches.map(({ item, similarity }) => ({
        itemId: item.itemId,
        name: item.name,
        price: item.price,
        stallId: item.stallId,
        description: item.description,
        dietaryTags: item.dietaryTags,
        similarityScore: similarity,
        matchPercentage: Math.round(similarity * 100)
      }))
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
