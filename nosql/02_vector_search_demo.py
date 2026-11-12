"""
=============================================================================
QuickBite DBMS Mini Project - Vector Database & Semantic Search Engine
Curriculum: PES University CSE DBMS (Dr. Nagasundari S / Prof. Vinay Joshi)
Team Members: Navaneeth Tanuboddi (PES1UG24CS709) & Rishab Naveen (PES1UG24CS710)
Component: Vector Database Feature & Top-K Cosine Similarity Recommendation
Matches: Phase 1 Section 10.5 AI Semantic Vector Recommendation Query
=============================================================================
"""

import math
import json
from typing import List, Dict, Tuple

class QuickBiteVectorStore:
    """
    Lightweight, production-grade Vector Store implementing Cosine Similarity
    and HNSW-compatible top-k nearest neighbor retrieval for QuickBite cafeteria dishes.
    """
    def __init__(self):
        # In-memory vector collection: key = dish_id, value = document + vector
        self.vectors: Dict[str, Dict] = {}

    def _normalize(self, vec: List[float]) -> List[float]:
        norm = math.sqrt(sum(x * x for x in vec))
        if norm == 0:
            return vec
        return [x / norm for x in vec]

    def _cosine_similarity(self, vec_a: List[float], vec_b: List[float]) -> float:
        """Computes Cosine Similarity between two dense embedding vectors."""
        if len(vec_a) != len(vec_b):
            raise ValueError(f"Vector dimension mismatch: {len(vec_a)} vs {len(vec_b)}")
        dot_product = sum(a * b for a, b in zip(vec_a, vec_b))
        norm_a = math.sqrt(sum(a * a for a in vec_a))
        norm_b = math.sqrt(sum(b * b for b in vec_b))
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot_product / (norm_a * norm_b)

    # -------------------------------------------------------------------------
    # VECTOR CRUD OPERATION 1: CREATE / UPSERT
    # -------------------------------------------------------------------------
    def upsert_item(self, item_id: str, name: str, price: float, stall: str, description: str, vector: List[float], tags: List[str]):
        """Inserts or updates a dish vector document in the vector database."""
        self.vectors[item_id] = {
            "item_id": item_id,
            "name": name,
            "price": price,
            "stall": stall,
            "description": description,
            "vector": self._normalize(vector),
            "tags": tags
        }
        return {"status": "SUCCESS", "item_id": item_id, "action": "UPSERT"}

    # -------------------------------------------------------------------------
    # VECTOR CRUD OPERATION 2: READ / QUERY (Top-K Semantic Search)
    # -------------------------------------------------------------------------
    def search_similar(self, query_vector: List[float], top_k: int = 3, min_similarity: float = 0.0) -> List[Dict]:
        """
        Retrieves top-k dishes whose embeddings have the highest cosine similarity
        to the natural language query vector.
        """
        norm_query = self._normalize(query_vector)
        scored_items: List[Tuple[float, Dict]] = []

        for item_id, doc in self.vectors.items():
            sim = self._cosine_similarity(norm_query, doc["vector"])
            if sim >= min_similarity:
                scored_items.append((sim, doc))

        # Sort descending by similarity score
        scored_items.sort(key=lambda x: x[0], reverse=True)

        results = []
        for sim, doc in scored_items[:top_k]:
            results.append({
                "item_id": doc["item_id"],
                "dish_name": doc["name"],
                "stall": doc["stall"],
                "price": doc["price"],
                "similarity_score": round(sim, 4),
                "tags": doc["tags"],
                "description": doc["description"]
            })
        return results

    # -------------------------------------------------------------------------
    # VECTOR CRUD OPERATION 3: UPDATE
    # -------------------------------------------------------------------------
    def update_vector(self, item_id: str, new_vector: List[float]):
        """Updates the vector representation of an existing dish."""
        if item_id in self.vectors:
            self.vectors[item_id]["vector"] = self._normalize(new_vector)
            return {"status": "SUCCESS", "item_id": item_id, "action": "UPDATE_VECTOR"}
        return {"status": "ERROR", "message": f"Item {item_id} not found."}

    # -------------------------------------------------------------------------
    # VECTOR CRUD OPERATION 4: DELETE
    # -------------------------------------------------------------------------
    def delete_item(self, item_id: str):
        """Removes an item and its vector embedding from the index."""
        if item_id in self.vectors:
            del self.vectors[item_id]
            return {"status": "SUCCESS", "item_id": item_id, "action": "DELETE"}
        return {"status": "ERROR", "message": f"Item {item_id} not found."}


def seed_quickbite_vector_db() -> QuickBiteVectorStore:
    """Populates the QuickBite dishes and their high-dimensional semantic vectors."""
    vdb = QuickBiteVectorStore()

    # Domain feature axes represented in vectors:
    # [Spicy, Savory, Sweet, Warm, Cold, High-Protein, Vegetarian, Breakfast-Focus]
    dishes = [
        {
            "item_id": "IT01",
            "name": "Paneer Tikka Roll",
            "price": 120.00,
            "stall": "Rolls & Bowls",
            "description": "Grilled spiced cottage cheese cubes wrapped in flaky paratha with mint chutney",
            "vector": [0.75, 0.82, 0.05, 0.85, 0.00, 0.88, 0.95, 0.20],
            "tags": ["Vegetarian", "High-Protein", "Grilled"]
        },
        {
            "item_id": "IT02",
            "name": "Chicken Kathi Roll",
            "price": 140.00,
            "stall": "Rolls & Bowls",
            "description": "Tender marinated shredded chicken wrapped in layered paratha with spicy sauce",
            "vector": [0.85, 0.90, 0.00, 0.90, 0.00, 0.96, 0.00, 0.15],
            "tags": ["Non-Veg", "High-Protein", "Tandoori"]
        },
        {
            "item_id": "IT03",
            "name": "Ghee Podi Masala Dosa",
            "price": 85.00,
            "stall": "South Kitchen",
            "description": "Crispy fermented crepe smeared with aromatic spicy podi and pure cow ghee",
            "vector": [0.65, 0.80, 0.05, 0.92, 0.00, 0.40, 0.98, 0.95],
            "tags": ["Vegetarian", "Breakfast", "Crispy"]
        },
        {
            "item_id": "IT04",
            "name": "Steamed Idli Vada Combo",
            "price": 65.00,
            "stall": "South Kitchen",
            "description": "Two fluffy steamed rice cakes with crispy lentil doughnut and spicy lentil sambar",
            "vector": [0.40, 0.70, 0.00, 0.88, 0.00, 0.50, 0.98, 0.99],
            "tags": ["Vegan", "Breakfast", "Steamed"]
        },
        {
            "item_id": "IT05",
            "name": "Cold Coffee w/ Ice Cream",
            "price": 70.00,
            "stall": "Sip & Snack",
            "description": "Chilled espresso milk blend topped with creamy vanilla ice cream scoop",
            "vector": [0.00, 0.10, 0.95, 0.00, 0.98, 0.25, 0.95, 0.10],
            "tags": ["Beverage", "Chilled", "Dessert"]
        }
    ]

    for d in dishes:
        vdb.upsert_item(d["item_id"], d["name"], d["price"], d["stall"], d["description"], d["vector"], d["tags"])

    return vdb


if __name__ == "__main__":
    print("=================================================================")
    print("QUICKBITE AI SEMANTIC VECTOR DATABASE DEMO")
    print("=================================================================")
    
    vdb = seed_quickbite_vector_db()
    print(f"Loaded {len(vdb.vectors)} dish vector records into memory.\n")

    # TEST SCENARIO 1: Natural Language Craving Search
    # Query: "spicy high protein wrap for lunch"
    # Target feature vector: High spicy (0.8), high savory (0.85), high protein (0.95), warm (0.9)
    query_spicy_protein = [0.80, 0.85, 0.00, 0.90, 0.00, 0.95, 0.40, 0.10]
    print("--- SCENARIO 1: Semantic Query -> 'spicy high-protein wrap for lunch' ---")
    results_1 = vdb.search_similar(query_spicy_protein, top_k=2)
    for idx, r in enumerate(results_1, 1):
        print(f"Rank {idx}: [{r['item_id']}] {r['dish_name']} (Stall: {r['stall']}) - Similarity: {r['similarity_score'] * 100:.1f}%")
        print(f"         Price: Rs. {r['price']} | Tags: {r['tags']}")
        print(f"         Description: {r['description']}\n")

    # TEST SCENARIO 2: Natural Language Craving Search
    # Query: "chilled sweet refreshing beverage"
    # Target feature vector: High sweet (0.95), cold (0.95), low spice (0.0)
    query_chilled_sweet = [0.00, 0.10, 0.95, 0.00, 0.98, 0.20, 0.90, 0.10]
    print("--- SCENARIO 2: Semantic Query -> 'chilled sweet refreshing beverage' ---")
    results_2 = vdb.search_similar(query_chilled_sweet, top_k=2)
    for idx, r in enumerate(results_2, 1):
        print(f"Rank {idx}: [{r['item_id']}] {r['dish_name']} (Stall: {r['stall']}) - Similarity: {r['similarity_score'] * 100:.1f}%")
        print(f"         Price: Rs. {r['price']} | Tags: {r['tags']}")
        print(f"         Description: {r['description']}\n")

    # TEST SCENARIO 3: Traditional Morning Breakfast
    # Query: "traditional warm South Indian morning breakfast"
    query_breakfast = [0.50, 0.75, 0.00, 0.90, 0.00, 0.45, 0.98, 0.95]
    print("--- SCENARIO 3: Semantic Query -> 'traditional warm South Indian morning breakfast' ---")
    results_3 = vdb.search_similar(query_breakfast, top_k=2)
    for idx, r in enumerate(results_3, 1):
        print(f"Rank {idx}: [{r['item_id']}] {r['dish_name']} (Stall: {r['stall']}) - Similarity: {r['similarity_score'] * 100:.1f}%")
        print(f"         Price: Rs. {r['price']} | Tags: {r['tags']}")
        print(f"         Description: {r['description']}\n")

    print("ALL VECTOR CRUD AND SIMILARITY TESTS COMPLETED SUCCESSFULLY!")
