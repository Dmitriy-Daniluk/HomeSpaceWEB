const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadDir = path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads'));
const maxFileSize = Number(process.env.MAX_FILE_SIZE || 10 * 1024 * 1024);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const avatarMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const fileMimeTypes = new Set([
  ...avatarMimeTypes,
  'image/gif',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

const avatarExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const fileExtensions = new Set([
  ...avatarExtensions,
  '.gif',
  '.pdf',
  '.txt',
  '.csv',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
]);

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

const createFileFilter = ({ mimeTypes, extensions }) => (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (!mimeTypes.has(file.mimetype) || !extensions.has(ext)) {
    const error = new Error('Unsupported file type');
    error.status = 400;
    return cb(error);
  }

  return cb(null, true);
};

const createUpload = ({ mimeTypes, extensions }) => multer({
  storage,
  limits: {
    files: 1,
    fileSize: maxFileSize,
  },
  fileFilter: createFileFilter({ mimeTypes, extensions }),
});

const handleUploadErrors = (uploadMiddleware) => (req, res, next) => {
  uploadMiddleware(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: 'File too large',
        message: `Файл слишком большой. Максимальный размер: ${Math.round(maxFileSize / 1024 / 1024)} МБ.`,
      });
    }

    return res.status(error.status || 400).json({
      error: error.message || 'Upload failed',
      message: error.message === 'Unsupported file type'
        ? 'Неподдерживаемый тип файла.'
        : 'Не удалось загрузить файл.',
    });
  });
};

const avatarUpload = createUpload({ mimeTypes: avatarMimeTypes, extensions: avatarExtensions });
const fileUpload = createUpload({ mimeTypes: fileMimeTypes, extensions: fileExtensions });

module.exports = {
  avatarUpload,
  fileUpload,
  handleUploadErrors,
  uploadDir,
};
