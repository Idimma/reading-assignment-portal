'use server';

import { createClient } from '@/lib/supabase/server';
import { logSessionSchema, updateStatusSchema, LogSessionInput, UpdateStatusInput } from './schemas';
import { aggregateReadingSessions, assertStatusTransition } from './progress';

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
      assignments!inner (
        id,
        due_date,
        deleted_at,
        books (id, title, author, cover_url, reading_level)
      ),
      reading_sessions (seconds_read, logged_at)
    `)
    .eq('student_id', user.id)
    .is('assignments.deleted_at', null);

  if (error) throw new Error(error.message);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return data.map((item) => {
    const assignment = item.assignments;
    const book = assignment.books;
    const dueDate = new Date(assignment.due_date);
    const sessionSummary = aggregateReadingSessions(
      item.reading_sessions || [],
      assignment.due_date
    );

    // Derived overdue flag: past due date AND not completed
    const isOverdue = dueDate < today && item.status !== 'completed';

    return {
      recordId: item.id,
      assignmentId: assignment.id,
      dueDate: assignment.due_date,
      status: item.status,
      statusUpdatedAt: item.status_updated_at,
      minutesRead: sessionSummary.minutesRead,
      isOverdue,
      hasLateLog: sessionSummary.hasLateLog,
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
      assignments!inner (
        deleted_at,
        books (id, title, author, content_text)
      )
    `)
    .eq('id', recordId)
    .is('assignments.deleted_at', null)
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
    throw new Error(parsed.error.issues[0].message);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthenticated');

  // Verify the assignment record exists and is not soft-deleted
  const { data: record, error: recordError } = await supabase
    .from('assignment_records')
    .select('id, assignments!inner(deleted_at)')
    .eq('id', parsed.data.recordId)
    .single();

  if (recordError || !record) {
    throw new Error('Assignment record not found.');
  }

  if (record.assignments.deleted_at) {
    throw new Error('Assignment is no longer active.');
  }

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
    throw new Error(parsed.error.issues[0].message);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthenticated');

  const { data: existingRecord, error: existingRecordError } = await supabase
    .from('assignment_records')
    .select('status, assignments!inner(deleted_at)')
    .eq('id', parsed.data.recordId)
    .single();

  if (existingRecordError || !existingRecord) {
    throw new Error(existingRecordError?.message || 'Assignment record not found.');
  }

  if (existingRecord.assignments.deleted_at) {
    throw new Error('Assignment is no longer active.');
  }

  assertStatusTransition(existingRecord.status, parsed.data.status);

  // Perform status update; Postgres trigger also validates and stamps status_updated_at.
  const { data, error } = await supabase
    .from('assignment_records')
    .update({
      status: parsed.data.status,
    })
    .eq('id', parsed.data.recordId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function markOpened(recordId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthenticated');

  const { error } = await supabase
    .from('assignment_records')
    .update({ status: 'in_progress' })
    .eq('id', recordId)
    .eq('status', 'not_started');

  if (error) {
    throw new Error(error.message);
  }
}
