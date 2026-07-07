import AnalyticsPage from '@/features/admin/pages/Analytics'
import UserListPage from '@/features/admin/pages/UserList'
import RolesAndPermissionsPage from '@/features/superAdmin/users/pages/RolesAndPermissions'

import ContactsListPage from '@/features/admin/leads/pages/ContactsList'
import TasksListPage from '@/features/admin/leads/pages/TasksList'
import CallLogsListPage from '@/features/admin/leads/pages/CallLogsList'
import BookingsListPage from '@/features/admin/leads/pages/BookingsList'

import ProjectsListPage from '@/features/admin/config/pages/ProjectsList'
import ApiListPage from '@/features/admin/config/pages/ApiList'
import BookingFormPage from '@/features/admin/config/pages/BookingForm'
import ResourcesPage from '@/features/admin/config/pages/Resources'
import WhatsappApiPage from '@/features/admin/config/pages/WhatsappApi'
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




import NewsListPage from '@/features/admin/support/pages/NewsList'
import FaqListPage from '@/features/admin/support/pages/FaqList'

import UpdatePasswordPage from '@/features/admin/setting/pages/UpdatePassword'
import SubscriptionDetailsPage from '@/features/admin/setting/pages/SubscriptionDetails'
import SettingsPage from '@/features/admin/setting/pages/Settings'

import AddContactPage from '@/features/admin/leads/pages/AddContact'

import AreaConverterPage from '@/features/admin/tool/pages/AreaConverter'
import CalculatorPage from '@/features/admin/tool/pages/Calculator'
import EmiCalculatorPage from '@/features/admin/tool/pages/EmiCalculator'

import LeadDistributionListPage from '@/features/admin/leaddistribution/pages/LeadDistributionList'
import ReassignListPage from '@/features/admin/leaddistribution/pages/ReassignList'

export const routeComponentMap: Record<string, any> = {
  "/analytics": AnalyticsPage,
  "/users": UserListPage,
  "/users/roles": RolesAndPermissionsPage,

  "/leads/contacts": ContactsListPage,
  "/leads/contacts/new": AddContactPage,

  "/leads/tasks": TasksListPage,
  "/leads/call-logs": CallLogsListPage,
  "/leads/bookings": BookingsListPage,

  "/configuration/projects": ProjectsListPage,
  "/configuration/api": ApiListPage,
  "/configuration/booking-form": BookingFormPage,
  "/configuration/resources": ResourcesPage,
  "/configuration/whatsapp": WhatsappApiPage,
  "/configuration/holidayConfig": HolidayConfigPage,
  "/configuration/holiday-config": HolidayConfigPage,
  "/configuration/daysConfig": DaysConfigPage,
  "/configuration/days-config": DaysConfigPage,

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
  "/account/update-password": UpdatePasswordPage,
  "/settings": SettingsPage,

  "/tool/areaConverter": AreaConverterPage,
  "/tool/calculator": CalculatorPage,
  "/tool/emi-calculator": EmiCalculatorPage,

  "/leadDistribution/list": LeadDistributionListPage,
  "/reassign/list": ReassignListPage,
}