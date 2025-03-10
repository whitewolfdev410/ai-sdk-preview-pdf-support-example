import { NextResponse } from "next/server";
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { flashcardsFromPDFSchema } from "@/lib/schemas";
import { nanoid } from "nanoid";
import { initDb } from "@/lib/db";

// Helper function to initialize database if needed
async function ensureDbInitialized() {
  try {
    await initDb();
  } catch (error) {
    console.error("Failed to initialize database:", error);
  }
}

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    // Ensure database is initialized
    await ensureDbInitialized();
    
    // Get the file data from the request
    const body = await req.json();
    const { file } = body;
    
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    console.log("Received file for content generation");

    // Generate flashcards from PDF
    try {
      const result = await generateObject({
        model: google("gemini-1.5-pro-latest"),
        schema: flashcardsFromPDFSchema,
        messages: [
          {
            role: "system",
            content: `You are a helpful assistant that creates study materials from documents. 
            Extract important concepts, terms, and information from the document to create flashcards. 
            Each flashcard should have a term/question and a definition/answer. 
            Generate between 5-15 flashcards depending on the document length and complexity.
            Make sure to cover the most important information in the document.
            The term should be concise, and the definition should be comprehensive but clear.`
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Create flashcards from this document." },
              { type: "file", data: file, mimeType: "application/pdf" },
            ],
          },
        ],
      });

      console.log("Successfully generated content, adding IDs to items");

      // Add IDs to items
      const flashcards = result.object.map((item: any) => ({
        ...item,
        id: nanoid(),
      }));
      
      return NextResponse.json(flashcards);
    } catch (aiError) {
      console.error("AI content generation error:", aiError);
      return NextResponse.json(
        { error: "AI failed to generate content from PDF", details: String(aiError) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Failed to generate content:", error);
    return NextResponse.json(
      { error: "Failed to generate content from PDF", details: String(error) },
      { status: 500 }
    );
  }
}
