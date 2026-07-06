import React from 'react';
import { getBookContent } from '@/lib/services/session';
import ReaderClient from './ReaderClient';

interface Props {
  params: Promise<{ recordId: string }>;
}

export const dynamic = 'force-dynamic';

export default async function Page({ params }: Props) {
  const { recordId } = await params;
  const book = await getBookContent(recordId);

  return <ReaderClient recordId={recordId} book={book} />;
}
