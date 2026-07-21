# Walkthrough - Hiding Booking Functionality

Hidden all Booking-related menus, navigation, routes, integrations, and API endpoints across the application. All underlying code structures remain intact to allow seamless re-enabling in the future.

## Areas Updated

1. **Sidebar Navigation & Menu Configuration**:
   - `menuConfig.ts`: Commented out `leads.bookings` across `superAdminMenuConfig` and `adminMenuConfig`.
   - `menuMapper.ts`: Filtered out any raw API sidebar items containing `booking` in key, name, or route.
   - `useSidebarMenu.ts`: Added filtering to ensure Booking menu items are hidden regardless of role or API payload.

2. **Routes & Pages**:
   - `adminRouteMap.ts` & `superAdminRouteMap.ts`: Disabled `/leads/bookings` and `/configuration/booking-form` routes.

3. **Integrations**:
   - `IntegrationsApi.tsx` & `IntegrationsApiData.tsx`: Hidden Booking references from integration logs and descriptions.

4. **API Backend**:
   - `api-server/src/routes/index.js`: Commented out `/bookings` router mounting (`// router.use('/bookings', bookingRoutes)`).

---

## Verification Results
Verified code compilation and builds successfully:
```bash
PORT=3000 pnpm run build
```
- **Result**: Success.
