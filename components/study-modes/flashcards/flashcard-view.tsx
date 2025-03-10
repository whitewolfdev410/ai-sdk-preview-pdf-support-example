"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  ChevronLeft, 
  ChevronRight, 
  Shuffle,
  RotateCcw,
  VolumeIcon
} from "lucide-react";
import { StudySet, StudyItem, UserProgress } from "@/lib/types";
import { toast } from "sonner";

interface FlashcardViewProps {
  studySet: StudySet;
}

export default function FlashcardView({ studySet }: FlashcardViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [items, setItems] = useState<StudyItem[]>(studySet.items);
  const [showingFront, setShowingFront] = useState(true);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadProgress() {
      try {
        const response = await fetch(`/api/learning-modes/flashcards?studySetId=${studySet.id}`);
        if (response.ok) {
          const data = await response.json();
          setProgress(data);
        }
      } catch (error) {
        console.error("Failed to load progress:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadProgress();
  }, [studySet.id]);

  const saveProgress = async () => {
    try {
      const response = await fetch(`/api/learning-modes/flashcards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studySetId: studySet.id,
          mode: "flashcards",
          itemsStudied: currentIndex + 1,
          completedSessions: progress ? progress.completedSessions + 1 : 1,
          correctAnswers: 0,
          incorrectAnswers: 0,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save progress");
      }
    } catch (error) {
      console.error("Failed to save progress:", error);
    }
  };

  const currentItem = items[currentIndex];
  const progressPercentage = ((currentIndex + 1) / items.length) * 100;

  const flipCard = () => {
    setShowingFront(!showingFront);
  };

  const nextCard = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowingFront(true);
    } else {
      // End of deck
      toast.success("You've completed the flashcards!");
      saveProgress();
    }
  };

  const prevCard = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setShowingFront(true);
    }
  };

  const shuffleDeck = () => {
    const shuffled = [...items].sort(() => Math.random() - 0.5);
    setItems(shuffled);
    setCurrentIndex(0);
    setShowingFront(true);
    toast.success("Cards shuffled");
  };

  const resetDeck = () => {
    setCurrentIndex(0);
    setShowingFront(true);
    toast.success("Started from beginning");
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    } else {
      toast.error("Text-to-speech is not supported in your browser");
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowRight" || event.key === " ") {
      nextCard();
    } else if (event.key === "ArrowLeft") {
      prevCard();
    } else if (event.key === "ArrowUp" || event.key === "ArrowDown" || event.key === "Enter") {
      flipCard();
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div 
      className="h-full w-full flex flex-col items-center p-4"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="w-full max-w-xl">
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-1">
            <span>{currentIndex + 1} of {items.length}</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        <div className="mb-8 relative perspective-1000">
          <div 
            className="relative w-full aspect-[5/3] cursor-pointer"
            onClick={flipCard}
          >
            <AnimatePresence initial={false} mode="wait">
              <motion.div
                key={`${currentItem.id}-${showingFront ? 'front' : 'back'}`}
                initial={{ rotateY: showingFront ? -90 : 90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                exit={{ rotateY: showingFront ? 90 : -90, opacity: 0 }}
                transition={{ duration: 0.4 }}
                className={`absolute inset-0 w-full h-full rounded-xl shadow-lg flex flex-col items-center justify-center p-6 backface-hidden
                  ${showingFront 
                    ? "bg-white dark:bg-zinc-800" 
                    : "bg-blue-500 dark:bg-blue-600 text-white"
                  }`}
              >
                <div className="absolute top-2 right-2 text-xs text-muted-foreground dark:text-zinc-400">
                  {showingFront ? "TERM" : "DEFINITION"}
                </div>
                
                <div className="text-center my-auto">
                  <div className={`text-xl ${showingFront ? "font-bold" : "font-normal"}`}>
                    {showingFront ? currentItem.term : currentItem.definition}
                  </div>
                </div>

                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute bottom-2 right-2 text-muted-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    speakText(showingFront ? currentItem.term : currentItem.definition);
                  }}
                >
                  <VolumeIcon className="h-4 w-4" />
                </Button>
              </motion.div>
            </AnimatePresence>
          </div>

          <p className="text-center text-sm mt-2 text-muted-foreground">
            Click card to flip or use ↑↓ keys
          </p>
        </div>

        <div className="flex justify-between">
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={shuffleDeck}
              title="Shuffle cards"
            >
              <Shuffle className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={resetDeck}
              title="Reset to beginning"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="icon"
              onClick={prevCard}
              disabled={currentIndex === 0}
              title="Previous card"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              onClick={nextCard}
              disabled={currentIndex === items.length - 1}
              title="Next card"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
