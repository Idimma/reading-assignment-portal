import React from 'react';
import { getBooks, getClassrooms } from '@/lib/services/assignments';
import NewAssignmentClient from './NewAssignmentClient';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const [books, classrooms] = await Promise.all([
    getBooks(),
    getClassrooms(),
  ]);

  return <NewAssignmentClient books={books} classrooms={classrooms} />;
}
