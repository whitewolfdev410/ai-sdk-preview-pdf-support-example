"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, FileUp, Book, RefreshCw, Database, Bug, CloudOff, Cloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { StudySet } from "@/lib/types";
import { 
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

export default function Dashboard() {
  const [studySets, setStudySets] = useState<StudySet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingSamples, setIsGeneratingSamples] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [dbStatus, setDbStatus] = useState<{ initialized: boolean; usingFallback: boolean }>({
    initialized: false,
    usingFallback: true
  });

  useEffect(() => {
    initializeDatabase();
  }, []);
  
  async function initializeDatabase() {
    try {
      // Initialize the database first
      const response = await fetch("/api/init-db");
      const result = await response.json();
      
      setDbStatus({
        initialized: result.success,
        usingFallback: !process.env.DATABASE_URL
      });
      
      // Then load the study sets
      loadStudySets();
    } catch (error) {
      console.error("Failed to initialize database:", error);
      toast.error("Failed to initialize database");
      setDbStatus({
        initialized: false,
        usingFallback: true
      });
      
      // Still try to load study sets from fallback
      loadStudySets();
    }
  }

  async function loadStudySets() {
    setIsLoading(true);
    try {
      const response = await fetch("/api/study-sets");
      if (!response.ok) {
        throw new Error("Failed to load study sets");
      }
      const data = await response.json();
      
      console.log("Loaded study sets:", data);
      
      // Handle both array and object with studySets property
      const sets = Array.isArray(data) ? data : (data.studySets || []);
      setStudySets(sets);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load study sets");
    } finally {
      setIsLoading(false);
    }
  }

  async function generateSampleData() {
    setIsGeneratingSamples(true);
    try {
      const response = await fetch("/api/sample-data", {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to generate sample data");
      }
      toast.success("Sample study sets created");
      // Reload study sets
      await loadStudySets();
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate sample data");
    } finally {
      setIsGeneratingSamples(false);
    }
  }
  
  async function createTestStudySet() {
    try {
      const response = await fetch("/api/debug/storage", {
        method: "POST",
      });
      
      const data = await response.json();
      console.log("Debug response:", data);
      
      if (data.success) {
        toast.success("Test study set created. Check console for details.");
      } else {
        toast.error("Failed to create test study set");
      }
      
      // Reload study sets
      await loadStudySets();
    } catch (error) {
      console.error(error);
      toast.error("Failed to create test study set");
    }
  }
  
  const toggleDebug = () => {
    setShowDebug(!showDebug);
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">My Study Sets</h1>
          <button 
            onClick={toggleDebug} 
            className="p-1 text-muted-foreground hover:text-foreground"
            title="Toggle debug panel"
          >
            <Bug className="h-4 w-4" />
          </button>
        </div>
        <Button asChild>
          <Link href="/study-sets/create">
            <Plus className="mr-2 h-4 w-4" /> Create Study Set
          </Link>
        </Button>
      </div>
      
      {dbStatus.usingFallback && (
        <Alert className="mb-6 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
          <CloudOff className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertTitle>Using Local Storage</AlertTitle>
          <AlertDescription>
            Your study sets are being stored in browser local storage. To enable persistent storage,
            connect a Neon Postgres database in your environment variables.
          </AlertDescription>
        </Alert>
      )}
      
      {!dbStatus.usingFallback && dbStatus.initialized && (
        <Alert className="mb-6 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <Cloud className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertTitle>Connected to Database</AlertTitle>
          <AlertDescription>
            Your study sets are being stored in Neon Postgres and will persist across devices.
          </AlertDescription>
        </Alert>
      )}
      
      {showDebug && (
        <Card className="mb-6 bg-yellow-50 dark:bg-yellow-900/20">
          <CardHeader>
            <CardTitle>Debug Panel</CardTitle>
            <CardDescription>Developer tools for troubleshooting</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm mb-2">Current study sets in memory: {studySets.length}</p>
              <div className="flex flex-wrap gap-2">
                {studySets.map(set => (
                  <div key={set.id} className="text-xs bg-gray-100 dark:bg-gray-800 p-1 rounded">
                    {set.title} (ID: {set.id.substring(0, 6)}...)
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadStudySets}>
                <RefreshCw className="mr-1 h-3 w-3" /> Reload Data
              </Button>
              <Button variant="outline" size="sm" onClick={createTestStudySet}>
                <Plus className="mr-1 h-3 w-3" /> Create Test Set
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    const studySetKeys = Object.keys(localStorage).filter(key => key.startsWith('study-set:'));
                    studySetKeys.forEach(key => localStorage.removeItem(key));
                    localStorage.removeItem('study-sets:all');
                    toast.success("LocalStorage cleared");
                    loadStudySets();
                  }
                }}
              >
                Clear Storage
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center items-center my-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : studySets.length === 0 ? (
        <Card className="w-full p-8 text-center">
          <CardHeader>
            <CardTitle className="text-2xl">No study sets yet</CardTitle>
            <CardDescription>
              Create your first study set by uploading a PDF or adding terms manually
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-6">
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <Button asChild className="w-full sm:w-auto">
                <Link href="/study-sets/create">
                  <Plus className="mr-2 h-4 w-4" /> Create Manually
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link href="/study-sets/create?source=pdf">
                  <FileUp className="mr-2 h-4 w-4" /> Upload PDF
                </Link>
              </Button>
            </div>
            
            <div className="border-t w-full pt-6">
              <p className="text-sm text-muted-foreground mb-4">
                Or start with some example study sets
              </p>
              <Button 
                variant="secondary" 
                onClick={generateSampleData}
                disabled={isGeneratingSamples}
              >
                {isGeneratingSamples ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Generating...
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-4 w-4" /> Generate Sample Data
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {studySets.map((studySet) => (
            <Link key={studySet.id} href={`/study-sets/${studySet.id}`} className="block">
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader>
                  <CardTitle className="truncate">{studySet.title}</CardTitle>
                  <CardDescription className="line-clamp-2">{studySet.description || "No description"}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Book className="h-4 w-4 mr-2" />
                    {studySet.items.length} {studySet.items.length === 1 ? "term" : "terms"}
                  </div>
                </CardContent>
                <CardFooter>
                  <div className="text-xs text-muted-foreground">
                    Last updated: {new Date(studySet.updatedAt).toLocaleDateString()}
                  </div>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
