const mongoose = require('mongoose');

const screenPermissionSchema = new mongoose.Schema(
  {
    screen_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Screen', required: true },
    roleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: true },
    industryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Industry', required: true },
    field_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ScreenField', required: true },
    is_enabled: { type: Boolean, default: true },
  },
  { timestamps: true },
);

screenPermissionSchema.index(
  { screen_id: 1, roleId: 1, industryId: 1, field_id: 1 },
  { unique: true, name: 'idx_screen_perm_unique' },
);
screenPermissionSchema.index(
  { screen_id: 1, roleId: 1, industryId: 1, is_enabled: 1 },
  { name: 'idx_screen_perm_lookup' },
);

const ScreenPermission = mongoose.model(
  'ScreenPermission',
  screenPermissionSchema,
  'screen_permissions',
);

exports.ScreenPermission = ScreenPermission;

exports.list = async ({ screen_id, roleId, industryId, field_id, enabledOnly = false } = {}) => {
  const q = {};
  if (screen_id) q.screen_id = screen_id;
  if (roleId) q.roleId = roleId;
  if (industryId) q.industryId = industryId;
  if (field_id) q.field_id = field_id;
  if (enabledOnly) q.is_enabled = true;
  return ScreenPermission.find(q).lean().exec();
};

exports.findById = async (id) => ScreenPermission.findById(id).lean().exec();

exports.upsert = async ({ screen_id, roleId, industryId, field_id, is_enabled }) => {
  const $set = {};
  if (is_enabled !== undefined) $set.is_enabled = !!is_enabled;
  await ScreenPermission.updateOne(
    { screen_id, roleId, industryId, field_id },
    { $set, $setOnInsert: { screen_id, roleId, industryId, field_id } },
    { upsert: true },
  );
  return ScreenPermission.findOne({ screen_id, roleId, industryId, field_id }).lean().exec();
};

exports.remove = async (id) => ScreenPermission.findByIdAndDelete(id).lean().exec();

exports.removeByScreen = async (screen_id) =>
  ScreenPermission.deleteMany({ screen_id }).exec();

exports.removeByRole = async (roleId) =>
  ScreenPermission.deleteMany({ roleId }).exec();

exports.removeByIndustry = async (industryId) =>
  ScreenPermission.deleteMany({ industryId }).exec();

exports.removeByField = async (field_id) =>
  ScreenPermission.deleteMany({ field_id }).exec();

// Overwrite enabled fields for a (screen, role, industry) combo. Anything not
// in `field_ids` becomes disabled (deleted); listed ids become enabled (upsert).
exports.bulkSetForCombo = async ({ screen_id, roleId, industryId, field_ids }) => {
  const ids = Array.isArray(field_ids) ? field_ids : [];
  await ScreenPermission.deleteMany({
    screen_id,
    roleId,
    industryId,
    field_id: { $nin: ids },
  });
  if (ids.length) {
    const ops = ids.map((field_id) => ({
      updateOne: {
        filter: { screen_id, roleId, industryId, field_id },
        update: {
          $set: { is_enabled: true },
          $setOnInsert: { screen_id, roleId, industryId, field_id },
        },
        upsert: true,
      },
    }));
    await ScreenPermission.bulkWrite(ops, { ordered: false });
  }
  return ScreenPermission.find({ screen_id, roleId, industryId }).lean().exec();
};
