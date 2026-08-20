import AnalyticsPage from '@/features/admin/pages/Analytics'
import UserListPage from '@/features/admin/pages/UserList'
import UserFormPage from '@/features/superAdmin/users/pages/UserForm'
import RolesAndPermissionsPage from '@/features/superAdmin/users/pages/RolesAndPermissions'

import ContactDrilldownPage from '@/features/admin/pages/drilldown/ContactDrilldown'
import TaskDrilldownPage from '@/features/admin/pages/drilldown/TaskDrilldown'
import CallLogDrilldownPage from '@/features/admin/pages/drilldown/CallLogDrilldown'

import ContactsListPage from '@/features/admin/leads/pages/ContactsList'
import TasksListPage from '@/features/admin/leads/pages/TasksList'
import CallLogsListPage from '@/features/admin/leads/pages/CallLogsList'
import BookingsListPage from '@/features/admin/leads/pages/BookingsList'

import ProjectsListPage from '@/features/admin/config/pages/ProjectsList'
import ProjectFormPage from '@/features/admin/config/pages/ProjectForm'
import ApiListPage from '@/features/admin/config/pages/ApiList'
import ApiFormPage from '@/features/admin/config/pages/ApiForm'
import BookingFormPage from '@/features/admin/config/pages/BookingForm'
import ResourcesPage from '@/features/admin/config/pages/Resources'
import WhatsappApiPage from '@/features/admin/config/pages/WhatsappApi'
import HolidayConfigPage from '@/features/admin/config/pages/HolidayConfig'
import HolidayConfigFormPage from '@/features/admin/config/pages/HolidayConfigForm'
import DaysConfigPage from '@/features/admin/config/pages/DaysConfig'
import AnalyticsConfigPage from '@/features/admin/config/pages/AnalyticsConfig'
import DomainSettingsPage from '@/features/admin/config/pages/DomainSettings'
import MenusPage from '@/features/admin/config/pages/Menus'
import PermissionsMatrixPage from '@/features/admin/config/pages/PermissionsMatrix'
import ScreensPage from '@/features/admin/config/pages/Screens'
import ScreenFieldsPage from '@/features/admin/config/pages/ScreenFields'
import ScreenPermissionsPage from '@/features/admin/config/pages/ScreenPermissions'

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

import NewsListPage from '@/features/admin/support/pages/NewsList'
import FaqListPage from '@/features/admin/support/pages/FaqList'

import SettingsPage from '@/features/admin/setting/pages/Settings'
import SubscriptionDetailsPage from '@/features/admin/setting/pages/SubscriptionDetails'
import PaymentInvoicesPage from '@/features/admin/setting/pages/PaymentInvoices'
import ReceiptsHistoryPage from '@/features/admin/setting/pages/ReceiptsHistory'
import UpdatePasswordPage from '@/features/admin/setting/pages/UpdatePassword'

import AddContactPage from '@/features/admin/leads/pages/AddContact'
import ContactDetailsPage from '@/features/admin/leads/pages/ContactDetails'
import InterestedDetailsPage from '@/features/admin/leads/components/InterestedDetails'

import AreaConverterPage from '@/features/admin/tool/pages/AreaConverter'
import CalculatorPage from '@/features/admin/tool/pages/Calculator'
import EmiCalculatorPage from '@/features/admin/tool/pages/EmiCalculator'

import LeadDistributionListPage from '@/features/admin/leaddistribution/pages/LeadDistributionList'
import LeadDistributionLogicPage from '@/features/admin/leaddistribution/pages/LeadDistributionLogic'
import ReassignListPage from '@/features/admin/leaddistribution/pages/ReassignList'
import ReassignLogicPage from '@/features/admin/leaddistribution/pages/ReassignLogic'

export const routeComponentMap: Record<string, any> = {
  "/analytics": AnalyticsPage,
  "/users": UserListPage,
  "/users/list": UserListPage,
  "/users/new": UserFormPage,
  "/users/:id/edit": UserFormPage,
  "/users/roles": RolesAndPermissionsPage,
  "/access-control/roles": RolesAndPermissionsPage,

  "/leads/contacts": ContactsListPage,
  "/leads/contacts/new": AddContactPage,
  "/leads/contacts/:id": ContactDetailsPage,
  "/leads/contacts/:id/interested": InterestedDetailsPage,
  "/leads/contacts/:id/edit": AddContactPage,

  "/leads/tasks": TasksListPage,
  "/leads/call-logs": CallLogsListPage,
  "/leads/bookings": BookingsListPage,

  "/configuration/projects": ProjectsListPage,
  "/configuration/projects/new": ProjectFormPage,
  "/configuration/projects/:id/edit": ProjectFormPage,
  "/configuration/api": ApiListPage,
  "/configuration/api/new": ApiFormPage,
  "/configuration/api/:id/edit": ApiFormPage,
  "/configuration/booking-form": BookingFormPage,
  "/configuration/resources": ResourcesPage,
  "/configuration/whatsapp": WhatsappApiPage,
  "/integrations/whatsapp": WhatsappApiPage,
  "/configuration/holiday-config": HolidayConfigPage,
  "/configuration/holiday-config/new": HolidayConfigFormPage,
  "/configuration/holiday-config/:id/edit": HolidayConfigFormPage,
  "/configuration/days-config": DaysConfigPage,
  "/configuration/domain-settings": DomainSettingsPage,
  "/configuration/screens": ScreensPage,
  "/configuration/screen-fields": ScreenFieldsPage,
  "/configuration/permissions": PermissionsMatrixPage,
  "/configuration/menus": MenusPage,
  "/ui-navigation/menus": MenusPage,
  "/ui-navigation/screens": ScreensPage,
  "/ui-navigation/screen-fields": ScreenFieldsPage,
  "/ui-navigation/analytics-config": AnalyticsConfigPage,

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

  "/account/subscription-details": SubscriptionDetailsPage,
  "/account/payment-invoices": PaymentInvoicesPage,
  "/account/receipts-history": ReceiptsHistoryPage,
  "/invoices/payment-invoices": PaymentInvoicesPage,
  "/invoices/receipts-history": ReceiptsHistoryPage,
  "/account/update-password": UpdatePasswordPage,
  "/settings": SettingsPage,

  "/tool/area-converter": AreaConverterPage,
  "/tool/calculator": CalculatorPage,
  "/tool/emi-calculator": EmiCalculatorPage,

  "/lead-distribution/list": LeadDistributionListPage,
  "/lead-distribution/logic": LeadDistributionLogicPage,
  "/reassign/list": ReassignListPage,
  "/reassign/logic": ReassignLogicPage,

  "/drilldown-data": ContactDrilldownPage,
  "/task-drilldown-data": TaskDrilldownPage,
  "/call-drilldown-data": CallLogDrilldownPage,
}