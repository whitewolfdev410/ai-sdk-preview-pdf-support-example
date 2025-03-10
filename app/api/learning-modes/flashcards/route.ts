import { NextResponse } from "next/server";
import { getUserProgress, saveUserProgress } from "@/lib/db";

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
    const progress = await getUserProgress(studySetId, "flashcards");
    return NextResponse.json(progress || {
      studySetId,
      mode: "flashcards",
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
    const data = await req.json();
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
