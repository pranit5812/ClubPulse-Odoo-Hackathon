import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

// Public & Community Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { EventsPage } from './pages/EventsPage';
import { MerchCatalogPage } from './pages/MerchCatalogPage';
import { AnnouncementsPage } from './pages/AnnouncementsPage';

// Student Pages
import { StudentDashboard } from './pages/StudentDashboard';
import { MyTicketsPage } from './pages/MyTicketsPage';
import { MembershipPage } from './pages/MembershipPage';
import { StudentTasksPage } from './pages/StudentTasksPage';
import { ExpensesPage } from './pages/ExpensesPage';

// Organizer Command Center & Management
import { OrganizerOverview } from './pages/OrganizerOverview';
import { MembersManagementPage } from './pages/MembersManagementPage';
import { VolunteerRegistrationsPage } from './pages/VolunteerRegistrationsPage';
import { EventsManagementPage } from './pages/EventsManagementPage';
import { CreateEventPage } from './pages/CreateEventPage';
import { EventDetailsPage } from './pages/EventDetailsPage';
import { EditEventPage } from './pages/EditEventPage';
import { QRScannerPage } from './pages/QRScannerPage';
import { MerchManagementPage } from './pages/MerchManagementPage';
import { TaskBoardPage } from './pages/TaskBoardPage';
import { DepartmentAssignmentsPage } from './pages/DepartmentAssignmentsPage';
import { OrganizerAnnouncementsPage } from './pages/OrganizerAnnouncementsPage';

// Operations, Intelligence & Treasury
import { ActionCenterPage } from './pages/ActionCenterPage';
import { EventBudgetsPage } from './pages/EventBudgetsPage';
import { SimulatorPage } from './pages/SimulatorPage';
import { OrganizerReportsPage } from './pages/OrganizerReportsPage';
import { FinancialLedgerPage } from './pages/FinancialLedgerPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { EventAnalyticsPage } from './pages/EventAnalyticsPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Routes>
          {/* Public & Exploratory Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/merch" element={<MerchCatalogPage />} />
          <Route path="/announcements" element={<AnnouncementsPage />} />

          {/* Student Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-tickets"
            element={
              <ProtectedRoute>
                <MyTicketsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/membership"
            element={
              <ProtectedRoute>
                <MembershipPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-tasks"
            element={
              <ProtectedRoute>
                <StudentTasksPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-orders"
            element={
              <ProtectedRoute>
                <MerchCatalogPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/expenses"
            element={
              <ProtectedRoute allowedRoles={['organizer', 'admin', 'treasurer']} allowVolunteer={true}>
                <ExpensesPage />
              </ProtectedRoute>
            }
          />

          {/* ============================================================== */}
          {/* 1. ORGANIZER NAVIGATION: Overview                              */}
          {/* ============================================================== */}
          <Route
            path="/organizer/overview"
            element={
              <ProtectedRoute allowedRoles={['organizer', 'admin', 'treasurer']}>
                <OrganizerOverview />
              </ProtectedRoute>
            }
          />

          {/* ============================================================== */}
          {/* 1. ORGANIZER NAVIGATION: Manage                                */}
          {/* ============================================================== */}
          <Route
            path="/organizer/members"
            element={
              <ProtectedRoute allowedRoles={['organizer', 'admin', 'treasurer']}>
                <MembersManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizer/volunteers"
            element={
              <ProtectedRoute allowedRoles={['organizer', 'admin', 'treasurer']}>
                <VolunteerRegistrationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/volunteers"
            element={
              <ProtectedRoute allowedRoles={['organizer', 'admin', 'treasurer']}>
                <VolunteerRegistrationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizer/events"
            element={
              <ProtectedRoute allowedRoles={['organizer', 'admin', 'treasurer']}>
                <EventsManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizer/events/new"
            element={
              <ProtectedRoute allowedRoles={['organizer', 'admin', 'treasurer']}>
                <CreateEventPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizer/events/:id/edit"
            element={
              <ProtectedRoute allowedRoles={['organizer', 'admin', 'treasurer']}>
                <EditEventPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizer/events/:id"
            element={
              <ProtectedRoute allowedRoles={['organizer', 'admin', 'treasurer']}>
                <EventDetailsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizer/scanner"
            element={
              <ProtectedRoute allowedRoles={['organizer', 'admin', 'treasurer']} allowVolunteer={true}>
                <QRScannerPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizer/tasks"
            element={
              <ProtectedRoute allowedRoles={['organizer', 'admin', 'treasurer']}>
                <TaskBoardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/tasks"
            element={
              <ProtectedRoute allowedRoles={['organizer', 'admin', 'treasurer']}>
                <TaskBoardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizer/department-assignments"
            element={
              <ProtectedRoute allowedRoles={['organizer', 'admin', 'treasurer']}>
                <DepartmentAssignmentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizer/merch"
            element={
              <ProtectedRoute allowedRoles={['organizer', 'admin', 'treasurer']}>
                <MerchManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizer/announcements"
            element={
              <ProtectedRoute allowedRoles={['organizer', 'admin', 'treasurer']}>
                <OrganizerAnnouncementsPage />
              </ProtectedRoute>
            }
          />

          {/* ============================================================== */}
          {/* 1. ORGANIZER NAVIGATION: Operations                            */}
          {/* ============================================================== */}
          <Route
            path="/action-center"
            element={
              <ProtectedRoute allowedRoles={['organizer', 'treasurer', 'admin']}>
                <ActionCenterPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizer/budgets"
            element={
              <ProtectedRoute allowedRoles={['organizer', 'treasurer', 'admin']}>
                <EventBudgetsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/simulator"
            element={
              <ProtectedRoute allowedRoles={['organizer', 'treasurer', 'admin']}>
                <SimulatorPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organizer/reports"
            element={
              <ProtectedRoute allowedRoles={['organizer', 'treasurer', 'admin']}>
                <OrganizerReportsPage />
              </ProtectedRoute>
            }
          />

          {/* ============================================================== */}
          {/* Treasury & Executive Audit Routes                              */}
          {/* ============================================================== */}
          <Route
            path="/ledger"
            element={
              <ProtectedRoute allowedRoles={['organizer', 'treasurer', 'admin']}>
                <FinancialLedgerPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/event-analytics"
            element={
              <ProtectedRoute allowedRoles={['organizer', 'treasurer', 'admin']}>
                <EventAnalyticsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/audit-logs"
            element={
              <ProtectedRoute allowedRoles={['organizer', 'treasurer', 'admin']}>
                <EventAnalyticsPage />
              </ProtectedRoute>
            }
          />

          {/* Profile & Governance Routes */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminUsersPage />
              </ProtectedRoute>
            }
          />

          {/* ============================================================== */}
          {/* Backward Compatibility Redirects & Route Aliases               */}
          {/* ============================================================== */}
          {/* /risk -> Consolidates into Action Center                       */}
          <Route path="/risk" element={<Navigate to="/action-center" replace />} />
          {/* /readiness -> Consolidates into Events Hub                     */}
          <Route path="/readiness" element={<Navigate to="/organizer/events" replace />} />
          {/* /handover -> Consolidates into Organizer Reports               */}
          <Route path="/handover" element={<Navigate to="/organizer/reports" replace />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  </ErrorBoundary>
  );
}
