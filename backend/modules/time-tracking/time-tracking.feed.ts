/**
 * backend/modules/time-tracking/time-tracking.feed.ts
 *
 * Today's attendance reported by each project's `timeTracking` feed, for the
 * CEO Time Tracking page. The enterprise's own clock-ins are read in the
 * browser from the workstation project (see modules/time-tracking/services).
 */

import { ProjectsService } from '../projects/projects.service';
import type { FeedSource, ProjectFeedStatus, ProjectTimeTracking } from '../projects/projects.types';

export interface ProjectAttendance extends ProjectTimeTracking {
  source: FeedSource;
}

export interface TimeTrackingFeed {
  attendance: ProjectAttendance[];
  projects: ProjectFeedStatus[];
}

export async function getTimeTrackingFeed(): Promise<TimeTrackingFeed> {
  const { entries, projects } = await ProjectsService.getProjectFeed('timeTracking');
  return {
    attendance: entries.map(({ source, data }) => ({ ...data, source })),
    projects,
  };
}
