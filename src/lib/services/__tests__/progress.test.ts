import { describe, expect, it } from 'vitest';
import {
  aggregateReadingSessions,
  ASSIGNMENT_STATUSES,
  canTransitionStatus,
  type AssignmentStatus,
} from '../progress';

const expectedTransitions: Record<AssignmentStatus, Record<AssignmentStatus, boolean>> = {
  not_started: {
    not_started: true,
    in_progress: true,
    completed: true,
  },
  in_progress: {
    not_started: false,
    in_progress: true,
    completed: true,
  },
  completed: {
    not_started: false,
    in_progress: true,
    completed: true,
  },
};

describe('assignment status machine', () => {
  it('evaluates all 9 status transitions', () => {
    const transitions = ASSIGNMENT_STATUSES.flatMap((from) =>
      ASSIGNMENT_STATUSES.map((to) => ({
        from,
        to,
        allowed: canTransitionStatus(from, to),
      }))
    );

    expect(transitions).toHaveLength(9);
    for (const transition of transitions) {
      expect(transition.allowed).toBe(expectedTransitions[transition.from][transition.to]);
    }
  });
});

describe('reading session aggregation', () => {
  it('rounds total seconds to minutes and flags logs after the due date', () => {
    const summary = aggregateReadingSessions(
      [
        { seconds_read: 90, logged_at: '2026-07-01T12:00:00.000Z' },
        { seconds_read: 89, logged_at: '2026-07-03T00:00:00.000Z' },
      ],
      '2026-07-02'
    );

    expect(summary.totalSeconds).toBe(179);
    expect(summary.minutesRead).toBe(3);
    expect(summary.hasLateLog).toBe(true);
  });

  it('does not flag late logs when all sessions land on or before due date', () => {
    const summary = aggregateReadingSessions(
      [
        { seconds_read: 30, logged_at: '2026-07-02T23:59:59.999Z' },
        { seconds_read: 31, logged_at: '2026-07-01T09:00:00.000Z' },
      ],
      '2026-07-02'
    );

    expect(summary.totalSeconds).toBe(61);
    expect(summary.minutesRead).toBe(1);
    expect(summary.hasLateLog).toBe(false);
  });
});
