import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import { AppLayout } from './components/layout/AppLayout';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { Planning } from './pages/Planning';
import { ChantierDetail } from './pages/ChantierDetail';
import { Chantiers } from './pages/Chantiers';
import { Equipe } from './pages/Equipe';
import { ChatPreview } from './pages/ChatPreview';
import { Plus } from './pages/Plus';
import { Loader2 } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-craie flex flex-col items-center justify-center p-6 text-foret">
        <Loader2 className="w-8 h-8 animate-spin text-terracotta mb-3" />
        <p className="text-sm font-bold">Chargement de l'espace terrain...</p>
        <p className="text-xs text-sauge mt-1">Vérification de la session locale</p>
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (profile) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
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
              <Route path="chantiers" element={<Chantiers />} />
              <Route path="chantier/:id" element={<ChantierDetail />} />
              <Route path="equipe" element={<Equipe />} />
              <Route path="chat" element={<ChatPreview />} />
              <Route path="plus" element={<Plus />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}