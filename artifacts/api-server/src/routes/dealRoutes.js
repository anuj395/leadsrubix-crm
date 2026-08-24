const express = require('express');
const ctrl = require('../controllers/dealController');
const { authenticate } = require('../middlewares/auth');
const { requireScreenAction } = require('../middlewares/screenAction');

const router = express.Router();

router.get('/pipelines', authenticate, requireScreenAction('deals', 'view'), ctrl.listPipelines);
router.post('/pipelines', authenticate, requireScreenAction('deals', 'add'), ctrl.createPipeline);

router.put('/:id/stage', authenticate, requireScreenAction('deals', 'edit'), ctrl.updateStage);
router.patch('/:id/stage', authenticate, requireScreenAction('deals', 'edit'), ctrl.updateStage);
router.get('/:id', authenticate, requireScreenAction('deals', 'view'), ctrl.retrieve);
router.get('/', authenticate, requireScreenAction('deals', 'view'), ctrl.list);
router.post('/', authenticate, requireScreenAction('deals', 'add'), ctrl.create);
router.put('/:id', authenticate, requireScreenAction('deals', 'edit'), ctrl.update);
router.delete('/:id', authenticate, requireScreenAction('deals', 'delete'), ctrl.remove);

module.exports = router;
