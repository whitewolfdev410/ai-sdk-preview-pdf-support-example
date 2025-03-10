import "./globals.css";
import { Metadata } from "next";
import { Toaster } from "sonner";
import { ThemeProvider } from "next-themes";
import { Geist } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { initDb } from "@/lib/db";

// Initialize the database at server startup
const dbPromise = initDb().catch(err => {
  console.error("Failed to initialize database on startup:", err);
  return { success: false, error: err };
});

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://quizlet-clone.vercel.app"),
  title: "Quizlet Clone - AI-Powered Flashcards",
  description: "Create and study with AI-generated flashcards, quizzes, and more",
  openGraph: {
    type: "website",
    title: "Quizlet Clone - AI-Powered Flashcards",
    description: "Create and study with AI-generated flashcards, quizzes, and more",
    images: [{ url: "/opengraph-image.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Quizlet Clone - AI-Powered Flashcards",
    description: "Create and study with AI-generated flashcards, quizzes, and more",
    images: ["/twitter-image.png"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Wait for database initialization
  await dbPromise;
  
  return (
    <html lang="en" suppressHydrationWarning className={geist.className}>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          <Toaster position="top-center" richColors />
          <main className="min-h-screen bg-white dark:bg-zinc-950">
            {children}
          </main>
          <footer className="py-6 border-t border-gray-200 dark:border-zinc-800">
            <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
              <p>Built with AI SDK and Google Gemini</p>
            </div>
          </footer>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
