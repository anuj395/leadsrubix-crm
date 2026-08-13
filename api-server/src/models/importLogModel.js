const mongoose = require('mongoose');

const importLogSchema = new mongoose.Schema(
  {
    request_id:      { type: String, required: true, index: true, alias: 'requestId' },
    organization_id: { type: String, required: true, index: true, alias: 'organizationId' },
    created_by:      { type: String, default: '', alias: 'createdBy' },
    uid:            { type: String, default: '' },
    status:         { type: String, default: 'Uploaded' }, // Uploaded, Processing, Completed, Failed
    upload_count:    { type: Number, default: 0, alias: 'uploadCount' },
    failed_count:    { type: Number, default: 0, alias: 'failedCount' },
    file_url:        { type: String, default: '', alias: 'fileUrl' },
    response_url:    { type: String, default: '', alias: 'responseUrl' },
  },
  { 
    timestamps: true,
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true }
  }
);

const ImportLog = mongoose.model('ImportLog', importLogSchema, 'import_logs');
module.exports = ImportLog;
