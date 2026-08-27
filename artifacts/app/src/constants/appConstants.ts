export const APP_CONFIG = {
  name: 'Leads Rubix CRM',
  shortName: 'LeadsRubix',
  edition: 'Enterprise',
  version: '1.4.0',
  displayVersion: 'v1.4',
  tagline: 'ENTERPRISE REAL ESTATE CRM',
  get footerVersionText(): string {
    return `${this.name} • ${this.edition} ${this.displayVersion}`;
  },
};
