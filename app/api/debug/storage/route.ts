import { NextResponse } from "next/server";
import { createStudySet, getAllStudySets } from "@/lib/db";
import { nanoid } from "nanoid";

// GET /api/debug/storage
// Get diagnostics about storage
export async function GET() {
  try {
    // Get all study sets from the database
    const studySets = await getAllStudySets();
    
    return NextResponse.json({
      studySets,
      studySetCount: studySets.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to get storage diagnostics:", error);
    return NextResponse.json(
      { error: "Failed to get storage diagnostics", details: String(error) },
      { status: 500 }
    );
  }
}

// POST /api/debug/storage
// Create a test study set
export async function POST() {
  try {
    const testStudySet = {
      title: `Test Study Set ${Date.now()}`,
      description: "This is a test study set created for debugging",
      sourceType: "manual" as const,
      items: [
        { id: nanoid(), term: "Test Term 1", definition: "Test Definition 1" },
        { id: nanoid(), term: "Test Term 2", definition: "Test Definition 2" },
        { id: nanoid(), term: "Test Term 3", definition: "Test Definition 3" },
      ],
    };
    
    const studySet = await createStudySet(testStudySet);
    console.log("Created test study set:", studySet.id);
    
    // Check if it was successfully created
    const allSets = await getAllStudySets();
    console.log("All study sets count:", allSets.length);
    
    return NextResponse.json({
      success: true,
      message: "Test study set created successfully",
      studySet,
      allSetsCount: allSets.length,
    });
  } catch (error) {
    console.error("Failed to create test study set:", error);
    return NextResponse.json(
      { error: "Failed to create test study set", details: String(error) },
      { status: 500 }
    );
  }
}
