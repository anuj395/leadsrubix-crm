const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

const isS3Configured = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_S3_BUCKET);

let s3 = null;
if (isS3Configured) {
  s3 = new S3Client({
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    region: process.env.AWS_REGION || 'ap-south-1',
  });
}

/**
 * Sanitizes a filename to remove special characters and spaces
 */
function sanitizeFilename(filename) {
  if (!filename) return `file-${Date.now()}`;
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_');
}

/**
 * Enterprise Multi-Tenant S3 Key Generator
 * Format: {industryId}/{organizationId}/{workspaceId}/contacts/{contactId}/attachments/{category}/{filename}
 */
function buildTenantS3Key({
  industryId = 'global',
  organizationId = 'global',
  workspaceId = 'default',
  contactId = null,
  resourceType = 'attachments',
  filename = 'file'
}) {
  const cleanFilename = sanitizeFilename(filename);
  const ind = industryId ? String(industryId).replace(/[^a-zA-Z0-9_-]/g, '') : 'global';
  const org = organizationId ? String(organizationId).replace(/[^a-zA-Z0-9_-]/g, '') : 'global';
  const ws = workspaceId ? String(workspaceId).replace(/[^a-zA-Z0-9_-]/g, '') : 'default';
  const resType = resourceType ? String(resourceType).toLowerCase().replace(/[^a-z0-9_-]/g, '') : 'attachments';
  
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 7);

  if (contactId) {
    const cleanContactId = String(contactId).replace(/[^a-zA-Z0-9_-]/g, '');
    return `${ind}/${org}/${ws}/contacts/${cleanContactId}/${resType}/${timestamp}-${randomSuffix}-${cleanFilename}`;
  }

  return `${ind}/${org}/${ws}/${resType}/${timestamp}-${randomSuffix}-${cleanFilename}`;
}

/**
 * Uploads a raw buffer to S3 with enterprise multi-tenant path hierarchy
 */
async function uploadMediaBuffer({
  fileBuffer,
  mimeType = 'application/octet-stream',
  filename = 'file',
  industryId = null,
  organizationId = null,
  workspaceId = null,
  contactId = null,
  resourceType = 'attachments'
}) {
  if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
    throw new Error('Invalid file buffer provided for S3 upload.');
  }

  const s3Key = buildTenantS3Key({
    industryId,
    organizationId,
    workspaceId,
    contactId,
    resourceType,
    filename
  });

  const region = process.env.AWS_REGION || 'ap-south-1';

  if (isS3Configured) {
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: mimeType,
    });
    await s3.send(command);
    const fileUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${region}.amazonaws.com/${s3Key}`;
    return {
      url: fileUrl,
      key: s3Key,
      name: filename,
      size: fileBuffer.length,
      mimeType,
      type: resourceType
    };
  } else {
    // Local Fallback Storage
    const uploadsDir = path.join(__dirname, '../../uploads', s3Key.substring(0, s3Key.lastIndexOf('/')));
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const cleanFilename = s3Key.substring(s3Key.lastIndexOf('/') + 1);
    const filepath = path.join(uploadsDir, cleanFilename);
    fs.writeFileSync(filepath, fileBuffer);
    const port = process.env.PORT || 8080;
    const fileUrl = `http://localhost:${port}/uploads/${s3Key}`;
    return {
      url: fileUrl,
      key: s3Key,
      name: filename,
      size: fileBuffer.length,
      mimeType,
      type: resourceType
    };
  }
}

/**
 * Uploads a base64 encoded media payload to S3
 */
async function uploadBase64Media({
  base64Data,
  filename = 'attachment',
  industryId = null,
  organizationId = null,
  workspaceId = null,
  contactId = null,
  resourceType = 'photo'
}) {
  if (!base64Data || typeof base64Data !== 'string') {
    return base64Data;
  }

  const matches = base64Data.match(/^data:([A-Za-z-+\/0-9.]+);base64,(.+)$/);
  if (!matches) {
    // Already a remote URL
    return {
      url: base64Data,
      key: '',
      name: filename,
      type: resourceType
    };
  }

  const mimeType = matches[1];
  const buffer = Buffer.from(matches[2], 'base64');
  let ext = mimeType.split('/')[1] || 'bin';
  ext = ext.split('+')[0].replace('jpeg', 'jpg');

  const finalFilename = filename.includes('.') ? filename : `${filename}.${ext}`;

  return await uploadMediaBuffer({
    fileBuffer: buffer,
    mimeType,
    filename: finalFilename,
    industryId,
    organizationId,
    workspaceId,
    contactId,
    resourceType
  });
}

/**
 * Legacy uploadImage helper for carousel / general resources
 */
async function uploadImage(base64Data, resourceKey = 'carousel') {
  if (!base64Data || typeof base64Data !== 'string') {
    return base64Data;
  }

  const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches) {
    return base64Data;
  }

  const res = await uploadBase64Media({
    base64Data,
    filename: `${resourceKey}.png`,
    resourceType: resourceKey
  });

  return typeof res === 'object' ? res.url : res;
}

/**
 * Deletes an object from S3 or local folder
 */
async function deleteImage(fileUrl, resourceKey = 'carousel') {
  if (!fileUrl || typeof fileUrl !== 'string') return;

  if (isS3Configured) {
    const s3Marker = '.amazonaws.com/';
    const s3Index = fileUrl.indexOf(s3Marker);
    if (s3Index !== -1) {
      const key = fileUrl.substring(s3Index + s3Marker.length);
      try {
        const command = new DeleteObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: key,
        });
        await s3.send(command);
      } catch (s3Err) {
        console.warn(`[S3Service] Could not delete S3 object (${key}): ${s3Err.message}`);
      }
    }
  } else {
    // Local fallback deletion
    const urlMarker = '/uploads/';
    const urlIndex = fileUrl.indexOf(urlMarker);
    if (urlIndex !== -1) {
      const relativeKey = fileUrl.substring(urlIndex + urlMarker.length);
      const filepath = path.join(__dirname, '../../uploads', relativeKey);
      if (fs.existsSync(filepath)) {
        try {
          fs.unlinkSync(filepath);
        } catch (err) {
          console.error(`Failed to delete local fallback file: ${filepath}`, err);
        }
      }
    }
  }
}

module.exports = {
  uploadMediaBuffer,
  uploadBase64Media,
  uploadImage,
  deleteImage,
  buildTenantS3Key,
  isS3Configured
};
