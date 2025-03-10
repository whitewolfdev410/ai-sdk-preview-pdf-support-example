"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RefreshCw, Clock } from "lucide-react";
import { StudySet } from "@/lib/types";
import { toast } from "sonner";

interface MatchItem {
  id: string;
  content: string;
  type: "term" | "definition";
  matched: boolean;
  selected: boolean;
}

interface MatchViewProps {
  studySet: StudySet;
}

export default function MatchView({ studySet }: MatchViewProps) {
  const [items, setItems] = useState<MatchItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes
  const [gameStarted, setGameStarted] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [gameWon, setGameWon] = useState(false);

  // Initialize the game
  useEffect(() => {
    if (gameStarted) return;
    
    // Create shuffled arrays of terms and definitions
    const shuffledItems = createShuffledItems();
    setItems(shuffledItems);
    setGameStarted(true);
  }, [studySet, gameStarted]);

  // Timer
  useEffect(() => {
    if (!gameStarted || gameComplete) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setGameComplete(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameStarted, gameComplete]);

  // Check for win condition
  useEffect(() => {
    if (matchedPairs === studySet.items.length) {
      setGameComplete(true);
      setGameWon(true);
      saveProgress();
    }
  }, [matchedPairs, studySet.items.length]);

  const createShuffledItems = () => {
    // Limit to 10 items for gameplay reasons
    const limitedItems = studySet.items.slice(0, 10);
    
    const terms = limitedItems.map((item) => ({
      id: `${item.id}-term`,
      content: item.term,
      type: "term" as const,
      matched: false,
      selected: false,
    }));

    const definitions = limitedItems.map((item) => ({
      id: `${item.id}-def`,
      content: item.definition,
      type: "definition" as const,
      matched: false,
      selected: false,
    }));

    // Combine and shuffle
    return [...terms, ...definitions].sort(() => Math.random() - 0.5);
  };

  const handleItemClick = (id: string) => {
    // If the game is complete or the item is already matched, do nothing
    if (gameComplete || items.find((item) => item.id === id)?.matched) return;

    if (!selectedItem) {
      // First selection
      setItems(
        items.map((item) =>
          item.id === id ? { ...item, selected: true } : item
        )
      );
      setSelectedItem(id);
    } else {
      // Second selection - same item clicked twice
      if (selectedItem === id) return;
      
      const firstItem = items.find((item) => item.id === selectedItem)!;
      const secondItem = items.find((item) => item.id === id)!;

      // Check if they match (term and definition from same item)
      const isMatch =
        firstItem.id.split("-")[0] === secondItem.id.split("-")[0] &&
        firstItem.type !== secondItem.type;

      if (isMatch) {
        // Mark both as matched
        setItems(
          items.map((item) =>
            item.id === selectedItem || item.id === id
              ? { ...item, matched: true, selected: false }
              : item
          )
        );
        setMatchedPairs((prev) => prev + 1);
        setSelectedItem(null);
      } else {
        // Briefly show as selected, then unselect both
        setItems(
          items.map((item) =>
            item.id === id ? { ...item, selected: true } : item
          )
        );

        setTimeout(() => {
          setItems(
            items.map((item) =>
              item.id === selectedItem || item.id === id
                ? { ...item, selected: false }
                : item
            )
          );
          setSelectedItem(null);
        }, 1000);
      }
    }
  };

  const restartGame = () => {
    setItems(createShuffledItems());
    setSelectedItem(null);
    setMatchedPairs(0);
    setTimeLeft(120);
    setGameComplete(false);
    setGameWon(false);
  };

  const saveProgress = async () => {
    try {
      await fetch(`/api/learning-modes/match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studySetId: studySet.id,
          mode: "match",
          itemsStudied: studySet.items.length,
          completedSessions: 1,
          correctAnswers: matchedPairs,
          incorrectAnswers: 0,
        }),
      });
    } catch (error) {
      console.error("Failed to save progress:", error);
    }
  };

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Summary screen when game is complete
  if (gameComplete) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4 py-8">
        <div className="bg-white dark:bg-zinc-800 p-8 rounded-xl shadow-md max-w-md w-full text-center">
          <h2 className="text-2xl font-bold mb-4">
            {gameWon ? "Match Complete!" : "Time's Up!"}
          </h2>
          
          <div className="mb-6">
            <p className="text-4xl font-bold mb-2">{matchedPairs}/{Math.min(studySet.items.length, 10)}</p>
            <p className="text-muted-foreground">Pairs Matched</p>
          </div>
          
          <div className="mb-8">
            {gameWon ? (
              <p>Great job! You matched all pairs with {formatTime(timeLeft)} left.</p>
            ) : (
              <p>You matched {matchedPairs} out of {Math.min(studySet.items.length, 10)} pairs.</p>
            )}
          </div>
          
          <Button onClick={restartGame} className="w-full">Play Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 h-full">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <Clock className="mr-2 h-4 w-4" />
          <span className="font-medium">{formatTime(timeLeft)}</span>
        </div>
        
        <div>
          <span className="font-medium">{matchedPairs}/{Math.min(studySet.items.length, 10)} matched</span>
        </div>
        
        <Button variant="ghost" size="sm" onClick={restartGame}>
          <RefreshCw className="mr-1 h-4 w-4" /> Restart
        </Button>
      </div>
      
      <Progress 
        value={(matchedPairs / Math.min(studySet.items.length, 10)) * 100} 
        className="h-2 mb-6" 
      />
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {items.map((item) => (
          <motion.div
            key={item.id}
            className={`
              p-3 rounded-lg cursor-pointer min-h-24 flex items-center justify-center text-center
              ${
                item.matched
                  ? "bg-green-100 dark:bg-green-900/50 cursor-default"
                  : item.selected
                  ? "bg-blue-100 dark:bg-blue-900/50"
                  : "bg-white dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700"
              }
            `}
            whileHover={!item.matched ? { scale: 1.03 } : {}}
            whileTap={!item.matched ? { scale: 0.98 } : {}}
            onClick={() => handleItemClick(item.id)}
          >
            {item.matched || item.selected ? (
              <p className="text-sm">{item.content}</p>
            ) : (
              <p className="text-xl font-bold">?</p>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
