"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { StudySet } from "@/lib/types";
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { 
  Check, 
  X, 
  ArrowRight, 
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface WriteViewProps {
  studySet: StudySet;
}

export default function WriteView({ studySet }: WriteViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<{
    isCorrect: boolean;
    similarityScore: number;
    feedback: string;
  } | null>(null);
  const [completedItems, setCompletedItems] = useState<{
    [key: string]: { isCorrect: boolean; userAnswer: string };
  }>({});

  const currentItem = studySet.items[currentIndex];
  const progressPercentage = ((Object.keys(completedItems).length) / studySet.items.length) * 100;

  const checkAnswer = async () => {
    if (!userInput.trim()) {
      toast.error("Please enter an answer");
      return;
    }

    setIsChecking(true);

    try {
      // Use AI to check the answer
      const result = await generateObject({
        model: google("gemini-1.5-flash-latest"),
        schema: {
          type: "object",
          properties: {
            isCorrect: {
              type: "boolean",
              description: "Whether the answer is semantically correct or close enough",
            },
            similarityScore: {
              type: "number",
              minimum: 0,
              maximum: 1,
              description: "A score from 0-1 indicating how close the answer is to correct",
            },
            feedback: {
              type: "string",
              description: "Helpful feedback about why the answer was correct or incorrect",
            },
          },
          required: ["isCorrect", "similarityScore", "feedback"],
        },
        prompt: `
          I'm studying using flashcards and need to check if my written answer matches the definition.
          
          Term: "${currentItem.term}"
          Correct definition: "${currentItem.definition}"
          My answer: "${userInput}"
          
          Evaluate if my answer is semantically correct or close enough to the definition.
          Be somewhat lenient, focusing on the core meaning rather than exact wording.
          If it has the general meaning but misses some details, it can still be considered correct.
          
          Rate my answer with a similarity score from 0 to 1, and provide brief, helpful feedback.
        `,
      });

      setCheckResult(result.object);
      
      // Save this item as completed
      setCompletedItems({
        ...completedItems,
        [currentItem.id]: {
          isCorrect: result.object.isCorrect,
          userAnswer: userInput,
        },
      });

      // Save progress
      await saveProgress(
        Object.values(completedItems).filter(item => item.isCorrect).length + (result.object.isCorrect ? 1 : 0),
        Object.values(completedItems).filter(item => !item.isCorrect).length + (result.object.isCorrect ? 0 : 1)
      );
    } catch (error) {
      console.error("Failed to check answer:", error);
      
      // Fallback to simple comparison if AI check fails
      const isCorrect = userInput.toLowerCase().trim() === currentItem.definition.toLowerCase().trim();
      
      setCheckResult({
        isCorrect,
        similarityScore: isCorrect ? 1 : 0,
        feedback: isCorrect 
          ? "Your answer matches the definition!" 
          : "Your answer doesn't match the definition.",
      });
      
      setCompletedItems({
        ...completedItems,
        [currentItem.id]: {
          isCorrect,
          userAnswer: userInput,
        },
      });
    } finally {
      setIsChecking(false);
    }
  };

  const nextItem = () => {
    // Move to next unanswered item
    let nextIndex = (currentIndex + 1) % studySet.items.length;
    
    // If we've gone through all items, start over with incorrect ones
    if (Object.keys(completedItems).length === studySet.items.length) {
      const incorrectItems = studySet.items.filter(
        item => completedItems[item.id] && !completedItems[item.id].isCorrect
      );
      
      if (incorrectItems.length > 0) {
        nextIndex = studySet.items.findIndex(item => item.id === incorrectItems[0].id);
        toast.info("Now reviewing items you got wrong");
      } else {
        // All items correct, we're done!
        toast("Completed! All items answered correctly", {
          icon: <CheckCircle className="text-green-500" />,
        });
      }
    }
    
    setCurrentIndex(nextIndex);
    setUserInput("");
    setCheckResult(null);
  };

  const saveProgress = async (correct: number, incorrect: number) => {
    try {
      await fetch(`/api/learning-modes/write`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studySetId: studySet.id,
          mode: "write",
          itemsStudied: Object.keys(completedItems).length,
          correctAnswers: correct,
          incorrectAnswers: incorrect,
          completedSessions: 1,
        }),
      });
    } catch (error) {
      console.error("Failed to save progress:", error);
    }
  };

  const resetSession = () => {
    setCurrentIndex(0);
    setUserInput("");
    setCheckResult(null);
    setCompletedItems({});
    toast.success("Session reset");
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6">
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-1">
          <span>
            {Object.keys(completedItems).length} of {studySet.items.length} completed
          </span>
          <Button variant="ghost" size="sm" onClick={resetSession}>
            <RefreshCw className="mr-1 h-4 w-4" /> Reset
          </Button>
        </div>
        <Progress value={progressPercentage} className="h-2" />
      </div>

      <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg shadow-sm mb-6">
        <h2 className="text-xl font-bold mb-6">{currentItem.term}</h2>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            Write the definition
          </label>
          <Textarea
            placeholder="Type your answer here..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            className="min-h-32"
            disabled={!!checkResult}
          />
        </div>

        {checkResult ? (
          <div>
            <div className={`p-4 rounded-md mb-4 ${
              checkResult.isCorrect
                ? "bg-green-100 dark:bg-green-900/30"
                : "bg-red-100 dark:bg-red-900/30"
            }`}>
              <div className="flex items-start">
                {checkResult.isCorrect ? (
                  <Check className="text-green-600 dark:text-green-400 mt-1 mr-2" />
                ) : (
                  <X className="text-red-600 dark:text-red-400 mt-1 mr-2" />
                )}
                <div>
                  <p className="font-medium">
                    {checkResult.isCorrect ? "Correct!" : "Incorrect"}
                  </p>
                  <p className="text-sm">{checkResult.feedback}</p>
                </div>
              </div>
            </div>
            
            <div className="mb-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                Correct definition:
              </h3>
              <div className="p-3 bg-gray-50 dark:bg-zinc-900 rounded-md">
                {currentItem.definition}
              </div>
            </div>
            
            <Button onClick={nextItem} className="w-full">
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button
            onClick={checkAnswer}
            disabled={isChecking || !userInput.trim()}
            className="w-full"
          >
            {isChecking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking...
              </>
            ) : (
              "Check Answer"
            )}
          </Button>
        )}
      </div>

      {Object.keys(completedItems).length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-3">Progress</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
            {studySet.items.map((item, index) => {
              const isCompleted = completedItems[item.id];
              let bgColor = "bg-gray-100 dark:bg-zinc-800";
              
              if (isCompleted) {
                bgColor = isCompleted.isCorrect
                  ? "bg-green-100 dark:bg-green-900/30"
                  : "bg-red-100 dark:bg-red-900/30";
              }
              
              return (
                <div
                  key={item.id}
                  className={`p-2 rounded-md text-center ${bgColor} ${
                    currentIndex === index ? "ring-2 ring-blue-500" : ""
                  }`}
                >
                  {index + 1}
                  {isCompleted && (
                    <span className="ml-1">
                      {isCompleted.isCorrect ? (
                        <CheckCircle className="inline h-3 w-3 text-green-600" />
                      ) : (
                        <XCircle className="inline h-3 w-3 text-red-600" />
                      )}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
