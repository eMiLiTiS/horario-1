import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RoleGuard, PublicRoute } from './role-guard'
import { RootRedirect } from './root-redirect'

// Auth pages
import { LoginPage } from '@/features/auth/pages/login-page'
import { ForgotPasswordPage } from '@/features/auth/pages/forgot-password-page'

// Employee pages
import { EmployeeDashboardPage } from '@/features/employee/pages/employee-dashboard-page'
import { ClockPage } from '@/features/employee/pages/clock-page'
import { MySchedulePage } from '@/features/employee/pages/my-schedule-page'
import { MyHistoryPage } from '@/features/employee/pages/my-history-page'
import { MyProfilePage } from '@/features/employee/pages/my-profile-page'

// Admin pages
import { AdminDashboardPage } from '@/features/admin/pages/admin-dashboard-page'
import { EmployeesPage } from '@/features/admin/pages/employees-page'
import { EmployeeDetailPage } from '@/features/admin/pages/employee-detail-page'
import { SchedulesPage } from '@/features/admin/pages/schedules-page'
import { MonitorPage } from '@/features/admin/pages/monitor-page'
import { IncidentsPage } from '@/features/admin/pages/incidents-page'
import { ReportsPage } from '@/features/admin/pages/reports-page'
import { SettingsPage } from '@/features/admin/pages/settings-page'

// Superadmin pages
import { SuperadminDashboardPage } from '@/features/superadmin/pages/superadmin-dashboard-page'
import { CompaniesPage } from '@/features/superadmin/pages/companies-page'
import { CompanyDetailPage } from '@/features/superadmin/pages/company-detail-page'

// Layouts
import { EmployeeShell } from '@/shared/components/layouts/employee-shell'
import { AdminShell } from '@/shared/components/layouts/admin-shell'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootRedirect />,
  },
  {
    path: '/login',
    element: <PublicRoute><LoginPage /></PublicRoute>,
  },
  {
    path: '/forgot-password',
    element: <PublicRoute><ForgotPasswordPage /></PublicRoute>,
  },

  // Employee
  {
    path: '/employee',
    element: <RoleGuard allow={['employee']}><EmployeeShell /></RoleGuard>,
    children: [
      { index: true, element: <EmployeeDashboardPage /> },
      { path: 'clock', element: <ClockPage /> },
      { path: 'schedule', element: <MySchedulePage /> },
      { path: 'history', element: <MyHistoryPage /> },
      { path: 'profile', element: <MyProfilePage /> },
    ],
  },

  // Admin
  {
    path: '/admin',
    element: <RoleGuard allow={['admin']}><AdminShell /></RoleGuard>,
    children: [
      { index: true, element: <AdminDashboardPage /> },
      { path: 'employees', element: <EmployeesPage /> },
      { path: 'employees/:id', element: <EmployeeDetailPage /> },
      { path: 'schedules', element: <SchedulesPage /> },
      { path: 'monitor', element: <MonitorPage /> },
      { path: 'incidents', element: <IncidentsPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },

  // Boss (read-only admin views)
  {
    path: '/boss',
    element: <RoleGuard allow={['boss']}><AdminShell readOnly /></RoleGuard>,
    children: [
      { index: true, element: <AdminDashboardPage /> },
      { path: 'employees', element: <EmployeesPage readOnly /> },
      { path: 'schedules', element: <SchedulesPage readOnly /> },
      { path: 'monitor', element: <MonitorPage /> },
      { path: 'reports', element: <ReportsPage /> },
    ],
  },

  // Superadmin
  {
    path: '/superadmin',
    element: <RoleGuard allow={['superadmin']}><AdminShell superadmin /></RoleGuard>,
    children: [
      { index: true, element: <SuperadminDashboardPage /> },
      { path: 'companies', element: <CompaniesPage /> },
      { path: 'companies/:id', element: <CompanyDetailPage /> },
    ],
  },

  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])
