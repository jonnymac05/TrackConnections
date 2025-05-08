import { 
  S3Client, 
  PutObjectCommand, 
  DeleteObjectCommand,
  GetObjectCommand 
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import path from 'path';

// Validate that all required environment variables are set
const requiredEnvVars = [
  'AWS_REGION',
  'AWS_ACCESS_KEY_ID', 
  'AWS_SECRET_ACCESS_KEY', 
  'AWS_S3_BUCKET_TRACKCONNECTIONS',
  'AWS_S3_URL_PREFIX'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.warn(`Warning: Missing required environment variable ${envVar}`);
  }
}

// Create S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  }
});

// The name of the bucket
const bucketName = process.env.AWS_S3_BUCKET_TRACKCONNECTIONS!;
// The URL prefix for accessing files (e.g., https://my-bucket.s3.amazonaws.com/)
const urlPrefix = process.env.AWS_S3_URL_PREFIX || '';

// List of allowed file types for image uploads
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp',
  'image/tiff'
];

/**
 * Validates if the file type is allowed
 */
export const isFileTypeAllowed = (mimetype: string): boolean => {
  return ALLOWED_FILE_TYPES.includes(mimetype);
};

/**
 * Generates a unique file key for S3
 */
export const generateFileKey = (userId: string, originalname: string): string => {
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  const extension = path.extname(originalname);
  const sanitizedFilename = path.basename(originalname, extension)
    .replace(/[^a-zA-Z0-9]/g, '_')
    .toLowerCase();
  
  return `${userId}/${timestamp}-${randomString}-${sanitizedFilename}${extension}`;
};

/**
 * Uploads a file to S3 and returns the URL
 */
export const uploadFileToS3 = async (
  fileBuffer: Buffer,
  fileKey: string,
  mimetype: string
): Promise<string> => {
  try {
    const params = {
      Bucket: bucketName,
      Key: fileKey,
      Body: fileBuffer,
      ContentType: mimetype
    };

    const command = new PutObjectCommand(params);
    await s3Client.send(command);
    
    // Return the full URL to the file
    return `${urlPrefix}/${fileKey}`;
  } catch (error) {
    console.error('Error uploading file to S3:', error);
    throw new Error('Failed to upload file to S3');
  }
};

/**
 * Deletes a file from S3
 */
export const deleteFileFromS3 = async (fileKey: string): Promise<void> => {
  try {
    const params = {
      Bucket: bucketName,
      Key: fileKey
    };

    const command = new DeleteObjectCommand(params);
    await s3Client.send(command);
  } catch (error) {
    console.error('Error deleting file from S3:', error);
    throw new Error('Failed to delete file from S3');
  }
};

/**
 * Extracts the file key from a full S3 URL
 */
export const getFileKeyFromUrl = (url: string): string => {
  if (!url) return '';
  
  // If urlPrefix is provided, remove it from the URL to get the key
  if (urlPrefix && url.startsWith(urlPrefix)) {
    return url.slice(urlPrefix.length + 1); // +1 for the leading slash
  }
  
  // Otherwise, try to extract the key from the URL structure
  const urlObj = new URL(url);
  return urlObj.pathname.startsWith('/') ? urlObj.pathname.slice(1) : urlObj.pathname;
};

/**
 * Generates a presigned URL for a file in S3 that expires after a specified duration
 */
export const generatePresignedUrl = async (
  fileKey: string,
  expiresInSeconds: number = 3600
): Promise<string> => {
  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: fileKey
    });
    
    return await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    throw new Error('Failed to generate presigned URL');
  }
};

export default {
  uploadFileToS3,
  deleteFileFromS3,
  generateFileKey,
  isFileTypeAllowed,
  getFileKeyFromUrl,
  generatePresignedUrl
};