const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fileController = require('../controllers/fileController');
const { auth } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: '/app/uploads',
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

router.post('/upload', auth, upload.single('file'), fileController.uploadFile);
router.get('/', auth, fileController.getFiles);
router.delete('/:id', auth, fileController.deleteFile);

module.exports = router;
