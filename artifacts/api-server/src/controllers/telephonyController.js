const mongoose = require('mongoose');

function generateChannelKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 14; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const PROVIDERS_CATALOG = [
  {
    key: 'tata_smartflo',
    name: 'Tata Tele (Smartflo)',
    tagline: 'Enterprise Cloud PBX & Smart DID routing for call centers and sales teams.',
    defaultDid: '+91 80 4567 8900',
    steps: [
      'Log into your Tata Smartflo Portal > Integrations & Webhooks.',
      'Create a new Webhook Subscription for "Call Completed / Call CDR" events.',
      'Paste the Leads Rubix Webhook URL shown below and select JSON format.',
      'Map your pilot DID numbers to this webhook subscription.',
      'Incoming callers will automatically land as fresh Inbound Inquiries (/leads/inquiries) and Call Logs (/leads/call-logs).',
    ],
    paramNotes: 'Smartflo delivers complete CDR payloads including caller_id, did_number, duration_seconds, and recording_file.',
  },
  {
    key: 'telecmi',
    name: 'TeleCMI',
    tagline: 'AI Cloud Contact Center with live call routing, recording sync, and agent hunt groups.',
    defaultDid: '+91 80 4567 8901',
    steps: [
      'Open your TeleCMI Dashboard > Webhook / API Settings.',
      'Add a Webhook event for "Call End" and "Missed Call".',
      'Set the target endpoint to the Leads Rubix Webhook URL with your active channel token.',
      'Verify that TeleCMI payload includes caller number, dialed DID, and call status.',
      'Inbound calls automatically map to your active CRM agents and triage in Inbound Inquiries.',
    ],
    paramNotes: 'TeleCMI fields mapped: from, to, duration, status, and recording_url.',
  },
  {
    key: 'exotel',
    name: 'Exotel',
    tagline: 'Exotel Passthru or Call-Log Applet integration for real-time inbound call distribution.',
    defaultDid: '+91 11 6789 0001',
    steps: [
      'Log into your Exotel Dashboard and navigate to App Bazaar > Create Flow / Flow Builder.',
      'Add a Passthru Applet after your greeting or IVR flow.',
      'Set the Passthru HTTP Method to POST, and paste the Leads Rubix Webhook URL below.',
      'Exotel will automatically forward caller details (CallSid, From, To, RecordingUrl, Status) in real-time.',
      'Calls are logged immediately in Call Logs and Inquiries triage.',
    ],
    paramNotes: 'Exotel automatically passes: From (Caller Number), To (Virtual DID), CallSid, DialCallDuration, and RecordingUrl.',
  },
  {
    key: 'myoperator',
    name: 'MyOperator',
    tagline: 'Virtual numbers and IVR system to log received, missed, and after-hours customer calls.',
    defaultDid: '+91 92 1234 5678',
    steps: [
      'Log into your MyOperator Panel and navigate to Integrations > Webhook.',
      'Enable Webhook integration for incoming call logs.',
      'Paste the Leads Rubix Webhook URL into the Webhook URL field.',
      'Select All Calls (Received, Missed) to push complete call records to CRM.',
      'Test your virtual pilot number to verify real-time inquiry creation.',
    ],
    paramNotes: 'MyOperator pushes: caller_id, virtual_number, duration, state, and recording link.',
  },
  {
    key: 'airtel_iq',
    name: 'Airtel IQ',
    tagline: 'Enterprise telecom cloud API with instant call connection and audio analytics.',
    defaultDid: '+91 12 4455 6677',
    steps: [
      'Access your Airtel IQ Portal > Voice API Configuration.',
      'Configure the Callback Event URL to the Leads Rubix Webhook URL.',
      'Set Event Triggers to Call Answered and Call Disconnected.',
      'Attach your pilot DID numbers to the webhook route.',
    ],
    paramNotes: 'Airtel IQ maps: caller_no, pilot_no, call_duration, call_status, and recording_url.',
  },
  {
    key: 'cloud_ivr',
    name: 'Standard Cloud IVR',
    tagline: 'Direct cloud telephony webhook integration for Inbound Inquiry capture and Call Logs.',
    defaultDid: '+91 80 4000 5000',
    steps: [
      'Log into your cloud telephony administrator portal with your credentials.',
      'Navigate to Apps or Integrations from the navigation menu.',
      'Select Webhooks / API Integration and paste the Leads Rubix Webhook URL shown below.',
      'Ensure event triggers are set to "Call Completed" and "Missed Call".',
      'Inbound calls automatically land as fresh Inbound Inquiries with recordings in Call Logs.',
    ],
    paramNotes: 'Sends: customer_number, virtual_number, agent_phone, agent_name, duration, call_status, recording_url.',
  },
  {
    key: 'custom_pbx',
    name: 'Custom PBX / Universal Asterisk',
    tagline: 'Universal REST Webhook integration for Asterisk, FreePBX, Vicidial, Twilio, or VoIP.',
    defaultDid: '+91 80 0000 0000',
    steps: [
      'Configure your PBX / IVR dialplan (e.g. Hangup handler or CDR trigger) to make an HTTP POST request.',
      'Send a JSON body to the Leads Rubix Webhook URL with Content-Type: application/json.',
      'Include your API Token in the body ("token": "YOUR_API_KEY") or in URL query parameter (?token=...).',
      'Include at minimum the caller contact number ("contact_no" or "caller_id").',
      'Optionally include duration, call_status, recording_url, virtual_number, and agent_name.',
    ],
    paramNotes: 'Accepts standard JSON payloads with flexible key matching (contact_no, caller_id, phone, duration, status, recording_url).',
  },
];

exports.getProvidersCatalog = async (req, res) => {
  return res.status(200).json({
    success: true,
    data: PROVIDERS_CATALOG,
  });
};

exports.listChannels = async (req, res) => {
  try {
    const TelephonyChannel = mongoose.model('TelephonyChannel');
    const ApiToken = mongoose.model('ApiToken');

    let orgId = req.user.role === 'superAdmin' && req.query.organizationId
      ? req.query.organizationId
      : (req.user.organizationId || req.user.organization_id);

    if (!orgId && req.user.role === 'superAdmin') {
      const Organization = mongoose.model('Organization');
      const firstOrg = await Organization.findOne({ status: 'ACTIVE' }).lean().exec();
      if (firstOrg) {
        orgId = firstOrg.organization_id || firstOrg._id;
      }
    }

    if (!orgId) {
      return res.status(200).json({ success: true, data: [] });
    }

    let channels = await TelephonyChannel.find({
      $or: [{ organization_id: orgId }, { organizationId: orgId }],
    })
      .sort({ created_at: -1 })
      .lean()
      .exec();

    // Auto-migration / seed: If organization has NO channels yet, check if they have an existing IVR ApiToken
    if (channels.length === 0) {
      const existingToken = await ApiToken.findOne({
        $or: [{ organization_id: orgId }, { organizationId: orgId }],
        $and: [
          {
            $or: [
              { source: /ivr/i },
              { source: /telephony/i },
              { source: /cloud telephony/i },
              { source: /digital rubix/i },
            ],
          },
        ],
      }).lean().exec();

      const seedKey = existingToken ? (existingToken.api_key || existingToken.apiKey) : generateChannelKey();
      
      const newChannel = await TelephonyChannel.create({
        organization_id: orgId,
        industry_id: req.user.industryId || req.user.industry_id || null,
        workspace_id: req.user.workspaceId || req.user.workspace_id || `ws_${orgId}`,
        name: 'Primary Inbound Line',
        provider: 'tata_smartflo',
        provider_name: 'Tata Tele (Smartflo)',
        virtual_number: '+91 80 4567 8900',
        api_key: seedKey,
        routing_mode: 'AGENT_PHONE_MATCH',
        status: 'ACTIVE',
        created_by: req.user.name || req.user.email || 'Admin',
      });

      // Ensure ApiToken exists for this channel
      if (!existingToken) {
        await ApiToken.create({
          api_key: seedKey,
          organization_id: orgId,
          industry_id: req.user.industryId || null,
          workspace_id: req.user.workspaceId || `ws_${orgId}`,
          source: 'Tata Tele (Smartflo)',
          status: 'ACTIVE',
          country_code: '+91',
        });
      }

      channels = [newChannel.toObject()];
    }

    return res.status(200).json({
      success: true,
      data: channels,
    });
  } catch (err) {
    console.error('[TelephonyController.listChannels] Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.createChannel = async (req, res) => {
  try {
    const TelephonyChannel = mongoose.model('TelephonyChannel');
    const ApiToken = mongoose.model('ApiToken');
    const User = mongoose.model('User');

    let orgId = req.user.organizationId || req.user.organization_id || req.body.organizationId || req.body.organization_id || req.query.organizationId;
    if (!orgId && req.user.role === 'superAdmin') {
      const Organization = mongoose.model('Organization');
      const firstOrg = await Organization.findOne({ status: 'ACTIVE' }).lean().exec();
      if (firstOrg) {
        orgId = firstOrg.organization_id || firstOrg._id;
      }
    }
    if (!orgId) {
      return res.status(400).json({ success: false, message: 'Organization ID is required' });
    }

    const {
      name,
      provider = 'tata_smartflo',
      virtual_number = '',
      virtualNumber = '',
      routing_mode = 'AGENT_PHONE_MATCH',
      routingMode = 'AGENT_PHONE_MATCH',
      default_agent_id = null,
      defaultAgentId = null,
    } = req.body;

    if (!name || String(name).trim() === '') {
      return res.status(400).json({ success: false, message: 'Channel Name is required' });
    }

    const resolvedProvider = PROVIDERS_CATALOG.find((p) => p.key === provider) || PROVIDERS_CATALOG[0];
    const targetAgentId = default_agent_id || defaultAgentId || null;
    let agentName = '';
    let agentEmail = '';

    if (targetAgentId && mongoose.Types.ObjectId.isValid(targetAgentId)) {
      const u = await User.findById(targetAgentId).lean().exec();
      if (u) {
        agentName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name || '';
        agentEmail = u.email || '';
      }
    }

    const channelApiKey = generateChannelKey();
    const finalVirtualNumber = virtual_number || virtualNumber || resolvedProvider.defaultDid || '';

    const channelDoc = await TelephonyChannel.create({
      organization_id: orgId,
      industry_id: req.user.industryId || req.user.industry_id || null,
      workspace_id: req.user.workspaceId || req.user.workspace_id || `ws_${orgId}`,
      name: String(name).trim(),
      provider: resolvedProvider.key,
      provider_name: resolvedProvider.name,
      virtual_number: finalVirtualNumber,
      api_key: channelApiKey,
      routing_mode: routing_mode || routingMode || 'AGENT_PHONE_MATCH',
      default_agent_id: targetAgentId,
      default_agent_name: agentName,
      default_agent_email: agentEmail,
      status: 'ACTIVE',
      created_by: req.user.name || req.user.email || 'Admin',
    });

    // Also register ApiToken for universal webhook resolution
    await ApiToken.create({
      api_key: channelApiKey,
      organization_id: orgId,
      industry_id: req.user.industryId || null,
      workspace_id: req.user.workspaceId || `ws_${orgId}`,
      source: `${resolvedProvider.name} - ${String(name).trim()}`,
      status: 'ACTIVE',
      country_code: '+91',
    });

    return res.status(201).json({
      success: true,
      message: 'Telephony Channel created successfully',
      data: channelDoc,
    });
  } catch (err) {
    console.error('[TelephonyController.createChannel] Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateChannel = async (req, res) => {
  try {
    const TelephonyChannel = mongoose.model('TelephonyChannel');
    const ApiToken = mongoose.model('ApiToken');
    const User = mongoose.model('User');

    const { id } = req.params;
    const orgId = req.user.organizationId || req.user.organization_id;

    const query = { _id: id };
    if (req.user.role !== 'superAdmin') {
      query.$or = [{ organization_id: orgId }, { organizationId: orgId }];
    }

    const existing = await TelephonyChannel.findOne(query).exec();
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Telephony Channel not found' });
    }

    const {
      name,
      provider,
      virtual_number,
      virtualNumber,
      routing_mode,
      routingMode,
      default_agent_id,
      defaultAgentId,
      status,
    } = req.body;

    if (name) existing.name = String(name).trim();
    if (provider) {
      const p = PROVIDERS_CATALOG.find((item) => item.key === provider);
      if (p) {
        existing.provider = p.key;
        existing.provider_name = p.name;
      }
    }
    if (virtual_number !== undefined || virtualNumber !== undefined) {
      existing.virtual_number = virtual_number !== undefined ? virtual_number : virtualNumber;
    }
    if (routing_mode || routingMode) {
      existing.routing_mode = routing_mode || routingMode;
    }
    if (status) {
      existing.status = status;
    }

    const targetAgentId = default_agent_id !== undefined ? default_agent_id : defaultAgentId;
    if (targetAgentId !== undefined) {
      if (targetAgentId && mongoose.Types.ObjectId.isValid(targetAgentId)) {
        const u = await User.findById(targetAgentId).lean().exec();
        if (u) {
          existing.default_agent_id = targetAgentId;
          existing.default_agent_name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.name || '';
          existing.default_agent_email = u.email || '';
        }
      } else {
        existing.default_agent_id = null;
        existing.default_agent_name = '';
        existing.default_agent_email = '';
      }
    }

    await existing.save();

    // Sync status to ApiToken
    if (existing.api_key) {
      await ApiToken.updateOne(
        { api_key: existing.api_key },
        {
          $set: {
            status: existing.status,
            source: `${existing.provider_name} - ${existing.name}`,
          },
        }
      ).exec();
    }

    return res.status(200).json({
      success: true,
      message: 'Telephony Channel updated successfully',
      data: existing,
    });
  } catch (err) {
    console.error('[TelephonyController.updateChannel] Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteChannel = async (req, res) => {
  try {
    const TelephonyChannel = mongoose.model('TelephonyChannel');
    const ApiToken = mongoose.model('ApiToken');

    const { id } = req.params;
    const orgId = req.user.organizationId || req.user.organization_id;

    const query = { _id: id };
    if (req.user.role !== 'superAdmin') {
      query.$or = [{ organization_id: orgId }, { organizationId: orgId }];
    }

    const channel = await TelephonyChannel.findOne(query).exec();
    if (!channel) {
      return res.status(404).json({ success: false, message: 'Telephony Channel not found' });
    }

    if (channel.api_key) {
      await ApiToken.updateOne({ api_key: channel.api_key }, { $set: { status: 'INACTIVE' } }).exec();
    }

    await TelephonyChannel.deleteOne({ _id: id }).exec();

    return res.status(200).json({
      success: true,
      message: 'Telephony Channel deleted successfully',
    });
  } catch (err) {
    console.error('[TelephonyController.deleteChannel] Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.testChannelCall = async (req, res) => {
  try {
    const TelephonyChannel = mongoose.model('TelephonyChannel');
    const User = mongoose.model('User');

    const { id } = req.params;
    const orgId = req.user.organizationId || req.user.organization_id;

    const query = { _id: id };
    if (req.user.role !== 'superAdmin') {
      query.$or = [{ organization_id: orgId }, { organizationId: orgId }];
    }

    const channel = await TelephonyChannel.findOne(query).exec();
    if (!channel) {
      return res.status(404).json({ success: false, message: 'Telephony Channel not found' });
    }

    // Resolve an active team user from the organization
    const activeUsers = await User.find({
      $or: [{ organization_id: orgId }, { organizationId: orgId }],
      status: 'ACTIVE',
    })
      .limit(5)
      .lean()
      .exec();

    const targetUser = activeUsers[0] || req.user;
    const agentPhone = targetUser.contact_number || targetUser.contactNumber || targetUser.phone || '+919876500001';
    const agentName = `${targetUser.firstName || ''} ${targetUser.lastName || ''}`.trim() || targetUser.name || 'Team Agent';

    // Construct simulated test call payload tailored to channel
    const testPayload = {
      token: channel.api_key,
      customer_number: '+919876543210',
      customer_name: 'Inbound Caller',
      agent_phone: agentPhone,
      agent_name: agentName,
      virtual_number: channel.virtual_number || '+918045678900',
      duration: 45,
      call_status: 'Answered',
      recording_url: 'https://storage.cloud-telephony.com/recordings/sample_call.mp3',
      ivr_option: 'Inbound Sales',
      provider: channel.provider_name,
      channel_id: String(channel._id),
      channel_name: channel.name,
      notes: `Simulated test call on ${channel.name} (${channel.provider_name})`,
    };

    // Forward to internal webhook ingestion handler
    const ivrHandler = require('../routes/ivrWebhookRoutes').handleIvrCall;
    
    // Mock request and response to run through ingestion pipeline
    const mockReq = {
      body: testPayload,
      query: {},
      headers: { 'content-type': 'application/json' },
    };

    let resultPayload = null;
    const mockRes = {
      status: (code) => ({
        json: (data) => {
          resultPayload = { statusCode: code, ...data };
          return data;
        },
      }),
    };

    await ivrHandler(mockReq, mockRes, (err) => {
      if (err) throw err;
    });

    return res.status(200).json({
      success: true,
      message: `Test call simulation successful for ${channel.name} (${channel.provider_name})`,
      data: resultPayload,
    });
  } catch (err) {
    console.error('[TelephonyController.testChannelCall] Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
