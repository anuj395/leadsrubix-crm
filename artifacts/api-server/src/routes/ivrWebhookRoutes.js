const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

// Helper to log transaction into ApiData for traffic counter and connection status
const logApiTransaction = async (reqData, tokenData, status, failReason, leadId = '') => {
  try {
    const ApiData = mongoose.model('ApiData');
    const sourceVal = tokenData?.source || reqData?.source || reqData?.provider || 'Cloud Telephony';
    const logDoc = {
      ...reqData,
      source: sourceVal,
      organization_id: tokenData?.organizationId || tokenData?.organization_id || reqData?.organizationId || reqData?.organization_id || 'unknown',
      status,
      fail_reason: failReason,
      lead_id: leadId || reqData?.leadId || reqData?.lead_id || '',
      created_at: new Date(),
    };
    await ApiData.create(logDoc);
  } catch (err) {
    console.error('Failed to log IVR API transaction:', err);
  }
};

// Universal recursive payload flattener to extract fields from JSON, form-data, or nested objects
const flattenPayload = (source, target = {}) => {
  if (!source || typeof source !== 'object') return target;

  if (Array.isArray(source)) {
    source.forEach((item) => flattenPayload(item, target));
    return target;
  }

  for (const [key, val] of Object.entries(source)) {
    if (val === null || val === undefined) continue;

    if (typeof val === 'object' && !Array.isArray(val)) {
      if (val.value !== undefined || val.raw_value !== undefined) {
        const actualVal = val.value !== undefined ? val.value : val.raw_value;
        if (val.id) target[String(val.id).toLowerCase()] = actualVal;
        target[String(key).toLowerCase()] = actualVal;
      } else {
        flattenPayload(val, target);
      }
    } else {
      target[String(key).toLowerCase()] = val;
      target[key] = val; // Preserve original casing too
    }
  }
  return target;
};

// Core IVR Ingestion Handler
async function handleIvrCall(req, res, next) {
  const reqData = {};
  flattenPayload(req.body, reqData);
  flattenPayload(req.query, reqData);

  try {
    const ApiToken = mongoose.model('ApiToken');
    const Contact = mongoose.model('Contact');
    const User = mongoose.model('User');
    const CallLog = mongoose.model('CallLog');
    const TelephonyChannel = mongoose.model('TelephonyChannel');

    // 1. Token Extraction (Query, Headers, Body)
    const authHeader = req.headers['authorization'] || '';
    const bearerToken = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
    const token =
      reqData.token ||
      reqData.api_key ||
      reqData.apikey ||
      req.query.token ||
      req.headers['x-api-token'] ||
      bearerToken;

    if (!token) {
      return res.status(200).json({ status: 'error', success: false, message: 'API Token Required' });
    }

    // Resolve TelephonyChannel first (channel-specific token)
    let channelDoc = await TelephonyChannel.findOne({ api_key: token }).exec();
    let tokenData = null;

    if (channelDoc) {
      if (channelDoc.status === 'INACTIVE') {
        return res.status(200).json({ status: 'error', success: false, message: 'Telephony Channel is Inactive' });
      }
    } else {
      tokenData = await ApiToken.findOne({ api_key: token }).exec();
      if (!tokenData) {
        return res.status(200).json({ status: 'error', success: false, message: 'Invalid API Token' });
      }

      if (tokenData.status === 'INACTIVE') {
        await logApiTransaction(reqData, tokenData, 'FAILED', 'Token is Inactive');
        return res.status(200).json({ status: 'error', success: false, message: 'Token is Inactive' });
      }
    }

    const orgId = channelDoc
      ? (channelDoc.organization_id || channelDoc.organizationId)
      : (tokenData?.organizationId || tokenData?.organization_id || null);
    const industryId = channelDoc
      ? (channelDoc.industry_id || channelDoc.industryId)
      : (tokenData?.industryId || tokenData?.industry_id || null);
    const workspaceId = channelDoc
      ? (channelDoc.workspace_id || channelDoc.workspaceId)
      : (tokenData?.workspaceId || tokenData?.workspace_id || null);

    // 2. Telephony Field Extraction & Normalization
    const rawCallerPhone =
      reqData.customer_number ||
      reqData.customernumber ||
      reqData.customer_no ||
      reqData.caller_id ||
      reqData.callerid ||
      reqData.caller_number ||
      reqData.caller ||
      reqData.from ||
      reqData.contact_number ||
      reqData.contactnumber ||
      reqData.phone ||
      reqData.mobile;

    let cleanCallerPhone = String(rawCallerPhone || '').replace(/\D/g, '');
    if (cleanCallerPhone.startsWith('91') && cleanCallerPhone.length === 12) {
      cleanCallerPhone = cleanCallerPhone.slice(2);
    } else if (cleanCallerPhone.startsWith('0') && cleanCallerPhone.length === 11) {
      cleanCallerPhone = cleanCallerPhone.slice(1);
    }
    cleanCallerPhone = cleanCallerPhone.slice(-10);

    const callSid =
      reqData.call_id ||
      reqData.callid ||
      reqData.call_sid ||
      reqData.callsid ||
      reqData.sid ||
      reqData.uuid ||
      reqData.unique_id ||
      `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const recordingUrl =
      reqData.recording_url ||
      reqData.recordingurl ||
      reqData.recording ||
      reqData.audio_url ||
      reqData.audiourl ||
      reqData.record_url ||
      reqData.recordurl ||
      reqData.audio ||
      '';

    const rawDuration =
      reqData.duration ||
      reqData.call_duration ||
      reqData.talk_time ||
      reqData.billsec ||
      reqData.conversation_duration ||
      0;
    const duration = Math.max(0, parseInt(rawDuration, 10) || 0);

    const rawStatus =
      reqData.call_status ||
      reqData.callstatus ||
      reqData.status ||
      reqData.dial_status ||
      reqData.disposition ||
      '';
    let callStatus = 'Answered';
    if (
      String(rawStatus).toLowerCase().includes('miss') ||
      String(rawStatus).toLowerCase().includes('no answer') ||
      String(rawStatus).toLowerCase().includes('busy') ||
      duration === 0
    ) {
      callStatus = 'Missed';
    }

    const agentPhone =
      reqData.agent_phone ||
      reqData.agentphone ||
      reqData.agent_number ||
      reqData.agentnumber ||
      reqData.agent_mobile ||
      reqData.to ||
      reqData.destination ||
      reqData.answered_by ||
      '';

    const agentName =
      reqData.agent_name ||
      reqData.agentname ||
      reqData.agent ||
      reqData.user_name ||
      reqData.username ||
      reqData.executive ||
      '';

    const virtualNumber =
      reqData.virtual_number ||
      reqData.virtualnumber ||
      reqData.did_number ||
      reqData.didnumber ||
      reqData.pilot_number ||
      reqData.did ||
      reqData.ivr_number ||
      (channelDoc ? channelDoc.virtual_number : '');

    const ivrOption = reqData.ivr_option || reqData.ivroption || reqData.department || reqData.menu || '';

    const providerName =
      channelDoc?.provider_name ||
      reqData.provider ||
      reqData.telephony_provider ||
      reqData.ivr_provider ||
      tokenData?.source ||
      'Cloud Telephony';

    let customerName =
      reqData.customer_name ||
      reqData.customername ||
      reqData.caller_name ||
      reqData.name ||
      reqData.full_name ||
      '';
    if (!customerName || customerName.trim() === '' || customerName.toLowerCase() === 'test') {
      customerName = 'Inbound Caller';
    }

    // 3. Delayed Recording Patch Handler
    // If this call SID already exists in CallLog, update recording URL without duplicating
    if (callSid) {
      const existingCallLog = await CallLog.findOne({
        call_sid: callSid,
        $or: [{ organization_id: orgId }, { organizationId: orgId }],
      }).exec();

      if (existingCallLog) {
        const updateFields = {};
        if (recordingUrl && !existingCallLog.recording_url) {
          updateFields.recording_url = recordingUrl;
        }
        if (duration > 0 && !existingCallLog.duration) {
          updateFields.duration = duration;
        }
        if (Object.keys(updateFields).length > 0) {
          await CallLog.findByIdAndUpdate(existingCallLog._id, { $set: updateFields }).exec();
        }
        await logApiTransaction(reqData, tokenData, 'SUCCESS', 'Recording Patched', existingCallLog.lead_id || '');
        return res.status(200).json({
          status: 'success',
          success: true,
          message: 'Call recording updated successfully',
          call_log_id: existingCallLog._id,
        });
      }
    }

    // Ensure phone number exists for fresh call registration
    if (!cleanCallerPhone || cleanCallerPhone.length < 7) {
      await logApiTransaction(reqData, tokenData, 'FAILED', 'Valid Phone Number Missing');
      return res.status(200).json({ status: 'error', success: false, message: 'Valid Phone Number Missing' });
    }

    // 4. Dynamic Multi-Tenant Agent Matching Engine
    let assignedUser = null;
    const cleanAgentPhone = String(agentPhone).replace(/\D/g, '').slice(-10);

    const orgQuery = {
      $or: [{ organization_id: orgId }, { organizationId: orgId }],
    };

    if (cleanAgentPhone) {
      assignedUser = await User.findOne({
        ...orgQuery,
        $or: [
          { phone: { $regex: cleanAgentPhone } },
          { contactNumber: { $regex: cleanAgentPhone } },
          { contact_number: { $regex: cleanAgentPhone } },
          { mobile: { $regex: cleanAgentPhone } },
        ],
      }).exec();
    }

    if (!assignedUser && agentName) {
      assignedUser = await User.findOne({
        ...orgQuery,
        $or: [
          { firstName: new RegExp(agentName, 'i') },
          { lastName: new RegExp(agentName, 'i') },
          { name: new RegExp(agentName, 'i') },
          { email: new RegExp(agentName, 'i') },
        ],
      }).exec();
    }

    // Fallback: Multi-tenant lead distribution rules or tenant default
    if (!assignedUser) {
      try {
        const { assignLeadByRules } = require('../services/leadDistributionService');
        const assignment = await assignLeadByRules({
          organizationId: orgId,
          industryId,
          workspaceId,
          source: providerName,
          project: virtualNumber ? `DID ${virtualNumber}` : '',
        });
        if (assignment?.uid) {
          assignedUser = await User.findById(assignment.uid).exec();
        }
      } catch (distErr) {
        console.warn('Lead distribution fallback warning:', distErr.message);
      }
    }

    const assignedEmail = assignedUser?.email || tokenData.owner_email || '';
    const assignedUid = assignedUser?._id ? String(assignedUser._id) : (tokenData.uid || '');
    const assignedName = assignedUser
      ? `${assignedUser.firstName || ''} ${assignedUser.lastName || ''}`.trim() || assignedUser.name || assignedUser.email
      : (agentName || 'Unassigned');

    // 5. Contact Deduplication Check
    const existingContact = await Contact.findOne({
      $or: [{ organization_id: orgId }, { organizationId: orgId }],
      $and: [
        {
          $or: [
            { contact_number: cleanCallerPhone },
            { contactNumber: cleanCallerPhone },
            { alternate_no: cleanCallerPhone },
            { alternateNo: cleanCallerPhone },
          ],
        },
      ],
    }).exec();

    let contactDoc = null;

    if (existingContact) {
      // Caller already in CRM: Append inquiry to existing contact
      const contactService = require('../services/contactService');
      const resolvedChannelSource = channelDoc?.name ? `${providerName} - ${channelDoc.name}` : providerName;
      await contactService.appendInquiry(
        existingContact._id,
        {
          source: resolvedChannelSource,
          campaign: channelDoc?.name ? `Inbound Line: ${channelDoc.name}` : `Inbound ${providerName}`,
          projectName: virtualNumber ? `Inbound DID ${virtualNumber}` : 'Inbound Telephony',
          notes: `Inbound Call via ${providerName}. ${channelDoc ? `Channel: ${channelDoc.name}. ` : ''}Agent: ${assignedName}. Duration: ${duration}s. DID: ${virtualNumber || '-'}. Status: ${callStatus}.`,
        },
        assignedUser || { email: 'ivr-webhook' }
      );

      const updateData = {
        last_contacted_at: new Date(),
        lastContactedAt: new Date(),
        modified_at: new Date(),
        modifiedAt: new Date(),
      };
      contactDoc = await Contact.findByIdAndUpdate(existingContact._id, { $set: updateData }, { new: true }).exec();
    } else {
      // NEW CALLER: Create with STRICT Inbound Inquiry lifecycle stage
      const resolvedChannelSource = channelDoc?.name ? `${providerName} - ${channelDoc.name}` : (providerName || tokenData?.source || 'Cloud Telephony');
      const newInquiryPayload = {
        customer_name: customerName,
        customerName,
        contact_number: cleanCallerPhone,
        contactNumber: cleanCallerPhone,
        country_code: '+91',
        countryCode: '+91',
        source: resolvedChannelSource,
        lead_source: resolvedChannelSource,
        leadSource: resolvedChannelSource,
        lifecycle_stage: 'INQUIRY',     // <--- Strictly Inbound Inquiry!
        lifecycleStage: 'INQUIRY',      // <--- Dual case support
        is_qualified: false,           // <--- Filtered OUT from Leads & Contacts!
        isQualified: false,
        stage: 'FRESH',
        assigned_to: assignedEmail,
        assignedTo: assignedEmail,
        contact_owner_email: assignedEmail,
        contactOwnerEmail: assignedEmail,
        contact_owner_id: assignedUid,
        contactOwnerId: assignedUid,
        organization_id: orgId,
        organizationId: orgId,
        industry_id: industryId,
        industryId: industryId,
        workspace_id: workspaceId,
        workspaceId: workspaceId,
        project_name: virtualNumber ? `Inbound DID ${virtualNumber}` : (channelDoc?.name || 'Inbound Telephony'),
        projectName: virtualNumber ? `Inbound DID ${virtualNumber}` : (channelDoc?.name || 'Inbound Telephony'),
        notes: `Inbound Call via ${providerName}. ${channelDoc ? `Channel: ${channelDoc.name}. ` : ''}Agent: ${assignedName}. Duration: ${duration}s. Status: ${callStatus}.`,
        lead_assign_time: new Date(),
        leadAssignTime: new Date(),
        last_contacted_at: new Date(),
        lastContactedAt: new Date(),
        isRawInquiry: true,             // <--- UI flag for InquiriesList triage
      };

      contactDoc = await Contact.create(newInquiryPayload);
    }

    // 6. Persist Telephony CallLog Record
    const callLogPayload = {
      contact_id: contactDoc._id,
      contactId: contactDoc._id,
      lead_id: String(contactDoc._id),
      leadId: String(contactDoc._id),
      call_sid: callSid,
      customer_name: customerName,
      customerName,
      contact_number: cleanCallerPhone,
      contactNumber: cleanCallerPhone,
      virtual_number: virtualNumber,
      virtualNumber,
      agent_number: agentPhone,
      agentNumber: agentPhone,
      created_by: assignedName,
      createdBy: assignedName,
      contact_owner_email: assignedEmail,
      contactOwnerEmail: assignedEmail,
      duration,
      stage: callStatus,
      call_status: callStatus,
      callStatus,
      direction: 'Inbound',
      type: 'Inbound',
      recording_url: recordingUrl,
      recordingUrl,
      source: channelDoc?.name ? `${providerName} - ${channelDoc.name}` : providerName,
      provider: providerName,
      ivr_option: ivrOption,
      organization_id: orgId,
      organizationId: orgId,
      industry_id: industryId,
      industryId,
      uid: assignedUid,
      details: `Telephony call on DID ${virtualNumber || 'Pilot'} (${channelDoc?.name || providerName}). Handled by ${assignedName}. Duration: ${duration}s. Status: ${callStatus}.`,
      createdAt: new Date(),
      created_at: new Date(),
    };

    const callLogDoc = await CallLog.create(callLogPayload);

    // Update TelephonyChannel live telemetry stats
    if (channelDoc) {
      try {
        const incFields = { total_calls: 1 };
        if (callStatus === 'Answered') {
          incFields.answered_calls = 1;
        } else {
          incFields.missed_calls = 1;
        }
        await TelephonyChannel.updateOne(
          { _id: channelDoc._id },
          {
            $inc: incFields,
            $set: { last_call_at: new Date() },
          }
        ).exec();
      } catch (statErr) {
        console.warn('Failed to increment telephony channel stats:', statErr);
      }
    }

    // 7. Missed Call Automation (Task + Alerts)
    if (callStatus === 'Missed' || duration === 0) {
      try {
        const Task = mongoose.model('Task');
        await Task.create({
          title: `Urgent Callback: Missed IVR call from +91 ${cleanCallerPhone}`,
          description: `Customer called pilot number ${virtualNumber || 'IVR'}. No agent was able to answer. Immediate callback required!`,
          type: 'Call',
          priority: 'High',
          status: 'Pending',
          contact_id: contactDoc._id,
          contactId: contactDoc._id,
          assigned_to: assignedEmail,
          assignedTo: assignedEmail,
          uid: assignedUid,
          organization_id: orgId,
          organizationId: orgId,
          industry_id: industryId,
          industryId,
          due_date: new Date(Date.now() + 15 * 60 * 1000), // Due in 15 mins
          createdAt: new Date(),
        });
      } catch (taskErr) {
        console.error('Failed to create missed call task:', taskErr);
      }
    }

    // 8. Log Success in ApiData
    await logApiTransaction(reqData, tokenData, 'SUCCESS', '', String(contactDoc._id));

    // 9. Return clean JSON Response
    return res.status(200).json({
      status: 'success',
      success: true,
      message: 'Inbound IVR call processed successfully',
      inquiry_id: contactDoc._id,
      call_log_id: callLogDoc._id,
      is_new_contact: !existingContact,
      lifecycle_stage: 'INQUIRY',
      assigned_agent: assignedName,
    });
  } catch (err) {
    console.error('Error processing IVR webhook:', err);
    return res.status(500).json({
      status: 'error',
      success: false,
      message: err.message || 'Internal Server Error processing IVR call',
    });
  }
}

router.post('/', handleIvrCall);
router.get('/', handleIvrCall);
router.handleIvrCall = handleIvrCall;

module.exports = router;
