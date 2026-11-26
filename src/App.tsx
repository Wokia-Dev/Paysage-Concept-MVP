import { Suspense, lazy, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { useAuth } from './context/useAuth';
import { AppLayout } from './components/layout/AppLayout';
import { Home } from './pages/Home';
import { Loader2 } from 'lucide-react';

const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })));
const Planning = lazy(() => import('./pages/Planning').then((m) => ({ default: m.Planning })));
const ChantierDetail = lazy(() =>
  import('./pages/ChantierDetail').then((m) => ({ default: m.ChantierDetail }))
);
const Chantiers = lazy(() => import('./pages/Chantiers').then((m) => ({ default: m.Chantiers })));
const Equipe = lazy(() => import('./pages/Equipe').then((m) => ({ default: m.Equipe })));
const ChatPreview = lazy(() =>
  import('./pages/ChatPreview').then((m) => ({ default: m.ChatPreview }))
);
const Plus = lazy(() => import('./pages/Plus').then((m) => ({ default: m.Plus })));

function RouteLoadingFallback() {
  return (
    <div className="min-h-[240px] flex flex-col items-center justify-center p-6 text-foret dark:text-[#EDF2F0]">
      <Loader2 className="w-7 h-7 animate-spin text-terracotta dark:text-[#E38D69] mb-2" />
      <p className="text-xs font-bold text-sauge dark:text-[#9BB89B]">Chargement...</p>
    </div>
  );
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-dvh bg-craie dark:bg-[#0F1716] flex flex-col items-center justify-center p-6 text-foret dark:text-[#EDF2F0]">
        <Loader2 className="w-8 h-8 animate-spin text-terracotta dark:text-[#E38D69] mb-3" />
        <p className="text-sm font-bold">Chargement de l'espace terrain...</p>
        <p className="text-xs text-sauge dark:text-[#9BB89B] mt-1">Vérification de la session locale</p>
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { profile, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (profile) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function SupervisorRoute({ children }: { children: ReactNode }) {
  const { profile } = useAuth();

  if (profile?.role === 'ouvrier') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <Suspense fallback={<RouteLoadingFallback />}>
            <Routes>
              {/* Route Publique : Connexion */}
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                }
              />

              {/* Routes Protégées avec Layout Mobile */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Home />} />
                <Route path="planning" element={<Planning />} />
                <Route
                  path="chantiers"
                  element={
                    <SupervisorRoute>
                      <Chantiers />
                    </SupervisorRoute>
                  }
                />
                <Route path="chantier/:id" element={<ChantierDetail />} />
                <Route path="equipe" element={<Equipe />} />
                <Route path="chat" element={<ChatPreview />} />
                <Route path="plus" element={<Plus />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
