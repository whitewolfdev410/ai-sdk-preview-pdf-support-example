"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import React from "react";
import { 
  ArrowLeft,
  FlipHorizontal, 
  BookOpenCheck, 
  SplitSquareVertical, 
  PenLine, 
  Loader2, 
  Edit, 
  Trash2,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { StudySet } from "@/lib/types";
import { toast } from "sonner";

export default function StudySetPage({ params }: { params: { id: string } }) {
  const [studySet, setStudySet] = useState<StudySet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  // Unwrap params using React.use()
  const unwrappedParams = React.use(params);
  const id = unwrappedParams.id;

  useEffect(() => {
    async function loadStudySet() {
      try {
        console.log("Loading study set with id:", id);
        setError(null);
        
        const response = await fetch(`/api/study-sets/${id}`);
        
        // Get response details even if not OK
        const responseText = await response.text();
        console.log(`Response status: ${response.status}, body:`, responseText);
        
        // Parse response if possible
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (e) {
          console.error("Failed to parse JSON response:", e);
        }
        
        if (!response.ok) {
          setError(data?.error || "Failed to load study set");
          return;
        }
        
        setStudySet(data);
      } catch (error) {
        console.error("Error in loadStudySet:", error);
        setError("An error occurred while loading the study set");
      } finally {
        setIsLoading(false);
      }
    }

    if (id) {
      loadStudySet();
    }
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this study set?")) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/study-sets/${id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete study set");
      }
      
      toast.success("Study set deleted successfully");
      router.push("/dashboard");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete study set");
    } finally {
      setIsDeleting(false);
    }
  };

  // Show a helpful error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Link>
        </Button>
        
        <Alert variant="destructive" className="my-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error}. This might happen because the study set doesn't exist or there was a problem connecting to the database.
          </AlertDescription>
        </Alert>
        
        <Card className="p-6 text-center">
          <CardHeader>
            <CardTitle>Study Set Not Found</CardTitle>
            <CardDescription>
              Try creating a new study set or refreshing the page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/study-sets/create">Create New Study Set</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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

  const studyModes = [
    {
      title: "Flashcards",
      description: "Review with digital flashcards",
      icon: FlipHorizontal,
      href: `/study-sets/${id}/flashcards`,
      color: "bg-blue-500",
    },
    {
      title: "Quiz",
      description: "Test your knowledge with multiple choice questions",
      icon: BookOpenCheck,
      href: `/study-sets/${id}/quiz`,
      color: "bg-purple-500",
    },
    {
      title: "Match",
      description: "Match terms with their definitions",
      icon: SplitSquareVertical,
      href: `/study-sets/${id}/match`,
      color: "bg-green-500",
    },
    {
      title: "Learn",
      description: "Adaptive learning with spaced repetition",
      icon: BookOpenCheck,
      href: `/study-sets/${id}/learn`,
      color: "bg-amber-500",
    },
    {
      title: "Write",
      description: "Practice by writing definitions",
      icon: PenLine,
      href: `/study-sets/${id}/write`,
      color: "bg-rose-500",
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Link>
        </Button>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">{studySet.title}</h1>
            {studySet.description && (
              <p className="text-muted-foreground mt-2">{studySet.description}</p>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              {studySet.items.length} {studySet.items.length === 1 ? "term" : "terms"} • 
              Created {new Date(studySet.createdAt).toLocaleDateString()}
            </p>
          </div>
          
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/study-sets/${id}/edit`}>
                <Edit className="h-4 w-4 mr-1" /> Edit
              </Link>
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-4">Study Modes</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {studyModes.map((mode) => (
          <Link key={mode.title} href={mode.href}>
            <Card className="h-full transition-shadow hover:shadow-md cursor-pointer">
              <CardHeader className={`${mode.color} text-white rounded-t-lg`}>
                <div className="flex items-center">
                  <mode.icon className="h-6 w-6 mr-2" />
                  <CardTitle>{mode.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <p>{mode.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <h2 className="text-2xl font-bold my-6">Preview</h2>
      <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 overflow-hidden">
        <div className="grid gap-2">
          {studySet.items.slice(0, 5).map((item) => (
            <div 
              key={item.id} 
              className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg"
            >
              <div className="font-medium">{item.term}</div>
              <div className="text-muted-foreground">{item.definition}</div>
            </div>
          ))}
          
          {studySet.items.length > 5 && (
            <div className="text-center py-2 text-muted-foreground">
              +{studySet.items.length - 5} more terms
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
