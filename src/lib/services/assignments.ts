'use server';

import { createClient } from '@/lib/supabase/server';
import { createAssignmentSchema, CreateAssignmentInput } from './schemas';
import { aggregateReadingSessions, aggregateStatusCounts } from './progress';

export async function getBooks() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthenticated');

  const { data, error } = await supabase
    .from('books')
    .select('*')
    .order('title');

  if (error) throw new Error(error.message);
  return data;
}

export async function getClassrooms() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthenticated');

  const { data, error } = await supabase
    .from('classrooms')
    .select('id, name, enrollments(student_id)')
    .order('name');

  if (error) throw new Error(error.message);
  
  return data.map((c) => ({
    id: c.id,
    name: c.name,
    studentCount: c.enrollments?.length || 0,
  }));
}

export async function getClassroomRoster(classId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthenticated');

  const { data, error } = await supabase
    .from('enrollments')
    .select('profiles(id, full_name)')
    .eq('class_id', classId);

  if (error) throw new Error(error.message);
  return data.flatMap((enrollment) => enrollment.profiles ? [enrollment.profiles] : []);
}

export async function createAssignment(input: CreateAssignmentInput) {
  const parsed = createAssignmentSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthenticated');

  const { data: assignmentId, error: rpcError } = await supabase.rpc('create_assignment', {
    p_book_id: parsed.data.bookId,
    p_class_id: parsed.data.classId,
    p_due_date: parsed.data.dueDate,
  });

  if (rpcError || !assignmentId) {
    throw new Error(rpcError?.message || 'Failed to create assignment record');
  }

  const { data: assignment, error: assignmentError } = await supabase
    .from('assignments')
    .select()
    .eq('id', assignmentId)
    .single();

  if (assignmentError || !assignment) {
    throw new Error(assignmentError?.message || 'Failed to load created assignment');
  }

  return assignment;
}

export async function getTeacherAssignments() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthenticated');
  
  // Get all assignments with joined book, classroom, and progress record information
  const { data, error } = await supabase
    .from('assignments')
    .select(`
      id,
      due_date,
      created_at,
      classrooms (id, name),
      books (id, title, author, reading_level),
      assignment_records (
        id,
        status,
        status_updated_at,
        profiles (id, full_name),
        reading_sessions (seconds_read)
      )
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  
  // Format aggregate counts for response dashboard
  return data.map((item) => {
    const records = item.assignment_records || [];
    const statusCounts = aggregateStatusCounts(records.map((record) => record.status));
    const assignmentSessionSummary = aggregateReadingSessions(
      records.flatMap((record) => record.reading_sessions || []),
      item.due_date
    );

    return {
      id: item.id,
      dueDate: item.due_date,
      createdAt: item.created_at,
      classroom: item.classrooms,
      book: item.books,
      records: records.map((rec) => {
        const studentSessionSummary = aggregateReadingSessions(
          rec.reading_sessions || [],
          item.due_date
        );

        return {
          id: rec.id,
          status: rec.status,
          statusUpdatedAt: rec.status_updated_at,
          studentName: rec.profiles?.full_name || 'Unknown student',
          minutesRead: studentSessionSummary.minutesRead,
          hasLateLog: studentSessionSummary.hasLateLog,
        };
      }),
      stats: {
        ...statusCounts,
        minutesRead: assignmentSessionSummary.minutesRead,
        hasLateLog: assignmentSessionSummary.hasLateLog,
      }
    };
  });
}

export async function softDeleteAssignment(assignmentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthenticated');

  const { error } = await supabase
    .from('assignments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', assignmentId);

  if (error) throw new Error(error.message);
}
