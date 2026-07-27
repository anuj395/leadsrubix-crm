const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
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
    region: process.env.AWS_REGION || 'us-east-1',
  });
}

/**
 * Uploads a base64 image payload to S3 or a local folder fallback.
 * @param {string} base64Data 
 * @param {string} resourceKey 
 * @returns {Promise<string>} The uploaded file URL
 */
async function uploadImage(base64Data, resourceKey = 'carousel') {
  if (!base64Data || typeof base64Data !== 'string') {
    return base64Data;
  }

  const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches) {
    // If it's already a URL, return it
    return base64Data;
  }

  const mimeType = matches[1];
  const buffer = Buffer.from(matches[2], 'base64');
  const rawExtension = mimeType.split('/')[1] || 'png';
  // Clean up content-type like svg+xml to svg
  const extension = rawExtension.split('+')[0];
  const filename = `${resourceKey}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${extension}`;

  if (isS3Configured) {
    const key = `${resourceKey}/${filename}`;
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    });
    await s3.send(command);
    const region = process.env.AWS_REGION || 'us-east-1';
    return `https://${process.env.AWS_S3_BUCKET}.s3.${region}.amazonaws.com/${key}`;
  } else {
    // Local fallback
    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const filepath = path.join(uploadsDir, filename);
    fs.writeFileSync(filepath, buffer);
    const port = process.env.PORT || 3001;
    return `http://localhost:${port}/uploads/${filename}`;
  }
}

/**
 * Deletes an image from S3 or local folder.
 * @param {string} fileUrl 
 * @param {string} resourceKey 
 */
async function deleteImage(fileUrl, resourceKey = 'carousel') {
  if (!fileUrl || typeof fileUrl !== 'string') return;

  if (isS3Configured) {
    const s3Marker = '.amazonaws.com/';
    const s3Index = fileUrl.indexOf(s3Marker);
    if (s3Index !== -1) {
      const key = fileUrl.substring(s3Index + s3Marker.length);
      const command = new DeleteObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: key,
      });
      await s3.send(command);
    }
  } else {
    // Local fallback deletion
    const urlMarker = '/uploads/';
    const urlIndex = fileUrl.indexOf(urlMarker);
    if (urlIndex !== -1) {
      const filename = fileUrl.substring(urlIndex + urlMarker.length);
      const filepath = path.join(__dirname, '../../uploads', filename);
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
  uploadImage,
  deleteImage,
  isS3Configured
};
