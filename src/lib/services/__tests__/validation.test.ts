import { describe, it, expect } from 'vitest';
import { logSessionSchema, updateStatusSchema, createAssignmentSchema } from '../schemas';

// Valid RFC 4122 v4 UUIDs for schema tests
const MOCK_RECORD_ID = 'e1a23456-7890-4112-a314-141516171819';
const MOCK_BOOK_ID = 'b1b23456-7890-4112-a314-141516171819';
const MOCK_CLASS_ID = 'c1c23456-7890-4112-a314-141516171819';

describe('RAG Reading Session Schema Validation', () => {
  it('should accept valid reading session lengths', () => {
    const valid = logSessionSchema.safeParse({
      recordId: MOCK_RECORD_ID,
      seconds: 1200, // 20 minutes
    });
    expect(valid.success).toBe(true);
  });

  it('should reject non-positive session lengths', () => {
    const invalidZero = logSessionSchema.safeParse({
      recordId: MOCK_RECORD_ID,
      seconds: 0,
    });
    expect(invalidZero.success).toBe(false);

    const invalidNegative = logSessionSchema.safeParse({
      recordId: MOCK_RECORD_ID,
      seconds: -60,
    });
    expect(invalidNegative.success).toBe(false);
  });

  it('should reject session lengths exceeding 8 hours limit', () => {
    const invalidLimit = logSessionSchema.safeParse({
      recordId: MOCK_RECORD_ID,
      seconds: 28801, // 8h + 1s
    });
    expect(invalidLimit.success).toBe(false);
  });

  it('should reject non-integer seconds', () => {
    const invalidFloat = logSessionSchema.safeParse({
      recordId: MOCK_RECORD_ID,
      seconds: 120.5,
    });
    expect(invalidFloat.success).toBe(false);
  });
});

describe('Assignment Status Schema Validation', () => {
  it('should accept legal statuses', () => {
    const notStarted = updateStatusSchema.safeParse({
      recordId: MOCK_RECORD_ID,
      status: 'not_started',
    });
    const inProgress = updateStatusSchema.safeParse({
      recordId: MOCK_RECORD_ID,
      status: 'in_progress',
    });
    const completed = updateStatusSchema.safeParse({
      recordId: MOCK_RECORD_ID,
      status: 'completed',
    });
    
    expect(notStarted.success).toBe(true);
    expect(inProgress.success).toBe(true);
    expect(completed.success).toBe(true);
  });

  it('should reject illegal status values', () => {
    const invalidStatus = updateStatusSchema.safeParse({
      recordId: MOCK_RECORD_ID,
      status: 'finished_reading',
    });
    expect(invalidStatus.success).toBe(false);
  });
});

describe('Assignment Creation Schema Validation', () => {
  it('should reject due dates in the past', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const invalidDate = createAssignmentSchema.safeParse({
      bookId: MOCK_BOOK_ID,
      classId: MOCK_CLASS_ID,
      dueDate: yesterdayStr,
    });
    
    expect(invalidDate.success).toBe(false);
  });

  it('should accept current or future due dates', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const validDate = createAssignmentSchema.safeParse({
      bookId: MOCK_BOOK_ID,
      classId: MOCK_CLASS_ID,
      dueDate: tomorrowStr,
    });
    
    expect(validDate.success).toBe(true);
  });

  it('should accept today as due date', () => {
    const todayStr = new Date().toISOString().split('T')[0];

    const validDate = createAssignmentSchema.safeParse({
      bookId: MOCK_BOOK_ID,
      classId: MOCK_CLASS_ID,
      dueDate: todayStr,
    });
    
    expect(validDate.success).toBe(true);
  });
});
