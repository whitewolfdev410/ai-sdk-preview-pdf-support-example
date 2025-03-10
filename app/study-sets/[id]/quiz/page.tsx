"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import React from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StudySet } from "@/lib/types";
import { toast } from "sonner";
import QuizView from "@/components/study-modes/quiz/quiz-view";

export default function QuizPage({ params }: { params: { id: string } }) {
  const [studySet, setStudySet] = useState<StudySet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Unwrap params using React.use()
  const unwrappedParams = React.use(params);
  const id = unwrappedParams.id;

  useEffect(() => {
    async function loadStudySet() {
      try {
        const response = await fetch(`/api/study-sets/${id}`);
        if (!response.ok) {
          throw new Error("Failed to load study set");
        }
        const data = await response.json();
        setStudySet(data);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load study set");
      } finally {
        setIsLoading(false);
      }
    }

    loadStudySet();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!studySet) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Study Set Not Found</h1>
          <p className="mb-6 text-muted-foreground">
            The study set you're looking for doesn't exist or has been deleted.
          </p>
          <Button asChild>
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-2">
          <Link href={`/study-sets/${id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Study Set
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">{studySet.title} - Quiz</h1>
      </div>

      <div className="bg-gray-50 dark:bg-zinc-900 rounded-xl p-6 min-h-[70vh] flex flex-col">
        <QuizView studySet={studySet} />
      </div>
    </div>
  );
}
