"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileUp, Plus, Trash2, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import Link from "next/link";
import { StudyItem } from "@/lib/types";
import { nanoid } from "nanoid";

export default function CreateStudySet() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<StudyItem[]>([
    { id: nanoid(), term: "", definition: "" },
  ]);
  const [file, setFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [filePreviewName, setFilePreviewName] = useState<string | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const source = searchParams.get("source") || "manual";

  useEffect(() => {
    // Increment progress animation during generation
    if (isGenerating && generationProgress < 90) {
      const timer = setTimeout(() => {
        setGenerationProgress((prev) => {
          // Slow down as we get closer to 90%
          const increment = prev < 30 ? 20 : prev < 60 ? 10 : 5;
          return Math.min(prev + increment, 90);
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isGenerating, generationProgress]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
      setFilePreviewName(selectedFile.name);
      
      // Auto-generate title from filename
      if (!title) {
        const fileName = selectedFile.name.replace(/\.pdf$/i, "");
        setTitle(fileName);
      }
    } else if (selectedFile) {
      toast.error("Please select a PDF file");
    }
  };

  const addItem = () => {
    setItems([...items, { id: nanoid(), term: "", definition: "" }]);
  };

  const updateItem = (id: string, field: keyof StudyItem, value: string) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    } else {
      toast.error("You need at least one item");
    }
  };

  const generateFromPDF = async () => {
    if (!file) return;

    setIsGenerating(true);
    setGenerationProgress(10);

    try {
      // Read file as base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") {
            resolve(reader.result);
          } else {
            reject(new Error("Failed to read file"));
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setGenerationProgress(30);
      
      // Call API to generate content
      const response = await fetch("/api/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: base64 }),
      });

      // Handle errors with detailed information
      if (!response.ok) {
        let errorMessage = `Failed to generate content: ${response.statusText}`;
        
        try {
          // Try to get a more detailed error message from the response
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
            if (errorData.details) {
              console.error("Error details:", errorData.details);
            }
          }
        } catch (e) {
          // If we can't parse the error response, use the status text
          console.error("Could not parse error response:", e);
        }
        
        throw new Error(errorMessage);
      }

      setGenerationProgress(70);
      
      // Set generated content
      const generatedItems = await response.json();
      
      if (!Array.isArray(generatedItems) || generatedItems.length === 0) {
        throw new Error("No flashcards generated. The AI may not have been able to extract content from this PDF.");
      }
      
      setItems(generatedItems);
      setGenerationProgress(100);
      toast.success(`Generated ${generatedItems.length} flashcards successfully`);
    } catch (error) {
      console.error("Error generating content:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate content");
    } finally {
      setIsGenerating(false);
    }
  };

  const saveStudySet = async () => {
    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    if (items.some((item) => !item.term.trim() || !item.definition.trim())) {
      toast.error("Please fill out all terms and definitions");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/study-sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          items,
          sourceType: source === "pdf" ? "pdf" : "manual",
          sourceName: file?.name,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save study set");
      }

      const studySet = await response.json();
      toast.success("Study set created successfully");
      router.push(`/study-sets/${studySet.id}`);
    } catch (error) {
      console.error("Error saving study set:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save study set");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Create Study Set</h1>
      </div>

      <div className="space-y-6">
        <div className="grid gap-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title for your study set"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter a description"
              className="mt-1"
            />
          </div>
        </div>

        {source === "pdf" && (
          <div className="space-y-4 bg-white dark:bg-zinc-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold">Upload PDF</h2>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center">
              <input
                type="file"
                onChange={handleFileChange}
                accept="application/pdf"
                className="hidden"
                id="pdf-upload"
              />
              <label
                htmlFor="pdf-upload"
                className="cursor-pointer flex flex-col items-center justify-center"
              >
                <FileUp className="h-8 w-8 mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {filePreviewName ? filePreviewName : "Drop your PDF here or click to browse"}
                </p>
              </label>
            </div>

            {file && !isGenerating && (
              <Button
                onClick={generateFromPDF}
                className="w-full"
                disabled={isGenerating}
              >
                Generate Flashcards from PDF
              </Button>
            )}

            {isGenerating && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Generating content...</span>
                  <span>{generationProgress}%</span>
                </div>
                <Progress value={generationProgress} className="h-2" />
              </div>
            )}
          </div>
        )}

        <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Terms and Definitions</h2>
            <Button variant="outline" size="sm" onClick={addItem}>
              <Plus className="h-4 w-4 mr-1" /> Add Card
            </Button>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg"
              >
                <div>
                  <Label htmlFor={`term-${item.id}`}>Term {index + 1}</Label>
                  <Input
                    id={`term-${item.id}`}
                    value={item.term}
                    onChange={(e) =>
                      updateItem(item.id, "term", e.target.value)
                    }
                    placeholder="Enter term"
                    className="mt-1"
                  />
                </div>
                <div className="relative">
                  <Label htmlFor={`definition-${item.id}`}>Definition</Label>
                  <div className="flex">
                    <Textarea
                      id={`definition-${item.id}`}
                      value={item.definition}
                      onChange={(e) =>
                        updateItem(item.id, "definition", e.target.value)
                      }
                      placeholder="Enter definition"
                      className="mt-1 min-h-24 flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(item.id)}
                      className="ml-2 self-start mt-1"
                      disabled={items.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <Button variant="outline" asChild>
            <Link href="/dashboard">Cancel</Link>
          </Button>
          <Button
            onClick={saveStudySet}
            disabled={isSubmitting}
            className="min-w-32"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
              </>
            ) : (
              "Create Study Set"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
