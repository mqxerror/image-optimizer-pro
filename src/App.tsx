import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { ErrorBoundary } from '@/components/error'

// Lazy load the feedback widget to avoid impacting initial bundle
const FeedbackWidget = lazy(() => import('@/components/feedback/FeedbackWidget').then(m => ({ default: m.FeedbackWidget })))
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import { RoleProtectedRoute } from './components/RoleProtectedRoute'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import Templates from './pages/Templates'
import Studio from './pages/Studio'
import Activity from './pages/Activity'
import Onboarding from './pages/Onboarding'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import AuthCallback from './pages/auth/Callback'
import Shopify from './pages/Shopify'
import ShopifyCallback from './pages/ShopifyCallback'
import ShopifyProducts from './pages/ShopifyProducts'
import ShopifySettings from './pages/ShopifySettings'
import ShopifyJobs from './pages/ShopifyJobs'
import ShopifyJobDetail from './pages/ShopifyJobDetail'
import Landing from './pages/Landing'

// Settings pages
import SettingsLayout from './pages/settings/SettingsLayout'
import SettingsIndex from './pages/settings/index'
import ProfileSettings from './pages/settings/ProfileSettings'
import OrganizationSettings from './pages/settings/OrganizationSettings'
import BillingSettings from './pages/settings/BillingSettings'
import IntegrationsSettings from './pages/settings/IntegrationsSettings'
import TeamSettings from './pages/settings/TeamSettings'

// Admin pages
import AdminLayout from './pages/admin/AdminLayout'
import AdminOverview from './pages/admin/Overview'
import AdminMembers from './pages/admin/Members'

function App() {
  return (
    <ErrorBoundary>
      <Routes>
        {/* Public landing page */}
        <Route path="/landing" element={<Landing />} />

        {/* Auth routes */}
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/register" element={<Register />} />
        <Route path="/auth/forgot-password" element={<ForgotPassword />} />
        <Route path="/auth/reset-password" element={<ResetPassword />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Onboarding - requires auth but not organization */}
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute requireOrganization={false}>
              <Onboarding />
            </ProtectedRoute>
          }
        />

        {/* Shopify OAuth callback - standalone page */}
        <Route
          path="/shopify/callback"
          element={
            <ProtectedRoute>
              <ShopifyCallback />
            </ProtectedRoute>
          }
        />

        {/* Protected routes - require auth and organization */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <Layout />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="studio" element={<Studio />} />
          <Route path="projects" element={<Projects />} />
          <Route path="activity" element={<Activity />} />

          {/* Settings - nested routes */}
          <Route path="settings" element={<SettingsLayout />}>
            <Route index element={<SettingsIndex />} />
            <Route path="profile" element={<ProfileSettings />} />
            <Route path="organization" element={<OrganizationSettings />} />
            <Route path="team" element={<TeamSettings />} />
            <Route path="billing" element={<BillingSettings />} />
            <Route path="integrations" element={<IntegrationsSettings />} />
          </Route>

          {/* Admin routes - owner only */}
          <Route
            path="admin"
            element={
              <RoleProtectedRoute requireOwner>
                <AdminLayout />
              </RoleProtectedRoute>
            }
          >
            <Route index element={<AdminOverview />} />
            <Route path="members" element={<AdminMembers />} />
          </Route>

          {/* Shopify routes */}
          <Route path="shopify" element={<Shopify />} />
          <Route path="shopify/jobs" element={<ShopifyJobs />} />
          <Route path="shopify/jobs/:jobId" element={<ShopifyJobDetail />} />
          <Route path="shopify/:storeId/products" element={<ShopifyProducts />} />
          <Route path="shopify/:storeId/settings" element={<ShopifySettings />} />

          {/* Legacy routes - redirect to new locations */}
          <Route path="templates" element={<Templates />} /> {/* Keep accessible, moved from nav */}
          <Route path="queue" element={<Navigate to="/activity" replace />} />
          <Route path="ai-jobs" element={<Navigate to="/activity" replace />} />
          <Route path="history" element={<Navigate to="/activity" replace />} />
        </Route>

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
      {/* Bug report widget - lazy loaded */}
      <Suspense fallback={null}>
        <FeedbackWidget />
      </Suspense>
    </ErrorBoundary>
  )
}

export default App
