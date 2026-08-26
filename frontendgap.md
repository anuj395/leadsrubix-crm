# Leads Rubix CRM — Frontend Architecture & Gaps Audit Report

**Generated Date:** August 25, 2026  
**Scope:** Complete Web Application Source Code (`artifacts/web/src/`)  
**Audit Focus:** UI/UX Resilience, State Persistence, Mobile Responsiveness, Error Boundaries, Network Timeouts & Component Architecture.

---

## Executive Summary

This document details the architectural, performance, and user experience audit of the Leads Rubix CRM web frontend (`@workspace/web`). The application provides a comprehensive UI layer built with React, Material-UI, and Redux Toolkit, supporting dynamic screen rendering, dark/light themes, and role-based views. However, specific gaps have been identified in global scope persistence, crash prevention via Error Boundaries, mobile card views, network timeout handling, and component deduplication between Super Admin and Admin modules.

---

## Table of Contents
1. [Category 1: Super Admin Scope & State Persistence (High Priority)](#1-super-admin-scope--state-persistence-high-priority)
2. [Category 2: Error Boundaries & Crash Prevention (High Priority)](#2-error-boundaries--crash-prevention-high-priority)
3. [Category 3: Mobile & Tablet Responsiveness (Medium Priority)](#3-mobile--tablet-responsiveness-medium-priority)
4. [Category 4: Network Timeouts & Bulk Action Handling (Medium Priority)](#4-network-timeouts--bulk-action-handling-medium-priority)
5. [Category 5: Code Duplication & Component Reusability (Maintainability)](#5-code-duplication--component-reusability-maintainability)
6. [Frontend Health & Quality Scorecard](#6-frontend-health--quality-scorecard)

---

## 1. Super Admin Scope & State Persistence (High Priority)

### Gap 1.1: Scope State Resets on Page Navigation
* **File:** `artifacts/web/src/hooks/useSuperAdminScope.ts` (Lines 12–43)
* **Issue:** 
  `selectedIndustry` and `selectedOrg` are held in local component `useState`. When a Super Admin changes the active industry filter (e.g., from Real Estate `temp0001` to Education `temp0004`) on the Projects page, and then navigates to Resources, Contacts, or Analytics, the hook re-initializes from scratch and resets the selected industry back to the first item (`temp0001`).
* **User Impact:** 
  The Super Admin has to repeatedly re-select their target industry and organization on every page transition.
* **Recommended Fix:**
  Persist the selected scope in `sessionStorage` or global Redux store:
  ```ts
  const SCOPE_STORAGE_KEY = 'leadsrubix_superadmin_scope';

  export function useSuperAdminScope(isSuperAdmin: boolean) {
    const savedScope = useMemo(() => {
      try {
        return JSON.parse(sessionStorage.getItem(SCOPE_STORAGE_KEY) || '{}');
      } catch { return {}; }
    }, []);

    const [selectedIndustry, setSelectedIndustryState] = useState(savedScope.industry || '');
    const [selectedOrg, setSelectedOrgState] = useState(savedScope.org || '');

    const setSelectedIndustry = (ind: string) => {
      setSelectedIndustryState(ind);
      sessionStorage.setItem(SCOPE_STORAGE_KEY, JSON.stringify({ industry: ind, org: selectedOrg }));
    };
    // ...
  }
  ```

---

## 2. Error Boundaries & Crash Prevention (High Priority)

### Gap 2.1: Missing React `<ErrorBoundary>` on Route Level
* **File:** `artifacts/web/src/routes/AppRoutes.tsx` (Lines 43–65)
* **Issue:** 
  The application wraps lazy-loaded routes with `<Suspense fallback={<Loader />}>`, but lacks a top-level or per-route React `<ErrorBoundary>`.
* **User Impact:** 
  If any child component encounters an unhandled runtime JavaScript exception during rendering (such as `undefined.map()` from unexpected API payload shapes), the entire React component tree unmounts, resulting in a blank white screen with no recovery option for the user.
* **Recommended Fix:**
  Introduce an `ErrorBoundary` component around route elements:
  ```tsx
  <ErrorBoundary fallback={<PageCrashFallback />}>
    <Suspense fallback={<Loader fullScreen={false} message="Loading..." />}>
      {Component ? <Component /> : <NotFoundPage />}
    </Suspense>
  </ErrorBoundary>
  ```

---

## 3. Mobile & Tablet Responsiveness (Medium Priority)

### Gap 3.1: Unused `MobileCardView` on List Pages
* **Files:** 
  * `artifacts/web/src/components/DataTable/MobileCardView.tsx`
  * `artifacts/web/src/features/admin/leads/pages/ContactsList.tsx`
  * `artifacts/web/src/features/admin/leads/pages/DealsList.tsx`
  * `artifacts/web/src/features/admin/leads/pages/TasksList.tsx`
  * `artifacts/web/src/features/superAdmin/config/pages/ProjectsList.tsx`
* **Issue:** 
  A dedicated `MobileCardView` component is implemented in `components/DataTable/` but is currently not consumed by any main data tables. On mobile screens (`< 600px`), tables render wide DataGrids requiring heavy horizontal scrolling.
* **User Impact:** 
  Suboptimal mobile browser experience for sales agents managing leads in the field.
* **Recommended Fix:**
  Detect mobile viewport using MUI `useMediaQuery(theme.breakpoints.down('sm'))` and conditionally render `<MobileCardView />` when on mobile viewports.

---

## 4. Network Timeouts & Bulk Action Handling (Medium Priority)

### Gap 4.1: Aggressive 10-Second Axios Timeout
* **File:** `artifacts/web/src/services/axiosInstance.ts` (Line 15)
* **Issue:** 
  `axiosInstance` defines `timeout: 10000` (10,000ms).
* **Impact:** 
  Complex operations such as bulk importing 5,000+ contacts via Excel/CSV, generating comprehensive multi-organization analytics reports, or uploading large marketing carousel assets can take 12–15 seconds on moderate network conditions, triggering premature client-side `timeout of 10000ms exceeded` error aborts.
* **Recommended Fix:**
  Increase the default timeout to 30,000ms (30 seconds) and support per-request timeout overrides for bulk actions.

---

## 5. Code Duplication & Component Reusability (Maintainability)

### Gap 5.1: Duplicated Views Between `admin` and `superAdmin`
* **Files:** 
  * `features/admin/config/pages/Resources.tsx` vs `features/superAdmin/config/pages/Resources.tsx`
  * `features/admin/config/pages/ProjectsList.tsx` vs `features/superAdmin/config/pages/ProjectsList.tsx`
* **Issue:** 
  The Super Admin and Admin implementations for several configuration pages share ~90% identical UI and state logic, differing primarily in the presence of the global organization selector dropdown.
* **Impact:** 
  Bug fixes or feature enhancements applied to one version must be manually mirrored to the other, creating maintenance overhead.
* **Recommended Fix:**
  Refactor duplicate pages into unified polymorphic components that accept an `isSuperAdmin` prop or derive scope from `useAuth()`.

---

## 6. Frontend Health & Quality Scorecard

| Area | Score / Quality | Status / Remarks |
| :--- | :---: | :--- |
| **Dynamic Form Engine (`DynamicForm.tsx`)** | 🟢 **95% Excellent** | Responsive 3-column layout, validations & tooltip hints active |
| **Design System & Theme (MUI + Tailwind)** | 🟢 **100% Clean** | Dark/Light mode, gradients & typography standardized |
| **Authentication & Route Guards** | 🟢 **95% Solid** | Token refresh & protected route wrappers active |
| **Build & Deployment Indicator** | 🟢 **100% Live** | Version, commit hash & deployed time visible in sidebar and profile |
| **Super Admin Scope Persistence** | 🟡 **Needs Session Storage** | Add persistence in `useSuperAdminScope.ts` |
| **Error Boundary Crash Shield** | 🟡 **Needs Error Boundary** | Add `<ErrorBoundary>` wrapper in `AppRoutes.tsx` |
| **Mobile List View Integration** | 🟡 **Needs Hookup** | Enable `MobileCardView` on mobile breakpoints |
| **API Timeout Configuration** | 🟡 **Needs 30s Timeout** | Increase 10s timeout in `axiosInstance.ts` |

