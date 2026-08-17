import { Navigate, Route, Routes } from 'react-router-dom';
import { PublicLayout } from '../layouts/PublicLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { AdminLayout } from '../layouts/AdminLayout';

import { LandingPage } from '../pages/LandingPage';
import { NotFoundPage } from '../pages/NotFoundPage';

import { TemplatesPage } from '../pages/public/TemplatesPage';
import { PricingPage } from '../pages/public/PricingPage';
import { HowItWorksPage } from '../pages/public/HowItWorksPage';
import { AboutPage } from '../pages/public/AboutPage';
import { ContactPage } from '../pages/public/ContactPage';
import { FaqPage } from '../pages/public/FaqPage';
import { TermsPage } from '../pages/public/TermsPage';
import { PrivacyPage } from '../pages/public/PrivacyPage';

import { RegisterPage } from '../pages/auth/RegisterPage';
import { LoginPage } from '../pages/auth/LoginPage';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage';

import { DashboardHomePage } from '../pages/dashboard/DashboardHomePage';
import { NotificationsPage } from '../pages/dashboard/NotificationsPage';
import { BillingPage } from '../pages/dashboard/BillingPage';
import { SettingsLayout } from '../pages/dashboard/settings/SettingsLayout';
import { ProfileSettingsPage } from '../pages/dashboard/settings/ProfileSettingsPage';
import { SecuritySettingsPage } from '../pages/dashboard/settings/SecuritySettingsPage';
import { NotificationsSettingsPage } from '../pages/dashboard/settings/NotificationsSettingsPage';
import { LanguageSettingsPage } from '../pages/dashboard/settings/LanguageSettingsPage';

import { CreateEventWizard } from '../pages/dashboard/events/CreateEventWizard';
import { EventsListPage } from '../pages/dashboard/events/EventsListPage';
import { EventWorkspaceLayout } from '../pages/dashboard/events/EventWorkspaceLayout';
import { EventOverviewPage } from '../pages/dashboard/events/EventOverviewPage';
import { EventSettingsPage } from '../pages/dashboard/events/EventSettingsPage';
import { InvitationBuilderPage } from '../pages/dashboard/events/builder/InvitationBuilderPage';
import { GuestsPage } from '../pages/dashboard/events/guests/GuestsPage';
import { EventAnalyticsPage } from '../pages/dashboard/events/EventAnalyticsPage';

import { InvitationPage } from '../pages/public/InvitationPage';

import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';
import { AdminUsersPage } from '../pages/admin/AdminUsersPage';
import { AdminEventsPage } from '../pages/admin/AdminEventsPage';
import { AdminTemplatesPage } from '../pages/admin/AdminTemplatesPage';
import { AdminAuditLogsPage } from '../pages/admin/AdminAuditLogsPage';

import { ProtectedRoute } from './ProtectedRoute';
import { AdminRoute } from './AdminRoute';
import { ROUTES } from '../constants/routes';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path={ROUTES.TEMPLATES} element={<TemplatesPage />} />
        <Route path={ROUTES.PRICING} element={<PricingPage />} />
        <Route path={ROUTES.HOW_IT_WORKS} element={<HowItWorksPage />} />
        <Route path={ROUTES.ABOUT} element={<AboutPage />} />
        <Route path={ROUTES.CONTACT} element={<ContactPage />} />
        <Route path={ROUTES.FAQ} element={<FaqPage />} />
        <Route path={ROUTES.TERMS} element={<TermsPage />} />
        <Route path={ROUTES.PRIVACY} element={<PrivacyPage />} />
      </Route>

      <Route element={<AuthLayout />}>
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />
        <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
        <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />
        <Route path={ROUTES.RESET_PASSWORD} element={<ResetPasswordPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path={ROUTES.DASHBOARD} element={<DashboardHomePage />} />
          <Route path={ROUTES.DASHBOARD_NOTIFICATIONS} element={<NotificationsPage />} />
          <Route path={ROUTES.DASHBOARD_EVENTS} element={<EventsListPage />} />
          <Route path={ROUTES.DASHBOARD_CREATE_EVENT} element={<CreateEventWizard />} />

          <Route path={ROUTES.DASHBOARD_EVENT_DETAIL} element={<EventWorkspaceLayout />}>
            <Route index element={<EventOverviewPage />} />
            <Route path="guests" element={<GuestsPage />} />
            <Route path="analytics" element={<EventAnalyticsPage />} />
            <Route path="settings" element={<EventSettingsPage />} />
          </Route>

          <Route path={ROUTES.DASHBOARD_BILLING} element={<BillingPage />} />

          <Route path={ROUTES.DASHBOARD_SETTINGS} element={<SettingsLayout />}>
            <Route index element={<Navigate to={ROUTES.DASHBOARD_SETTINGS_PROFILE} replace />} />
            <Route path="profile" element={<ProfileSettingsPage />} />
            <Route path="security" element={<SecuritySettingsPage />} />
            <Route path="notifications" element={<NotificationsSettingsPage />} />
            <Route path="language" element={<LanguageSettingsPage />} />
          </Route>
        </Route>

        {/* The builder gets its own focused chrome — no dashboard sidebar/topbar */}
        <Route path={ROUTES.DASHBOARD_EVENT_BUILDER} element={<InvitationBuilderPage />} />
      </Route>

      {/* Admin — real authorization is server-side (authenticate + authorize('admin')); AdminRoute is UX-only */}
      <Route element={<AdminRoute />}>
        <Route element={<AdminLayout />}>
          <Route path={ROUTES.ADMIN} element={<AdminDashboardPage />} />
          <Route path={ROUTES.ADMIN_USERS} element={<AdminUsersPage />} />
          <Route path={ROUTES.ADMIN_EVENTS} element={<AdminEventsPage />} />
          <Route path={ROUTES.ADMIN_TEMPLATES} element={<AdminTemplatesPage />} />
          <Route path={ROUTES.ADMIN_AUDIT_LOGS} element={<AdminAuditLogsPage />} />
        </Route>
      </Route>

      {/* Public invitation — no auth, no dashboard/marketing chrome; the customer's invitation is the whole page */}
      <Route path={ROUTES.INVITE} element={<InvitationPage />} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
