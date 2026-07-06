'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { logout } from '@/lib/services/auth';
import { updateAssignmentStatus } from '@/lib/services/session';
import Link from 'next/link';

interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl: string | null;
  readingLevel: string | null;
}

interface ReadingRecord {
  recordId: string;
  assignmentId: string;
  dueDate: string;
  status: 'not_started' | 'in_progress' | 'completed';
  statusUpdatedAt: string;
  minutesRead: number;
  isOverdue: boolean;
  hasLateLog: boolean;
  book: Book;
}

interface Props {
  initialReadings: ReadingRecord[];
}

export default function StudentDashboard({ initialReadings }: Props) {
  const router = useRouter();
  const [readings, setReadings] = useState<ReadingRecord[]>(initialReadings);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback;

  const handleStatusToggle = async (recordId: string, currentStatus: string) => {
    // completed -> in_progress (reopen) is allowed
    // in_progress -> completed is allowed
    // back to not_started is blocked by triggers, we handle it natively in UI too
    const nextStatus = currentStatus === 'completed' ? 'in_progress' : 'completed';
    
    try {
      await updateAssignmentStatus({ recordId, status: nextStatus });
      setReadings(
        readings.map((r) =>
          r.recordId === recordId
            ? { ...r, status: nextStatus, statusUpdatedAt: new Date().toISOString() }
            : r
        )
      );
      router.refresh();
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Status transition rejected.'));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'in_progress':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      default:
        return 'text-slate-500 bg-slate-50 border-slate-200';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-bottom border-slate-200/80 sticky top-0 z-10 shadow-sm px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-600 text-white font-bold text-lg w-9 h-9 rounded-xl flex items-center justify-center">S</div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Student Reading Space</h1>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 rounded-xl px-4 py-2 transition-all"
        >
          Sign Out
        </button>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8 flex flex-col gap-8">
        
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">My Reading Assignments</h2>
          <p className="text-sm text-slate-500">View assigned books, log reading session logs, and update status.</p>
        </div>

        {readings.length === 0 ? (
          <div className="text-center bg-white border border-slate-200 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center gap-4 shadow-sm">
            <span className="text-3xl">📖</span>
            <div className="text-slate-700 font-bold text-lg">All caught up!</div>
            <p className="text-slate-500 text-sm max-w-sm">You do not have any reading assignments currently assigned by your teacher.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {readings.map((item) => (
              <div 
                key={item.recordId} 
                className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between gap-5 relative overflow-hidden"
              >
                {item.isOverdue && (
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-500" />
                )}

                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 text-xxs font-bold uppercase border rounded-md ${getStatusColor(item.status)}`}>
                        {item.status.replace('_', ' ')}
                      </span>
                      {item.isOverdue && (
                        <span className="px-2 py-0.5 text-xxs font-bold text-red-700 bg-red-50 border border-red-200 rounded-md">
                          Overdue
                        </span>
                      )}
                      {item.hasLateLog && (
                        <span className="px-2 py-0.5 text-xxs font-bold text-orange-700 bg-orange-50 border border-orange-200 rounded-md">
                          Logged late
                        </span>
                      )}
                    </div>
                    
                    <h3 className="mt-3 text-lg font-bold text-slate-950 tracking-tight leading-snug">{item.book.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">by {item.book.author}</p>
                    
                    <div className="mt-4 flex flex-col gap-1.5 text-xs text-slate-500 font-medium">
                      <div>Due date: {new Date(item.dueDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}</div>
                      <div>Level: {item.book.readingLevel || 'Grade 3–5'}</div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center p-3 border border-slate-100 rounded-xl bg-slate-50/50 min-w-[90px]">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Minutes</div>
                    <div className="text-2xl font-black text-slate-800 mt-1">{item.minutesRead}</div>
                    <div className="text-xxs text-slate-400 font-semibold mt-0.5">Logged</div>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4 flex justify-between items-center flex-wrap gap-2">
                  <button
                    onClick={() => handleStatusToggle(item.recordId, item.status)}
                    disabled={item.status === 'not_started'}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 rounded-lg px-3 py-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title={item.status === 'not_started' ? 'Open the book to start reading and change status' : ''}
                  >
                    {item.status === 'completed' ? 'Mark In Progress (Reopen)' : 'Mark Completed'}
                  </button>

                  <Link
                    href={`/student/read/${item.recordId}`}
                    className="inline-flex items-center justify-center px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all transform hover:-translate-y-0.5"
                  >
                    Open &amp; Read Book &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
