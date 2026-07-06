'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { logReadingSession, markOpened } from '@/lib/services/session';
import { getWordBookmarks, addWordBookmark, removeWordBookmark, type WordBookmark } from '@/lib/services/bookmarks';
import Link from 'next/link';

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

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

  // Bookmarks State
  const [sidebarTab, setSidebarTab] = useState<'vocab' | 'bookmarks'>('vocab');
  const [bookmarks, setBookmarks] = useState<WordBookmark[]>([]);
  const [savingBookmark, setSavingBookmark] = useState(false);

  // Tracking Ref
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let cancelled = false;

    markOpened(recordId)
      .then(() => {
        if (!cancelled) router.refresh();
      })
      .catch((error: unknown) => {
        console.error(getErrorMessage(error, 'Failed to mark assignment opened.'));
      });

    getWordBookmarks(recordId)
      .then((data) => { if (!cancelled) setBookmarks(data); })
      .catch((error: unknown) => {
        console.error(getErrorMessage(error, 'Failed to load bookmarks.'));
      });

    return () => {
      cancelled = true;
    };
  }, [recordId, router]);

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
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to log reading session.'));
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
    } catch (err: unknown) {
      console.error(err);
      setSelectedWord('');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveBookmark = async () => {
    if (!aiResult) return;
    setSavingBookmark(true);
    try {
      const saved = await addWordBookmark(recordId, aiResult.word, aiResult.definition, aiResult.explanation);
      setBookmarks((prev) => {
        const exists = prev.some((b) => b.id === saved.id);
        return exists ? prev : [saved, ...prev];
      });
    } catch (err: unknown) {
      console.error(getErrorMessage(err, 'Failed to save bookmark.'));
    } finally {
      setSavingBookmark(false);
    }
  };

  const handleRemoveBookmark = async (bookmarkId: string) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId));
    try {
      await removeWordBookmark(bookmarkId);
    } catch (err: unknown) {
      console.error(getErrorMessage(err, 'Failed to remove bookmark.'));
      // Re-fetch to restore correct state on failure
      getWordBookmarks(recordId).then(setBookmarks).catch(console.error);
    }
  };

  const isWordBookmarked = aiResult
    ? bookmarks.some((b) => b.word.toLowerCase() === aiResult.word.toLowerCase())
    : false;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col h-screen overflow-hidden">
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

      <div className="flex-1 flex overflow-hidden">
        
        <main 
          onMouseUp={handleTextHighlight}
          className="flex-1 overflow-y-auto px-8 md:px-16 py-10 bg-white leading-relaxed text-slate-800 text-lg selection:bg-violet-200/80 font-serif max-w-4xl mx-auto border-r border-slate-100"
        >
          {!book.contentText ? (
            <div className="text-center p-12 flex flex-col items-center gap-4">
              <span className="text-3xl">⚠️</span>
              <div className="font-bold text-slate-800 text-lg">Content Temporarily Unavailable</div>
              <p className="text-slate-500 text-sm max-w-md">
                We are unable to load the text of this book. Please try opening the book in a new tab or contact your teacher.
              </p>
              <a href="https://www.gutenberg.org" target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-violet-600 hover:underline">
                Search Project Gutenberg &rarr;
              </a>
            </div>
          ) : (
            book.contentText.split('\n').map((para, idx) => (
              <p key={idx} className="mb-6 indent-8">
                {para}
              </p>
            ))
          )}
        </main>

        <aside className="w-80 border-l border-slate-200/80 bg-slate-50 overflow-y-auto p-6 flex flex-col gap-6 shrink-0 hidden md:flex">

          {/* Sidebar tab switcher */}
          <div className="flex rounded-xl border border-slate-200 bg-white overflow-hidden shrink-0">
            <button
              onClick={() => setSidebarTab('vocab')}
              className={`flex-1 text-xs font-semibold py-2 transition-colors ${
                sidebarTab === 'vocab'
                  ? 'bg-violet-600 text-white'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              Vocabulary
            </button>
            <button
              onClick={() => setSidebarTab('bookmarks')}
              className={`flex-1 text-xs font-semibold py-2 transition-colors relative ${
                sidebarTab === 'bookmarks'
                  ? 'bg-violet-600 text-white'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              Saved Words
              {bookmarks.length > 0 && (
                <span className={`ml-1.5 inline-flex items-center justify-center rounded-full w-4 h-4 text-[10px] font-bold ${
                  sidebarTab === 'bookmarks' ? 'bg-white/30 text-white' : 'bg-violet-100 text-violet-700'
                }`}>
                  {bookmarks.length}
                </span>
              )}
            </button>
          </div>

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

          {/* Vocabulary Assistant tab */}
          {sidebarTab === 'vocab' && (
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
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xxs font-bold uppercase text-violet-600 tracking-wider">Target Word</span>
                      <div className="text-lg font-black text-slateate-950 tracking-tight mt-0.5">{aiResult.word}</div>
                    </div>
                    <button
                      onClick={handleSaveBookmark}
                      disabled={savingBookmark || isWordBookmarked}
                      title={isWordBookmarked ? 'Already saved' : 'Save word'}
                      className={`mt-1 shrink-0 p-1.5 rounded-lg border transition-colors ${
                        isWordBookmarked
                          ? 'border-violet-200 bg-violet-50 text-violet-500 cursor-default'
                          : 'border-slate-200 hover:border-violet-300 hover:bg-violet-50 text-slate-400 hover:text-violet-600'
                      }`}
                    >
                      {savingBookmark ? (
                        <span className="block w-3.5 h-3.5 border border-violet-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                          <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
                          <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
                        </svg>
                      )}
                    </button>
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
          )}

          {/* Saved Words tab */}
          {sidebarTab === 'bookmarks' && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex-1 flex flex-col gap-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Saved Words</h3>

              {bookmarks.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 border border-dashed border-slate-200 rounded-xl p-4 text-xs italic text-slate-400">
                  <span>🔖</span>
                  No words saved yet. Look up a word and tap the save icon.
                </div>
              ) : (
                <ul className="flex flex-col gap-3 overflow-y-auto">
                  {bookmarks.map((b) => (
                    <li key={b.id} className="border border-slate-100 rounded-xl p-3 flex flex-col gap-1.5 group">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-black text-slate-900 tracking-tight">{b.word}</span>
                        <button
                          onClick={() => handleRemoveBookmark(b.id)}
                          title="Remove bookmark"
                          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-400"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                            <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                          </svg>
                        </button>
                      </div>
                      <p className="text-xs text-slate-600 leading-normal">{b.definition}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

        </aside>

      </div>
    </div>
  );
}
