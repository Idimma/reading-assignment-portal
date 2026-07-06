'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/services/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await login({ email, password });
      if (result.role === 'teacher') {
        router.push('/teacher');
      } else {
        router.push('/student');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : null;
      setError(message && message !== '{}' ? message : 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSelect = (uEmail: string) => {
    setEmail(uEmail);
    setPassword('Demo1234!');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[20%] w-[50vw] h-[50vw] bg-radial from-violet-100 to-transparent blur-3xl -z-10 pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 text-white font-bold text-xl shadow-md">
          RG
        </div>
        <h2 className="mt-6 text-3xl font-extrabold text-slate-900 tracking-tight">
          Scholastic Reading Portal
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Sign in to manage assignments or track reading time
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-slate-200/80 rounded-2xl sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-sm text-red-600 rounded-xl">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 bg-slate-50 focus:bg-white transition-all text-sm text-slate-900"
                  placeholder="name@demo.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 bg-slate-50 focus:bg-white transition-all text-sm text-slate-900"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>

          <div className="mt-8 border-t border-slate-100 pt-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center">
              Quick Test Accounts
            </h3>
            <p className="text-xxs text-slate-400 text-center mb-3">Password: Demo1234!</p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => handleQuickSelect('teacher1@demo.com')}
                className="p-2 border border-slate-200 rounded-xl hover:border-violet-500 hover:bg-violet-50/20 text-xs font-medium text-slate-700 transition-all text-left"
              >
                <div className="text-violet-600 font-semibold">Teacher View</div>
                <div className="text-xxs text-slate-400 truncate">teacher1@demo.com</div>
              </button>
              <button
                onClick={() => handleQuickSelect('student1@demo.com')}
                className="p-2 border border-slate-200 rounded-xl hover:border-violet-500 hover:bg-violet-50/20 text-xs font-medium text-slate-700 transition-all text-left"
              >
                <div className="text-emerald-600 font-semibold">Student View</div>
                <div className="text-xxs text-slate-400 truncate">student1@demo.com</div>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
