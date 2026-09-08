import { EvalRun, EvalReport, HumanRating } from '../types';

const STORAGE_KEYS = {
  RUNS: 'pm_eval_runs',
  REPORTS: 'pm_eval_reports',
  BASELINE: 'pm_eval_baseline',
  HUMAN_RATINGS: 'pm_eval_human_ratings',
};

const memoryStorage: Record<string, any> = {};

function getItem<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') {
    return memoryStorage[key] !== undefined ? JSON.parse(JSON.stringify(memoryStorage[key])) : fallback;
  }
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setItem<T>(key: string, value: T): void {
  if (typeof localStorage === 'undefined') {
    memoryStorage[key] = JSON.parse(JSON.stringify(value));
    return;
  }
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Failed to save to localStorage [${key}]:`, err);
  }
}

export const evalStorage = {
  // Runs
  getRuns(): EvalRun[] {
    return getItem<EvalRun[]>(STORAGE_KEYS.RUNS, []);
  },

  saveRun(run: EvalRun): void {
    const runs = this.getRuns();
    const index = runs.findIndex((r) => r.id === run.id);
    if (index >= 0) {
      runs[index] = run;
    } else {
      runs.unshift(run);
    }
    // Cap history at 200 runs
    setItem(STORAGE_KEYS.RUNS, runs.slice(0, 200));
  },

  getRunsForCase(caseId: string): EvalRun[] {
    return this.getRuns().filter((r) => r.evalCaseId === caseId);
  },

  // Reports
  getReports(): EvalReport[] {
    return getItem<EvalReport[]>(STORAGE_KEYS.REPORTS, []);
  },

  getLatestReport(): EvalReport | null {
    const reports = this.getReports();
    return reports.length > 0 ? reports[0] : null;
  },

  saveReport(report: EvalReport): void {
    const reports = this.getReports();
    reports.unshift(report);
    setItem(STORAGE_KEYS.REPORTS, reports.slice(0, 20));
  },

  // Baseline Report (for Regression Detection)
  getBaselineReport(): EvalReport | null {
    return getItem<EvalReport | null>(STORAGE_KEYS.BASELINE, null);
  },

  setBaselineReport(report: EvalReport): void {
    setItem(STORAGE_KEYS.BASELINE, report);
  },

  clearBaselineReport(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.BASELINE);
    } catch {
      // ignore
    }
  },

  // Human Ratings
  getHumanRatings(caseId?: string): HumanRating[] {
    const all = getItem<HumanRating[]>(STORAGE_KEYS.HUMAN_RATINGS, []);
    if (caseId) {
      return all.filter((r) => r.evalCaseId === caseId);
    }
    return all;
  },

  saveHumanRating(rating: HumanRating): void {
    const ratings = this.getHumanRatings();
    const index = ratings.findIndex((r) => r.id === rating.id);
    if (index >= 0) {
      ratings[index] = rating;
    } else {
      ratings.unshift(rating);
    }
    setItem(STORAGE_KEYS.HUMAN_RATINGS, ratings);
  },

  // Clear History
  clearAllEvalData(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.RUNS);
      localStorage.removeItem(STORAGE_KEYS.REPORTS);
      localStorage.removeItem(STORAGE_KEYS.BASELINE);
      localStorage.removeItem(STORAGE_KEYS.HUMAN_RATINGS);
    } catch (err) {
      console.error('Failed to clear eval data:', err);
    }
  },
};
