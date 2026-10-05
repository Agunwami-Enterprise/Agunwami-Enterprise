/**
 * backend/modules/training/training.types.ts
 *
 * Types for CEO Training & Course Management.
 */

export interface CourseItem {
  id: string;
  title: string;
  description: string;
  category: string;
  level: string;
  visibility: 'Published' | 'Draft' | 'Archived';
  enrolledStudents: number;
  modulesCount: number;
  instructorName?: string;
  priceNGN: number;
  createdAt: string;
  updatedAt?: string;
}

export interface TrainingSummaryStats {
  totalCourses: number;
  publishedCourses: number;
  draftCourses: number;
  totalEnrolledStudents: number;
  completionRate: number;
}
