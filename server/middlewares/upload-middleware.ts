import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import * as s3Service from '../services/s3-service';

// Configure multer for memory storage
const storage = multer.memoryStorage();

// Configure file filter to allow only specific file types
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (s3Service.isFileTypeAllowed(file.mimetype)) {
    // Accept file
    cb(null, true);
  } else {
    // Reject file
    cb(null, false);
  }
};

// Configure upload limits
const limits = {
  fileSize: 5 * 1024 * 1024, // 5MB file size limit
  files: 5 // Maximum 5 files per upload
};

// Create the multer instance
const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits
});

// Export the upload middleware
export const upload = uploadMiddleware;

// Error handling middleware for multer errors
export const handleUploadErrors = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    // A Multer error occurred when uploading
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: 'File too large. Maximum file size is 5MB.'
      });
    }
    
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        message: 'Too many files. Maximum number of files is 5.'
      });
    }
    
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        message: 'Unexpected field name in form data.'
      });
    }
    
    // For any other multer error
    return res.status(400).json({
      message: `File upload error: ${err.message}`
    });
  }
  
  // For non-multer errors, pass to express's error handler
  next(err);
};