export interface FeatureCount {
  event: string;
  count: number;
}

export interface MyStatistics {
  memberSince: string;
  routes: { total: number; public: number; stops: number };
  favorites: { routes: number; stops: number };
  reach: { followers: number; following: number; savesByOthers: number };
  activity: { days: number; total: number; events: FeatureCount[] };
  canViewOverview: boolean;
}

export interface FeatureUsage extends FeatureCount {
  users: number;
  previousCount: number;
}

export interface DailyUsage {
  date: string;
  events: number;
  activeUsers: number;
}

export interface AppStatistics {
  period: { days: number; from: string; to: string };
  totals: {
    users: number;
    newUsers: number;
    activeUsers: number;
    routes: number;
    publicRoutes: number;
    stops: number;
    favoriteRoutes: number;
    favoriteStops: number;
    follows: number;
  };
  consent: { granted: number; withdrawn: number; accountsDeleted: number };
  features: FeatureUsage[];
  daily: DailyUsage[];
}
