import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/store/auth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Landing } from '@/pages/Landing';
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { Onboarding } from '@/pages/Onboarding';
import { Dashboard } from '@/pages/Dashboard';
import { Projects } from '@/pages/Projects';
import { Tests } from '@/pages/Tests';
import { TestDetail } from '@/pages/TestDetail';
import { Analytics } from '@/pages/Analytics';
import { Ads } from '@/pages/Ads';
import { ImportExcel } from '@/pages/ImportExcel';
import { AIRecommendationsPage } from '@/pages/AIRecommendations';
import { CompetitorsPage } from '@/pages/Competitors';
import { Settings } from '@/pages/Settings';
import { Profile } from '@/pages/Profile';
import { NotFound } from '@/pages/NotFound';

function RequireAuth({ children }: { children: JSX.Element }) {
  const user = useAuth((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RequireOnboarding({ children }: { children: JSX.Element }) {
  const user = useAuth((s) => s.user);
  const onboarded = useAuth((s) => s.onboarded);
  if (!user) return <Navigate to="/login" replace />;
  if (!onboarded) return <Navigate to="/onboarding" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/onboarding"
        element={
          <RequireAuth>
            <Onboarding />
          </RequireAuth>
        }
      />
      <Route
        path="/app"
        element={
          <RequireOnboarding>
            <AppLayout />
          </RequireOnboarding>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="projects" element={<Projects />} />
        <Route path="tests" element={<Tests />} />
        <Route path="tests/:id" element={<TestDetail />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="ads" element={<Ads />} />
        <Route path="import" element={<ImportExcel />} />
        <Route path="ai" element={<AIRecommendationsPage />} />
        <Route path="competitors" element={<CompetitorsPage />} />
        <Route path="settings" element={<Settings />} />
        <Route path="profile" element={<Profile />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
