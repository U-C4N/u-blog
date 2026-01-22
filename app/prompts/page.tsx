'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSupabaseBrowser, Prompt } from '@/lib/supabase/config';
import { Button } from '@/components/ui/button';
import { Copy, Check, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPrompts() {
      try {
        // Use cached Supabase client instead of creating new one each render
        const supabase = getSupabaseBrowser();
        const { data } = await supabase
          .from('prompts')
          .select('*')
          .order('created_at', { ascending: false });

        if (data) {
          setPrompts(data);
        }
      } catch (error) {
        console.error('Error fetching prompts:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPrompts();
  }, []); // Empty deps - fetch once on mount

  // Stable callback using useCallback
  const handleCopyPrompt = useCallback(async (prompt: Prompt) => {
    try {
      await navigator.clipboard.writeText(prompt.content);
      setCopiedPromptId(prompt.id);
      setTimeout(() => setCopiedPromptId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  if (isLoading) {
    return (
      <main className="max-w-[1000px] mx-auto px-6 py-16">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4" />
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-muted rounded" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-[1000px] mx-auto px-6 py-16">
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <h1 className="text-2xl font-bold">Prompts</h1>
      </div>

      <div className="grid gap-4">
        {prompts.map((prompt) => (
          <div key={prompt.id} className="bg-card p-4 rounded-lg border group relative">
            <div className="flex justify-between items-start gap-4 mb-2">
              <h2 className="font-medium text-sm">{prompt.title}</h2>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 hover:bg-transparent opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleCopyPrompt(prompt)}
              >
                {copiedPromptId === prompt.id ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {prompt.content}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
} 