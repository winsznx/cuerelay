import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Landing } from '@/pages/Landing';
import { Login } from '@/pages/Login';
import { Dashboard } from '@/pages/Dashboard';
import { Rundown } from '@/pages/Rundown';
import { Vendors } from '@/pages/Vendors';
import { Revisions } from '@/pages/Revisions';
import { ExportRunSheet } from '@/pages/ExportRunSheet';
import { VendorSheet } from '@/pages/VendorSheet';
import { Demo } from '@/pages/Demo';

function RequireAuth({ children }) {
  const { isLoading, isSignedIn, signIn } = useAuth();
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-cue-border border-t-brand" />
      </div>
    );
  }
  if (!isSignedIn) {
    signIn();
    return null;
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/demo" element={<Demo />} />
        <Route
          path="/app"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/app/events/:eventId/rundown"
          element={
            <RequireAuth>
              <Rundown />
            </RequireAuth>
          }
        />
        <Route
          path="/app/events/:eventId/vendors"
          element={
            <RequireAuth>
              <Vendors />
            </RequireAuth>
          }
        />
        <Route
          path="/app/events/:eventId/revisions"
          element={
            <RequireAuth>
              <Revisions />
            </RequireAuth>
          }
        />
        <Route
          path="/app/events/:eventId/export"
          element={
            <RequireAuth>
              <ExportRunSheet />
            </RequireAuth>
          }
        />
        <Route
          path="/v/:eventId"
          element={
            <RequireAuth>
              <VendorSheet />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
