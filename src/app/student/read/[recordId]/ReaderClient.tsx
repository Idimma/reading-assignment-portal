'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { logReadingSession } from '@/lib/services/session';
import Link from 'next/link';

interface BookContent {
  title: string;
  author: string;
  contentText: string;
}

interface Props {
  recordId: string;
  book: BookContent;
}

interface AIExplanation {
  word: string;
  definition: string;
  explanation: string;
}

export default function ReaderClient({ recordId, book }: Props) {
  const router = useRouter();
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [logging, setLogging] = useState(false);
  const [logSuccess, setLogSuccess] = useState(false);

  // Vocabulary Explainer State
  const [selectedWord, setSelectedWord] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AIExplanation | null>(null);

  // Tracking Ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Active Reading Telemetry Timer
  useEffect(() => {
    // Visibility listener: pause clock when tab is backgrounded
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setIsActive(true);
      } else {
        setIsActive(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    if (isActive) {
      timerRef.current = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive]);

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return [
      hrs > 0 ? String(hrs).padStart(2, '0') : null,
      String(mins).padStart(2, '0'),
      String(secs).padStart(2, '0'),
    ]
      .filter(Boolean)
      .join(':');
  };

  // Log session to DB
  const handleLogSession = async () => {
    if (seconds < 5) {
      alert('Please read for at least 5 seconds to log a reading session.');
      return;
    }

    setLogging(true);
    setLogSuccess(false);

    try {
      await logReadingSession({ recordId, seconds });
      setLogSuccess(true);
      setSeconds(0); // Reset local timer
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Failed to log reading session.');
    } finally {
      setLogging(false);
    }
  };

  // 2. Vocabulary Explainer (AI Highlight Widget)
  const handleTextHighlight = async () => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    
    // Validate selection length (limit to single word or short phrase, max 30 chars)
    if (!text || text.length === 0 || text.length > 30 || text.includes(' ')) {
      return;
    }

    // Clean word string
    const wordClean = text.replace(/[^a-zA-Z]/g, '');
    if (!wordClean) return;

    setSelectedWord(wordClean);
    setAiLoading(true);
    setAiResult(null);

    try {
      const response = await fetch('/api/v1/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: wordClean }),
      });
      const data = await response.json();
      
      if (response.ok) {
        setAiResult({
          word: wordClean,
          definition: data.definition,
          explanation: data.explanation,
        });
      } else {
        throw new Error(data.error || 'Failed to explain word');
      }
    } catch (err: any) {
      console.error(err);
      setSelectedWord('');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col h-screen overflow-hidden">
      <!-- Reader Header -->
      <header className="bg-white border-bottom border-slate-200/80 px-6 py-4 flex justify-between items-center shadow-xs shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/student" className="text-slate-500 hover:text-slate-800 font-bold text-sm select-none">
            &larr; Exit
          </Link>
          <div className="h-4 w-px bg-slate-200" />
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-none">{book.title}</h1>
            <p className="text-xxs text-slate-400 mt-1">by {book.author}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <!-- Active Clock -->
          <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-1.5 border border-slate-200/50">
            <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            <span className="text-xs font-mono font-bold text-slate-700">{formatTime(seconds)}</span>
          </div>
          
          <button
            onClick={handleLogSession}
            disabled={logging || seconds < 5}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs rounded-xl shadow-xs transition-all"
          >
            {logging ? 'Saving...' : 'Log Session'}
          </button>
        </div>
      </header>

      <!-- Layout Split Screen -->
      <div className="flex-1 flex overflow-hidden">
        
        <!-- Left Side: Book content viewer -->
        <main 
          onMouseUp={handleTextHighlight}
          className="flex-1 overflow-y-auto px-8 md:px-16 py-10 bg-white leading-relaxed text-slate-800 text-lg selection:bg-violet-200/80 font-serif max-w-4xl mx-auto border-r border-slate-100"
        >
          {book.contentText.split('\n').map((para, idx) => (
            <p key={idx} className="mb-6 indent-8">
              {para}
            </p>
          ))}
        </main>

        <!-- Right Side: Dashboard widgets -->
        <aside className="w-80 border-l border-slate-200/80 bg-slate-50 overflow-y-auto p-6 flex flex-col gap-6 shrink-0 hidden md:flex">
          
          <!-- Logging Telemetry widget -->
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col gap-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Session Tracking</h3>
            {logSuccess && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xxs font-semibold text-emerald-700">
                Session logged successfully! Status updated.
              </div>
            )}
            <p className="text-xs text-slate-500 leading-normal">
              Keep reading! The clock counts active seconds. If you switch tabs, it pauses. Log your time before closing the reader.
            </p>
            <div className="mt-1 flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="text-xs text-slate-400 font-semibold">Active:</span>
              <span className="text-xs font-bold text-slate-700">{isActive ? 'Yes' : 'Paused (Background)'}</span>
            </div>
          </div>

          <!-- Vocabulary Assistant Widget (The Scholastic Differentiator) -->
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex-1 flex flex-col gap-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Vocabulary Assistant</h3>
            
            {!selectedWord && !aiLoading && (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 border border-dashed border-slate-200 rounded-xl p-4 text-xs italic text-slate-400">
                <span>💡</span>
                Highlight a word on the left to inspect its definition.
              </div>
            )}

            {aiLoading && (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
                <span className="border-2 border-violet-200 border-t-violet-600 rounded-full w-6 h-6 animate-spin" />
                <span className="text-xs text-slate-500 font-semibold">Consulting AI helper...</span>
              </div>
            )}

            {aiResult && (
              <div className="flex flex-col gap-3.5">
                <div>
                  <span className="text-xxs font-bold uppercase text-violet-600 tracking-wider">Target Word</span>
                  <div className="text-lg font-black text-slate-950 tracking-tight mt-0.5">{aiResult.word}</div>
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <span className="text-xxs font-bold uppercase text-slate-400 tracking-wider">Simple Definition</span>
                  <p className="text-xs text-slate-700 leading-normal mt-1">{aiResult.definition}</p>
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <span className="text-xxs font-bold uppercase text-slate-400 tracking-wider">Grade 4 Example</span>
                  <p className="text-xs italic text-slate-600 leading-normal mt-1">
                    &ldquo;{aiResult.explanation}&rdquo;
                  </p>
                </div>
              </div>
            )}
          </div>

        </aside>

      </div>
    </div>
  );
}
