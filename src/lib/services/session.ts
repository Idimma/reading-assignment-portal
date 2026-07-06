'use server';

import { createClient } from '@/lib/supabase/server';
import { logSessionSchema, updateStatusSchema, LogSessionInput, UpdateStatusInput } from './schemas';

export async function getStudentReadings() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthenticated');

  // Fetch all assignment progress records for this student
  const { data, error } = await supabase
    .from('assignment_records')
    .select(`
      id,
      status,
      status_updated_at,
      assignments (
        id,
        due_date,
        books (id, title, author, cover_url, reading_level)
      ),
      reading_sessions (seconds_read)
    `)
    .eq('student_id', user.id);

  if (error) throw new Error(error.message);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return data.map((item: any) => {
    const assignment = item.assignments;
    const book = assignment.books;
    const dueDate = new Date(assignment.due_date);
    
    // Calculate total minutes read
    let totalSeconds = 0;
    (item.reading_sessions || []).forEach((s: any) => {
      totalSeconds += s.seconds_read;
    });

    // Derived overdue flag: past due date AND not completed
    const isOverdue = dueDate < today && item.status !== 'completed';

    return {
      recordId: item.id,
      assignmentId: assignment.id,
      dueDate: assignment.due_date,
      status: item.status,
      statusUpdatedAt: item.status_updated_at,
      minutesRead: Math.round(totalSeconds / 60),
      isOverdue,
      book: {
        id: book.id,
        title: book.title,
        author: book.author,
        coverUrl: book.cover_url,
        readingLevel: book.reading_level,
      }
    };
  });
}

export async function getBookContent(recordId: string) {
  const supabase = await createClient();
  
  // Validate record ownership and fetch book details
  const { data, error } = await supabase
    .from('assignment_records')
    .select(`
      id,
      assignments (
        books (id, title, author, content_text)
      )
    `)
    .eq('id', recordId)
    .single();

  if (error || !data) throw new Error('Unable to retrieve book content.');

  const book = data.assignments.books;
  return {
    title: book.title,
    author: book.author,
    contentText: book.content_text,
  };
}

export async function logReadingSession(input: LogSessionInput) {
  const parsed = logSessionSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0].message);
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('reading_sessions')
    .insert({
      record_id: parsed.data.recordId,
      seconds_read: parsed.data.seconds,
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function updateAssignmentStatus(input: UpdateStatusInput) {
  const parsed = updateStatusSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0].message);
  }

  const supabase = await createClient();

  // Perform status update (Postgres database trigger will automatically validate transitions)
  const { data, error } = await supabase
    .from('assignment_records')
    .update({
      status: parsed.data.status,
      status_updated_at: new Date().toISOString(),
    })
    .eq('id', parsed.data.recordId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
