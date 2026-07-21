const mongoose = require('mongoose');

const importLogSchema = new mongoose.Schema(
  {
    requestId:      { type: String, required: true, index: true },
    organizationId: { type: String, required: true, index: true },
    createdBy:      { type: String, default: '' },
    uid:            { type: String, default: '' },
    status:         { type: String, default: 'Uploaded' }, // Uploaded, Processing, Completed, Failed
    uploadCount:    { type: Number, default: 0 },
    failedCount:    { type: Number, default: 0 },
    fileUrl:        { type: String, default: '' },
    responseUrl:    { type: String, default: '' },
  },
  { 
    timestamps: true 
  }
);

const ImportLog = mongoose.model('ImportLog', importLogSchema, 'import_logs');
module.exports = ImportLog;
