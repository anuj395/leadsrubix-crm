import AnalyticsPage from '@/features/superAdmin/pages/Analytics'
import OrganizationsListPage from '@/features/superAdmin/organization/pages/Organizations'
import OrganizationFormPage from '@/features/superAdmin/organization/pages/OrganizationForm'
import UserListPage from '@/features/superAdmin/users/pages/UserList'
import UserFormPage from '@/features/superAdmin/users/pages/UserForm'
import RolesAndPermissionsPage from '@/features/superAdmin/users/pages/RolesAndPermissions'

import ContactsListPage from '@/features/superAdmin/leads/pages/ContactsList'
import TasksListPage from '@/features/superAdmin/leads/pages/TasksList'
import CallLogsListPage from '@/features/superAdmin/leads/pages/CallLogsList'
import BookingsListPage from '@/features/superAdmin/leads/pages/BookingsList'
import SortedListPage from '@/features/superAdmin/leads/pages/SortedList'

import ScreensPage from '@/features/superAdmin/config/pages/Screens'
import ScreenFieldsPage from '@/features/superAdmin/config/pages/ScreenFields'
import ScreenPermissionsPage from '@/features/superAdmin/config/pages/ScreenPermissions'
import ProjectsListPage from '@/features/superAdmin/config/pages/ProjectsList'
import ProjectFormPage from '@/features/superAdmin/config/pages/ProjectForm'
import ApiListPage from '@/features/superAdmin/config/pages/ApiList'
import ApiFormPage from '@/features/superAdmin/config/pages/ApiForm'
import BookingFormPage from '@/features/superAdmin/config/pages/BookingForm'
import ResourcesPage from '@/features/superAdmin/config/pages/Resources'
import WhatsappApiPage from '@/features/superAdmin/config/pages/WhatsappApi'
import IndustriesPage from '@/features/superAdmin/config/pages/Industries'
import MenusPage from '@/features/superAdmin/config/pages/Menus'
import PermissionsMatrixPage from '@/features/superAdmin/config/pages/PermissionsMatrix'
import AnalyticsConfigPage from '@/features/superAdmin/config/pages/AnalyticsConfig'

import NewsListPage from '@/features/superAdmin/support/pages/NewsList'
import FaqListPage from '@/features/superAdmin/support/pages/FaqList'

import LicensesPage from '@/features/superAdmin/setting/pages/Licenses'
import CouponsPage from '@/features/superAdmin/setting/pages/Coupons'
import UpdatePasswordPage from '@/features/superAdmin/setting/pages/UpdatePassword'
import SubscriptionDetailsPage from '@/features/admin/setting/pages/SubscriptionDetails'
import SuperAdminPaymentInvoicesPage from '@/features/superAdmin/setting/pages/SuperAdminPaymentInvoices'
import SuperAdminReceiptsHistoryPage from '@/features/superAdmin/setting/pages/SuperAdminReceiptsHistory'
import SettingsPage from '@/features/admin/setting/pages/Settings'

import HolidayConfigPage from '@/features/admin/config/pages/HolidayConfig'
import DaysConfigPage from '@/features/admin/config/pages/DaysConfig'

import IntegrationsPage from '@/features/admin/integrations/pages/Integrations'
import IntegrationsApiPage from '@/features/admin/integrations/pages/IntegrationsApi'
import IntegrationsApiDataPage from '@/features/admin/integrations/pages/IntegrationsApiData'
import FacebookLeadsPage from '@/features/admin/integrations/pages/FacebookLeads'
import AcresPage from '@/features/admin/integrations/pages/Acres'
import MagicBricksPage from '@/features/admin/integrations/pages/MagicBricks'
import JustDialPage from '@/features/admin/integrations/pages/JustDial'
import SulekhaPage from '@/features/admin/integrations/pages/Sulekha'
import WebsitePage from '@/features/admin/integrations/pages/Website'
import HousingPage from '@/features/admin/integrations/pages/Housing'





import AreaConverterPage from '@/features/admin/tool/pages/AreaConverter'
import CalculatorPage from '@/features/admin/tool/pages/Calculator'
import EmiCalculatorPage from '@/features/admin/tool/pages/EmiCalculator'
import ContactDetailsPage from '@/features/admin/leads/pages/ContactDetails'
import AddContactPage from '@/features/admin/leads/pages/AddContact'
import InterestedDetailsPage from '@/features/admin/leads/components/InterestedDetails'
import ContactDrilldownPage from '@/features/admin/pages/drilldown/ContactDrilldown'
import TaskDrilldownPage from '@/features/admin/pages/drilldown/TaskDrilldown'
import CallLogDrilldownPage from '@/features/admin/pages/drilldown/CallLogDrilldown'
import DealsListPage from '@/features/admin/leads/pages/DealsList'

export const routeComponentMap: Record<string, any> = {
  "/analytics": AnalyticsPage,
  "/organization/list": OrganizationsListPage,
  "/organization/new": OrganizationFormPage,
  "/organization/:id/edit": OrganizationFormPage,
  "/users": UserListPage,
  "/users/new": UserFormPage,
  "/users/:id/edit": UserFormPage,
  "/users/roles": RolesAndPermissionsPage,
  "/access-control/roles": RolesAndPermissionsPage,

  "/leads/deals": DealsListPage,
  "/leads/deals-list": DealsListPage,
  "/leads/contacts": ContactsListPage,
  "/leads/contacts/new": AddContactPage,
  "/leads/contacts/:id": ContactDetailsPage,
  "/leads/contacts/:id/edit": AddContactPage,
  "/leads/contacts/:id/interested": InterestedDetailsPage,
  "/leads/tasks": TasksListPage,
  "/leads/call-logs": CallLogsListPage,
  // "/leads/bookings": BookingsListPage,
  "/leads/sorted": SortedListPage,

  "/drilldown-data": ContactDrilldownPage,
  "/task-drilldown-data": TaskDrilldownPage,
  "/call-drilldown-data": CallLogDrilldownPage,
 
  "/configuration/screens": ScreensPage,
  "/configuration/screen-fields": ScreenFieldsPage,
  "/configuration/screen-permissions": ScreenPermissionsPage,
  "/configuration/projects": ProjectsListPage,
  "/configuration/projects/new": ProjectFormPage,
  "/configuration/projects/:id/edit": ProjectFormPage,
  "/configuration/api": ApiListPage,
  "/configuration/api/new": ApiFormPage,
  "/configuration/api/:id/edit": ApiFormPage,
  // "/configuration/booking-form": BookingFormPage,
  "/configuration/resources": ResourcesPage,
  "/configuration/whatsapp": WhatsappApiPage,
  "/integrations/whatsapp": WhatsappApiPage,
  "/configuration/industries": IndustriesPage,
  "/configuration/menus": MenusPage,
  "/configuration/permissions": PermissionsMatrixPage,
  "/configuration/analytics-config": AnalyticsConfigPage,
  "/configuration/holiday-config": HolidayConfigPage,
  "/configuration/days-config": DaysConfigPage,
  "/ui-navigation/screens": ScreensPage,
  "/ui-navigation/screen-fields": ScreenFieldsPage,
  "/ui-navigation/analytics-config": AnalyticsConfigPage,
  "/ui-navigation/menus": MenusPage,
  "/access-control/permissions": PermissionsMatrixPage,
  "/access-control/screen-permissions": ScreenPermissionsPage,

  "/integrations": IntegrationsPage,
  "/integrations/api": ApiListPage,
  "/integrations/api-data": IntegrationsApiDataPage,
  "/integrations/facebook": FacebookLeadsPage,
  "/integrations/99acres": AcresPage,
  "/integrations/magicbricks": MagicBricksPage,
  "/integrations/justdial": JustDialPage,
  "/integrations/sulekha": SulekhaPage,
  "/integrations/website": WebsitePage,
  "/integrations/housing": HousingPage,






  "/support/news": NewsListPage,
  "/support/faq": FaqListPage,

  "/account/licenses": LicensesPage,
  "/account/coupons": CouponsPage,
  "/account/subscription-details": SubscriptionDetailsPage,
  "/account/payment-invoices": SuperAdminPaymentInvoicesPage,
  "/account/receipts-history": SuperAdminReceiptsHistoryPage,
  "/invoices/payment-invoices": SuperAdminPaymentInvoicesPage,
  "/invoices/receipts-history": SuperAdminReceiptsHistoryPage,
  "/account/update-password": UpdatePasswordPage,
  "/settings": SettingsPage,

  "/tool/area-converter": AreaConverterPage,
  "/tool/calculator": CalculatorPage,
  "/tool/emi-calculator": EmiCalculatorPage,
}
