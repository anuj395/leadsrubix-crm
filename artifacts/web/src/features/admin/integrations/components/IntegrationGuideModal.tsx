import React, { useState } from 'react'
import Box from '@mui/material/Box'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import Paper from '@mui/material/Paper'
import Grid from '@mui/material/Grid'
import Alert from '@mui/material/Alert'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import Tooltip from '@mui/material/Tooltip'
import CloseIcon from '@mui/icons-material/Close'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import MenuBookIcon from '@mui/icons-material/MenuBook'
import FacebookIcon from '@mui/icons-material/Facebook'
import BusinessIcon from '@mui/icons-material/Business'
import ContactPageIcon from '@mui/icons-material/ContactPage'
import WebIcon from '@mui/icons-material/Web'
import PhoneInTalkIcon from '@mui/icons-material/PhoneInTalk'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'
import { alpha } from '@mui/material/styles'

export type IntegrationPlatformKey =
  | 'facebook'
  | '99acres'
  | 'magicbricks'
  | 'housing'
  | 'justdial'
  | 'sulekha'
  | 'website'
  | 'ivr'

interface IntegrationGuideModalProps {
  open: boolean
  onClose: () => void
  initialPlatform?: IntegrationPlatformKey
  token?: string
}

interface PlatformGuideData {
  key: IntegrationPlatformKey
  name: string
  icon: React.ReactNode
  tagline: string
  overview: string
  prerequisites: string[]
  steps: { title: string; desc: string; tip?: string }[]
  webhookPath: string
  method: 'POST'
  tokenFormat: string
  fieldMappings: { portalField: string; crmField: string; required: boolean; desc: string; sample: string }[]
  samplePayload: Record<string, any>
  testingGuide: { title: string; steps: string[]; externalToolUrl?: string; externalToolName?: string }
  faqs: { q: string; a: string }[]
}

const PLATFORM_GUIDES: PlatformGuideData[] = [
  {
    key: 'facebook',
    name: 'Facebook Lead Ads',
    icon: <FacebookIcon sx={{ color: '#1877F2' }} />,
    tagline: 'Meta Graph API Webhook & Leadgen Integration',
    overview:
      'Seamlessly captures leads generated through Facebook and Instagram Instant Forms. When an interested prospect submits a lead form on Facebook or Instagram, Meta automatically triggers a webhook event into Leads Rubix within 1–2 seconds, creating an Inbound Inquiry and notifying assigned reps.',
    prerequisites: [
      'Facebook Business Manager / Page Admin permissions for your target page.',
      'Active Meta Leadgen Form published on your Facebook Page or Instagram Ad.',
      'A valid Leads Rubix organization workspace with access to the Integrations module.',
    ],
    steps: [
      {
        title: 'Authorize Meta Account Connection',
        desc: 'Click the "Login with Facebook" button on the Facebook Integration page. A Meta popup will prompt you to select your Business Account and grant permissions: leads_retrieval, pages_manage_ads, and pages_show_list.',
        tip: 'Ensure all pages you run ads on are selected in the Meta dialog.',
      },
      {
        title: 'Review Connected Pages & Auto-Subscribed Webhook',
        desc: 'Once authenticated, Leads Rubix exchanges your session token for a long-lived access token (valid for 60 days) and registers a webhook subscription for the "leadgen" field on each page.',
      },
      {
        title: 'Map Lead Forms to CRM Projects',
        desc: 'In the "Connected Facebook Pages" table, click on the "Lead Forms Connected" chip. In the modal that appears, select the target CRM Project for each form. Inbound leads from that specific ad form will automatically route into the assigned project.',
        tip: 'If no specific project is selected, leads are captured into your default workspace pipeline.',
      },
      {
        title: 'Verify Inbound Lead Capture in Real Time',
        desc: 'Use the official Meta Lead Ads Testing Tool to generate a free simulated lead. The inquiry will appear in your Leads Rubix panel within 2 seconds.',
      },
    ],
    webhookPath: '/api/webhook/facebook',
    method: 'POST',
    tokenFormat: 'Handled automatically via Meta OAuth handshake and stored page tokens.',
    fieldMappings: [
      { portalField: 'full_name / name', crmField: 'Contact Name', required: true, desc: 'Full name of the lead', sample: 'Rahul Sharma' },
      { portalField: 'phone_number', crmField: 'Mobile Number', required: true, desc: 'Mobile number used for contact & deduplication', sample: '+91 98765 43210' },
      { portalField: 'email', crmField: 'Email Address', required: false, desc: 'Lead email address', sample: 'rahul.sharma@example.com' },
      { portalField: 'city / location', crmField: 'City / Location', required: false, desc: 'City answer from leadgen question', sample: 'Bangalore' },
      { portalField: 'Custom Form Questions', crmField: 'Inbound Details & Notes', required: false, desc: 'Budget, BHK preference, requirement type, etc.', sample: 'Budget: 80L-1Cr, 3 BHK' },
    ],
    samplePayload: {
      entry: [
        {
          id: "PAGE_ID",
          changes: [
            {
              field: "leadgen",
              value: {
                created_time: 1695000000,
                page_id: "PAGE_ID",
                form_id: "FORM_ID",
                leadgen_id: "LEADGEN_ID",
              },
            },
          ],
        },
      ],
    },
    testingGuide: {
      title: 'Testing with Meta Lead Ads Testing Tool',
      steps: [
        'Visit the official Meta Developer Lead Ads Testing Tool: https://developers.facebook.com/tools/lead-ads-testing',
        'Select your Facebook Page and Lead Form from the dropdown menus.',
        'Click the "Create Lead" button. Meta will immediately fire a webhook payload.',
        'Switch back to Leads Rubix and navigate to Inbound Inquiries (/leads/inquiries) or Leads & Contacts (/leads/contacts) to see the newly captured lead with source "Facebook".',
      ],
      externalToolUrl: 'https://developers.facebook.com/tools/lead-ads-testing',
      externalToolName: 'Meta Lead Ads Testing Tool',
    },
    faqs: [
      {
        q: 'How long does the Facebook access token stay valid?',
        a: 'Meta tokens typically remain active for 60 days. When your session is near expiration, Leads Rubix displays a "Session Expired" alert on your screen. Simply click "Renew Session" to refresh your token without losing any form mappings.',
      },
      {
        q: 'What happens if a lead submits twice through the same ad form?',
        a: 'Leads Rubix automatically de-duplicates records based on the mobile phone number. The existing contact profile is updated, and a new inquiry event is logged in the contact activity timeline.',
      },
      {
        q: 'Why are leads not showing up after ad campaign launch?',
        a: 'Ensure that the Lead Form used in your Facebook Ad campaign is associated with the Page connected in Leads Rubix. Also check whether your Facebook user account has full Page Admin privileges.',
      },
    ],
  },
  {
    key: '99acres',
    name: '99 Acres',
    icon: <BusinessIcon sx={{ color: '#FF8F00' }} />,
    tagline: 'Real Estate Lead Capture Webhook',
    overview:
      'Captures incoming property inquiry leads from 99acres listings directly into Leads Rubix via a high-speed HTTP POST Webhook. Inquiries instantly convert into CRM Leads with campaign tagging, property interest details, and automatic agent assignment.',
    prerequisites: [
      'Active 99acres Advertiser / Builder / Broker subscription.',
      'Access to your 99acres Relationship Manager (RM) or 99acres Developer / CRM settings.',
      'Your organization API token from Leads Rubix.',
    ],
    steps: [
      {
        title: 'Retrieve Your Leads Rubix Webhook URL & Token',
        desc: 'On the 99 Acres integration page, copy the provided Webhook URL (https://api1.leadsrubix.com/api/webhook/createContacts) and your dedicated organization API Token.',
      },
      {
        title: 'Submit Configuration Request to 99acres Support / RM',
        desc: 'Copy the pre-written instructions from the "Instructions for Account Manager" box and send them via email to your 99acres Relationship Manager or services@99acres.com.',
        tip: 'Specify that HTTP POST method with JSON body format should be used for real-time lead push.',
      },
      {
        title: 'Provide Payload Format & Authentication',
        desc: 'Share the sample JSON payload containing customer_name, contact_no, email, project, campaign ("99 Acres"), and your token.',
      },
      {
        title: 'Receive Confirmation & Run Real-Time Test',
        desc: 'Once the 99acres technical team confirms activation (typically 24–48 hours), execute a test lead submission to verify live reception in your Inbound Inquiries panel.',
      },
    ],
    webhookPath: '/api/webhook/createContacts',
    method: 'POST',
    tokenFormat: 'Pass in JSON body as {"token": "YOUR_API_KEY"} or in query URL: ?token=YOUR_API_KEY',
    fieldMappings: [
      { portalField: 'customer_name / name', crmField: 'Contact Name', required: true, desc: 'Lead / Buyer Name', sample: 'Inbound Lead' },
      { portalField: 'contact_no / mobile', crmField: 'Mobile Number', required: true, desc: 'Primary contact phone number', sample: '9876543210' },
      { portalField: 'email', crmField: 'Email Address', required: false, desc: 'Contact email address', sample: 'buyer@example.com' },
      { portalField: 'project / property', crmField: 'Project / Property Name', required: false, desc: 'Listing title or project name', sample: 'Sample Project / Property' },
      { portalField: 'campaign', crmField: 'Lead Source / Campaign', required: false, desc: 'Ingestion identifier', sample: '99 Acres' },
      { portalField: 'notes / query', crmField: 'Buyer Inquiry Remarks', required: false, desc: 'Buyer budget, message or query', sample: 'Interested in 3BHK ready to move' },
    ],
    samplePayload: {
      customer_name: "Inbound Lead",
      contact_no: "9876543210",
      email: "buyer@example.com",
      project: "Sample Project / Property",
      campaign: "99 Acres",
      token: "YOUR_API_KEY",
    },
    testingGuide: {
      title: 'Testing 99acres Webhook Ingestion via cURL',
      steps: [
        'Open Terminal or Postman on your computer.',
        'Copy the cURL command below with your active organization token.',
        'Execute the command. You should receive {"status": "success", "message": "Contact created successfully"}.',
        'Check Leads & Contacts (/leads/contacts) to see the lead listed with Source: 99 Acres.',
      ],
    },
    faqs: [
      {
        q: 'How long does 99acres take to activate webhook mapping?',
        a: '99acres customer support typically configures the webhook within 1 to 3 business days of receiving your request. Once mapped, leads stream in sub-second real time.',
      },
      {
        q: 'Can 99acres send leads with XML instead of JSON?',
        a: 'Leads Rubix supports standard JSON as well as URL-encoded key-value pairs. Request 99acres to use JSON POST format for maximum data reliability.',
      },
      {
        q: 'Will my sales reps be alerted when a 99acres lead arrives?',
        a: 'Yes! If you have enabled Notifications & Automation, assigned reps receive instant WhatsApp, Push, and Bell notifications whenever a 99acres inquiry arrives.',
      },
    ],
  },
  {
    key: 'magicbricks',
    name: 'MagicBricks',
    icon: <ContactPageIcon sx={{ color: '#E53935' }} />,
    tagline: 'Property Inbound Push & Lead API',
    overview:
      'Integrates MagicBricks property inquiries directly with Leads Rubix. Captures buyer details, project interest, budget, and inquiry timestamps automatically from MagicBricks listings and banner ad campaigns.',
    prerequisites: [
      'Active MagicBricks Developer or Agency advertiser account.',
      'MagicBricks Account Manager or CRM Lead Delivery access.',
      'Leads Rubix API Token with "MagicBricks" source resource configured.',
    ],
    steps: [
      {
        title: 'Locate MagicBricks API Settings',
        desc: 'Log in to your MagicBricks PropWorth/Advertiser portal, or contact your MagicBricks Account Representative for the "CRM Inbound Webhook" configuration.',
      },
      {
        title: 'Provide Endpoint & Parameters',
        desc: 'Provide the dedicated Leads Rubix endpoint (https://api1.leadsrubix.com/api/webhook/createContacts) and ensure your organization token is included in the payload.',
      },
      {
        title: 'Map Standard Inbound Fields',
        desc: 'Ensure MagicBricks pushes customer_name, contact_no, email, and project name in the request body.',
      },
      {
        title: 'Run Live Verification',
        desc: 'Verify inbound leads in your Leads Rubix inquiries screen. If MagicBricks sends test leads, confirm they land with source tagged as "MagicBricks".',
      },
    ],
    webhookPath: '/api/webhook/createContacts',
    method: 'POST',
    tokenFormat: 'Pass in JSON body as {"token": "YOUR_API_KEY"} or query: ?token=YOUR_API_KEY',
    fieldMappings: [
      { portalField: 'customer_name / name', crmField: 'Contact Name', required: true, desc: 'Inquirer Name', sample: 'Inbound Lead' },
      { portalField: 'contact_no / mobile', crmField: 'Mobile Number', required: true, desc: '10-digit mobile number', sample: '9876543210' },
      { portalField: 'email', crmField: 'Email Address', required: false, desc: 'Contact email address', sample: 'inquirer@example.com' },
      { portalField: 'project', crmField: 'Project Name', required: false, desc: 'Listing title or project name', sample: 'Sample Project / Property' },
      { portalField: 'campaign', crmField: 'Lead Source', required: false, desc: 'Campaign identifier', sample: 'MagicBricks' },
    ],
    samplePayload: {
      customer_name: "Inbound Lead",
      contact_no: "9876543210",
      email: "inquirer@example.com",
      project: "Sample Project / Property",
      campaign: "MagicBricks",
      token: "YOUR_API_KEY",
    },
    testingGuide: {
      title: 'Testing MagicBricks Lead Submission',
      steps: [
        'Send an HTTP POST request to https://api1.leadsrubix.com/api/webhook/createContacts with the sample JSON.',
        'Ensure the "token" parameter matches your organization key.',
        'View the lead instantly in /leads/contacts.',
      ],
    },
    faqs: [
      {
        q: 'Does MagicBricks require IP whitelisting?',
        a: 'The Leads Rubix webhook endpoint is publicly accessible over secure HTTPS and accepts webhook requests from any verified MagicBricks server IP.',
      },
      {
        q: 'What if MagicBricks sends field names like "Mobile" or "Name"?',
        a: 'Leads Rubix includes an intelligent fuzzy parser that automatically normalizes "mobile", "contact_no", "phone", "name", and "customer_name" seamlessly.',
      },
    ],
  },
  {
    key: 'housing',
    name: 'Housing.com',
    icon: <BusinessIcon sx={{ color: '#00ACC1' }} />,
    tagline: 'Housing & Makaan Lead Delivery Webhook',
    overview:
      'Direct real-time lead capture for properties listed on Housing.com and Makaan.com. Captures buyer inquiries, verified phone numbers, and property identifiers into Leads Rubix without manual export/import.',
    prerequisites: [
      'Active Housing.com / Elara Technologies partner package.',
      'Housing Partner Portal login or assistance from Housing tech support.',
      'Leads Rubix organization token.',
    ],
    steps: [
      {
        title: 'Access Housing Partner Portal',
        desc: 'Log in to your Housing.com advertiser panel and navigate to "Lead Delivery Settings" or "CRM Integrations".',
      },
      {
        title: 'Configure Webhook Endpoint',
        desc: 'Select HTTP POST / Webhook option and enter: https://api1.leadsrubix.com/api/webhook/createContacts?token=YOUR_API_KEY.',
        tip: 'Appending the token in the URL query string ensures authentication even if custom body headers are omitted.',
      },
      {
        title: 'Confirm Payload Structure',
        desc: 'Verify that buyer name, phone number, email, and property name are included in the JSON payload.',
      },
      {
        title: 'Test & Activate',
        desc: 'Send a test inquiry from the Housing portal or using cURL to confirm instant arrival.',
      },
    ],
    webhookPath: '/api/webhook/createContacts',
    method: 'POST',
    tokenFormat: 'Pass in JSON body {"token": "YOUR_API_KEY"} or in query string ?token=YOUR_API_KEY',
    fieldMappings: [
      { portalField: 'customer_name / name', crmField: 'Contact Name', required: true, desc: 'Buyer Name', sample: 'Inbound Lead' },
      { portalField: 'contact_no / mobile', crmField: 'Mobile Number', required: true, desc: 'Mobile number', sample: '9876543210' },
      { portalField: 'email', crmField: 'Email Address', required: false, desc: 'Buyer email', sample: 'buyer@example.com' },
      { portalField: 'project / property', crmField: 'Project Name', required: false, desc: 'Housing Property ID / Name', sample: 'Sample Project / Property' },
      { portalField: 'campaign', crmField: 'Lead Source', required: false, desc: 'Campaign identifier', sample: 'Housing' },
    ],
    samplePayload: {
      customer_name: "Inbound Lead",
      contact_no: "9876543210",
      email: "buyer@example.com",
      project: "Sample Project / Property",
      campaign: "Housing",
      token: "YOUR_API_KEY",
    },
    testingGuide: {
      title: 'Verifying Housing.com Webhook',
      steps: [
        'Use the copyable cURL below to send a sample payload.',
        'Review the JSON response: {"status":"success","message":"Contact created successfully"}.',
        'Verify the lead appears in Leads & Contacts with campaign "Housing".',
      ],
    },
    faqs: [
      {
        q: 'Can Housing.com leads trigger automated WhatsApp welcome messages?',
        a: 'Yes! When a Housing.com lead lands, Leads Rubix triggers any active "New Lead WhatsApp" automation rules instantly.',
      },
    ],
  },
  {
    key: 'justdial',
    name: 'JustDial',
    icon: <ContactPageIcon sx={{ color: '#F4511E' }} />,
    tagline: 'JustDial B2B / B2C Real-Time Data Push API',
    overview:
      'Direct integration with JustDial’s Inbound Lead API and Lead Push service. Captures prospective customers searching for your products and services on JustDial in real time.',
    prerequisites: [
      'Active JustDial Paid Listing / Campaign contract.',
      'JustDial Relationship Manager or CRM Push support access.',
      'Leads Rubix dedicated organization API Token.',
    ],
    steps: [
      {
        title: 'Request JustDial Lead Push Activation',
        desc: 'Contact your JustDial Relationship Manager or email JustDial Tech Support requesting "CRM Data Push" setup.',
      },
      {
        title: 'Provide Webhook URL with Token',
        desc: 'Give JustDial the webhook URL: https://api1.leadsrubix.com/api/webhook/createContacts?token=YOUR_API_KEY. JustDial will configure their server to push lead records on every user inquiry.',
      },
      {
        title: 'Configure Parameter Mapping',
        desc: 'Confirm JustDial sends lead ID, customer name, mobile number, category/service, and city.',
      },
      {
        title: 'Test Live Delivery',
        desc: 'Once activated by JustDial, monitor incoming inquiries in the Leads Rubix panel.',
      },
    ],
    webhookPath: '/api/webhook/createContacts',
    method: 'POST',
    tokenFormat: 'Accepts token in URL query parameter (?token=...) or in JSON/Form POST body',
    fieldMappings: [
      { portalField: 'name / customer_name', crmField: 'Contact Name', required: true, desc: 'Customer Name', sample: 'Inbound Lead' },
      { portalField: 'mobile / contact_no', crmField: 'Mobile Number', required: true, desc: 'Customer Mobile', sample: '9876543210' },
      { portalField: 'email', crmField: 'Email Address', required: false, desc: 'Customer Email', sample: 'lead@example.com' },
      { portalField: 'category / project', crmField: 'Project / Service', required: false, desc: 'Searched Category / Product', sample: 'Sample Service / Project' },
      { portalField: 'area / city', crmField: 'City / Location', required: false, desc: 'Inquiry locality', sample: 'City / Region' },
      { portalField: 'campaign', crmField: 'Lead Source', required: false, desc: 'Source tag', sample: 'JustDial' },
    ],
    samplePayload: {
      customer_name: "Inbound Lead",
      contact_no: "9876543210",
      email: "lead@example.com",
      project: "Sample Service / Project",
      campaign: "JustDial",
      token: "YOUR_API_KEY",
    },
    testingGuide: {
      title: 'Testing JustDial Ingestion',
      steps: [
        'Execute the cURL command below with your token.',
        'Ensure the status code returns 200 OK.',
        'View the contact in Leads Rubix tagged with Source "JustDial".',
      ],
    },
    faqs: [
      {
        q: 'Does JustDial support GET or POST?',
        a: 'Leads Rubix supports both POST requests and query parameters, making it compatible with all JustDial legacy and modern push formats.',
      },
    ],
  },
  {
    key: 'sulekha',
    name: 'Sulekha',
    icon: <ContactPageIcon sx={{ color: '#3949AB' }} />,
    tagline: 'Service Marketplace Lead Integration',
    overview:
      'Automates lead capture from Sulekha business listings. Whether prospects request quotes, service callbacks, or consultation appointments, inquiries land in Leads Rubix within seconds.',
    prerequisites: [
      'Active Sulekha Business Profile or partner package.',
      'Sulekha Partner support contact for CRM push URL entry.',
      'Leads Rubix API Token with "Sulekha" resource configured.',
    ],
    steps: [
      {
        title: 'Request Sulekha CRM Webhook Setup',
        desc: 'Contact Sulekha partner support and request integration of your CRM webhook endpoint.',
      },
      {
        title: 'Provide Webhook URL & Parameters',
        desc: 'Provide https://api1.leadsrubix.com/api/webhook/createContacts?token=YOUR_API_KEY and specify HTTP POST format.',
      },
      {
        title: 'Confirm Field Mapping',
        desc: 'Ensure Sulekha passes customer name, mobile, email, and requested service type.',
      },
      {
        title: 'Verify Live Ingestion',
        desc: 'Send a test submission to ensure immediate contact creation in your CRM.',
      },
    ],
    webhookPath: '/api/webhook/createContacts',
    method: 'POST',
    tokenFormat: 'JSON body or URL query (?token=YOUR_API_KEY)',
    fieldMappings: [
      { portalField: 'customer_name / name', crmField: 'Contact Name', required: true, desc: 'Client Name', sample: 'Inbound Lead' },
      { portalField: 'contact_no / mobile', crmField: 'Mobile Number', required: true, desc: 'Contact Mobile', sample: '9876543210' },
      { portalField: 'email', crmField: 'Email Address', required: false, desc: 'Client Email', sample: 'client@example.com' },
      { portalField: 'project / service', crmField: 'Project / Service', required: false, desc: 'Requested Service', sample: 'Sample Service / Project' },
      { portalField: 'campaign', crmField: 'Lead Source', required: false, desc: 'Source tag', sample: 'Sulekha' },
    ],
    samplePayload: {
      customer_name: "Inbound Lead",
      contact_no: "9876543210",
      email: "client@example.com",
      project: "Sample Service / Project",
      campaign: "Sulekha",
      token: "YOUR_API_KEY",
    },
    testingGuide: {
      title: 'Testing Sulekha Ingestion',
      steps: [
        'Send test POST request via cURL or Postman.',
        'Verify contact in Leads & Contacts with source "Sulekha".',
      ],
    },
    faqs: [
      {
        q: 'How are duplicate inquiries handled from Sulekha?',
        a: 'If a user requests quotes from multiple vendors and reaches you twice, Leads Rubix keeps a single contact profile and links the new inquiry timestamp.',
      },
    ],
  },
  {
    key: 'website',
    name: 'Website Forms & Webhooks',
    icon: <WebIcon sx={{ color: '#43A047' }} />,
    tagline: 'Universal Lead Capture from Any Website or CMS',
    overview:
      'Connect any website contact form, popup, booking calendar, or landing page directly to Leads Rubix. Works seamlessly with WordPress, Elementor Pro, Contact Form 7, Webflow, Wix, Squarespace, React, Next.js, and custom HTML/JS forms.',
    prerequisites: [
      'Access to your website CMS or source code.',
      'Your Leads Rubix organization API Token.',
      'Basic knowledge of form field naming (e.g. name, email, phone).',
    ],
    steps: [
      {
        title: 'Elementor Pro (WordPress) 1-Click Setup',
        desc: 'Edit your form in Elementor. Under "Actions After Submit", add "Webhook". In the Webhook settings, paste: https://api1.leadsrubix.com/api/webhook/createContacts?token=YOUR_API_KEY. Click Update. Leads Rubix automatically unpacks Elementor field structures!',
        tip: 'No extra WordPress plugins required! Leads Rubix includes built-in recursive Elementor field unpackers.',
      },
      {
        title: 'Standard HTML Form Setup',
        desc: 'Set your HTML form tag: <form action="https://api1.leadsrubix.com/api/webhook/createContacts" method="POST"> and add a hidden field: <input type="hidden" name="token" value="YOUR_API_KEY" />.',
      },
      {
        title: 'JavaScript / AJAX / React / Next.js Setup',
        desc: 'Submit form data asynchronously using the browser fetch() API without reloading the page. Full copyable snippet provided in the Code Snippets tab.',
      },
      {
        title: 'Webflow, Wix & Squarespace Setup',
        desc: 'Use the Webhook / Zapier action in Webflow/Wix forms to send an HTTP POST payload to the Leads Rubix endpoint with your token.',
      },
    ],
    webhookPath: '/api/webhook/createContacts',
    method: 'POST',
    tokenFormat: 'Passed via body field "token", URL query ?token=YOUR_API_KEY, or header Authorization: Bearer <token>',
    fieldMappings: [
      { portalField: 'customer_name / name / your-name', crmField: 'Contact Name', required: true, desc: 'Visitor full name', sample: 'Siddharth Rao' },
      { portalField: 'contact_no / phone / your-phone', crmField: 'Mobile Number', required: true, desc: 'Visitor phone number', sample: '9819988776' },
      { portalField: 'email / your-email', crmField: 'Email Address', required: false, desc: 'Visitor email address', sample: 'sid.rao@example.com' },
      { portalField: 'project / interest', crmField: 'Project / Service Interest', required: false, desc: 'Product, service or property selected', sample: 'Enterprise Plan Inquiry' },
      { portalField: 'campaign / source', crmField: 'Lead Source', required: false, desc: 'Source tag (defaults to Website)', sample: 'Website Contact Form' },
      { portalField: 'notes / message / query', crmField: 'Inquiry Remarks', required: false, desc: 'User message or comments', sample: 'Please arrange a demo on Friday' },
    ],
    samplePayload: {
      customer_name: "Siddharth Rao",
      contact_no: "9819988776",
      email: "sid.rao@example.com",
      project: "Enterprise Plan Inquiry",
      notes: "Please arrange a demo on Friday",
      campaign: "Website",
      token: "YOUR_API_KEY",
    },
    testingGuide: {
      title: 'Testing Website Form Integration',
      steps: [
        'Open the Website Integration page in Leads Rubix.',
        'Use the copyable cURL or JavaScript snippet.',
        'Execute the submission. Verify the new lead appears in Inbound Inquiries with Source: Website.',
      ],
    },
    faqs: [
      {
        q: 'Does Leads Rubix support Cross-Origin (CORS) requests from my website domain?',
        a: 'Yes! The Leads Rubix webhook endpoint has full CORS support enabled, allowing client-side AJAX fetch() calls from any domain without CORS errors.',
      },
      {
        q: 'Can I pass custom parameters like UTM tags or landing page URLs?',
        a: 'Yes! Any additional key-value pairs (such as utm_source, utm_medium, page_url) are automatically captured and stored in the inquiry details metadata.',
      },
    ],
  },
  {
    key: 'ivr',
    name: 'Cloud Telephony & IVR',
    icon: <PhoneInTalkIcon sx={{ color: '#272944' }} />,
    tagline: 'Multi-Line Virtual DID Routing & Call Audio Logging',
    overview:
      'Connects your cloud telephony lines (Tata Smartflo, TeleCMI, Exotel, MyOperator, Custom PBX) directly to Leads Rubix. Automatically creates Inbound Inquiries when callers dial your virtual numbers, routes calls to active agents based on phone number or extensions, and logs call recordings.',
    prerequisites: [
      'Active virtual pilot DID number from a supported cloud telephony provider.',
      'Access to your telephony provider dashboard (e.g. Tata Smartflo portal, Exotel applet builder).',
      'Configured agent phone numbers in Leads Rubix (Organization Telephony Routing Roster).',
    ],
    steps: [
      {
        title: 'Create an IVR Line in Leads Rubix',
        desc: 'Click "+ Add New IVR Line" at the top of the IVR Management screen. Enter a friendly name, select your provider (Tata Smartflo, TeleCMI, Exotel, etc.), and enter your assigned Virtual DID Number.',
      },
      {
        title: 'Copy the Dedicated Channel Webhook URL',
        desc: 'Each line receives a dedicated Webhook Endpoint with an authentication token (e.g. https://api1.leadsrubix.com/api/telephony/ivr-webhook?token=YOUR_CHANNEL_TOKEN).',
      },
      {
        title: 'Configure Passthru Applet in Telephony Portal',
        desc: 'In your cloud telephony management console (e.g. Tata Smartflo flow designer), add a Passthru / Webhook applet pointing to the Leads Rubix webhook URL.',
        tip: 'Configure the webhook to trigger on both call initiation (to create the inquiry) and call hangup (to record duration and recording MP3 URL).',
      },
      {
        title: 'Simulate & Verify Inbound Calls',
        desc: 'Click the "Send Test Call" button on your IVR line card. Leads Rubix simulates an inbound call payload, verifies agent extension matching, and logs an inquiry in Call Logs.',
      },
    ],
    webhookPath: '/api/telephony/ivr-webhook',
    method: 'POST',
    tokenFormat: 'Pass token in query string (?token=YOUR_TOKEN) or in JSON request body {"token": "YOUR_TOKEN"}',
    fieldMappings: [
      { portalField: 'caller_id / caller / customer_number', crmField: 'Caller Phone Number', required: true, desc: 'Inbound caller mobile number', sample: '+919876543210' },
      { portalField: 'virtual_number / did / dialed_number', crmField: 'Telephony Channel / DID', required: true, desc: 'Virtual pilot number called', sample: '+918012345678' },
      { portalField: 'agent_extension / agent_phone', crmField: 'Assigned Agent', required: false, desc: 'Matched agent extension or phone', sample: '101' },
      { portalField: 'call_duration / duration', crmField: 'Call Duration (Seconds)', required: false, desc: 'Total call talktime in seconds', sample: '145' },
      { portalField: 'call_status / status', crmField: 'Call Status', required: false, desc: 'ANSWERED, MISSED, BUSY, FAILED', sample: 'ANSWERED' },
      { portalField: 'recording_url / audio_url', crmField: 'Call Audio Recording', required: false, desc: 'Direct URL to call audio MP3', sample: 'https://cdn.provider.com/rec/123.mp3' },
    ],
    samplePayload: {
      caller: "+919876543210",
      did: "+918012345678",
      agent_phone: "9876500001",
      duration: 145,
      status: "ANSWERED",
      recording_url: "https://cdn.telephony.com/recordings/call_98765.mp3",
      token: "YOUR_CHANNEL_TOKEN",
    },
    testingGuide: {
      title: 'Testing IVR Line with 1-Click Simulation',
      steps: [
        'On the Cloud Telephony & IVR Management screen, find your configured line.',
        'Click the "Send Test Call" button.',
        'The CRM dispatches a simulated test payload.',
        'Navigate to Call Logs (/leads/call-logs) or Inbound Inquiries (/leads/inquiries) to confirm call capture.',
      ],
    },
    faqs: [
      {
        q: 'How does Leads Rubix match calls to specific team members?',
        a: 'Leads Rubix matches the agent_extension or agent_phone received in the telephony payload against the registered contact numbers of users in your organization roster. If no specific agent matched, the call routes according to your organization lead distribution rules.',
      },
      {
        q: 'Can agents listen to call recordings directly in the CRM?',
        a: 'Yes! When the telephony provider passes the recording_url, a built-in HTML5 audio player appears in Call Logs (/leads/call-logs) allowing managers and reps to play back call recordings with one click.',
      },
    ],
  },
]

export function IntegrationGuideModal({
  open,
  onClose,
  initialPlatform = 'facebook',
  token = 'YOUR_API_KEY',
}: IntegrationGuideModalProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<IntegrationPlatformKey>(initialPlatform)
  const [innerTab, setInnerTab] = useState<number>(0)
  const [copiedText, setCopiedText] = useState<string | null>(null)

  React.useEffect(() => {
    if (initialPlatform) {
      setSelectedPlatform(initialPlatform)
      setInnerTab(0)
    }
  }, [initialPlatform, open])

  const guide = PLATFORM_GUIDES.find((g) => g.key === selectedPlatform) || PLATFORM_GUIDES[0]

  const baseUrl =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:3000'
      : 'https://api1.leadsrubix.com'

  const fullWebhookUrl = `${baseUrl}${guide.webhookPath}`

  const handleCopy = (text: string, label: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text)
      setCopiedText(label)
      setTimeout(() => setCopiedText(null), 2000)
    }
  }

  // Pre-fill active token into sample payload
  const activePayload = {
    ...guide.samplePayload,
    token: token || 'YOUR_API_KEY',
  }
  const payloadString = JSON.stringify(activePayload, null, 2)

  const curlCommand = `curl -X POST "${fullWebhookUrl}" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(activePayload)}'`

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3, maxHeight: '90vh' } }}>
      <DialogTitle
        sx={{
          p: 2.5,
          pb: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: (theme) => (theme.palette.mode === 'dark' ? '#0B0E20' : '#FAFAFC'),
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '10px',
              bgcolor: 'primary.main',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MenuBookIcon fontSize="small" />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2, color: 'text.primary' }}>
              Integration Help & Setup Guides
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Layman-friendly setup instructions, webhook specifications, field mappings & troubleshooting
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      {/* Platform Selector Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper', px: 2 }}>
        <Tabs
          value={selectedPlatform}
          onChange={(_, val) => {
            setSelectedPlatform(val)
            setInnerTab(0)
          }}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 48,
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
              minHeight: 48,
              gap: 1,
            },
          }}
        >
          {PLATFORM_GUIDES.map((item) => (
            <Tab
              key={item.key}
              value={item.key}
              iconPosition="start"
              icon={item.icon as React.ReactElement}
              label={item.name}
            />
          ))}
        </Tabs>
      </Box>

      {/* Inner Sub-Tabs: Steps, Webhook Specs, Field Mappings, cURL Test, FAQs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'), px: 2.5 }}>
        <Tabs
          value={innerTab}
          onChange={(_, val) => setInnerTab(val)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 42,
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.8rem',
              minHeight: 42,
            },
          }}
        >
          <Tab label="1. Step-by-Step Guide" />
          <Tab label="2. Webhook Specs & Payload" />
          <Tab label="3. Field Mapping Reference" />
          <Tab label="4. Testing & Verification" />
          <Tab label="5. Troubleshooting & FAQs" />
        </Tabs>
      </Box>

      <DialogContent sx={{ p: 3, maxHeight: '65vh', overflowY: 'auto' }}>
        {/* TAB 0: Step-by-Step Guide */}
        {innerTab === 0 && (
          <Stack spacing={3}>
            {/* Overview Banner */}
            <Paper
              variant="outlined"
              sx={{
                p: 2.5,
                borderRadius: 2.5,
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
                borderColor: (theme) => alpha(theme.palette.primary.main, 0.18),
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                {guide.icon}
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  {guide.name} — {guide.tagline}
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                {guide.overview}
              </Typography>
            </Paper>

            {/* Prerequisites */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
                📋 Prerequisites Before You Start
              </Typography>
              <Stack spacing={1}>
                {guide.prerequisites.map((prereq, i) => (
                  <Stack direction="row" spacing={1.25} alignItems="flex-start" key={i}>
                    <CheckCircleOutlineIcon sx={{ fontSize: 18, color: 'success.main', mt: 0.25, flexShrink: 0 }} />
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.825rem' }}>
                      {prereq}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>

            {/* Steps */}
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: 'text.primary' }}>
                🚀 Setup Steps
              </Typography>
              <Stack spacing={2}>
                {guide.steps.map((step, idx) => (
                  <Paper key={idx} variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'background.paper' }}>
                    <Stack direction="row" spacing={1.5} alignItems="flex-start">
                      <Box
                        sx={{
                          width: 26,
                          height: 26,
                          borderRadius: '50%',
                          bgcolor: 'primary.main',
                          color: '#FFFFFF',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          mt: 0.25,
                        }}
                      >
                        {idx + 1}
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
                          {step.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.825rem', lineHeight: 1.55 }}>
                          {step.desc}
                        </Typography>
                        {step.tip && (
                          <Alert severity="info" sx={{ mt: 1.25, py: 0.5, fontSize: '0.78rem', borderRadius: 1.5 }}>
                            <strong>Pro-Tip:</strong> {step.tip}
                          </Alert>
                        )}
                      </Box>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </Box>
          </Stack>
        )}

        {/* TAB 1: Webhook Specs & Payload */}
        {innerTab === 1 && (
          <Stack spacing={3}>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Inbound Webhook Endpoint
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
                <Box
                  sx={{
                    flex: 1,
                    p: 1.25,
                    borderRadius: 1.5,
                    bgcolor: (theme) => (theme.palette.mode === 'dark' ? '#16182D' : '#F1F3F9'),
                    fontFamily: 'monospace',
                    fontSize: '0.825rem',
                    color: 'text.primary',
                    wordBreak: 'break-all',
                  }}
                >
                  {fullWebhookUrl}
                </Box>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<ContentCopyIcon fontSize="small" />}
                  onClick={() => handleCopy(fullWebhookUrl, 'url')}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5, whiteSpace: 'nowrap' }}
                >
                  {copiedText === 'url' ? 'Copied' : 'Copy URL'}
                </Button>
              </Stack>
              <Stack direction="row" spacing={1.5} sx={{ mt: 1.5 }} alignItems="center">
                <Chip label={`Method: ${guide.method}`} size="small" color="success" sx={{ fontWeight: 700, fontSize: '0.72rem' }} />
                <Typography variant="caption" color="text.secondary">
                  Accepts JSON bodies, x-www-form-urlencoded & query params
                </Typography>
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Authentication Token Requirement
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.825rem', mb: 1.5 }}>
                {guide.tokenFormat}
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ xs: 'stretch', sm: 'center' }}>
                <Box
                  sx={{
                    flex: 1,
                    p: 1.25,
                    borderRadius: 1.5,
                    bgcolor: (theme) => (theme.palette.mode === 'dark' ? '#16182D' : '#F1F3F9'),
                    fontFamily: 'monospace',
                    fontSize: '0.825rem',
                    color: 'text.primary',
                  }}
                >
                  {token || 'YOUR_API_KEY'}
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ContentCopyIcon fontSize="small" />}
                  onClick={() => handleCopy(token || 'YOUR_API_KEY', 'token')}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5, whiteSpace: 'nowrap' }}
                >
                  {copiedText === 'token' ? 'Copied' : 'Copy Token'}
                </Button>
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Sample Request Payload (JSON)
                </Typography>
                <Button
                  size="small"
                  startIcon={<ContentCopyIcon fontSize="small" />}
                  onClick={() => handleCopy(payloadString, 'payload')}
                  sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' }}
                >
                  {copiedText === 'payload' ? 'Copied' : 'Copy Payload'}
                </Button>
              </Stack>
              <Box
                component="pre"
                sx={{
                  m: 0,
                  p: 2,
                  borderRadius: 2,
                  bgcolor: '#16182D',
                  color: '#93C5FD',
                  fontFamily: 'Consolas, Monaco, monospace',
                  fontSize: '0.8rem',
                  overflowX: 'auto',
                }}
              >
                {payloadString}
              </Box>
            </Paper>
          </Stack>
        )}

        {/* TAB 2: Field Mapping Reference */}
        {innerTab === 2 && (
          <Stack spacing={2.5}>
            <Alert severity="info" sx={{ borderRadius: 2, fontSize: '0.825rem' }}>
              Leads Rubix features an intelligent recursive parser that automatically matches variations (e.g. <code>contact_no</code>, <code>mobile</code>, <code>phone</code>, <code>tel</code>, <code>your-phone</code>).
            </Alert>

            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: (theme) => (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : '#F8FAFC') }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem' }}>Portal Field Name</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem' }}>Leads Rubix CRM Field</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem' }}>Required?</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem' }}>Description & Purpose</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem' }}>Example Value</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {guide.fieldMappings.map((field, i) => (
                    <TableRow key={i} hover>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.78rem' }}>
                        {field.portalField}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.78rem', color: 'primary.main' }}>
                        {field.crmField}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={field.required ? 'Mandatory' : 'Optional'}
                          size="small"
                          color={field.required ? 'error' : 'default'}
                          variant={field.required ? 'filled' : 'outlined'}
                          sx={{ height: 20, fontSize: '0.68rem', fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
                        {field.desc}
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {field.sample}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        )}

        {/* TAB 3: Testing & Verification */}
        {innerTab === 3 && (
          <Stack spacing={3}>
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                {guide.testingGuide.title}
              </Typography>
              <Stack spacing={1.5} sx={{ mb: 2 }}>
                {guide.testingGuide.steps.map((st, idx) => (
                  <Stack direction="row" spacing={1.25} alignItems="flex-start" key={idx}>
                    <Box
                      sx={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        bgcolor: 'action.hover',
                        fontWeight: 700,
                        fontSize: '0.72rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        mt: 0.25,
                      }}
                    >
                      {idx + 1}
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.825rem' }}>
                      {st}
                    </Typography>
                  </Stack>
                ))}
              </Stack>

              {guide.testingGuide.externalToolUrl && (
                <Button
                  variant="outlined"
                  size="small"
                  endIcon={<OpenInNewIcon fontSize="small" />}
                  component="a"
                  href={guide.testingGuide.externalToolUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5, mb: 1 }}
                >
                  Open {guide.testingGuide.externalToolName}
                </Button>
              )}
            </Paper>

            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Copyable 1-Click cURL Test Command
                </Typography>
                <Button
                  size="small"
                  startIcon={<ContentCopyIcon fontSize="small" />}
                  onClick={() => handleCopy(curlCommand, 'curl')}
                  sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' }}
                >
                  {copiedText === 'curl' ? 'Copied' : 'Copy cURL'}
                </Button>
              </Stack>
              <Box
                component="pre"
                sx={{
                  m: 0,
                  p: 2,
                  borderRadius: 2,
                  bgcolor: '#16182D',
                  color: '#34D399',
                  fontFamily: 'Consolas, Monaco, monospace',
                  fontSize: '0.75rem',
                  overflowX: 'auto',
                }}
              >
                {curlCommand}
              </Box>
            </Paper>
          </Stack>
        )}

        {/* TAB 4: Troubleshooting & FAQs */}
        {innerTab === 4 && (
          <Stack spacing={2}>
            {guide.faqs.map((faq, i) => (
              <Accordion key={i} defaultExpanded={i === 0} sx={{ borderRadius: 2, '&:before': { display: 'none' }, border: '1px solid', borderColor: 'divider' }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {faq.q}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.825rem', lineHeight: 1.6 }}>
                    {faq.a}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            ))}
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2.5, px: 3, borderTop: '1px solid', borderColor: 'divider', justifyContent: 'space-between' }}>
        <Typography variant="caption" color="text.secondary">
          Need technical assistance? Reach our engineering team at <strong>support@leadsrubix.com</strong>
        </Typography>
        <Button variant="contained" onClick={onClose} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2, px: 3 }}>
          Got It, Done
        </Button>
      </DialogActions>
    </Dialog>
  )
}
