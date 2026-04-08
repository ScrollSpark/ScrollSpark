import React from 'react';
import ReactDOM from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import Dashboard from './pages/Dashboard';
import Onboarding from './pages/Onboarding';
import Premium from './pages/Premium';
import SignUp from './pages/SignUp';
import Login from './pages/Login';
import Settings from './pages/Settings';
import SettingsPersonalization from './pages/SettingsPersonalization';
import TermsOfUse from './pages/TermsOfUse';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Support from './pages/Support';

const queryClient = new QueryClient();

/** React Router basename for GitHub Pages (/repo/) vs Capacitor / local dev (./). */
function routerBasename() {
  const b = import.meta.env.BASE_URL;
  if (b === './' || b === '/' || !b) return '/';
  const normalized = b.endsWith('/') ? b.slice(0, -1) : b;
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

if (Capacitor.isNativePlatform()) {
  StatusBar.setStyle({ style: Style.Light }).catch(() => {});
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={routerBasename()}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/premium" element={<Premium />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/login" element={<Login />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/personalization" element={<SettingsPersonalization />} />
          <Route path="/terms" element={<TermsOfUse />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/support" element={<Support />} />
          {/* Add more routes here as you build them out:
              <Route path="/spark" element={<Spark />} />
          */}
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
