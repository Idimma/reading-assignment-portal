import React from 'react';
import { getTeacherAssignments } from '@/lib/services/assignments';
import TeacherDashboard from './TeacherDashboard';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const initialAssignments = await getTeacherAssignments();
  return <TeacherDashboard initialAssignments={initialAssignments} />;
}
