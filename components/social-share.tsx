'use client';

import { Twitter, Instagram, Share2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface SocialShareProps {
  title: string;
  url: string;
}

export function SocialShare({ title, url }: SocialShareProps) {
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleInstagramShare = () => {
    navigator.clipboard.writeText(`${title} ${url}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        className="flex items-center text-muted-foreground hover:text-foreground transition-colors p-1"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Share post"
      >
        <Share2 className="w-4 h-4" />
      </button>
      {isOpen && (
        <div className="absolute left-0 mt-2 flex flex-col gap-3 bg-background border rounded-md p-3 shadow-md z-10">
          <div className="flex gap-3">
            <a 
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-md hover:bg-muted"
              aria-label="Share on Twitter"
            >
              <Twitter className="w-5 h-5" />
            </a>
            <button
              onClick={handleInstagramShare}
              className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-md hover:bg-muted"
              aria-label="Share on Instagram (Copy to clipboard)"
            >
              <Instagram className="w-5 h-5" />
            </button>
          </div>
          {copied && (
            <div className="text-xs text-green-500 mt-1 text-center">
              Link copied!
            </div>
          )}
        </div>
      )}
    </div>
  );
} 