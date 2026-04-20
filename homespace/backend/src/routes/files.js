const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fileController = require('../controllers/fileController');
const { auth } = require('../middleware/auth');

const uploadDir = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads'));
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

router.post('/upload', auth, upload.single('file'), fileController.uploadFile);
router.get('/', auth, fileController.getFiles);
router.put('/:id', auth, fileController.renameFile);
router.delete('/:id', auth, fileController.deleteFile);

module.exports = router;
