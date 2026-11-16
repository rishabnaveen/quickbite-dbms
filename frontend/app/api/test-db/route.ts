import { NextResponse } from "next/server";
import pool from "@/lib/mysql";

export async function GET() {
  try {
    const [rows] = await pool.query(
      "SELECT COUNT(*) AS totalOrders FROM ORDER_TABLE"
    );

    return NextResponse.json({
      success: true,
      message: "MySQL connected successfully!",
      data: rows,
    });
  } catch (error) {
    console.error("MySQL connection error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "MySQL connection failed",
      },
      { status: 500 }
    );
  }
}