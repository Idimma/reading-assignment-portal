'use server';

import { createClient } from '@/lib/supabase/server';

export interface WordBookmark {
  id: string;
  word: string;
  definition: string;
  explanation: string;
  createdAt: string;
}

export async function getWordBookmarks(recordId: string): Promise<WordBookmark[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthenticated');

  const { data, error } = await supabase
    .from('word_bookmarks')
    .select('id, word, definition, explanation, created_at')
    .eq('student_id', user.id)
    .eq('record_id', recordId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    word: row.word,
    definition: row.definition,
    explanation: row.explanation,
    createdAt: row.created_at,
  }));
}

export async function addWordBookmark(
  recordId: string,
  word: string,
  definition: string,
  explanation: string
): Promise<WordBookmark> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthenticated');

  const { data, error } = await supabase
    .from('word_bookmarks')
    .upsert(
      { student_id: user.id, record_id: recordId, word, definition, explanation },
      { onConflict: 'student_id,record_id,word' }
    )
    .select('id, word, definition, explanation, created_at')
    .single();

  if (error) throw new Error(error.message);

  return {
    id: data.id,
    word: data.word,
    definition: data.definition,
    explanation: data.explanation,
    createdAt: data.created_at,
  };
}

export async function removeWordBookmark(bookmarkId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthenticated');

  const { error } = await supabase
    .from('word_bookmarks')
    .delete()
    .eq('id', bookmarkId)
    .eq('student_id', user.id);

  if (error) throw new Error(error.message);
}
