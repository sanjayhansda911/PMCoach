import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Interview } from '../types';
import { interviewService } from '../services/interviewService';

interface InterviewContextType {
  interviews: Interview[];
  currentInterview: Interview | null;
  setCurrentInterview: (interview: Interview | null) => void;
  refreshInterviews: () => Promise<void>;
  deleteInterview: (id: string) => Promise<void>;
}

const InterviewContext = createContext<InterviewContextType | undefined>(undefined);

const CURRENT_INTERVIEW_ID_KEY = 'pm_coach_current_interview_id';

export const InterviewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [currentInterview, setCurrentInterviewState] = useState<Interview | null>(null);

  const refreshInterviews = useCallback(async () => {
    try {
      const list = await interviewService.listInterviews();
      setInterviews(list);
    } catch (e) {
      console.error('Failed to load interviews:', e);
    }
  }, []);

  useEffect(() => {
    refreshInterviews();
  }, [refreshInterviews]);

  // Restore current interview on mount if saved
  useEffect(() => {
    const savedId = localStorage.getItem(CURRENT_INTERVIEW_ID_KEY);
    if (savedId) {
      interviewService.getInterview(savedId).then((composite) => {
        if (composite) {
          setCurrentInterviewState(composite.interview);
        }
      });
    }
  }, []);

  const setCurrentInterview = useCallback((interview: Interview | null) => {
    setCurrentInterviewState((prev) => {
      if (prev?.id === interview?.id) return prev;
      return interview;
    });
    if (interview) {
      localStorage.setItem(CURRENT_INTERVIEW_ID_KEY, interview.id);
    } else {
      localStorage.removeItem(CURRENT_INTERVIEW_ID_KEY);
    }
  }, []);

  const deleteInterview = useCallback(async (id: string) => {
    await interviewService.deleteInterview(id);
    setCurrentInterviewState((prev) => {
      if (prev?.id === id) {
        localStorage.removeItem(CURRENT_INTERVIEW_ID_KEY);
        return null;
      }
      return prev;
    });
    await refreshInterviews();
  }, [refreshInterviews]);

  return (
    <InterviewContext.Provider
      value={{
        interviews,
        currentInterview,
        setCurrentInterview,
        refreshInterviews,
        deleteInterview,
      }}
    >
      {children}
    </InterviewContext.Provider>
  );
};

export function useInterview() {
  const context = useContext(InterviewContext);
  if (!context) {
    throw new Error('useInterview must be used within an InterviewProvider');
  }
  return context;
}
