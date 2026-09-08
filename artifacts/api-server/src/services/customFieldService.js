const { getDb } = require('../config/db');
const { ObjectId } = require('mongodb');

/**
 * Service for managing per-tenant dynamic custom fields
 */
const customFieldService = {
  async getCustomFields(organizationId, module = 'leads') {
    const db = getDb();
    const query = { organizationId: String(organizationId), module };
    const fields = await db.collection('custom_fields').find(query).sort({ order: 1, createdAt: 1 }).toArray();
    return fields.map((f) => ({
      ...f,
      id: f._id.toString(),
    }));
  },

  async createCustomField(organizationId, payload) {
    const db = getDb();
    const doc = {
      organizationId: String(organizationId),
      module: payload.module || 'leads',
      fieldKey: payload.fieldKey || payload.name?.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      label: payload.label || payload.name,
      type: payload.type || 'text', // text, number, select, date, boolean
      required: Boolean(payload.required),
      options: Array.isArray(payload.options) ? payload.options : [],
      order: Number(payload.order) || 0,
      isActive: payload.isActive !== false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const res = await db.collection('custom_fields').insertOne(doc);
    return { ...doc, id: res.insertedId.toString(), _id: res.insertedId };
  },

  async updateCustomField(organizationId, fieldId, payload) {
    const db = getDb();
    const filter = { _id: new ObjectId(fieldId), organizationId: String(organizationId) };
    const update = {
      $set: {
        label: payload.label,
        type: payload.type,
        required: Boolean(payload.required),
        options: Array.isArray(payload.options) ? payload.options : [],
        order: Number(payload.order) || 0,
        isActive: payload.isActive !== false,
        updatedAt: new Date(),
      },
    };

    await db.collection('custom_fields').updateOne(filter, update);
    return this.getCustomFields(organizationId, payload.module || 'leads');
  },

  async deleteCustomField(organizationId, fieldId) {
    const db = getDb();
    await db.collection('custom_fields').deleteOne({
      _id: new ObjectId(fieldId),
      organizationId: String(organizationId),
    });
    return true;
  },
};

module.exports = customFieldService;
