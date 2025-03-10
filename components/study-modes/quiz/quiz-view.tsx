"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { StudySet } from "@/lib/types";
import { toast } from "sonner";

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  answer: string;
}

interface QuizViewProps {
  studySet: StudySet;
}

export default function QuizView({ studySet }: QuizViewProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    generateQuiz();
  }, [studySet.id]);

  const generateQuiz = async () => {
    setIsGenerating(true);
    setIsLoading(true);
    setIsSubmitted(false);
    setScore(null);
    
    try {
      const response = await fetch(`/api/learning-modes/quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generateQuiz",
          studySetId: studySet.id
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate quiz");
      }

      const quizQuestions = await response.json();
      setQuestions(quizQuestions);
      setSelectedAnswers(Array(quizQuestions.length).fill(null));
    } catch (error) {
      console.error("Failed to generate quiz:", error);
      toast.error("Failed to generate quiz");
    } finally {
      setIsGenerating(false);
      setIsLoading(false);
    }
  };

  const handleSelectAnswer = (answer: string) => {
    if (isSubmitted) return;
    
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestionIndex] = answer;
    setSelectedAnswers(newAnswers);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmit = () => {
    // Check if all questions are answered
    if (selectedAnswers.some(answer => answer === null)) {
      toast.error("Please answer all questions");
      return;
    }
    
    setIsSubmitted(true);
    
    // Calculate score
    const correctAnswers = questions.reduce((acc, question, index) => {
      return acc + (question.answer === selectedAnswers[index] ? 1 : 0);
    }, 0);
    
    setScore(correctAnswers);
    
    // Save progress
    saveProgress(correctAnswers);
  };

  const saveProgress = async (correctAnswers: number) => {
    try {
      await fetch(`/api/learning-modes/quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "saveProgress",
          studySetId: studySet.id,
          mode: "quiz",
          itemsStudied: questions.length,
          correctAnswers,
          incorrectAnswers: questions.length - correctAnswers,
          completedSessions: 1,
        }),
      });
    } catch (error) {
      console.error("Failed to save progress:", error);
    }
  };

  const handleReset = () => {
    generateQuiz();
  };

  if (isLoading || isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
        <p className="text-muted-foreground">
          {isGenerating ? "Generating quiz questions..." : "Loading..."}
        </p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12">
        <p className="text-muted-foreground mb-4">No questions available</p>
        <Button onClick={generateQuiz}>Generate Quiz</Button>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const answerLabels = ["A", "B", "C", "D"];

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6">
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-1">
          <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
          <span>{Math.round((currentQuestionIndex / questions.length) * 100)}%</span>
        </div>
        <Progress
          value={(currentQuestionIndex / questions.length) * 100}
          className="h-2"
        />
      </div>

      <AnimatePresence mode="wait">
        {!isSubmitted ? (
          <motion.div
            key="quiz"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg shadow-sm mb-6">
              <h2 className="text-xl font-semibold mb-6">{currentQuestion.question}</h2>
              <div className="space-y-3">
                {currentQuestion.options.map((option, index) => (
                  <Button
                    key={index}
                    variant={
                      selectedAnswers[currentQuestionIndex] === answerLabels[index]
                        ? "secondary"
                        : "outline"
                    }
                    className="w-full h-auto py-4 px-4 justify-start text-left whitespace-normal"
                    onClick={() => handleSelectAnswer(answerLabels[index])}
                  >
                    <span className="text-lg font-medium mr-4 shrink-0">
                      {answerLabels[index]}
                    </span>
                    <span className="flex-grow">{option}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <Button
                onClick={handlePreviousQuestion}
                disabled={currentQuestionIndex === 0}
                variant="outline"
              >
                <ChevronLeft className="mr-2 h-4 w-4" /> Previous
              </Button>
              
              <span className="text-sm font-medium">
                {currentQuestionIndex + 1} / {questions.length}
              </span>
              
              <Button
                onClick={handleNextQuestion}
                disabled={selectedAnswers[currentQuestionIndex] === null}
              >
                {currentQuestionIndex === questions.length - 1 ? "Submit" : "Next"}{" "}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg shadow-sm mb-6 text-center">
              <h2 className="text-2xl font-bold mb-2">Quiz Results</h2>
              <div className="text-5xl font-bold mb-4">
                {score} / {questions.length}
              </div>
              <p className="mb-6 text-muted-foreground">
                {score === questions.length
                  ? "Perfect score! Great job!"
                  : score! >= questions.length * 0.7
                  ? "Good job! You're doing well!"
                  : "Keep practicing to improve your score."}
              </p>
              
              <Button onClick={handleReset} variant="outline" className="mb-4">
                <RefreshCw className="mr-2 h-4 w-4" /> Try Again
              </Button>
            </div>

            <div className="space-y-6">
              <h3 className="text-xl font-semibold">Review Your Answers</h3>
              
              {questions.map((question, index) => (
                <div
                  key={question.id}
                  className="bg-white dark:bg-zinc-800 p-6 rounded-lg shadow-sm"
                >
                  <h4 className="font-medium mb-4">
                    {index + 1}. {question.question}
                  </h4>
                  <div className="space-y-3">
                    {question.options.map((option, optionIndex) => {
                      const optionLabel = answerLabels[optionIndex];
                      const isSelected = selectedAnswers[index] === optionLabel;
                      const isCorrect = question.answer === optionLabel;
                      
                      let bgColor = "";
                      if (isSelected && isCorrect) bgColor = "bg-green-100 dark:bg-green-900/30";
                      else if (isSelected && !isCorrect) bgColor = "bg-red-100 dark:bg-red-900/30";
                      else if (isCorrect) bgColor = "bg-green-50 dark:bg-green-900/20";
                      
                      return (
                        <div
                          key={optionIndex}
                          className={`flex items-center p-3 rounded-md border ${bgColor}`}
                        >
                          <span className="text-lg font-medium mr-4 w-6">
                            {optionLabel}
                          </span>
                          <span className="flex-grow">{option}</span>
                          {isSelected && isCorrect && (
                            <Check className="ml-2 text-green-600 dark:text-green-400" size={20} />
                          )}
                          {isSelected && !isCorrect && (
                            <X className="ml-2 text-red-600 dark:text-red-400" size={20} />
                          )}
                          {!isSelected && isCorrect && (
                            <Check className="ml-2 text-green-600 dark:text-green-400" size={20} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
