'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { logout } from '@/lib/services/auth';
import { softDeleteAssignment } from '@/lib/services/assignments';
import Link from 'next/link';

interface StudentRecord {
  id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  statusUpdatedAt: string;
  studentName: string;
  minutesRead: number;
}

interface Assignment {
  id: string;
  dueDate: string;
  createdAt: string;
  classroom: { id: string; name: string };
  book: { id: string; title: string; author: string; reading_level: string };
  records: StudentRecord[];
  stats: {
    totalStudents: number;
    completedCount: number;
    inProgressCount: number;
    notStartedCount: number;
    minutesRead: number;
  };
}

interface Props {
  initialAssignments: Assignment[];
}

export default function TeacherDashboard({ initialAssignments }: Props) {
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to archive this reading assignment? Charlotte\'s Web data will remain safe.')) {
      try {
        await softDeleteAssignment(id);
        setAssignments(assignments.filter((a) => a.id !== id));
      } catch (err: any) {
        alert(err.message || 'Failed to archive assignment.');
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="px-2 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg">Completed</span>;
      case 'in_progress':
        return <span className="px-2 py-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg">In Progress</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 rounded-lg">Not Started</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <!-- Top navbar -->
      <header className="bg-white border-bottom border-slate-200/80 sticky top-0 z-10 shadow-sm px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-violet-600 text-white font-bold text-lg w-9 h-9 rounded-xl flex items-center justify-center">I</div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Teacher Dashboard</h1>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 rounded-xl px-4 py-2 transition-all"
        >
          Sign Out
        </button>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 flex flex-col gap-8">
        
        <!-- Welcome Summary Banner -->
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Active Assignments</h2>
            <p className="text-sm text-slate-500">Assign reading lists and track student engagement metrics.</p>
          </div>
          <Link
            href="/teacher/assignments/new"
            className="inline-flex items-center justify-center px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm rounded-xl shadow-md transition-all transform hover:-translate-y-0.5"
          >
            Create Reading Assignment
          </Link>
        </div>

        {assignments.length === 0 ? (
          <div className="text-center bg-white border border-slate-200 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center gap-4 shadow-sm">
            <span className="text-3xl">📚</span>
            <div className="text-slate-700 font-bold text-lg">No Assignments Created Yet</div>
            <p className="text-slate-500 text-sm max-w-sm">Create your first reading assignment to start tracking student progress.</p>
            <Link
              href="/teacher/assignments/new"
              className="mt-2 text-sm font-semibold text-violet-600 hover:text-violet-700 hover:underline"
            >
              Get started now &rarr;
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Book Title</th>
                  <th className="px-6 py-4">Class</th>
                  <th className="px-6 py-4">Due Date</th>
                  <th className="px-6 py-4">Progress Breakdown</th>
                  <th className="px-6 py-4 text-center">Total Min</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {assignments.map((item) => (
                  <React.Fragment key={item.id}>
                    <!-- Primary Assignment Row -->
                    <tr 
                      className={`hover:bg-slate-50/50 cursor-pointer transition-all ${expandedId === item.id ? 'bg-slate-50/30' : ''}`}
                      onClick={() => toggleExpand(item.id)}
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{item.book.title}</div>
                        <div className="text-xs text-slate-400">{item.book.author}</div>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-500">{item.classroom.name}</td>
                      <td className="px-6 py-4 text-slate-500 font-medium">
                        {new Date(item.dueDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 text-xxs font-bold text-emerald-700 bg-emerald-50 rounded-md" title="Completed">
                            {item.stats.completedCount} Done
                          </span>
                          <span className="px-2 py-0.5 text-xxs font-bold text-amber-700 bg-amber-50 rounded-md" title="In Progress">
                            {item.stats.inProgressCount} Active
                          </span>
                          <span className="px-2 py-0.5 text-xxs font-bold text-slate-500 bg-slate-50 rounded-md" title="Not Started">
                            {item.stats.notStartedCount} Pending
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-900 text-center">{item.stats.minutesRead} m</td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => toggleExpand(item.id)}
                            className="text-xs font-semibold text-violet-600 hover:text-violet-700 hover:underline cursor-pointer"
                          >
                            {expandedId === item.id ? 'Hide Details' : 'View Details'}
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-xs font-semibold text-red-500 hover:text-red-700 hover:underline cursor-pointer"
                          >
                            Archive
                          </button>
                        </div>
                      </td>
                    </tr>

                    <!-- Expandable Student Details Row -->
                    {expandedId === item.id && (
                      <tr>
                        <td colSpan={6} className="bg-slate-50/30 px-6 py-4 border-t border-slate-100">
                          <div className="text-slate-800 font-bold text-xs uppercase tracking-wider mb-3">Student Status Details</div>
                          {item.records.length === 0 ? (
                            <p className="text-xs italic text-slate-400">No students are currently assigned to this classroom roster.</p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                              {item.records.map((rec) => (
                                <div key={rec.id} className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs flex justify-between items-center gap-4">
                                  <div>
                                    <div className="font-semibold text-slate-950 text-sm">{rec.studentName}</div>
                                    <div className="text-xxs text-slate-400 mt-0.5">
                                      Updated {new Date(rec.statusUpdatedAt).toLocaleDateString()}
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end gap-1.5">
                                    {getStatusBadge(rec.status)}
                                    <span className="text-xs font-bold text-slate-800">{rec.minutesRead} mins read</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
