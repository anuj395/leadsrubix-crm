import { Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ForgotPasswordPage, LoginPage, SignupPage, FirstTimeChangePasswordPage } from '@/features/auth'
import AuthLayout from '@/layouts/AuthLayout'
import { MainLayout } from '@/layouts/MainLayout/MainLayout'
import { ProtectedRoute } from './ProtectedRoute'
import { superAdminMenuConfig, getMenuConfigForRole, type SuperAdminMenuItem } from '@/config/menuConfig'
import { routeComponentMap as superAdminRouteMap } from './superAdminRouteMap'
import { routeComponentMap as adminRouteMap } from './adminRouteMap'
import { useAuth } from '@/hooks/useAuth'
import { Loader } from '@/components/common/Loader'
import NotFoundPage from '@/features/superAdmin/pages/NotFound'
import type { UserRole } from '@/types/user'

export function AppRoutes() {
  const { user } = useAuth()
  const role = user?.role ?? undefined;
  const menuConfig = (role === 'superAdmin'
    ? superAdminMenuConfig
    : getMenuConfigForRole(role as UserRole)) as SuperAdminMenuItem[]
  const routeComponentMap = role === 'superAdmin' ? superAdminRouteMap : adminRouteMap

  return (
    <Routes>
      {/* Root Redirect */}
      <Route path="/" element={<Navigate replace to="/analytics" />} />

      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        {/* Force First-Time Password Change */}
        <Route element={<AuthLayout />}>
          <Route path="/change-password" element={<FirstTimeChangePasswordPage />} />
        </Route>

        <Route element={<MainLayout />}>
          <Route index element={<Navigate to="/analytics" replace />} />

          {menuConfig.map((item) => {
            if (!item.route) return null
            const Component = routeComponentMap[item.route]
            return (
              <Route
                key={item.route}
                path={item.route}
                element={
                  <Suspense fallback={<Loader fullScreen={false} message="Loading..." />}>
                    {Component ? <Component /> : <NotFoundPage />}
                  </Suspense>
                }
              />
            )
          })}

          {/* Also register any additional routes present in the route maps but not exposed in the menu config */}
          {Object.entries(routeComponentMap).map(([routePath, Comp]) => {
            // skip if already added via menuConfig
            const already = menuConfig.some((m) => m.route === routePath)
            if (already) return null
            return (
              <Route
                key={routePath}
                path={routePath}
                element={
                  <Suspense fallback={<Loader fullScreen={false} message="Loading..." />}>
                    {Comp ? <Comp /> : <NotFoundPage />}
                  </Suspense>
                }
              />
            )
          })}

        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}