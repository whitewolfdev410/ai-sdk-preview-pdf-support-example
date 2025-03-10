import { NextResponse } from "next/server";
import { createStudySet, getAllStudySets, initDb } from "@/lib/db";
import { studySetSchema } from "@/lib/schemas";
import { nanoid } from "nanoid";

// Helper function to initialize database if needed
async function ensureDbInitialized() {
  try {
    await initDb();
  } catch (error) {
    console.error("Failed to initialize database:", error);
  }
}

// GET /api/study-sets
// List all study sets
export async function GET() {
  try {
    // Ensure database is initialized
    await ensureDbInitialized();
    
    const studySets = await getAllStudySets();
    return NextResponse.json(studySets);
  } catch (error) {
    console.error("Failed to get study sets:", error);
    return NextResponse.json(
      { error: "Failed to fetch study sets", details: String(error) },
      { status: 500 }
    );
  }
}

// POST /api/study-sets
// Create a new study set
export async function POST(req: Request) {
  try {
    // Ensure database is initialized
    await ensureDbInitialized();
    
    const data = await req.json();
    
    // Add IDs to items if they don't have them
    if (data.items) {
      data.items = data.items.map((item: any) => ({
        ...item,
        id: item.id || nanoid(),
      }));
    }
    
    // Validate data
    const validatedData = studySetSchema.parse(data);
    
    // Create study set
    const studySet = await createStudySet(validatedData);
    
    return NextResponse.json(studySet);
  } catch (error) {
    console.error("Failed to create study set:", error);
    return NextResponse.json(
      { error: "Failed to create study set", details: String(error) },
      { status: 500 }
    );
  }
}
