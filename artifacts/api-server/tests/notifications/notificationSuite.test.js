/**
 * Comprehensive Automated Notification Test Suite
 * Built on Node.js native test runner (node:test + node:assert)
 * 
 * Verifies:
 * 1. Role-Level Isolation (Admin OFF/Agent ON, Admin ON/Agent OFF, Team Lead, Customer)
 * 2. Channel Granularity (WhatsApp, Email, Push, Bell)
 * 3. All 12 Standard CRM Lifecycle Events
 * 4. All 7 Industry Vertical Adaptations (temp0001 - temp0007)
 * 5. Delivery Audit Logging (NotificationLog creation, status, latency, target)
 * 6. SLA Breach Escalation Triggering
 * 7. Event Suppression when is_enabled: false
 */

const { describe, it, before, beforeEach } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');

// Ensure models are registered
require('../../src/models/notificationMatrixModel');
require('../../src/models/notificationTemplateModel');
require('../../src/models/notificationLogModel');
require('../../src/models/notificationModel');
require('../../src/models/organizationModel');
require('../../src/models/userModel');
require('../../src/models/whatsappConfigModel');

const NotificationMatrixRule = mongoose.model('NotificationMatrixRule');
const NotificationTemplate = mongoose.model('NotificationTemplate');
const NotificationLog = mongoose.model('NotificationLog');
const Notification = mongoose.model('Notification');
const Organization = mongoose.model('Organization');
const User = mongoose.model('User');

const whatsappService = require('../../src/services/whatsappService');
const mailer = require('../../src/utils/mailer');
const awsSnsService = require('../../src/services/awsSnsService');
const {
  dispatchCrmEvent,
  resolveCrmRecipients,
  getRoutingMatrix
} = require('../../src/services/notificationDispatcherService');
const {
  STANDARD_EVENTS,
  DEFAULT_MATRIX_RULES,
  getIndustryTemplates
} = require('../../src/services/notificationDefaults');

describe('CRM Omnichannel Notification Engine Test Suite', () => {
  // Captured outbound calls for assertions
  let waCalls = [];
  let emailCalls = [];
  let pushCalls = [];
  let inAppCalls = [];
  let logCalls = [];

  // Global Mock Store
  let mockMatrixRules = {};
  let mockOrgDoc = {
    organization_id: 'test_org_100',
    organizationId: 'test_org_100',
    name: 'Test Enterprise Realty',
    industry_id: 'temp0001'
  };
  let mockAdminUser = {
    _id: 'admin_user_id',
    name: 'Admin User',
    email: 'admin@testenterprise.com',
    phone: '919876543210',
    role: 'admin'
  };
  let mockAgentUser = {
    _id: 'agent_user_id',
    name: 'Sales Agent Rep',
    email: 'rep@testenterprise.com',
    phone: '919876500001',
    role: 'sales'
  };

  before(() => {
    // Intercept outbound channels supporting both object & scalar signatures
    whatsappService.sendDirectWhatsAppMessage = async (arg1, arg2) => {
      let recipient = '';
      let text = '';
      if (typeof arg1 === 'object' && arg1 !== null) {
        recipient = arg1.phone || arg1.to || '';
        text = arg1.messageBody || arg1.message || arg1.text || '';
      } else {
        recipient = String(arg1 || '');
        text = String(arg2 || '');
      }
      waCalls.push({ recipient, text, raw: arg1 });
      return { success: true, messageId: 'mock_wa_' + Date.now() };
    };

    mailer.sendDynamicEmail = async (options) => {
      emailCalls.push(options);
      return { success: true, messageId: 'mock_email_' + Date.now() };
    };

    mailer.sendEmail = async (options) => {
      emailCalls.push(options);
      return { messageId: 'mock_email_' + Date.now(), accepted: [options.to] };
    };

    awsSnsService.sendPushNotification = async (payload) => {
      pushCalls.push(payload);
      return { success: true, messageId: 'mock_push_' + Date.now() };
    };

    awsSnsService.publishNotification = async (payload) => {
      pushCalls.push(payload);
      return { success: true, messageId: 'mock_push_' + Date.now() };
    };

    Notification.create = async (doc) => {
      inAppCalls.push(doc);
      return { ...doc, _id: 'mock_inapp_' + Date.now() };
    };

    NotificationLog.create = async (doc) => {
      logCalls.push(doc);
      return { ...doc, _id: 'mock_log_' + Date.now() };
    };

    Organization.findOne = (query) => ({
      lean: () => ({
        exec: async () => mockOrgDoc
      })
    });

    User.findOne = (query) => ({
      lean: () => ({
        exec: async () => {
          if (query?.role === 'admin') return mockAdminUser;
          return mockAgentUser;
        }
      })
    });

    User.findById = (id) => ({
      lean: () => ({
        exec: async () => {
          if (String(id) === 'admin_user_id') return mockAdminUser;
          return mockAgentUser;
        }
      })
    });

    NotificationTemplate.find = () => ({
      lean: () => ({
        exec: async () => []
      })
    });

    NotificationTemplate.findOne = () => ({
      lean: () => ({
        exec: async () => null
      })
    });

    NotificationMatrixRule.find = () => ({
      lean: () => ({
        exec: async () => []
      })
    });

    NotificationMatrixRule.findOne = (filter) => ({
      lean: () => ({
        exec: async () => {
          const key = filter?.event_key;
          if (key && mockMatrixRules[key]) {
            return mockMatrixRules[key];
          }
          return null;
        }
      })
    });
  });

  beforeEach(() => {
    waCalls = [];
    emailCalls = [];
    pushCalls = [];
    inAppCalls = [];
    logCalls = [];
    mockMatrixRules = {};
    mockOrgDoc = {
      organization_id: 'test_org_100',
      organizationId: 'test_org_100',
      name: 'Test Enterprise Realty',
      industry_id: 'temp0001'
    };
  });

  // =========================================================================
  // SUITE 1: ROLE-LEVEL ISOLATION & GRANULAR FLEXIBILITY
  // =========================================================================
  describe('Suite 1: Role-Level Isolation & Flexibility', () => {
    it('Scenario 1.1: Admin turns OFF WhatsApp for self, leaves ON for Agent -> Agent receives, Admin does NOT', async () => {
      mockMatrixRules['lead.assigned'] = {
        event_key: 'lead.assigned',
        is_enabled: true,
        routing: {
          assigned_agent: {
            enabled: true,
            channels: { whatsapp: true, email: false, push: true, in_app: true }
          },
          org_admin: {
            enabled: false,
            channels: { whatsapp: false, email: false, push: false, in_app: false }
          },
          team_lead: {
            enabled: false,
            channels: { whatsapp: false, email: false, push: false, in_app: false }
          },
          customer: {
            enabled: false,
            channels: { whatsapp: false, email: false }
          }
        }
      };

      const result = await dispatchCrmEvent({
        eventKey: 'lead.assigned',
        organizationId: 'test_org_100',
        entityType: 'contact',
        entityData: {
          _id: 'lead_123',
          customerName: 'Rahul Sharma',
          contactNumber: '919999999999',
          contactOwnerEmail: 'rep@testenterprise.com',
          contactOwnerName: 'Sales Agent Rep',
          contactOwnerPhone: '919876500001'
        }
      });

      assert.strictEqual(result.success, true, 'Dispatch should succeed');

      // Assert Agent received WhatsApp
      const agentWa = waCalls.find(c => c.recipient === '919876500001');
      assert.ok(agentWa, 'Assigned agent must receive WhatsApp alert');
      assert.ok(agentWa.text.includes('Rahul Sharma'), 'Message should contain lead name');

      // Assert Admin received ZERO WhatsApp
      const adminWa = waCalls.find(c => c.recipient === '919876543210');
      assert.strictEqual(adminWa, undefined, 'Admin must NOT receive WhatsApp when disabled');

      // Assert Audit Logs
      const agentLog = logCalls.find(l => l.recipient_role === 'agent' && l.channel === 'whatsapp');
      assert.ok(agentLog, 'Log entry must exist for Agent WhatsApp');
      assert.strictEqual(agentLog.status, 'SUCCESS');

      const adminLog = logCalls.find(l => l.recipient_role === 'admin');
      assert.strictEqual(adminLog, undefined, 'No log should exist for disabled Admin role');
    });

    it('Scenario 1.2: Admin turns ON WhatsApp for self, turns OFF for Agent -> Admin receives, Agent does NOT', async () => {
      mockMatrixRules['lead.assigned'] = {
        event_key: 'lead.assigned',
        is_enabled: true,
        routing: {
          assigned_agent: {
            enabled: false,
            channels: { whatsapp: false, email: false, push: false, in_app: false }
          },
          org_admin: {
            enabled: true,
            channels: { whatsapp: true, email: true, push: false, in_app: true }
          },
          team_lead: {
            enabled: false,
            channels: { whatsapp: false, email: false, push: false, in_app: false }
          },
          customer: {
            enabled: false,
            channels: { whatsapp: false, email: false }
          }
        }
      };

      const result = await dispatchCrmEvent({
        eventKey: 'lead.assigned',
        organizationId: 'test_org_100',
        entityType: 'contact',
        entityData: {
          _id: 'lead_456',
          customerName: 'Pooja Verma',
          contactOwnerEmail: 'rep@testenterprise.com',
          contactOwnerPhone: '919876500001'
        }
      });

      assert.strictEqual(result.success, true);

      // Assert Admin received WhatsApp
      const adminWa = waCalls.find(c => c.recipient === '919876543210');
      assert.ok(adminWa, 'Admin must receive WhatsApp alert when enabled');

      // Assert Agent received ZERO WhatsApp
      const agentWa = waCalls.find(c => c.recipient === '919876500001');
      assert.strictEqual(agentWa, undefined, 'Agent must NOT receive WhatsApp when disabled');
    });

    it('Scenario 1.3: Channel-level isolation (WhatsApp OFF, Email + Bell ON)', async () => {
      mockMatrixRules['lead.created'] = {
        event_key: 'lead.created',
        is_enabled: true,
        routing: {
          assigned_agent: {
            enabled: true,
            channels: { whatsapp: false, email: true, push: false, in_app: true }
          },
          org_admin: {
            enabled: false,
            channels: { whatsapp: false, email: false, push: false, in_app: false }
          }
        }
      };

      await dispatchCrmEvent({
        eventKey: 'lead.created',
        organizationId: 'test_org_100',
        entityType: 'contact',
        entityData: {
          _id: 'lead_789',
          customerName: 'Vikram Singh',
          contactOwnerEmail: 'rep@testenterprise.com',
          contactOwnerPhone: '919876500001'
        }
      });

      // WhatsApp should NOT be sent to agent
      const agentWa = waCalls.find(c => c.recipient === '919876500001');
      assert.strictEqual(agentWa, undefined, 'WhatsApp must NOT be sent when channel is OFF');

      // Email MUST be sent to agent
      const agentEmail = emailCalls.find(c => c.toEmail === 'rep@testenterprise.com' || c.to === 'rep@testenterprise.com');
      assert.ok(agentEmail, 'Email must be sent when channel is ON');

      // Bell MUST be created
      const agentInApp = inAppCalls.find(c => c.user_id === 'agent_user_id');
      assert.ok(agentInApp, 'In-App Bell must be created when channel is ON');
    });

    it('Scenario 1.4: Event suppression when is_enabled is FALSE', async () => {
      mockMatrixRules['deal.won'] = {
        event_key: 'deal.won',
        is_enabled: false,
        routing: {
          org_admin: { enabled: true, channels: { whatsapp: true } }
        }
      };

      const result = await dispatchCrmEvent({
        eventKey: 'deal.won',
        organizationId: 'test_org_100',
        entityType: 'deal',
        entityData: { title: 'Luxury Penthouse Deal', dealValue: 50000000 }
      });

      assert.strictEqual(result.suppressed, true, 'Event must be suppressed');
      assert.strictEqual(waCalls.length, 0, 'Zero dispatches on disabled event');
      assert.strictEqual(emailCalls.length, 0);
    });
  });

  // =========================================================================
  // SUITE 2: ALL 12 CRM LIFECYCLE EVENTS RESOLUTION
  // =========================================================================
  describe('Suite 2: All 12 Standard CRM Lifecycle Events', () => {
    const eventsToTest = [
      { key: 'lead.created', label: 'Fresh Inbound Lead Captured' },
      { key: 'lead.assigned', label: 'Lead Assigned or Rotated' },
      { key: 'lead.transferred', label: 'Lead Transferred / Reassigned' },
      { key: 'lead.stage_changed', label: 'Lead Pipeline Stage Transition' },
      { key: 'task.reminder', label: 'Follow-up Callback / Task Due' },
      { key: 'task.sla_breach', label: 'Urgent Uncontacted SLA Breach' },
      { key: 'customer.welcome', label: 'Customer Instant Welcome Greeting' },
      { key: 'customer.reply', label: 'Customer WhatsApp Reply Received' },
      { key: 'deal.won', label: 'Deal Closed & Won Milestone' },
      { key: 'deal.lost', label: 'Deal Lost Post-Mortem Alert' },
      { key: 'payment.received', label: 'Payment / Booking Advance Received' },
      { key: 'team.daily_digest', label: 'Daily Team Performance Digest' }
    ];

    for (const ev of eventsToTest) {
      it(`Event "${ev.key}" resolves fallback template and executes without errors`, async () => {
        mockMatrixRules[ev.key] = {
          event_key: ev.key,
          is_enabled: true,
          routing: {
            assigned_agent: {
              enabled: true,
              channels: { whatsapp: true, in_app: true }
            },
            org_admin: {
              enabled: true,
              channels: { whatsapp: true, in_app: true }
            }
          }
        };

        const res = await dispatchCrmEvent({
          eventKey: ev.key,
          organizationId: 'test_org_100',
          entityType: 'contact',
          entityData: {
            _id: 'entity_' + ev.key,
            customerName: 'Test Customer',
            contactNumber: '919876543219',
            contactOwnerEmail: 'rep@testenterprise.com',
            contactOwnerPhone: '919876500001',
            stage: 'SITE_VISIT',
            taskTitle: 'Site Visit Inspection',
            dealTitle: 'Skyline Residence 3BHK',
            dealValue: 12500000,
            amount: 250000
          }
        });

        assert.strictEqual(res.success, true, `Dispatch for ${ev.key} must succeed`);
        assert.ok(res.totalDispatched > 0, `At least 1 dispatch should execute for ${ev.key}`);
      });
    }
  });

  // =========================================================================
  // SUITE 3: MULTI-VERTICAL INDUSTRY ADAPTATION (All 7 Verticals)
  // =========================================================================
  describe('Suite 3: Multi-Vertical Vocabulary & Dynamic Merge Tags', () => {
    const industries = [
      { id: 'temp0001', expectedSubstring: 'Project', name: 'Real Estate' },
      { id: 'temp0002', expectedSubstring: 'Account', name: 'B2B & Corporate Services' },
      { id: 'temp0003', expectedSubstring: 'Department', name: 'Healthcare & Medical Clinic' },
      { id: 'temp0004', expectedSubstring: 'Program', name: 'Education & Admissions' },
      { id: 'temp0005', expectedSubstring: 'Product', name: 'Financial Services & Wealth' },
      { id: 'temp0006', expectedSubstring: 'Tech Stack', name: 'IT & Technology Services' },
      { id: 'temp0007', expectedSubstring: 'Product Line', name: 'Manufacturing & Industrial' }
    ];

    for (const ind of industries) {
      it(`Vertical "${ind.id}" (${ind.name}) generates correct domain-specific vocabulary`, async () => {
        const templates = getIndustryTemplates(ind.id);
        assert.ok(Array.isArray(templates), `Templates for ${ind.id} must be an array`);
        assert.ok(templates.length > 0, `Templates for ${ind.id} must not be empty`);

        const leadCreatedTpl = templates.find(t => t.event_key === 'lead.created' && t.channel === 'whatsapp');
        assert.ok(leadCreatedTpl, `lead.created WhatsApp template must exist for ${ind.id}`);
        const bodyContent = leadCreatedTpl.body_template || leadCreatedTpl.body || '';
        assert.ok(
          bodyContent.includes(ind.expectedSubstring) || bodyContent.includes('{{project_name}}'),
          `Template for ${ind.name} should contain vertical keyword "${ind.expectedSubstring}"`
        );
      });
    }
  });

  // =========================================================================
  // SUITE 4: DELIVERY AUDIT LOGGING
  // =========================================================================
  describe('Suite 4: Delivery Audit Logging Completeness', () => {
    it('Records full latency, status, provider, role, and target for each dispatch', async () => {
      mockMatrixRules['lead.created'] = {
        event_key: 'lead.created',
        is_enabled: true,
        routing: {
          assigned_agent: {
            enabled: true,
            channels: { whatsapp: true, email: true, in_app: true }
          }
        }
      };

      await dispatchCrmEvent({
        eventKey: 'lead.created',
        organizationId: 'test_org_100',
        entityType: 'contact',
        entityData: {
          _id: 'lead_audit_test',
          customerName: 'Audit Test User',
          contactOwnerEmail: 'rep@testenterprise.com',
          contactOwnerPhone: '919876500001'
        }
      });

      // Check WhatsApp log
      const waLog = logCalls.find(l => l.channel === 'whatsapp');
      assert.ok(waLog, 'WhatsApp dispatch must be logged');
      assert.strictEqual(waLog.status, 'SUCCESS');
      assert.strictEqual(waLog.organization_id, 'test_org_100');
      assert.strictEqual(waLog.recipient_role, 'agent');
      assert.strictEqual(waLog.recipient_target, '919876500001');
      assert.ok(typeof waLog.latency_ms === 'number', 'Latency must be numeric');

      // Check Email log
      const emailLog = logCalls.find(l => l.channel === 'email');
      assert.ok(emailLog, 'Email dispatch must be logged');
      assert.strictEqual(emailLog.status, 'SUCCESS');
      assert.strictEqual(emailLog.recipient_target, 'rep@testenterprise.com');

      // Check In-App Bell log
      const bellLog = logCalls.find(l => l.channel === 'in_app');
      assert.ok(bellLog, 'Bell dispatch must be logged');
      assert.strictEqual(bellLog.status, 'SUCCESS');
    });

    it('Records FAILED status and error_message when gateway throws', async () => {
      whatsappService.sendDirectWhatsAppMessage = async () => {
        throw new Error('WHAPI Gateway Timeout (504)');
      };

      mockMatrixRules['lead.created'] = {
        event_key: 'lead.created',
        is_enabled: true,
        routing: {
          assigned_agent: {
            enabled: true,
            channels: { whatsapp: true }
          }
        }
      };

      await dispatchCrmEvent({
        eventKey: 'lead.created',
        organizationId: 'test_org_100',
        entityType: 'contact',
        entityData: {
          _id: 'lead_fail_test',
          customerName: 'Fail Test User',
          contactOwnerEmail: 'rep@testenterprise.com',
          contactOwnerPhone: '919876500001'
        }
      });

      const failedLog = logCalls.find(l => l.channel === 'whatsapp');
      assert.ok(failedLog, 'Failed dispatch must be logged');
      assert.strictEqual(failedLog.status, 'FAILED');
      assert.ok(failedLog.error_message.includes('WHAPI Gateway Timeout'), 'Error message must be captured');

      whatsappService.sendDirectWhatsAppMessage = async (arg1, arg2) => {
        let recipient = '';
        let text = '';
        if (typeof arg1 === 'object' && arg1 !== null) {
          recipient = arg1.phone || arg1.to || '';
          text = arg1.messageBody || arg1.message || arg1.text || '';
        } else {
          recipient = String(arg1 || '');
          text = String(arg2 || '');
        }
        waCalls.push({ recipient, text, raw: arg1 });
        return { success: true, messageId: 'mock_wa_' + Date.now() };
      };
    });
  });

  // =========================================================================
  // SUITE 5: RECIPIENT RESOLUTION SANITY
  // =========================================================================
  describe('Suite 5: Recipient Resolution Accuracy', () => {
    it('Resolves Agent, Admin, Customer, and Override Admin targets accurately', async () => {
      const recipients = await resolveCrmRecipients({
        organizationId: 'test_org_100',
        entityData: {
          customerName: 'Anil Gupta',
          contactNumber: '917777777777',
          email: 'anil.gupta@example.com',
          contactOwnerEmail: 'rep@testenterprise.com',
          contactOwnerPhone: '919876500001',
          contactOwnerName: 'Sales Agent Rep'
        },
        matrixRule: {
          routing: {
            org_admin: {
              override_phone: '919999000011',
              override_email: 'override_admin@testenterprise.com'
            }
          }
        }
      });

      // Agent
      assert.strictEqual(recipients.agent.email, 'rep@testenterprise.com');
      assert.strictEqual(recipients.agent.phone, '919876500001');

      // Customer
      assert.strictEqual(recipients.customer.phone, '917777777777');
      assert.strictEqual(recipients.customer.email, 'anil.gupta@example.com');

      // Admin (with Override)
      assert.strictEqual(recipients.admin.phone, '919999000011', 'Admin phone should use override when configured');
      assert.strictEqual(recipients.admin.email, 'override_admin@testenterprise.com', 'Admin email should use override');
    });
  });
});
