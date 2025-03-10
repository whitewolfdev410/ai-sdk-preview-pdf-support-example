"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Check,
  X,
  ArrowRight,
  RefreshCw,
  BookOpen,
  Brain,
  CheckCircle,
} from "lucide-react";
import { StudySet, StudyItem } from "@/lib/types";
import { toast } from "sonner";

// Knowledge levels for spaced repetition
type KnowledgeLevel = 0 | 1 | 2 | 3 | 4;

interface LearnItem extends StudyItem {
  knowledgeLevel: KnowledgeLevel;
  nextReview: number;
  lastReviewed: number | null;
}

interface LearnViewProps {
  studySet: StudySet;
}

export default function LearnView({ studySet }: LearnViewProps) {
  // Transform study items into learn items with metadata
  const [items, setItems] = useState<LearnItem[]>(() => 
    studySet.items.map(item => ({
      ...item,
      knowledgeLevel: 0,
      nextReview: Date.now(),
      lastReviewed: null,
    }))
  );
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [stage, setStage] = useState<'term' | 'definition' | 'quiz'>('term');
  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [mastered, setMastered] = useState(0);
  const [inProgress, setInProgress] = useState(0);
  const [notStarted, setNotStarted] = useState(studySet.items.length);

  // Initialize/update statistics
  useEffect(() => {
    updateStats();
  }, [items]);

  const updateStats = () => {
    const masterCount = items.filter(item => item.knowledgeLevel >= 3).length;
    const progressCount = items.filter(item => item.knowledgeLevel > 0 && item.knowledgeLevel < 3).length;
    
    setMastered(masterCount);
    setInProgress(progressCount);
    setNotStarted(items.length - masterCount - progressCount);
  };

  // Find next item to review
  useEffect(() => {
    if (stage !== 'term') return;
    
    const now = Date.now();
    // Find items due for review, sorted by due date (oldest first)
    const dueItems = items
      .filter(item => item.nextReview <= now)
      .sort((a, b) => a.nextReview - b.nextReview);
    
    if (dueItems.length > 0) {
      const nextItemIndex = items.findIndex(item => item.id === dueItems[0].id);
      setCurrentIndex(nextItemIndex);
    } else {
      // No items due - session complete
      setIsSessionComplete(true);
      saveProgress();
    }
  }, [stage, items]);

  const handleNext = () => {
    if (stage === 'term') {
      setStage('definition');
    } else if (stage === 'definition') {
      setStage('quiz');
    } else {
      // Update item's knowledge level based on answer
      updateItemKnowledge();
      // Reset for next item
      setStage('term');
      setUserInput('');
      setFeedback(null);
    }
  };

  const updateItemKnowledge = () => {
    const now = Date.now();
    const isCorrect = feedback === 'correct';
    const currentItem = { ...items[currentIndex] };
    
    // Update knowledge level based on correctness
    let newLevel = currentItem.knowledgeLevel;
    if (isCorrect) {
      newLevel = Math.min(4, currentItem.knowledgeLevel + 1) as KnowledgeLevel;
    } else {
      newLevel = Math.max(0, currentItem.knowledgeLevel - 1) as KnowledgeLevel;
    }
    
    // Calculate next review time based on spaced repetition algorithm
    // Higher levels = longer intervals between reviews
    const intervals = [
      1000 * 60, // Level 0: 1 minute (immediate review)
      1000 * 60 * 60, // Level 1: 1 hour
      1000 * 60 * 60 * 24, // Level 2: 1 day
      1000 * 60 * 60 * 24 * 3, // Level 3: 3 days
      1000 * 60 * 60 * 24 * 7, // Level 4: 1 week
    ];
    
    const nextReview = now + intervals[newLevel];
    
    // Update the item
    const updatedItems = [...items];
    updatedItems[currentIndex] = {
      ...currentItem,
      knowledgeLevel: newLevel,
      nextReview,
      lastReviewed: now,
    };
    
    setItems(updatedItems);
  };

  const checkAnswer = () => {
    // Simple comparison (could be enhanced with AI for semantic comparison)
    // This is simplified for this prototype - in production, use similarity checks
    const item = items[currentIndex];
    const isCorrect = userInput.toLowerCase().trim().includes(item.definition.toLowerCase().trim().substring(0, 20));
    setFeedback(isCorrect ? 'correct' : 'incorrect');
  };

  const saveProgress = async () => {
    try {
      const correctItems = items.filter(item => item.knowledgeLevel >= 2).length;
      const incorrectItems = items.filter(item => item.knowledgeLevel < 2 && item.lastReviewed !== null).length;
      
      await fetch(`/api/learning-modes/learn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studySetId: studySet.id,
          mode: "learn",
          itemsStudied: items.filter(item => item.lastReviewed !== null).length,
          correctAnswers: correctItems,
          incorrectAnswers: incorrectItems,
          completedSessions: 1,
        }),
      });
    } catch (error) {
      console.error("Failed to save progress:", error);
    }
  };

  const resetSession = () => {
    setItems(studySet.items.map(item => ({
      ...item,
      knowledgeLevel: 0,
      nextReview: Date.now(),
      lastReviewed: null,
    })));
    setCurrentIndex(0);
    setStage('term');
    setUserInput('');
    setFeedback(null);
    setIsSessionComplete(false);
    toast.success("Session reset");
  };

  // Session complete view
  if (isSessionComplete) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4 py-8">
        <div className="bg-white dark:bg-zinc-800 p-8 rounded-xl shadow-md max-w-md w-full text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Learning Session Complete!</h2>
          
          <div className="mb-6 space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Mastered</p>
              <p className="text-2xl font-bold">{mastered} of {items.length}</p>
            </div>
            
            <Progress value={(mastered / items.length) * 100} className="h-2" />
            
            <p className="text-muted-foreground text-sm">
              Come back later to continue learning. Items will be ready for review
              based on your knowledge level.
            </p>
          </div>
          
          <Button onClick={resetSession} className="w-full">Start New Session</Button>
        </div>
      </div>
    );
  }

  // Regular review session
  const currentItem = items[currentIndex];
  const masteredPercent = (mastered / items.length) * 100;

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6">
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-1">
          <span>{mastered} of {items.length} mastered</span>
          <Button variant="ghost" size="sm" onClick={resetSession}>
            <RefreshCw className="mr-1 h-4 w-4" /> Reset
          </Button>
        </div>
        <Progress value={masteredPercent} className="h-2" />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6 text-center text-sm">
        <div className="bg-white dark:bg-zinc-800 p-3 rounded-lg">
          <p className="font-medium mb-1">Not Started</p>
          <p className="text-xl">{notStarted}</p>
        </div>
        <div className="bg-white dark:bg-zinc-800 p-3 rounded-lg">
          <p className="font-medium mb-1">Learning</p>
          <p className="text-xl">{inProgress}</p>
        </div>
        <div className="bg-white dark:bg-zinc-800 p-3 rounded-lg">
          <p className="font-medium mb-1">Mastered</p>
          <p className="text-xl">{mastered}</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${currentItem.id}-${stage}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="bg-white dark:bg-zinc-800 p-6 rounded-lg shadow-sm"
        >
          {stage === 'term' && (
            <div className="text-center">
              <BookOpen className="h-8 w-8 mx-auto mb-4 text-blue-500" />
              <h3 className="text-lg font-medium mb-2">Term</h3>
              <div className="text-2xl font-bold p-8">{currentItem.term}</div>
              <Button onClick={handleNext} className="mt-4">Show Definition</Button>
            </div>
          )}
          
          {stage === 'definition' && (
            <div className="text-center">
              <Brain className="h-8 w-8 mx-auto mb-4 text-purple-500" />
              <h3 className="text-lg font-medium mb-2">Definition</h3>
              <div className="text-xl p-8">{currentItem.definition}</div>
              <Button onClick={handleNext} className="mt-4">Test Yourself</Button>
            </div>
          )}
          
          {stage === 'quiz' && (
            <div>
              <h3 className="text-lg font-medium mb-4">Write the definition for:</h3>
              <div className="text-2xl font-bold mb-4">{currentItem.term}</div>
              
              <Textarea
                className="w-full p-3 min-h-32 mb-4"
                placeholder="Type the definition..."
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                disabled={feedback !== null}
              />
              
              {feedback === null ? (
                <Button onClick={checkAnswer} className="w-full" disabled={!userInput.trim()}>
                  Check
                </Button>
              ) : (
                <div>
                  <div className={`p-4 rounded-md mb-4 ${
                    feedback === 'correct' 
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' 
                      : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                  }`}>
                    <div className="flex">
                      {feedback === 'correct' ? (
                        <Check className="mt-1 mr-2 flex-shrink-0" />
                      ) : (
                        <X className="mt-1 mr-2 flex-shrink-0" />
                      )}
                      <div>
                        <p className="font-medium">
                          {feedback === 'correct' ? 'Correct!' : 'Not quite right'}
                        </p>
                        {feedback === 'incorrect' && (
                          <p className="text-sm mt-1">Correct definition: {currentItem.definition}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <Button onClick={handleNext} className="w-full">
                    Continue <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
