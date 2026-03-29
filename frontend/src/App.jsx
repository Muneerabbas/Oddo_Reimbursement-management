import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { GlobalLoadingProvider } from './contexts/GlobalLoadingContext';
import AppRoutes from './routes/AppRoutes';
import AppErrorBoundary from './components/feedback/AppErrorBoundary';
import GlobalLoadingOverlay from './components/feedback/GlobalLoadingOverlay';
import ToastProvider from './components/feedback/ToastProvider';
import './index.css';

function App() {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <GlobalLoadingProvider>
          <Router>
            <ToastProvider />
            <GlobalLoadingOverlay />
            <AppRoutes />
          </Router>
        </GlobalLoadingProvider>
      </AuthProvider>
    </AppErrorBoundary>
  );
}

export default App;
