import { NextResponse } from "next/server";
import { initDb } from "@/lib/db";

// GET /api/init-db
// Initialize database tables if needed
export async function GET() {
  try {
    console.log("Initializing database...");
    const result = await initDb();
    console.log("Database initialization result:", result);
    
    return NextResponse.json({
      ...result,
      timestamp: new Date().toISOString(),
      message: "Database initialization " + (result.success ? "succeeded" : "failed"),
    });
  } catch (error) {
    console.error("Failed to initialize database:", error);
    return NextResponse.json(
      { 
        error: "Failed to initialize database", 
        details: String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
