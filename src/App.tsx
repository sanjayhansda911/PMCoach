import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { InterviewProvider } from './context/InterviewContext';
import { AppShell } from './components/layout/AppShell';

import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SignUpPage } from './pages/SignUpPage';
import { DashboardPage } from './pages/DashboardPage';
import { SetupPage } from './pages/SetupPage';
import { InterviewRoomPage } from './pages/InterviewRoomPage';
import { EvaluationPage } from './pages/EvaluationPage';
import { HistoryPage } from './pages/HistoryPage';
import { InternalEvalsDashboardPage } from './pages/InternalEvalsDashboardPage';

export function App() {
  return (
    <AuthProvider>
      <InterviewProvider>
        <BrowserRouter>
          <AppShell>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignUpPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/setup" element={<SetupPage />} />
              <Route path="/interview" element={<InterviewRoomPage />} />
              <Route path="/interview/:id" element={<InterviewRoomPage />} />
              <Route path="/evaluation" element={<EvaluationPage />} />
              <Route path="/evaluation/:id" element={<EvaluationPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/internal/evals" element={<InternalEvalsDashboardPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppShell>
        </BrowserRouter>
      </InterviewProvider>
    </AuthProvider>
  );
}

export default App;
