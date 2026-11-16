/**
 * QuickBite NoSQL (MongoDB) Document Store Engine
 * Implements MongoDB JSON Schema Validation, Compound Indexes,
 * Aggregation Pipelines, and Full CRUD Operations.
 */

export interface MongoFoodReview {
  _id?: string;
  review_id: string;
  dish_id: string;
  dish_name: string;
  user_id: string;
  user_name: string;
  rating: number; // 1 to 5
  review_title: string;
  comment: string;
  tags: string[];
  helpful_votes: number;
  metadata: {
    spice_level: 'Mild' | 'Medium' | 'Spicy' | 'Extra Spicy';
    portion_size: 'Small' | 'Adequate' | 'Generous';
    order_channel: 'Web' | 'Mobile' | 'Kiosk';
  };
  created_at: string;
}

class MongoReviewCollection {
  private collectionName = 'food_reviews';
  private documents: MongoFoodReview[] = [
    {
      _id: '6731001a1b2c3d4e5f6a7b8c',
      review_id: 'REV-1001',
      dish_id: 'IT01',
      dish_name: 'Paneer Tikka Roll',
      user_id: 'U101',
      user_name: 'Navaneeth Tanuboddi',
      rating: 5,
      review_title: 'Best wrap on campus!',
      comment: 'The paneer cubes were succulent, freshly grilled, and the mint chutney had the perfect tang. Excellent value.',
      tags: ['High-Protein', 'Fresh', 'ValueForMoney', 'PES-Favorite'],
      helpful_votes: 15,
      metadata: {
        spice_level: 'Medium',
        portion_size: 'Generous',
        order_channel: 'Web'
      },
      created_at: '2026-11-01T12:30:00Z'
    },
    {
      _id: '6731002a1b2c3d4e5f6a7b8d',
      review_id: 'REV-1002',
      dish_id: 'IT03',
      dish_name: 'Ghee Podi Masala Dosa',
      user_id: 'U102',
      user_name: 'Rishab Naveen',
      rating: 5,
      review_title: 'Authentic Bangalore style podi dosa',
      comment: 'Crispy on the outside with generous pure ghee dripping. The potato masala stuffing was flavorful and not too oily.',
      tags: ['Crispy', 'PureGhee', 'BreakfastFavorite', 'PES-Favorite'],
      helpful_votes: 22,
      metadata: {
        spice_level: 'Spicy',
        portion_size: 'Generous',
        order_channel: 'Web'
      },
      created_at: '2026-11-02T09:15:00Z'
    },
    {
      _id: '6731003a1b2c3d4e5f6a7b8e',
      review_id: 'REV-1003',
      dish_id: 'IT02',
      dish_name: 'Chicken Kathi Roll',
      user_id: 'U103',
      user_name: 'Sneha Rao',
      rating: 4,
      review_title: 'Great flavor, slightly spicy',
      comment: 'Tender chicken chunks marinated well in tandoori spices. A bit spicier than expected, order with extra curd chutney.',
      tags: ['Non-Veg', 'Juicy', 'QuickBite'],
      helpful_votes: 8,
      metadata: {
        spice_level: 'Extra Spicy',
        portion_size: 'Adequate',
        order_channel: 'Mobile'
      },
      created_at: '2026-11-03T13:45:00Z'
    },
    {
      _id: '6731004a1b2c3d4e5f6a7b8f',
      review_id: 'REV-1004',
      dish_id: 'IT05',
      dish_name: 'Cold Coffee w/ Ice Cream',
      user_id: 'U101',
      user_name: 'Navaneeth Tanuboddi',
      rating: 5,
      review_title: 'Refreshing post-class cooler',
      comment: 'Thick espresso blend topped with rich vanilla scoop. Perfect savior during afternoon heat between lectures.',
      tags: ['Chilled', 'SweetTooth', 'AfternoonPickMeUp', 'PES-Favorite'],
      helpful_votes: 19,
      metadata: {
        spice_level: 'Mild',
        portion_size: 'Generous',
        order_channel: 'Kiosk'
      },
      created_at: '2026-11-04T15:20:00Z'
    }
  ];

  /** Schema Validator enforcing required attributes and rating bounds */
  validateDocument(doc: Partial<MongoFoodReview>): boolean {
    if (!doc.dish_id || !doc.user_id || typeof doc.rating !== 'number') return false;
    if (doc.rating < 1 || doc.rating > 5) return false;
    return true;
  }

  /** Find query supporting dish_id filtering and compound index { dish_id: 1, rating: -1 } */
  async find(query: { dish_id?: string; rating?: { $gte?: number } } = {}): Promise<MongoFoodReview[]> {
    let result = [...this.documents];
    if (query.dish_id) {
      result = result.filter(r => r.dish_id === query.dish_id);
    }
    if (query.rating?.$gte) {
      result = result.filter(r => r.rating >= query.rating!.$gte!);
    }
    // Emulate compound index sort { dish_id: 1, rating: -1 }
    return result.sort((a, b) => b.rating - a.rating);
  }

  /** MongoDB Aggregation Pipeline emulation: $group by dish_id and compute average rating */
  async aggregate(pipeline: any[]): Promise<any[]> {
    const summary: Record<string, { dish_id: string; dish_name: string; total_reviews: number; sum_rating: number; helpful_votes: number }> = {};

    for (const doc of this.documents) {
      if (!summary[doc.dish_id]) {
        summary[doc.dish_id] = {
          dish_id: doc.dish_id,
          dish_name: doc.dish_name,
          total_reviews: 0,
          sum_rating: 0,
          helpful_votes: 0,
        };
      }
      summary[doc.dish_id].total_reviews++;
      summary[doc.dish_id].sum_rating += doc.rating;
      summary[doc.dish_id].helpful_votes += doc.helpful_votes;
    }

    return Object.values(summary).map(s => ({
      dish_id: s.dish_id,
      dish_name: s.dish_name,
      total_reviews: s.total_reviews,
      average_rating: Number((s.sum_rating / s.total_reviews).toFixed(2)),
      cumulative_helpful_votes: s.helpful_votes
    })).sort((a, b) => b.average_rating - a.average_rating);
  }

  /** insertOne operation */
  async insertOne(doc: Omit<MongoFoodReview, '_id'>): Promise<{ acknowledged: boolean; insertedId: string }> {
    if (!this.validateDocument(doc)) {
      throw new Error('Document failed MongoDB $jsonSchema validation: rating must be between 1 and 5.');
    }
    const fakeObjectId = Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const fullDoc: MongoFoodReview = {
      ...doc,
      _id: fakeObjectId,
      created_at: doc.created_at || new Date().toISOString()
    };
    this.documents.push(fullDoc);
    return { acknowledged: true, insertedId: fakeObjectId };
  }

  /** updateOne with atomic $inc */
  async updateOne(filter: { review_id: string }, update: { $inc?: { helpful_votes?: number }; $addToSet?: { tags?: string } }): Promise<boolean> {
    const doc = this.documents.find(r => r.review_id === filter.review_id);
    if (!doc) return false;
    if (update.$inc?.helpful_votes) {
      doc.helpful_votes += update.$inc.helpful_votes;
    }
    if (update.$addToSet?.tags && !doc.tags.includes(update.$addToSet.tags)) {
      doc.tags.push(update.$addToSet.tags);
    }
    return true;
  }

  /** deleteOne */
  async deleteOne(filter: { review_id: string }): Promise<boolean> {
    const idx = this.documents.findIndex(r => r.review_id === filter.review_id);
    if (idx >= 0) {
      this.documents.splice(idx, 1);
      return true;
    }
    return false;
  }
}

// Global Singleton Instance
const globalForMongo = global as unknown as { mongoReviewCollection?: MongoReviewCollection };
export const mongoReviews = globalForMongo.mongoReviewCollection || new MongoReviewCollection();
if (process.env.NODE_ENV !== 'production') globalForMongo.mongoReviewCollection = mongoReviews;
