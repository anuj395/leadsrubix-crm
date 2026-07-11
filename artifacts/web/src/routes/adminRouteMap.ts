import AnalyticsPage from '@/features/admin/pages/Analytics'
import UserListPage from '@/features/admin/pages/UserList'
import UserFormPage from '@/features/superAdmin/users/pages/UserForm'
import RolesAndPermissionsPage from '@/features/superAdmin/users/pages/RolesAndPermissions'

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
  "/users/new": UserFormPage,
  "/users/:id/edit": UserFormPage,
  "/users/roles": RolesAndPermissionsPage,

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
  "/configuration/holidayConfig": HolidayConfigPage,
  "/configuration/holidayConfig/new": HolidayConfigFormPage,
  "/configuration/holidayConfig/:id/edit": HolidayConfigFormPage,
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
  "/leadDistribution/logic": LeadDistributionLogicPage,
  "/reassign/list": ReassignListPage,
  "/reassign/logic": ReassignLogicPage,
}