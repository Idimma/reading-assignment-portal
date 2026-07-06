import { createClient } from '@/lib/supabase/server';
import { createAssignmentSchema, CreateAssignmentInput } from './schemas';

export async function getBooks() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .order('title');

  if (error) throw new Error(error.message);
  return data;
}

export async function getClassrooms() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('classrooms')
    .select('*')
    .order('name');

  if (error) throw new Error(error.message);
  return data;
}

export async function getClassroomRoster(classId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('enrollments')
    .select('profiles(id, full_name)')
    .eq('class_id', classId);

  if (error) throw new Error(error.message);
  return data.map((d: any) => d.profiles);
}

export async function createAssignment(input: CreateAssignmentInput) {
  const parsed = createAssignmentSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0].message);
  }

  const supabase = await createClient();

  // 1. Create the Assignment
  const { data: assignment, error: assignmentError } = await supabase
    .from('assignments')
    .insert({
      book_id: parsed.data.bookId,
      class_id: parsed.data.classId,
      due_date: parsed.data.dueDate,
    })
    .select()
    .single();

  if (assignmentError || !assignment) {
    throw new Error(assignmentError?.message || 'Failed to create assignment record');
  }

  // 2. Fetch all students enrolled in the class
  const { data: enrollments, error: enrollError } = await supabase
    .from('enrollments')
    .select('student_id')
    .eq('class_id', parsed.data.classId);

  if (enrollError) {
    throw new Error(enrollError.message);
  }

  if (enrollments.length === 0) {
    return assignment; // No students enrolled to fan out to
  }

  // 3. Create progress records for each student (atomic fan-out)
  const progressRecords = enrollments.map((enr) => ({
    assignment_id: assignment.id,
    student_id: enr.student_id,
    status: 'not_started' as const,
  }));

  const { error: recordsError } = await supabase
    .from('assignment_records')
    .insert(progressRecords);

  if (recordsError) {
    // If progress records creation fails, delete the parent assignment to avoid orphaned rows
    await supabase.from('assignments').delete().eq('id', assignment.id);
    throw new Error(recordsError.message);
  }

  return assignment;
}

export async function getTeacherAssignments() {
  const supabase = await createClient();
  
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
  return data.map((item: any) => {
    const records = item.assignment_records || [];
    const totalStudents = records.length;
    
    // Calculate total minutes read across all student progress records
    let totalSeconds = 0;
    records.forEach((rec: any) => {
      const sessions = rec.reading_sessions || [];
      sessions.forEach((s: any) => {
        totalSeconds += s.seconds_read;
      });
    });

    const completedCount = records.filter((r: any) => r.status === 'completed').length;
    const inProgressCount = records.filter((r: any) => r.status === 'in_progress').length;
    const notStartedCount = records.filter((r: any) => r.status === 'not_started').length;

    return {
      id: item.id,
      dueDate: item.due_date,
      createdAt: item.created_at,
      classroom: item.classrooms,
      book: item.books,
      records: records.map((rec: any) => {
        let studentSeconds = 0;
        (rec.reading_sessions || []).forEach((s: any) => {
          studentSeconds += s.seconds_read;
        });

        return {
          id: rec.id,
          status: rec.status,
          statusUpdatedAt: rec.status_updated_at,
          studentName: rec.profiles.full_name,
          minutesRead: Math.round(studentSeconds / 60),
        };
      }),
      stats: {
        totalStudents,
        completedCount,
        inProgressCount,
        notStartedCount,
        minutesRead: Math.round(totalSeconds / 60),
      }
    };
  });
}

export async function softDeleteAssignment(assignmentId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('assignments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', assignmentId);

  if (error) throw new Error(error.message);
}
