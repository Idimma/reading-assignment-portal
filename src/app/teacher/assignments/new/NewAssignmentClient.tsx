'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createAssignment } from '@/lib/services/assignments';
import Link from 'next/link';

interface Book {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  reading_level: string | null;
}

interface Classroom {
  id: string;
  name: string;
}

interface Props {
  books: Book[];
  classrooms: Classroom[];
}

export default function NewAssignmentClient({ books, classrooms }: Props) {
  const router = useRouter();
  const [selectedBookId, setSelectedBookId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedBookId) {
      setError('Please select a book to assign.');
      return;
    }
    if (!selectedClassId) {
      setError('Please select a classroom roster.');
      return;
    }
    if (!dueDate) {
      setError('Please select a due date.');
      return;
    }

    setLoading(true);

    try {
      await createAssignment({
        bookId: selectedBookId,
        classId: selectedClassId,
        dueDate,
      });
      router.push('/teacher');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to create reading assignment.');
    } finally {
      setLoading(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-bottom border-slate-200/80 sticky top-0 z-10 shadow-sm px-6 py-4 flex items-center gap-4">
        <Link href="/teacher" className="text-slate-500 hover:text-slate-800 font-bold text-sm select-none">
          &larr; Back
        </Link>
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Create Reading Assignment</h1>
      </header>

      <main className="max-w-4xl w-full mx-auto p-6 md:p-8">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-sm">
          <form className="space-y-8" onSubmit={handleSubmit}>
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-sm text-red-600 rounded-xl">
                {error}
              </div>
            )}

            <div>
              <label className="block text-base font-bold text-slate-900 mb-2">
                1. Select Classroom Roster
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full sm:max-w-xs px-3 py-2.5 border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 bg-slate-50 focus:bg-white text-sm"
              >
                <option value="">Choose a classroom...</option>
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-base font-bold text-slate-900 mb-3">
                2. Choose a Book from Catalog
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {books.map((b) => {
                  const isSelected = selectedBookId === b.id;
                  return (
                    <div
                      key={b.id}
                      onClick={() => setSelectedBookId(b.id)}
                      className={`border rounded-2xl p-4 cursor-pointer transition-all flex flex-col gap-2 ${
                        isSelected
                          ? 'border-violet-500 bg-violet-50/10 ring-2 ring-violet-500/20'
                          : 'border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/30'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="font-bold text-slate-950 text-sm leading-snug">{b.title}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{b.author}</div>
                      </div>
                      <div className="mt-2 flex justify-between items-center flex-wrap gap-1 border-t border-slate-100 pt-2.5">
                        <span className="px-2 py-0.5 text-xxs font-bold text-slate-500 bg-slate-100 rounded-md">
                          {b.reading_level || 'Grade 3–5'}
                        </span>
                        {isSelected && (
                          <span className="text-xxs font-bold text-violet-600">Selected</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-base font-bold text-slate-900 mb-2">
                3. Choose Due Date
              </label>
              <input
                type="date"
                min={todayStr}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full sm:max-w-xs px-3 py-2 border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 bg-slate-50 focus:bg-white text-sm"
              />
            </div>

            <div className="border-t border-slate-100 pt-6 flex justify-end gap-3">
              <Link
                href="/teacher"
                className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-xl transition-all"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm rounded-xl shadow-md transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Assign Book'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
