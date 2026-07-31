export type CourseStatus = 'not_started' | 'in_progress' | 'completed';

export interface Course {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
}

export interface CourseProgress {
  staffUid: string;
  courseId: string;
  status: CourseStatus;
  completedAt: string | null;
}
