const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {createHttpError} = require('../utils/httpError');

const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, {recursive: true});
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        cb(null, `${name}-${uniqueSuffix}${ext}`);
    },
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, PDF, DOC, and DOCX files are allowed.'));
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024,
    },
    fileFilter: fileFilter,
});

const uploadSingle = upload.single('file');
const uploadMultiple = upload.array('files', 10);

class Upload {
    static uploadFile(req, res) {
        return new Promise((resolve, reject) => {
            uploadSingle(req, res, (err) => {
                if (err) {
                    if (err instanceof multer.MulterError) {
                        if (err.code === 'LIMIT_FILE_SIZE') {
                            return reject(createHttpError('File size too large. Maximum size is 10MB.', 400));
                        }
                        return reject(createHttpError(err.message, 400));
                    }
                    return reject(createHttpError(err.message, 400));
                }

                if (!req.file) {
                    return reject(createHttpError('No file uploaded', 400));
                }

                const fileUrl = `/uploads/${req.file.filename}`;
                return resolve({
                    status: 200,
                    data: {
                        message: 'File uploaded successfully',
                        file: {
                            filename: req.file.filename,
                            originalname: req.file.originalname,
                            mimetype: req.file.mimetype,
                            size: req.file.size,
                            path: fileUrl,
                            url: `${req.protocol}://${req.get('host')}${fileUrl}`,
                        },
                    },
                });
            });
        });
    }

    static uploadMultiple(req, res) {
        return new Promise((resolve, reject) => {
            uploadMultiple(req, res, (err) => {
                if (err) {
                    if (err instanceof multer.MulterError) {
                        if (err.code === 'LIMIT_FILE_SIZE') {
                            return reject(createHttpError('File size too large. Maximum size is 10MB per file.', 400));
                        }
                        if (err.code === 'LIMIT_FILE_COUNT') {
                            return reject(createHttpError('Too many files. Maximum is 10 files.', 400));
                        }
                        return reject(createHttpError(err.message, 400));
                    }
                    return reject(createHttpError(err.message, 400));
                }

                if (!req.files || req.files.length === 0) {
                    return reject(createHttpError('No files uploaded', 400));
                }

                const files = req.files.map(file => ({
                    filename: file.filename,
                    originalname: file.originalname,
                    mimetype: file.mimetype,
                    size: file.size,
                    path: `/uploads/${file.filename}`,
                    url: `${req.protocol}://${req.get('host')}/uploads/${file.filename}`,
                }));

                return resolve({
                    status: 200,
                    data: {
                        message: `${files.length} file(s) uploaded successfully`,
                        files: files,
                    },
                });
            });
        });
    }
}

module.exports = Upload;
