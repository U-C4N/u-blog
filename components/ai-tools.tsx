'use client'

import { useState } from 'react';
import { Wand2, BookOpen, Loader2 } from 'lucide-react';
import { BlurBackground } from './ui/blur-background';
import { fixGrammar, generateArticle } from '@/lib/deepseek';
import { researchTopic } from '@/lib/research';

interface AIToolsProps {
  content: string;
  onUpdate: (newContent: string) => void;
}

export function AITools({ content, onUpdate }: AIToolsProps) {
  const [isFixingGrammar, setIsFixingGrammar] = useState(false);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [researchStatus, setResearchStatus] = useState<'idle' | 'researching' | 'writing'>('idle');
  const [showResearchPrompt, setShowResearchPrompt] = useState(false);
  const [topic, setTopic] = useState('');

  const handleGrammarFix = async () => {
    if (!content.trim()) return;
    
    try {
      setIsFixingGrammar(true);
      const fixedContent = await fixGrammar(content);
      onUpdate(fixedContent);
    } catch (error) {
      console.error('Error fixing grammar:', error);
      alert('Failed to fix grammar. Please try again.');
    } finally {
      setIsFixingGrammar(false);
    }
  };

  const handleResearchGenerate = async () => {
    if (!topic.trim()) return;
    
    try {
      setIsGeneratingContent(true);
      setResearchStatus('researching');
      
      // First, research the topic
      const research = await researchTopic(topic);
      
      setResearchStatus('writing');
      // Then, generate the article using the research
      const generatedContent = await generateArticle(topic, research);
      
      onUpdate(generatedContent);
      setShowResearchPrompt(false);
      setTopic('');
    } catch (error) {
      console.error('Error generating content:', error);
      alert('Failed to generate content. Please try again.');
    } finally {
      setIsGeneratingContent(false);
      setResearchStatus('idle');
    }
  };

  return (
    <>
      <div className="flex gap-2 mb-4">
        <button
          onClick={handleGrammarFix}
          disabled={isFixingGrammar || !content.trim()}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-primary/10 text-primary hover:bg-primary/20 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isFixingGrammar ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Wand2 className="w-4 h-4" />
          )}
          Fix Grammar
        </button>

        <button
          onClick={() => setShowResearchPrompt(true)}
          disabled={isGeneratingContent}
          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-primary/10 text-primary hover:bg-primary/20 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <BookOpen className="w-4 h-4" />
          Research & Write
        </button>
      </div>

      <BlurBackground isVisible={showResearchPrompt}>
        <div className="bg-card p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
          <h3 className="text-lg font-semibold mb-4">Generate Research Article</h3>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Enter topic or title..."
            className="w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 mb-4"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowResearchPrompt(false)}
              className="px-4 py-2 text-sm border rounded-md hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleResearchGenerate}
              disabled={isGeneratingContent || !topic.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isGeneratingContent ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {researchStatus === 'researching' ? 'Researching...' : 'Writing...'}
                </>
              ) : (
                <>
                  <BookOpen className="w-4 h-4" />
                  Generate
                </>
              )}
            </button>
          </div>
        </div>
      </BlurBackground>
    </>
  );
}