import { NextResponse } from "next/server";
import { getStudySet, updateStudySet, deleteStudySet, initDb } from "@/lib/db";

// Helper function to initialize database if needed
async function ensureDbInitialized() {
  try {
    await initDb();
  } catch (error) {
    console.error("Failed to initialize database:", error);
  }
}

// GET /api/study-sets/[id]
// Get a specific study set
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Ensure database is initialized
    await ensureDbInitialized();
    
    // In Next.js 15, params is a Promise so we need to await it
    const unwrappedParams = await Promise.resolve(params);
    const id = unwrappedParams.id;
    
    // Debug the request and params
    console.log("GET study set with ID:", id);
    
    const studySet = await getStudySet(id);
    
    if (!studySet) {
      console.log("Study set not found for ID:", id);
      return NextResponse.json(
        { error: "Study set not found" },
        { status: 404 }
      );
    }
    
    console.log("Returning study set with title:", studySet.title);
    return NextResponse.json(studySet);
  } catch (error) {
    console.error("Failed to get study set:", error);
    return NextResponse.json(
      { error: "Failed to fetch study set", details: String(error) },
      { status: 500 }
    );
  }
}

// PUT /api/study-sets/[id]
// Update a study set
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Ensure database is initialized
    await ensureDbInitialized();
    
    // Await params before accessing its properties
    const unwrappedParams = await Promise.resolve(params);
    const id = unwrappedParams.id;
    
    const data = await req.json();
    const updatedStudySet = await updateStudySet(id, data);
    
    if (!updatedStudySet) {
      return NextResponse.json(
        { error: "Study set not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(updatedStudySet);
  } catch (error) {
    console.error("Failed to update study set:", error);
    return NextResponse.json(
      { error: "Failed to update study set" },
      { status: 500 }
    );
  }
}

// DELETE /api/study-sets/[id]
// Delete a study set
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Ensure database is initialized
    await ensureDbInitialized();
    
    // Await params before accessing its properties
    const unwrappedParams = await Promise.resolve(params);
    const id = unwrappedParams.id;
    
    const success = await deleteStudySet(id);
    
    if (!success) {
      return NextResponse.json(
        { error: "Study set not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete study set:", error);
    return NextResponse.json(
      { error: "Failed to delete study set" },
      { status: 500 }
    );
  }
}
