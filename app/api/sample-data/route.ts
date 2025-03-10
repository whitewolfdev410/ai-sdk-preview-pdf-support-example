import { NextResponse } from "next/server";
import { createStudySet, initDb } from "@/lib/db";
import { nanoid } from "nanoid";

// Helper function to initialize database if needed
async function ensureDbInitialized() {
  try {
    await initDb();
  } catch (error) {
    console.error("Failed to initialize database:", error);
  }
}

// Sample data to populate the app with examples
const sampleStudySets = [
  {
    title: "Basic Spanish Vocabulary",
    description: "Essential Spanish words for beginners",
    sourceType: "manual" as const,
    items: [
      { id: nanoid(), term: "Hola", definition: "Hello" },
      { id: nanoid(), term: "Gracias", definition: "Thank you" },
      { id: nanoid(), term: "Buenos días", definition: "Good morning" },
      { id: nanoid(), term: "Buenas noches", definition: "Good night" },
      { id: nanoid(), term: "Por favor", definition: "Please" },
      { id: nanoid(), term: "Adiós", definition: "Goodbye" },
      { id: nanoid(), term: "Sí", definition: "Yes" },
      { id: nanoid(), term: "No", definition: "No" },
    ],
  },
  {
    title: "Biology Terms",
    description: "Common biology terminology",
    sourceType: "manual" as const,
    items: [
      { id: nanoid(), term: "Mitochondria", definition: "The powerhouse of the cell, responsible for producing energy" },
      { id: nanoid(), term: "DNA", definition: "Deoxyribonucleic acid, the genetic material in humans and almost all other organisms" },
      { id: nanoid(), term: "Photosynthesis", definition: "The process by which plants use sunlight to synthesize foods from carbon dioxide and water" },
      { id: nanoid(), term: "Cell", definition: "The basic structural and functional unit of all organisms" },
      { id: nanoid(), term: "Ecosystem", definition: "A biological community of interacting organisms and their physical environment" },
    ],
  },
];

// POST /api/sample-data
// Create sample study sets for demonstration
export async function POST() {
  try {
    // Ensure database is initialized
    await ensureDbInitialized();
    
    const createdSets = [];
    
    for (const setData of sampleStudySets) {
      const studySet = await createStudySet(setData);
      createdSets.push(studySet);
    }
    
    return NextResponse.json({
      message: "Sample data created successfully",
      studySets: createdSets,
    });
  } catch (error) {
    console.error("Failed to create sample data:", error);
    return NextResponse.json(
      { error: "Failed to create sample data", details: String(error) },
      { status: 500 }
    );
  }
}
