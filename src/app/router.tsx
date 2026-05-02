import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RoleGuard, PublicRoute } from './role-guard'
import { RootRedirect } from './root-redirect'
import { LoadingState } from '@/shared/components/ui/states'

// Layouts — eager: small, needed immediately after auth resolves
import { EmployeeShell } from '@/shared/components/layouts/employee-shell'
import { AdminShell } from '@/shared/components/layouts/admin-shell'

// Auth pages — lazy
const LoginPage = lazy(() => import('@/features/auth/pages/login-page').then(m => ({ default: m.LoginPage })))
const ForgotPasswordPage = lazy(() => import('@/features/auth/pages/forgot-password-page').then(m => ({ default: m.ForgotPasswordPage })))
const SignupPage = lazy(() => import('@/features/auth/pages/signup-page').then(m => ({ default: m.SignupPage })))

// Employee pages — lazy
const EmployeeDashboardPage = lazy(() => import('@/features/employee/pages/employee-dashboard-page').then(m => ({ default: m.EmployeeDashboardPage })))
const ClockPage = lazy(() => import('@/features/employee/pages/clock-page').then(m => ({ default: m.ClockPage })))
const MySchedulePage = lazy(() => import('@/features/employee/pages/my-schedule-page').then(m => ({ default: m.MySchedulePage })))
const MyHistoryPage = lazy(() => import('@/features/employee/pages/my-history-page').then(m => ({ default: m.MyHistoryPage })))
const MyProfilePage = lazy(() => import('@/features/employee/pages/my-profile-page').then(m => ({ default: m.MyProfilePage })))

// Admin pages — lazy
const AdminDashboardPage = lazy(() => import('@/features/admin/pages/admin-dashboard-page').then(m => ({ default: m.AdminDashboardPage })))
const EmployeesPage = lazy(() => import('@/features/admin/pages/employees-page').then(m => ({ default: m.EmployeesPage })))
const EmployeeDetailPage = lazy(() => import('@/features/admin/pages/employee-detail-page').then(m => ({ default: m.EmployeeDetailPage })))
const SchedulesPage = lazy(() => import('@/features/admin/pages/schedules-page').then(m => ({ default: m.SchedulesPage })))
const MonitorPage = lazy(() => import('@/features/admin/pages/monitor-page').then(m => ({ default: m.MonitorPage })))
const IncidentsPage = lazy(() => import('@/features/admin/pages/incidents-page').then(m => ({ default: m.IncidentsPage })))
const ReportsPage = lazy(() => import('@/features/admin/pages/reports-page').then(m => ({ default: m.ReportsPage })))
const SettingsPage = lazy(() => import('@/features/admin/pages/settings-page').then(m => ({ default: m.SettingsPage })))

// Superadmin pages — lazy
const SuperadminDashboardPage = lazy(() => import('@/features/superadmin/pages/superadmin-dashboard-page').then(m => ({ default: m.SuperadminDashboardPage })))
const CompaniesPage = lazy(() => import('@/features/superadmin/pages/companies-page').then(m => ({ default: m.CompaniesPage })))
const CompanyDetailPage = lazy(() => import('@/features/superadmin/pages/company-detail-page').then(m => ({ default: m.CompanyDetailPage })))

function withSuspense(node: React.ReactNode, fullPage = false) {
  return <Suspense fallback={<LoadingState fullPage={fullPage} />}>{node}</Suspense>
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootRedirect />,
  },
  {
    path: '/login',
    element: <PublicRoute>{withSuspense(<LoginPage />, true)}</PublicRoute>,
  },
  {
    path: '/forgot-password',
    element: <PublicRoute>{withSuspense(<ForgotPasswordPage />, true)}</PublicRoute>,
  },
  {
    path: '/signup',
    element: <PublicRoute>{withSuspense(<SignupPage />, true)}</PublicRoute>,
  },

  // Employee
  {
    path: '/employee',
    element: <RoleGuard allow={['employee']}><EmployeeShell /></RoleGuard>,
    children: [
      { index: true, element: withSuspense(<EmployeeDashboardPage />) },
      { path: 'clock', element: withSuspense(<ClockPage />) },
      { path: 'schedule', element: withSuspense(<MySchedulePage />) },
      { path: 'history', element: withSuspense(<MyHistoryPage />) },
      { path: 'profile', element: withSuspense(<MyProfilePage />) },
    ],
  },

  // Admin
  {
    path: '/admin',
    element: <RoleGuard allow={['admin']}><AdminShell /></RoleGuard>,
    children: [
      { index: true, element: withSuspense(<AdminDashboardPage />) },
      { path: 'employees', element: withSuspense(<EmployeesPage />) },
      { path: 'employees/:id', element: withSuspense(<EmployeeDetailPage />) },
      { path: 'schedules', element: withSuspense(<SchedulesPage />) },
      { path: 'monitor', element: withSuspense(<MonitorPage />) },
      { path: 'incidents', element: withSuspense(<IncidentsPage />) },
      { path: 'reports', element: withSuspense(<ReportsPage />) },
      { path: 'settings', element: withSuspense(<SettingsPage />) },
    ],
  },

  // Boss (read-only admin views)
  {
    path: '/boss',
    element: <RoleGuard allow={['boss']}><AdminShell readOnly /></RoleGuard>,
    children: [
      { index: true, element: withSuspense(<AdminDashboardPage />) },
      { path: 'employees', element: withSuspense(<EmployeesPage readOnly />) },
      { path: 'schedules', element: withSuspense(<SchedulesPage readOnly />) },
      { path: 'monitor', element: withSuspense(<MonitorPage />) },
      { path: 'reports', element: withSuspense(<ReportsPage />) },
    ],
  },

  // Superadmin
  {
    path: '/superadmin',
    element: <RoleGuard allow={['superadmin']}><AdminShell superadmin /></RoleGuard>,
    children: [
      { index: true, element: withSuspense(<SuperadminDashboardPage />) },
      { path: 'companies', element: withSuspense(<CompaniesPage />) },
      { path: 'companies/:id', element: withSuspense(<CompanyDetailPage />) },
    ],
  },

  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])
