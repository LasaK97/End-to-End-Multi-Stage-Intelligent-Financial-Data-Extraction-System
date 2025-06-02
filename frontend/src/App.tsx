import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AppShell } from './components/layout/AppShell';
import { Dashboard } from './pages/Dashboard';
import { Upload } from './pages/Upload';
import { Documents } from './pages/Documents';
import { DocumentDetail } from './pages/DocumentDetail';
import { Analytics } from './pages/Analytics';
import { NotFound } from './pages/NotFound';
import { useHealth } from './hooks/useApi';
import { useAppStore } from './stores/useAppStore';
import { useEffect } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30000,
    },
  },
});

const AppContent = () => {
  const { status: healthQueryStatus, data: healthData, error: healthError } = useHealth();
  const { setSystemHealth, setSystemStatus } = useAppStore();

  useEffect(() => {
    if (healthQueryStatus === 'pending') {
      setSystemStatus('loading');
      setSystemHealth(null);
    } else if (healthQueryStatus === 'error') {
      setSystemStatus('unavailable');
      setSystemHealth(null);
    } else if (healthQueryStatus === 'success') {
      setSystemStatus('ok');
      setSystemHealth(healthData || null);
    }
  }, [healthQueryStatus, healthData, healthError, setSystemHealth, setSystemStatus]);

  return (
    <Router>
      <AppShell>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/documents/:id" element={<DocumentDetail />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AppShell>
    </Router>
  );
};

export const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#374151',
            border: '1px solid #e5e7eb',
          },
        }}
      />
    </QueryClientProvider>
  );
};
