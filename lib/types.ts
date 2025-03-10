// Study Set
export interface StudySet {
  id: string;
  title: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  items: StudyItem[];
  sourceType: 'pdf' | 'manual' | 'ai-generated';
  sourceName?: string; // e.g., PDF filename
}

// Study Item (Flashcard/Question)
export interface StudyItem {
  id: string;
  term: string;
  definition: string;
  // Quiz-specific fields
  options?: string[];
  correctAnswer?: string;
}

// User Progress
export interface UserProgress {
  studySetId: string;
  mode: 'flashcards' | 'quiz' | 'match' | 'learn' | 'write';
  updatedAt: number;
  itemsStudied: number;
  correctAnswers: number;
  incorrectAnswers: number;
  completedSessions: number;
}
