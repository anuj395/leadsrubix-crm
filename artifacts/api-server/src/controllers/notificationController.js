const mongoose = require('mongoose');

exports.list = async (req, res, next) => {
  try {
    const Notification = mongoose.model('Notification');
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    
    const query = {
      user_id: req.user.id || req.user._id,
      organization_id: req.user.organization_id || req.user.organizationId || null
    };
    
    const list = await Notification.find(query)
      .sort({ created_at: -1 })
      .limit(limit)
      .lean()
      .exec();
      
    res.json(list);
  } catch (err) {
    next(err);
  }
};

exports.getUnreadCount = async (req, res, next) => {
  try {
    const Notification = mongoose.model('Notification');
    
    const query = {
      user_id: req.user.id || req.user._id,
      organization_id: req.user.organization_id || req.user.organizationId || null,
      is_read: false
    };
    
    const count = await Notification.countDocuments(query);
    res.json({ count });
  } catch (err) {
    next(err);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const Notification = mongoose.model('Notification');
    
    const query = {
      _id: req.params.id,
      user_id: req.user.id || req.user._id,
      organization_id: req.user.organization_id || req.user.organizationId || null
    };
    
    const updated = await Notification.findOneAndUpdate(
      query,
      { $set: { is_read: true } },
      { new: true }
    ).exec();
    
    if (!updated) {
      const err = new Error('Notification not found or access denied');
      err.status = 404;
      throw err;
    }
    
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

exports.markAllAsRead = async (req, res, next) => {
  try {
    const Notification = mongoose.model('Notification');
    
    const query = {
      user_id: req.user.id || req.user._id,
      organization_id: req.user.organization_id || req.user.organizationId || null,
      is_read: false
    };
    
    await Notification.updateMany(query, { $set: { is_read: true } }).exec();
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
