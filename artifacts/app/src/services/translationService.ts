export interface IndustryTranslationMap {
  projects: string;
  resources: string;
  contacts: string;
  tasks: string;
  quotes: string;
  bookings: string;
  leads: string;
  configuration: string;
}

export const INDUSTRY_TRANSLATIONS: Record<string, IndustryTranslationMap> = {
  auto_sales_service_3s: {
    projects: 'Vehicle Inventory',
    resources: 'Workshop Spares',
    contacts: 'Customer Records',
    tasks: 'Test Drives',
    quotes: 'Vehicle Quotations',
    bookings: 'Vehicle Bookings',
    leads: 'Car Inquiries',
    configuration: 'Dealership Inventory',
  },
  auto_dealership: {
    projects: 'Vehicle Inventory',
    resources: 'Showroom Accessories',
    contacts: 'Buyer Prospects',
    tasks: 'Test Drive Schedule',
    quotes: 'Vehicle Quotes',
    bookings: 'Vehicle Bookings',
    leads: 'New Car Leads',
    configuration: 'Showroom Inventory',
  },
  real_estate: {
    projects: 'Property Projects',
    resources: 'Site Assets',
    contacts: 'Property Leads',
    tasks: 'Site Visits',
    quotes: 'Payment Plans',
    bookings: 'Unit Bookings',
    leads: 'Buyer Leads',
    configuration: 'Property Configuration',
  },
  it_saas: {
    projects: 'Software Products',
    resources: 'Developer Assets',
    contacts: 'B2B Accounts',
    tasks: 'Demos & POCs',
    quotes: 'SaaS Proposals',
    bookings: 'Contract Wins',
    leads: 'Inbound Prospects',
    configuration: 'Product Catalog',
  },
  ecommerce: {
    projects: 'Product Catalog',
    resources: 'Warehouse Inventory',
    contacts: 'VIP Customers',
    tasks: 'Order Dispatches',
    quotes: 'Custom Order Estimates',
    bookings: 'Order Confirmations',
    leads: 'Cart Abandonments',
    configuration: 'Store Catalog',
  },
  healthcare: {
    projects: 'Clinical Services',
    resources: 'Medical Supplies',
    contacts: 'Patient Records',
    tasks: 'Appointments',
    quotes: 'Treatment Cost Estimates',
    bookings: 'Patient Registrations',
    leads: 'Patient Inquiries',
    configuration: 'Clinic Services',
  },
  hospitality: {
    projects: 'Properties & Suites',
    resources: 'Dining & Banquet Amenities',
    contacts: 'Guest & Corporate Records',
    tasks: 'Check-ins & Guest Tours',
    quotes: 'Tariff & Event Packages',
    bookings: 'Room & Event Reservations',
    leads: 'Guest & Event Inquiries',
    configuration: 'Hotel & Venue Inventory',
  },
  real_estate_channel_partner: {
    projects: 'Developer Mandates & Projects',
    resources: 'Marketing Collateral & Brochures',
    contacts: 'Buyer & Investor Portfolio',
    tasks: 'Client Site Visits & Builder Meets',
    quotes: 'Cost Sheets & Price Quotes',
    bookings: 'Unit Closures & Registrations',
    leads: 'Buyer Inquiries & CP Leads',
    configuration: 'Mandate Inventory & Config',
  },
  basic_crm: {
    projects: 'Products & Services',
    resources: 'Resources & Assets',
    contacts: 'Contacts & Accounts',
    tasks: 'Tasks & Activities',
    quotes: 'Quotations & Estimates',
    bookings: 'Bookings & Signings',
    leads: 'Lead Inquiries',
    configuration: 'Product Catalog',
  },
};

export const translationService = {
  getIndustryTranslations(industryCode?: string): IndustryTranslationMap {
    if (!industryCode) return INDUSTRY_TRANSLATIONS.basic_crm;

    const lower = String(industryCode).toLowerCase().trim();
    if (lower.includes('hospitality') || lower.includes('hotel') || lower.includes('resort')) {
      return INDUSTRY_TRANSLATIONS.hospitality;
    }
    if (lower.includes('channel_partner') || lower.includes('broker') || lower.includes('proptech') || lower.includes('real_estate_cp')) {
      return INDUSTRY_TRANSLATIONS.real_estate_channel_partner;
    }
    if (lower.includes('auto') || lower.includes('dealership')) {
      return INDUSTRY_TRANSLATIONS.auto_sales_service_3s;
    }
    if (lower.includes('real_estate') || lower.includes('property')) {
      return INDUSTRY_TRANSLATIONS.real_estate;
    }
    if (lower.includes('saas') || lower.includes('it_tech')) {
      return INDUSTRY_TRANSLATIONS.it_saas;
    }
    if (lower.includes('ecommerce')) {
      return INDUSTRY_TRANSLATIONS.ecommerce;
    }
    if (lower.includes('healthcare')) {
      return INDUSTRY_TRANSLATIONS.healthcare;
    }

    return INDUSTRY_TRANSLATIONS[lower] || INDUSTRY_TRANSLATIONS.basic_crm;
  },

  translateKey(key: keyof IndustryTranslationMap, industryCode?: string): string {
    const map = this.getIndustryTranslations(industryCode);
    return map[key] || key;
  },
};
