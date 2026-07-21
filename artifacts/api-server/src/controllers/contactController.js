const service = require('../services/contactService');

exports.list = async (req, res, next) => {
  try {
    const items = await service.listForUser({
      authedUser: req.user,
      limit: Number(req.query.limit) || 200,
    });
    res.json({ items });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const item = await service.createForUser({
      payload: req.body,
      authedUser: req.user,
    });
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const item = await service.updateForUser({
      id: req.params.id,
      payload: req.body,
      authedUser: req.user,
    });
    res.json(item);
  } catch (err) {
    next(err);
  }
};

exports.transfer = async (req, res, next) => {
  try {
    const { ids, owner, reason, leadType, options } = req.body;
    const result = await service.transferLeads({
      ids,
      owner,
      reason,
      leadType,
      options,
      authedUser: req.user,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.bulkReassign = async (req, res, next) => {
  try {
    const { ids, contactOwnerEmail, uid } = req.body;
    const result = await service.bulkReassignContacts({
      ids,
      contactOwnerEmail,
      uid,
      authedUser: req.user,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.bulkImport = async (req, res, next) => {
  try {
    const { contacts } = req.body;
    const result = await service.bulkImportContacts({
      contacts,
      authedUser: req.user,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.importHistory = async (req, res, next) => {
  try {
    const logs = await service.listImportLogs({
      authedUser: req.user,
    });
    res.json(logs);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    await service.deleteForUser({
      id: req.params.id,
      authedUser: req.user,
    });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};
