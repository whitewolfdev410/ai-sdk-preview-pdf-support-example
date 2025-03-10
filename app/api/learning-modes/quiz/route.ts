import { NextResponse } from "next/server";
import { getUserProgress, saveUserProgress, getStudySet } from "@/lib/db";
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { nanoid } from "nanoid";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const studySetId = url.searchParams.get("studySetId");

  if (!studySetId) {
    return NextResponse.json(
      { error: "Study set ID is required" },
      { status: 400 }
    );
  }

  try {
    const progress = await getUserProgress(studySetId, "quiz");
    return NextResponse.json(progress || {
      studySetId,
      mode: "quiz",
      updatedAt: Date.now(),
      itemsStudied: 0,
      correctAnswers: 0,
      incorrectAnswers: 0,
      completedSessions: 0,
    });
  } catch (error) {
    console.error("Failed to get progress:", error);
    return NextResponse.json(
      { error: "Failed to fetch progress" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    if (body.action === "generateQuiz") {
      return await generateQuiz(body.studySetId);
    } else if (body.action === "saveProgress") {
      return await updateProgress(body);
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error in quiz route:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}

async function generateQuiz(studySetId: string) {
  try {
    // Fetch the study set
    const studySet = await getStudySet(studySetId);
    
    if (!studySet) {
      return NextResponse.json(
        { error: "Study set not found" },
        { status: 404 }
      );
    }
    
    // Create quiz questions from the study set items
    const quizQuestions = await Promise.all(
      studySet.items.slice(0, 8).map(async (item) => {
        // If the item already has options and a correct answer, use those
        if (item.options && item.options.length === 4 && item.correctAnswer) {
          return {
            id: nanoid(),
            question: item.term,
            options: item.options,
            answer: item.correctAnswer,
          };
        }
        
        // Otherwise, generate options using AI
        try {
          const result = await generateObject({
            model: google("gemini-1.5-flash-latest"),
            schema: {
              type: "object",
              properties: {
                options: {
                  type: "array",
                  items: { type: "string" },
                  minItems: 3,
                  maxItems: 3,
                  description: "Three incorrect but plausible options for a multiple choice question",
                },
              },
              required: ["options"],
            },
            prompt: `
              I'm creating a multiple-choice quiz question based on this term and definition:
              Term: "${item.term}"
              Definition: "${item.definition}"
              
              Please generate THREE incorrect but plausible options that would work well as distractors.
              The options should be roughly the same length as the correct answer and in a similar style.
              Don't include the correct answer in your response.
            `,
          });
          
          // Shuffle all options including the correct answer
          const allOptions = [item.definition, ...result.object.options];
          const shuffledOptions = [...allOptions].sort(() => Math.random() - 0.5);
          
          // Find index of correct answer in the shuffled array
          const correctIndex = shuffledOptions.findIndex(opt => opt === item.definition);
          const answerLabels = ["A", "B", "C", "D"];
          
          return {
            id: nanoid(),
            question: item.term,
            options: shuffledOptions,
            answer: answerLabels[correctIndex],
          };
        } catch (error) {
          console.error("Error generating options:", error);
          // Fallback to simple options if AI generation fails
          return {
            id: nanoid(),
            question: item.term,
            options: [
              item.definition,
              "Incorrect option 1",
              "Incorrect option 2", 
              "Incorrect option 3"
            ],
            answer: "A",
          };
        }
      })
    );
    
    return NextResponse.json(quizQuestions);
  } catch (error) {
    console.error("Failed to generate quiz:", error);
    return NextResponse.json(
      { error: "Failed to generate quiz" },
      { status: 500 }
    );
  }
}

async function updateProgress(data: any) {
  try {
    const { studySetId, mode, itemsStudied, completedSessions, correctAnswers, incorrectAnswers } = data;

    if (!studySetId || !mode) {
      return NextResponse.json(
        { error: "Study set ID and mode are required" },
        { status: 400 }
      );
    }

    const progress = await saveUserProgress({
      studySetId,
      mode,
      itemsStudied,
      completedSessions,
      correctAnswers,
      incorrectAnswers,
    });

    return NextResponse.json(progress);
  } catch (error) {
    console.error("Failed to save progress:", error);
    return NextResponse.json(
      { error: "Failed to save progress" },
      { status: 500 }
    );
  }
}
