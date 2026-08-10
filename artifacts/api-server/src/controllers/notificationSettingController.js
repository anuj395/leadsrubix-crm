const mongoose = require('mongoose');

exports.getSettings = async (req, res, next) => {
  try {
    const NotificationSetting = mongoose.model('NotificationSetting');
    const User = mongoose.model('User');
    const Organization = mongoose.model('Organization');

    const role = req.user.role;
    
    // 1. Super Admin fetching settings for a specific Industry
    if (role === 'superAdmin' && req.query.industryId) {
      const industryId = req.query.industryId;
      const settings = await NotificationSetting.find({
        organization_id: `industry_${industryId}`,
        user_id: null
      }).lean().exec();
      return res.json({ industrySettings: settings, orgSettings: [], userSettings: [] });
    }

    // 2. Org Admin or standard User fetching settings
    const orgId = req.user.organization_id || req.user.organizationId;
    if (!orgId) {
      return res.json({ industrySettings: [], orgSettings: [], userSettings: [] });
    }

    // Find organization to get its industryId
    const org = await Organization.findOne({
      $or: [
        { organization_id: orgId },
        { _id: mongoose.Types.ObjectId.isValid(orgId) ? orgId : null }
      ].filter(Boolean)
    }).lean().exec();
    
    const industryId = org ? org.industry_id || org.industryId : null;

    // Query all relevant settings in parallel
    const [industrySettings, orgSettings, userSettings] = await Promise.all([
      industryId ? NotificationSetting.find({ organization_id: `industry_${industryId}`, user_id: null }).lean().exec() : [],
      NotificationSetting.find({ organization_id: orgId, user_id: null }).lean().exec(),
      NotificationSetting.find({ organization_id: orgId, user_id: String(req.user.id || req.user._id) }).lean().exec()
    ]);

    res.json({
      industrySettings,
      orgSettings,
      userSettings
    });
  } catch (err) {
    next(err);
  }
};

exports.updateSetting = async (req, res, next) => {
  try {
    const NotificationSetting = mongoose.model('NotificationSetting');
    const { level, notificationType, isEnabled, industryId } = req.body;

    if (!level || !notificationType) {
      const err = new Error('Level and notificationType are required');
      err.status = 400;
      throw err;
    }

    const role = req.user.role;
    let targetOrgId = null;
    let targetUserId = null;

    if (level === 'industry') {
      if (role !== 'superAdmin') {
        const err = new Error('Only Super Admin can configure Industry capabilities');
        err.status = 403;
        throw err;
      }
      if (!industryId) {
        const err = new Error('industryId is required for industry level settings');
        err.status = 400;
        throw err;
      }
      targetOrgId = `industry_${industryId}`;
    } else if (level === 'org') {
      if (role !== 'admin' && role !== 'superAdmin') {
        const err = new Error('Only Organization Admin or Super Admin can configure organization-wide settings');
        err.status = 403;
        throw err;
      }
      if (role === 'admin') {
        targetOrgId = req.user.organization_id || req.user.organizationId;
        if (req.body.organizationId && String(req.body.organizationId) !== String(targetOrgId)) {
          const err = new Error("Access denied: You cannot modify another organization's settings");
          err.status = 403;
          throw err;
        }
      } else {
        targetOrgId = req.body.organizationId || req.user.organization_id || req.user.organizationId;
      }
    } else if (level === 'user') {
      targetOrgId = req.user.organization_id || req.user.organizationId;
      targetUserId = String(req.user.id || req.user._id);
      if (req.body.userId && String(req.body.userId) !== String(targetUserId)) {
        const err = new Error("Access denied: You cannot modify another user's settings");
        err.status = 403;
        throw err;
      }
    } else {
      const err = new Error('Invalid setting level');
      err.status = 400;
      throw err;
    }

    if (!targetOrgId) {
      const err = new Error('Organization context not found');
      err.status = 400;
      throw err;
    }

    // Upsert preference in database
    const query = {
      organization_id: targetOrgId,
      user_id: targetUserId,
      notification_type: notificationType
    };

    const update = {
      $set: { is_enabled: !!isEnabled }
    };

    const doc = await NotificationSetting.findOneAndUpdate(
      query,
      update,
      { new: true, upsert: true }
    ).exec();

    res.json(doc);
  } catch (err) {
    next(err);
  }
};
