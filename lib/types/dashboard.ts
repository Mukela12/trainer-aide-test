export interface TrainerDashboardStats {
  earningsThisWeek: number;
  sessionsThisWeek: number;
  activeClients: number;
  softHoldsCount: number;
  pendingRequests: number;
}

export interface StudioOwnerDashboardStats {
  totalTemplates: number;
  activeTemplates: number;
  totalSessions: number;
  averageRpe: number;
  pendingRequests: number;
  totalClients: number;
}

export interface SoloDashboardStats {
  earningsThisWeek: number;
  sessionsThisWeek: number;
  activeClients: number;
  utilizationPercent: number;
  softHoldsCount: number;
  outstandingCredits: number;
  lowCreditClients: number;
  pendingRequests: number;
}

export interface UpcomingSession {
  id: string;
  clientName: string;
  scheduledAt: Date;
  serviceName: string;
  status: string;
}

export interface RecentClient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  credits: number;
  createdAt: Date;
}
