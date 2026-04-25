const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const { auth } = require('../middleware/auth');
const { fileUpload, handleUploadErrors } = require('../middleware/upload');

router.post('/upload', auth, handleUploadErrors(fileUpload.single('file')), fileController.uploadFile);
router.get('/', auth, fileController.getFiles);
router.put('/:id', auth, fileController.renameFile);
router.delete('/:id', auth, fileController.deleteFile);

module.exports = router;
