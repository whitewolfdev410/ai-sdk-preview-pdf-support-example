import { z } from "zod";
import { nanoid } from "nanoid";

// Original quiz schema
export const questionSchema = z.object({
  question: z.string(),
  options: z
    .array(z.string())
    .length(4)
    .describe(
      "Four possible answers to the question. Only one should be correct. They should all be of equal lengths.",
    ),
  answer: z
    .enum(["A", "B", "C", "D"])
    .describe(
      "The correct answer, where A is the first option, B is the second, and so on.",
    ),
});

export type Question = z.infer<typeof questionSchema>;

export const questionsSchema = z.array(questionSchema).length(4);

// New schemas for Quizlet clone

export const studyItemSchema = z.object({
  id: z.string().default(() => nanoid()),
  term: z.string().min(1, "Term is required"),
  definition: z.string().min(1, "Definition is required"),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string().optional(),
});

export type StudyItem = z.infer<typeof studyItemSchema>;

export const studySetSchema = z.object({
  id: z.string().optional().default(() => nanoid()),
  title: z.string().min(1, "Title is required"),
  description: z.string().default(""),
  createdAt: z.number().optional().default(() => Date.now()),
  updatedAt: z.number().optional().default(() => Date.now()),
  items: z.array(studyItemSchema).min(1, "At least one study item is required"),
  sourceType: z.enum(["pdf", "manual", "ai-generated"]).default("manual"),
  sourceName: z.string().optional(),
});

export type StudySet = z.infer<typeof studySetSchema>;

// Schema for generating flashcards from PDF
export const flashcardsFromPDFSchema = z.array(
  z.object({
    term: z.string().describe("A concept, term, or question from the document"),
    definition: z.string().describe("The definition, explanation, or answer related to the term"),
  })
).min(5).max(50).describe("Generate 5-50 flashcard pairs based on the document's content");

// Schema for AI-based answer checking
export const answerCheckSchema = z.object({
  isCorrect: z.boolean().describe("Whether the answer is semantically correct or close enough"),
  similarityScore: z.number().min(0).max(1).describe("A score from 0-1 indicating how close the answer is to correct"),
  feedback: z.string().describe("Helpful feedback about why the answer was correct or incorrect"),
});
