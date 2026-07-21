const mongoose = require('mongoose');

const screenPermissionSchema = new mongoose.Schema(
  {
    screenId: { type: mongoose.Schema.Types.ObjectId, ref: 'Screen', required: true },
    roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
    industryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Industry', required: true },
    fieldId: { type: mongoose.Schema.Types.ObjectId, ref: 'ScreenField', required: true },
    isEnabled: { type: Boolean, default: true },
  },
  { 
    timestamps: true,
    toObject: { virtuals: true, getters: true },
    toJSON: { virtuals: true, getters: true }
  },
);

screenPermissionSchema.virtual('screen_id')
  .get(function() { return this.screenId; })
  .set(function(v) { this.screenId = v; });

screenPermissionSchema.virtual('field_id')
  .get(function() { return this.fieldId; })
  .set(function(v) { this.fieldId = v; });

screenPermissionSchema.virtual('is_enabled')
  .get(function() { return this.isEnabled; })
  .set(function(v) { this.isEnabled = v; });

screenPermissionSchema.index(
  { screenId: 1, roleId: 1, industryId: 1, fieldId: 1 },
  { unique: true, name: 'idx_screen_perm_unique' },
);
screenPermissionSchema.index(
  { screenId: 1, roleId: 1, industryId: 1, isEnabled: 1 },
  { name: 'idx_screen_perm_lookup' },
);

const ScreenPermission = mongoose.model(
  'ScreenPermission',
  screenPermissionSchema,
  'screen_permissions',
);

exports.ScreenPermission = ScreenPermission;

exports.list = async ({ screenId, screen_id, roleId, industryId, fieldId, field_id, enabledOnly = false } = {}) => {
  const sId = screenId || screen_id;
  const fId = fieldId || field_id;
  const q = {};
  if (sId) q.screenId = sId;
  if (roleId) q.roleId = roleId;
  if (industryId) q.industryId = industryId;
  if (fId) q.fieldId = fId;
  if (enabledOnly) q.isEnabled = true;
  return ScreenPermission.find(q).lean().exec();
};

exports.findById = async (id) => ScreenPermission.findById(id).lean().exec();

exports.upsert = async ({ screenId, screen_id, roleId, industryId, fieldId, field_id, isEnabled, is_enabled }) => {
  const sId = screenId || screen_id;
  const fId = fieldId || field_id;
  const enabled = isEnabled !== undefined ? isEnabled : is_enabled;
  const $set = {};
  if (enabled !== undefined) $set.isEnabled = !!enabled;
  await ScreenPermission.updateOne(
    { screenId: sId, roleId, industryId, fieldId: fId },
    { $set, $setOnInsert: { screenId: sId, roleId, industryId, fieldId: fId } },
    { upsert: true },
  );
  return ScreenPermission.findOne({ screenId: sId, roleId, industryId, fieldId: fId }).lean().exec();
};

exports.remove = async (id) => ScreenPermission.findByIdAndDelete(id).lean().exec();

exports.removeByScreen = async (screenId) =>
  ScreenPermission.deleteMany({ screenId }).exec();

exports.removeByRole = async (roleId) =>
  ScreenPermission.deleteMany({ roleId }).exec();

exports.removeByIndustry = async (industryId) =>
  ScreenPermission.deleteMany({ industryId }).exec();

exports.removeByField = async (fieldId) =>
  ScreenPermission.deleteMany({ fieldId }).exec();

exports.bulkSetForCombo = async ({ screenId, screen_id, roleId, industryId, fieldIds, field_ids }) => {
  const sId = screenId || screen_id;
  const ids = Array.isArray(fieldIds || field_ids) ? (fieldIds || field_ids) : [];
  await ScreenPermission.deleteMany({
    screenId: sId,
    roleId,
    industryId,
    fieldId: { $nin: ids },
  });
  if (ids.length) {
    const ops = ids.map((fieldId) => ({
      updateOne: {
        filter: { screenId: sId, roleId, industryId, fieldId },
        update: {
          $set: { isEnabled: true },
          $setOnInsert: { screenId: sId, roleId, industryId, fieldId },
        },
        upsert: true,
      },
    }));
    await ScreenPermission.bulkWrite(ops, { ordered: false });
  }
  return ScreenPermission.find({ screenId: sId, roleId, industryId }).lean().exec();
};
