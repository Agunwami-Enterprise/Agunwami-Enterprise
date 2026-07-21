export interface TimeEntry {
  id: string;
  staffUid: string;
  clockIn: string;
  clockOut: string | null;
  durationMinutes: number | null;
  notes: string;
}
