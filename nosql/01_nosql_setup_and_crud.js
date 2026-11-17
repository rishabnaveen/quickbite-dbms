// =============================================================================
// QuickBite DBMS Mini Project - NoSQL (MongoDB) Database Implementation
// Curriculum: PES University CSE DBMS (Prof. Vinay Joshi)
// Team Members: Navaneeth Tanuboddi (PES1UG24CS709) & Rishab Naveen (PES1UG24CS710)
// Target NoSQL Engine: MongoDB 6.0+ / mongosh / Mongoose
// Rubric Coverage:
//   1. NoSQL Database Creation with Schema Validation (4 Marks)
//   2. NoSQL Features & Comprehensive CRUD Operations (7 Marks)
// =============================================================================

// Switch to QuickBite NoSQL Database
use quickbite_nosql;

// -----------------------------------------------------------------------------
// 1. COLLECTION CREATION WITH JSON SCHEMA VALIDATION
// -----------------------------------------------------------------------------
db.food_reviews.drop();

db.createCollection("food_reviews", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["review_id", "dish_id", "dish_name", "user_id", "rating", "comment", "created_at"],
      properties: {
        review_id: {
          bsonType: "string",
          description: "Unique string identifier for the review (e.g., REV-1001)"
        },
        dish_id: {
          bsonType: "string",
          description: "References SQL Item_ID (e.g., IT01)"
        },
        dish_name: {
          bsonType: "string",
          description: "Denormalized dish title for fast sub-millisecond lookups"
        },
        user_id: {
          bsonType: "string",
          description: "References SQL User_ID (e.g., U101)"
        },
        user_name: {
          bsonType: "string",
          description: "Reviewer full name"
        },
        rating: {
          bsonType: "int",
          minimum: 1,
          maximum: 5,
          description: "Rating scalar must be an integer between 1 and 5"
        },
        review_title: {
          bsonType: "string",
          description: "Brief summary heading of the feedback"
        },
        comment: {
          bsonType: "string",
          description: "Detailed feedback regarding taste, portion, spice level"
        },
        tags: {
          bsonType: "array",
          items: { bsonType: "string" },
          description: "Array of unstructured descriptors e.g. ['Crispy', 'ValueForMoney']"
        },
        helpful_votes: {
          bsonType: "int",
          minimum: 0,
          description: "Number of community upvotes"
        },
        metadata: {
          bsonType: "object",
          properties: {
            spice_level: { enum: ["Mild", "Medium", "Spicy", "Extra Spicy"] },
            portion_size: { enum: ["Small", "Adequate", "Generous"] },
            order_channel: { enum: ["Web", "Mobile", "Kiosk"] }
          }
        },
        created_at: {
          bsonType: "date",
          description: "Review submission timestamp"
        }
      }
    }
  }
});

// -----------------------------------------------------------------------------
// 2. INDEX OPTIMIZATIONS
// -----------------------------------------------------------------------------
// Compound index for fast dish filtering ordered by highest rating first
db.food_reviews.createIndex({ dish_id: 1, rating: -1 }, { name: "idx_dish_rating" });

// Text index for full-text search across review comments and titles
db.food_reviews.createIndex({ review_title: "text", comment: "text" }, { name: "idx_text_search" });

// Unique index to prevent duplicate reviews from the same student on the same dish
db.food_reviews.createIndex({ dish_id: 1, user_id: 1 }, { unique: true, name: "idx_unique_user_dish_review" });


// -----------------------------------------------------------------------------
// 3. CRUD OPERATION 1: CREATE (Insert Operations)
// -----------------------------------------------------------------------------
db.food_reviews.insertMany([
  {
    review_id: "REV-1001",
    dish_id: "IT01",
    dish_name: "Paneer Tikka Roll",
    user_id: "U101",
    user_name: "Navaneeth Tanuboddi",
    rating: NumberInt(5),
    review_title: "Best wrap on campus!",
    comment: "The paneer cubes were succulent, freshly grilled, and the mint chutney had the perfect tang. Excellent value.",
    tags: ["High-Protein", "Fresh", "ValueForMoney"],
    helpful_votes: NumberInt(14),
    metadata: {
      spice_level: "Medium",
      portion_size: "Generous",
      order_channel: "Web"
    },
    created_at: new Date("2026-11-01T12:30:00Z")
  },
  {
    review_id: "REV-1002",
    dish_id: "IT03",
    dish_name: "Ghee Podi Masala Dosa",
    user_id: "U102",
    user_name: "Rishab Naveen",
    rating: NumberInt(5),
    review_title: "Authentic Bangalore style podi dosa",
    comment: "Crispy on the outside with generous pure ghee dripping. The potato masala stuffing was flavorful and not too oily.",
    tags: ["Crispy", "PureGhee", "BreakfastFavorite"],
    helpful_votes: NumberInt(22),
    metadata: {
      spice_level: "Spicy",
      portion_size: "Generous",
      order_channel: "Web"
    },
    created_at: new Date("2026-11-02T09:15:00Z")
  },
  {
    review_id: "REV-1003",
    dish_id: "IT02",
    dish_name: "Chicken Kathi Roll",
    user_id: "U103",
    user_name: "Sneha Rao",
    rating: NumberInt(4),
    review_title: "Great flavor, slightly spicy",
    comment: "Tender chicken chunks marinated well in tandoori spices. A bit spicier than expected, order with extra curd chutney.",
    tags: ["Non-Veg", "Juicy", "QuickBite"],
    helpful_votes: NumberInt(8),
    metadata: {
      spice_level: "Extra Spicy",
      portion_size: "Adequate",
      order_channel: "Mobile"
    },
    created_at: new Date("2026-11-03T13:45:00Z")
  },
  {
    review_id: "REV-1004",
    dish_id: "IT05",
    dish_name: "Cold Coffee w/ Ice Cream",
    user_id: "U101",
    user_name: "Navaneeth Tanuboddi",
    rating: NumberInt(5),
    review_title: "Refreshing post-class cooler",
    comment: "Thick espresso blend topped with rich vanilla scoop. Perfect savior during afternoon heat between lectures.",
    tags: ["Chilled", "SweetTooth", "AfternoonPickMeUp"],
    helpful_votes: NumberInt(19),
    metadata: {
      spice_level: "Mild",
      portion_size: "Generous",
      order_channel: "Kiosk"
    },
    created_at: new Date("2026-11-04T15:20:00Z")
  },
  {
    review_id: "REV-1005",
    dish_id: "IT04",
    dish_name: "Steamed Idli Vada Combo",
    user_id: "U102",
    user_name: "Rishab Naveen",
    rating: NumberInt(3),
    review_title: "Idlis were soft, vada could be hotter",
    comment: "Idlis melted in the mouth with aromatic sambar, but the medu vada felt lukewarm. Sambar refill was fast though.",
    tags: ["ComfortFood", "Traditional", "QuickBreakfast"],
    helpful_votes: NumberInt(3),
    metadata: {
      spice_level: "Mild",
      portion_size: "Adequate",
      order_channel: "Web"
    },
    created_at: new Date("2026-11-05T08:50:00Z")
  }
]);


// -----------------------------------------------------------------------------
// 4. CRUD OPERATION 2: READ (Queries & Advanced Aggregation Pipelines)
// -----------------------------------------------------------------------------

// Read Query 2.1: Simple Filter Query
// Finds all high-rated reviews (rating >= 4) with generous portion size
print("--- 2.1: High Rated Generous Portion Reviews ---");
db.food_reviews.find(
  { rating: { $gte: 4 }, "metadata.portion_size": "Generous" },
  { review_id: 1, dish_name: 1, rating: 1, review_title: 1, helpful_votes: 1, _id: 0 }
).pretty();

// Read Query 2.2: Full-Text Search
// Searches for keywords like 'crispy' or 'spicy'
print("--- 2.2: Full-Text Search for 'crispy' ---");
db.food_reviews.find(
  { $text: { $search: "crispy" } },
  { score: { $meta: "textScore" }, dish_name: 1, comment: 1, _id: 0 }
).sort({ score: { $meta: "textScore" } }).pretty();

// Read Query 2.3: Advanced Aggregation Pipeline (Analytics)
// Calculates Average Rating, Total Review Volume, and Unique Tags per dish
print("--- 2.3: Dish Rating Summary & Tag Aggregation Pipeline ---");
db.food_reviews.aggregate([
  {
    $group: {
      _id: "$dish_id",
      dish_name: { $first: "$dish_name" },
      total_reviews: { $sum: 1 },
      average_rating: { $avg: "$rating" },
      cumulative_helpful_votes: { $sum: "$helpful_votes" },
      all_tags: { $addToSet: "$tags" }
    }
  },
  {
    $project: {
      _id: 0,
      dish_id: "$_id",
      dish_name: 1,
      total_reviews: 1,
      average_rating: { $round: ["$average_rating", 2] },
      cumulative_helpful_votes: 1
    }
  },
  {
    $sort: { average_rating: -1, total_reviews: -1 }
  }
]).pretty();


// -----------------------------------------------------------------------------
// 5. CRUD OPERATION 3: UPDATE
// -----------------------------------------------------------------------------

// Update 3.1: Atomic Increment ($inc)
// A student clicked 'Helpful' on review REV-1001
print("--- 3.1: Increment Helpful Votes on REV-1001 ---");
db.food_reviews.updateOne(
  { review_id: "REV-1001" },
  { 
    $inc: { helpful_votes: 1 },
    $set: { last_voted_at: new Date() }
  }
);

// Update 3.2: Array Modification ($addToSet)
// Add badge tag 'PES-Favorite' to all dishes with rating 5
print("--- 3.2: Add Tag 'PES-Favorite' to 5-Star Reviews ---");
db.food_reviews.updateMany(
  { rating: 5 },
  { $addToSet: { tags: "PES-Favorite" } }
);


// -----------------------------------------------------------------------------
// 6. CRUD OPERATION 4: DELETE
// -----------------------------------------------------------------------------

// Delete 4.1: Delete single flagged or obsolete review
print("--- 4.1: Delete Review by ID ---");
db.food_reviews.deleteOne({ review_id: "REV-1005" });

// Output count remaining
print("Remaining reviews count: " + db.food_reviews.countDocuments());
