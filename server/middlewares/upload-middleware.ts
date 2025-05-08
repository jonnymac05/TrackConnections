import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { isFileTypeAllowed } from '../services/s3-service';

// Configure multer for memory storage
const storage = multer.memoryStorage();

// Create a multer instance with constraints
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB file size limit
    files: 5 // Maximum 5 files per request
  },
  fileFilter: (req, file, cb) => {
    // Check if the file type is allowed (only images)
    if (!isFileTypeAllowed(file.mimetype)) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  }
});

// Middleware to handle file upload errors
export const handleUploadErrors = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    // A Multer error occurred during file upload
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ 
        message: 'File too large. Maximum file size is 10MB.' 
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(413).json({ 
        message: 'Too many files. Maximum of 5 files allowed per upload.' 
      });
    }
    return res.status(400).json({ 
      message: `File upload error: ${err.message}` 
    });
  } else if (err) {
    // A custom error occurred
    return res.status(400).json({ 
      message: err.message 
    });
  }
  next();
};

export default upload;