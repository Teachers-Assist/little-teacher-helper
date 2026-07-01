import type { Anomaly } from '@/lib/anomalyDetection';

export interface DashboardStatsData {
  roomCount: number;
  inProgressTaskCount: number;
  anomalyCount: number;
}

export interface DashboardRoom {
  id: string;
  name: string;
  inProgressTaskCount: number;
  anomalyCount: number;
  lastActivityAt: string;
}

export interface DashboardTask {
  id: string;
  roomId: string;
  roomName: string;
  name: string;
  type: string;
  status: string;
  dueDate: string | null;
  recordedCount: number;
  studentCount: number;
  isAnomaly: boolean;
  anomalies: Anomaly[];
  lastActivityAt: string;
}

export interface DashboardData {
  stats: DashboardStatsData;
  rooms: DashboardRoom[];
  tasks: DashboardTask[];
}
