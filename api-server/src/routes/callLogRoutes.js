const express = require('express');
const router = express.Router();
const callLogsController = require('../controllers/callLogsController');
const { authenticate } = require('../middlewares/auth');

const {
  Create,
  Update,
  Search,
  FilterValues,
  CallLogCount,
  CallingReport,
  DeleteCallLogs,
  MasterSearch,
  MasterContactCount,
  MasterFilterValues,
  MaskMasterSearch
} = callLogsController;

// Apply authenticate middleware to all endpoints
router.use(authenticate);

router.post('/create', Create);
router.post('/update', Update);
router.post('/search', Search);
router.post('/masterSearch', MasterSearch);
router.post('/maskMasterSearch', MaskMasterSearch);
router.post('/filterValues', FilterValues);
router.post('/masterFilterValues', MasterFilterValues);
router.post('/callLogCount', CallLogCount);
router.post('/masterContactCount', MasterContactCount);
router.post('/callingReport', CallingReport);
router.delete('/deleteCallLogs', DeleteCallLogs);

module.exports = router;
