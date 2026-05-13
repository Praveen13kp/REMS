import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useApp, Toaster, Modal } from './store.jsx';
import PublicLayout from './components/layouts/PublicLayout.jsx';
import AppLayout from './components/layouts/AppLayout.jsx';
import Landing from './pages/Landing.jsx';
import Pricing from './pages/Pricing.jsx';
import Features from './pages/Features.jsx';
import Contact from './pages/Contact.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Forgot from './pages/Forgot.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Leads from './pages/Leads.jsx';
import LeadDetail from './pages/LeadDetail.jsx';
import LeadForm from './pages/LeadForm.jsx';
import Assign from './pages/Assign.jsx';
import FollowUps from './pages/FollowUps.jsx';
import Reports from './pages/Reports.jsx';
import UsersMgmt from './pages/UsersMgmt.jsx';
import Settings from './pages/Settings.jsx';
import Profile from './pages/Profile.jsx';
import Notifications from './pages/Notifications.jsx';
import Files from './pages/Files.jsx';
import SuperAdmin from './pages/SuperAdmin.jsx';
import Orgs from './pages/Orgs.jsx';

function RequireAuth({ children }) {
  const { currentUser } = useApp();
  const location = useLocation();
  if (!currentUser) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

export default function App() {
  return (
    <>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/features" element={<Features />} />
          <Route path="/contact" element={<Contact />} />
        </Route>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot" element={<Forgot />} />
        <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route path="/app" element={<Navigate to="/app/dashboard" replace />} />
          <Route path="/app/dashboard" element={<Dashboard />} />
          <Route path="/app/leads" element={<Leads />} />
          <Route path="/app/leads/new" element={<LeadForm />} />
          <Route path="/app/leads/:id" element={<LeadDetail />} />
          <Route path="/app/leads/:id/edit" element={<LeadForm />} />
          <Route path="/app/assign" element={<Assign />} />
          <Route path="/app/follow-ups" element={<FollowUps />} />
          <Route path="/app/reports" element={<Reports />} />
          <Route path="/app/users-mgmt" element={<UsersMgmt />} />
          <Route path="/app/settings" element={<Settings />} />
          <Route path="/app/profile" element={<Profile />} />
          <Route path="/app/notifications" element={<Notifications />} />
          <Route path="/app/files" element={<Files />} />
          <Route path="/app/super-admin" element={<SuperAdmin />} />
          <Route path="/app/orgs" element={<Orgs />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
      <Modal />
    </>
  );
}
