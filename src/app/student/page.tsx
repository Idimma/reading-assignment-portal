import React from 'react';
import { getStudentReadings } from '@/lib/services/session';
import StudentDashboard from './StudentDashboard';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const initialReadings = await getStudentReadings();
  return <StudentDashboard initialReadings={initialReadings} />;
}
