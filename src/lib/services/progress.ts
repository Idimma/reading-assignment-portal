import type { Enums } from '@/lib/database.types';

export type AssignmentStatus = Enums<'assignment_status'>;

export const ASSIGNMENT_STATUSES = [
  'not_started',
  'in_progress',
  'completed',
] as const satisfies readonly AssignmentStatus[];

export type ReadingSessionSummary = {
  totalSeconds: number;
  minutesRead: number;
  hasLateLog: boolean;
};

export type ReadingSessionLike = {
  seconds_read: number;
  logged_at?: string | null;
};

export type StatusCounts = {
  totalStudents: number;
  completedCount: number;
  inProgressCount: number;
  notStartedCount: number;
};

export function canTransitionStatus(from: AssignmentStatus, to: AssignmentStatus) {
  if (from !== 'not_started' && to === 'not_started') {
    return false;
  }

  return true;
}

export function assertStatusTransition(from: AssignmentStatus, to: AssignmentStatus) {
  if (!canTransitionStatus(from, to)) {
    throw new Error('Illegal status transition: progress cannot revert to not_started');
  }
}

export function aggregateReadingSessions(
  sessions: readonly ReadingSessionLike[] = [],
  dueDate?: string
): ReadingSessionSummary {
  const totalSeconds = sessions.reduce((sum, session) => sum + session.seconds_read, 0);
  const dueDay = dueDate ?? null;
  const hasLateLog =
    dueDay !== null &&
    sessions.some((session) => {
      if (!session.logged_at) return false;
      return session.logged_at.slice(0, 10) > dueDay;
    });

  return {
    totalSeconds,
    minutesRead: Math.round(totalSeconds / 60),
    hasLateLog,
  };
}

export function aggregateStatusCounts(statuses: readonly AssignmentStatus[]): StatusCounts {
  return {
    totalStudents: statuses.length,
    completedCount: statuses.filter((status) => status === 'completed').length,
    inProgressCount: statuses.filter((status) => status === 'in_progress').length,
    notStartedCount: statuses.filter((status) => status === 'not_started').length,
  };
}
