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
  const [wordInput, setWordInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AIExplanation | null>(null);
  const [readerMessage, setReaderMessage] = useState<string | null>(null);
  const [readerError, setReaderError] = useState<string | null>(null);

  // Bookmarks State
  const [sidebarTab, setSidebarTab] = useState<'vocab' | 'bookmarks'>('vocab');
  const [bookmarks, setBookmarks] = useState<WordBookmark[]>([]);
  const [savingBookmark, setSavingBookmark] = useState(false);

  // Text-selection popover + color highlights
  const [popover, setPopover] = useState<{ text: string; x: number; y: number } | null>(null);
  const [colorPickerVisible, setColorPickerVisible] = useState(false);
  const [highlights, setHighlights] = useState<Array<{ id: string; paraIdx: number; start: number; end: number; color: string }>>([]);

  // Tracking Refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

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

  // Dismiss popover on outside click
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopover(null);
        setColorPickerVisible(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

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
      setReaderError('Please read for at least 5 seconds to log a reading session.');
      return;
    }

    setLogging(true);
    setLogSuccess(false);
    setReaderError(null);

    try {
      await logReadingSession({ recordId, seconds });
      setLogSuccess(true);
      setReaderMessage('Reading session logged successfully.');
      setSeconds(0); // Reset local timer
      router.refresh();
    } catch (err: unknown) {
      setReaderError(getErrorMessage(err, 'Failed to log reading session.'));
    } finally {
      setLogging(false);
    }
  };

  const explainWord = async (text: string) => {
    if (!text || text.length === 0 || text.length > 30 || text.includes(' ')) {
      return;
    }

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
        setReaderMessage(`Definition loaded for ${wordClean}.`);
        setSidebarTab('vocab');
      } else {
        throw new Error(data.error || 'Failed to explain word');
      }
    } catch (err: unknown) {
      console.error(err);
      setSelectedWord('');
      setReaderError('Failed to explain word.');
    } finally {
      setAiLoading(false);
    }
  };

  // 2. Show popover on text selection
  const handleTextHighlight = () => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (!text) { setPopover(null); return; }
    const range = selection!.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setPopover({ text, x: rect.left + rect.width / 2, y: rect.top });
    setColorPickerVisible(false);
  };

  const handleVocabularySubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await explainWord(wordInput.trim());
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

  // Popover: define then auto-save to bookmarks
  const handlePopoverSave = async (text: string) => {
    const clean = text.replace(/[^a-zA-Z\s'-]/g, '').trim().slice(0, 50);
    if (!clean) return;
    setSavingBookmark(true);
    try {
      const response = await fetch('/api/v1/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: clean }),
      });
      const data = await response.json();
      if (response.ok) {
        const saved = await addWordBookmark(recordId, clean, data.definition, data.explanation);
        setBookmarks((prev) => {
          const exists = prev.some((b) => b.id === saved.id);
          return exists ? prev : [saved, ...prev];
        });
        setReaderMessage(`"${clean}" saved to your word list.`);
      }
    } catch (err: unknown) {
      console.error(getErrorMessage(err, 'Failed to save.'));
    } finally {
      setSavingBookmark(false);
    }
  };

  // Popover: compute character offset within a paragraph element across all child text nodes
  const getAbsoluteOffset = (container: Node, offset: number, paraEl: Element): number => {
    let abs = 0;
    const walk = document.createTreeWalker(paraEl, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walk.nextNode())) {
      if (node === container) return abs + offset;
      abs += node.textContent?.length ?? 0;
    }
    return abs + offset;
  };

  // Popover: apply a color highlight to the active selection
  const handleColorHighlight = (color: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) { setPopover(null); return; }
    const range = selection.getRangeAt(0);

    let node: Node | null = range.startContainer;
    if (node.nodeType === Node.TEXT_NODE) node = (node as Text).parentElement;
    while (node && (node as Element).tagName !== 'P') node = (node as Element).parentElement;
    if (!node) { setPopover(null); return; }

    const paraEl = node as HTMLElement;
    const idxAttr = paraEl.getAttribute('data-para-idx');
    if (idxAttr === null) { setPopover(null); return; }

    const paraIdx = parseInt(idxAttr, 10);
    const start = getAbsoluteOffset(range.startContainer, range.startOffset, paraEl);
    const end = getAbsoluteOffset(range.endContainer, range.endOffset, paraEl);

    setHighlights((prev) => [
      ...prev,
      { id: Math.random().toString(36).slice(2), paraIdx, start: Math.min(start, end), end: Math.max(start, end), color },
    ]);
    selection.removeAllRanges();
    setPopover(null);
    setColorPickerVisible(false);
  };

  // Render a paragraph string with color-highlight spans applied
  const renderParagraph = (text: string, paraIdx: number): React.ReactNode => {
    const paraHighlights = highlights
      .filter((h) => h.paraIdx === paraIdx)
      .sort((a, b) => a.start - b.start);
    if (paraHighlights.length === 0) return text;

    const nodes: React.ReactNode[] = [];
    let cursor = 0;
    for (const h of paraHighlights) {
      const s = Math.max(cursor, h.start);
      const e = Math.min(text.length, h.end);
      if (s > cursor) nodes.push(text.slice(cursor, s));
      if (s < e) {
        nodes.push(
          <mark key={h.id} style={{ backgroundColor: h.color, borderRadius: '2px', padding: '0 1px' }}>
            {text.slice(s, e)}
          </mark>
        );
      }
      cursor = e;
    }
    if (cursor < text.length) nodes.push(text.slice(cursor));
    return <>{nodes}</>;
  };

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
            aria-describedby={readerError ? 'reader-error' : undefined}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs rounded-xl shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-2"
          >
            {logging ? 'Saving...' : 'Log Session'}
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        
        <main
          id="main-content"
          tabIndex={-1}
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
              <p key={idx} data-para-idx={idx} className="mb-6 indent-8">
                {renderParagraph(para, idx)}
              </p>
            ))
          )}
        </main>

        <aside className="w-130 border-l border-slate-200/80 bg-slate-50 overflow-y-auto p-6 flex flex-col gap-6 shrink-0 hidden md:flex">

          {/* Sidebar tab switcher */}
          <div className="sr-only" role="status" aria-live="polite">
            {readerMessage}
          </div>
          {readerError && (
            <div id="reader-error" role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
              {readerError}
            </div>
          )}

          <div role="tablist" aria-label="Reader sidebar" className="flex rounded-xl border border-slate-200 bg-white overflow-hidden shrink-0">
            <button
              id="vocab-tab"
              role="tab"
              aria-selected={sidebarTab === 'vocab'}
              aria-controls="vocab-panel"
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
              id="bookmarks-tab"
              role="tab"
              aria-selected={sidebarTab === 'bookmarks'}
              aria-controls="bookmarks-panel"
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
            <div id="vocab-panel" role="tabpanel" aria-labelledby="vocab-tab" className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex-1 flex flex-col gap-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Vocabulary Assistant</h3>
              <form onSubmit={handleVocabularySubmit} className="flex gap-2">
                <label htmlFor="word-lookup" className="sr-only">Word to define</label>
                <input
                  id="word-lookup"
                  value={wordInput}
                  onChange={(event) => setWordInput(event.target.value)}
                  maxLength={30}
                  placeholder="Type a word"
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                />
                <button
                  type="submit"
                  disabled={aiLoading || !wordInput.trim()}
                  className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:ring-offset-2"
                >
                  Define
                </button>
              </form>

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
                      <div className="text-lg font-black text-slate-950 tracking-tight mt-0.5">{aiResult.word}</div>
                    </div>
                    <button
                      onClick={handleSaveBookmark}
                      disabled={savingBookmark || isWordBookmarked}
                      title={isWordBookmarked ? 'Already saved' : 'Save word'}
                      aria-label={isWordBookmarked ? `${aiResult.word} is already saved` : `Save ${aiResult.word}`}
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
            <div id="bookmarks-panel" role="tabpanel" aria-labelledby="bookmarks-tab" className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex-1 flex flex-col gap-3">
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
                          aria-label={`Remove ${b.word} bookmark`}
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

      {/* Text-selection floating popover */}
      {popover && (
        <div
          ref={popoverRef}
          onMouseDown={(e) => e.preventDefault()}
          style={{
            position: 'fixed',
            left: popover.x,
            top: popover.y,
            transform: 'translateX(-50%) translateY(calc(-100% - 10px))',
            zIndex: 50,
          }}
          className="bg-slate-900 rounded-xl shadow-2xl border border-slate-700/50"
        >
          {!colorPickerVisible ? (
            <div className="flex items-center">
              {/* Define word */}
              <button
                onClick={() => {
                  const text = popover.text;
                  setPopover(null);
                  setSidebarTab('vocab');
                  explainWord(text);
                }}
                disabled={popover.text.includes(' ') || popover.text.length > 30}
                title={popover.text.includes(' ') ? 'Select a single word to define' : 'Look up definition'}
                className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-white/10 transition-colors rounded-l-xl disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-violet-400 shrink-0">
                  <path d="M5 3.5h6A1.5 1.5 0 0 1 12.5 5v1.5a.5.5 0 0 0 1 0V5a2.5 2.5 0 0 0-2.5-2.5H5A2.5 2.5 0 0 0 2.5 5v6A2.5 2.5 0 0 0 5 13.5h1.5a.5.5 0 0 0 0-1H5A1.5 1.5 0 0 1 3.5 11V5A1.5 1.5 0 0 1 5 3.5Z" />
                  <path d="M10.5 9a.5.5 0 0 1 .5.5V13h3.5a.5.5 0 0 1 0 1H11a.5.5 0 0 1-.5-.5v-4a.5.5 0 0 1 .5-.5Z" />
                </svg>
                Define
              </button>

              <div className="w-px h-5 bg-slate-700 shrink-0" />

              {/* Save word / text */}
              <button
                onClick={() => {
                  const text = popover.text;
                  setPopover(null);
                  handlePopoverSave(text);
                }}
                disabled={savingBookmark}
                title="Save to your word list"
                className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-white/10 transition-colors disabled:opacity-40"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-emerald-400 shrink-0">
                  <path d="M3 3.5A1.5 1.5 0 0 1 4.5 2h7A1.5 1.5 0 0 1 13 3.5v10.137a.5.5 0 0 1-.74.439L8 11.907l-4.26 2.169A.5.5 0 0 1 3 13.637V3.5Z" />
                </svg>
                Save
              </button>

              <div className="w-px h-5 bg-slate-700 shrink-0" />

              {/* Color highlight */}
              <button
                onClick={() => setColorPickerVisible(true)}
                title="Highlight text"
                className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-white hover:bg-white/10 transition-colors rounded-r-xl"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-amber-400 shrink-0">
                  <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.774a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.261-4.263a1.75 1.75 0 0 0 0-2.474ZM2.75 12.5a.75.75 0 0 0 0 1.5h10.5a.75.75 0 0 0 0-1.5H2.75Z" />
                </svg>
                Color
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2.5">
              <button
                onClick={() => setColorPickerVisible(false)}
                className="text-slate-400 hover:text-white transition-colors text-sm leading-none mr-0.5"
                aria-label="Back to menu"
              >
                ←
              </button>
              {[
                { bg: '#fef08a', label: 'Yellow' },
                { bg: '#bbf7d0', label: 'Green' },
                { bg: '#fbcfe8', label: 'Pink' },
                { bg: '#bae6fd', label: 'Blue' },
                { bg: '#ddd6fe', label: 'Purple' },
              ].map(({ bg, label }) => (
                <button
                  key={bg}
                  onClick={() => handleColorHighlight(bg)}
                  title={`Highlight ${label}`}
                  aria-label={`Highlight ${label}`}
                  style={{ backgroundColor: bg }}
                  className="w-5 h-5 rounded-full border-2 border-white/20 hover:border-white transition-all shadow-sm"
                />
              ))}
            </div>
          )}
          {/* Downward caret */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              top: '100%',
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid #0f172a',
            }}
          />
        </div>
      )}
    </div>
  );
}
