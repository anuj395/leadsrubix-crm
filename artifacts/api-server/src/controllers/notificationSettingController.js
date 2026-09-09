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
    let industryId = null;

    if (orgId) {
      // Find organization to get its industryId
      const org = await Organization.findOne({
        $or: [
          { organization_id: orgId },
          { _id: mongoose.Types.ObjectId.isValid(orgId) ? orgId : null }
        ].filter(Boolean)
      }).lean().exec();
      industryId = org ? org.industry_id || org.industryId : null;
    }

    let orgIdFilter = [];
    if (orgId) {
      orgIdFilter = [
        { organization_id: orgId },
        { organizationId: orgId },
        { organization_id: String(orgId) },
        { organizationId: String(orgId) }
      ];
      if (mongoose.Types.ObjectId.isValid(orgId)) {
        orgIdFilter.push({ organization_id: new mongoose.Types.ObjectId(orgId) });
        orgIdFilter.push({ organizationId: new mongoose.Types.ObjectId(orgId) });
      }
    }

    const userQuery = (role === 'superAdmin' || !orgId || orgIdFilter.length === 0)
      ? User.find({}).select('_id email firstName lastName role device_id aws_push_tokens is_active status').lean().exec()
      : User.find({ $or: orgIdFilter }).select('_id email firstName lastName role device_id aws_push_tokens is_active status').lean().exec();

    // Query all relevant settings in parallel
    const [industrySettings, orgSettings, userSettings, allUsersSettings, orgUsers] = await Promise.all([
      (industryId && orgId) ? NotificationSetting.find({ organization_id: `industry_${industryId}`, user_id: null }).lean().exec() : [],
      orgId ? NotificationSetting.find({ organization_id: orgId, user_id: null }).lean().exec() : [],
      orgId ? NotificationSetting.find({ organization_id: orgId, user_id: String(req.user.id || req.user._id) }).lean().exec() : [],
      NotificationSetting.find({ user_id: { $ne: null } }).lean().exec(),
      userQuery
    ]);

    const finalOrgUsers = (orgUsers && orgUsers.length > 0) ? orgUsers : [req.user];

    res.json({
      industrySettings: industrySettings || [],
      orgSettings: orgSettings || [],
      userSettings: userSettings || [],
      allUsersSettings: allUsersSettings || [],
      orgUsers: finalOrgUsers
    });
  } catch (err) {
    next(err);
  }
};

exports.updateSetting = async (req, res, next) => {
  try {
    const NotificationSetting = mongoose.model('NotificationSetting');
    const { level, notificationType, isEnabled, industryId, userId } = req.body;

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
      if (role === 'admin' || role === 'superAdmin') {
        targetUserId = String(userId || req.user.id || req.user._id);
        targetOrgId = req.user.organization_id || req.user.organizationId || req.body.organizationId || null;
        if (!targetOrgId && targetUserId) {
          const targetUserDoc = await User.findById(targetUserId).lean().exec();
          if (targetUserDoc) {
            targetOrgId = targetUserDoc.organization_id || targetUserDoc.organizationId || null;
          }
        }
      } else {
        targetOrgId = req.user.organization_id || req.user.organizationId;
        targetUserId = String(req.user.id || req.user._id);
        if (userId && String(userId) !== String(targetUserId)) {
          const err = new Error("Access denied: You cannot modify another user's settings");
          err.status = 403;
          throw err;
        }
      }
    } else {
      const err = new Error('Invalid setting level');
      err.status = 400;
      throw err;
    }

    if (!targetOrgId) {
      targetOrgId = 'default_org';
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
