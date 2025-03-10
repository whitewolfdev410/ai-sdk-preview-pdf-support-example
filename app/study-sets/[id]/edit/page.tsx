"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import React from "react";
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StudySet, StudyItem } from "@/lib/types";
import { toast } from "sonner";
import { nanoid } from "nanoid";

export default function EditStudySetPage({ params }: { params: { id: string } }) {
  const [studySet, setStudySet] = useState<StudySet | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<StudyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const router = useRouter();
  
  // Unwrap params using React.use()
  const unwrappedParams = React.use(params);
  const id = unwrappedParams.id;

  useEffect(() => {
    async function loadStudySet() {
      try {
        const response = await fetch(`/api/study-sets/${id}`);
        if (!response.ok) {
          throw new Error("Failed to load study set");
        }
        const data = await response.json();
        setStudySet(data);
        setTitle(data.title);
        setDescription(data.description || "");
        setItems(data.items);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load study set");
      } finally {
        setIsLoading(false);
      }
    }

    loadStudySet();
  }, [id]);

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

  const saveStudySet = async () => {
    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    if (items.some((item) => !item.term.trim() || !item.definition.trim())) {
      toast.error("Please fill out all terms and definitions");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/study-sets/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          items,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update study set");
      }

      toast.success("Study set updated successfully");
      router.push(`/study-sets/${id}`);
    } catch (error) {
      console.error("Error updating study set:", error);
      toast.error("Failed to update study set");
    } finally {
      setIsSaving(false);
    }
  };

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

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href={`/study-sets/${id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Study Set
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Edit Study Set</h1>
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
            <Link href={`/study-sets/${id}`}>Cancel</Link>
          </Button>
          <Button
            onClick={saveStudySet}
            disabled={isSaving}
            className="min-w-32"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
