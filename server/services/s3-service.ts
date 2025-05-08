import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

// S3 bucket name for Track Connections
const bucketName = process.env.AWS_S3_BUCKET_TRACKCONNECTIONS || '';
const urlPrefix = process.env.AWS_S3_URL_PREFIX || '';

// Check if all required environment variables are present
if (!process.env.AWS_REGION || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !bucketName) {
  console.warn('AWS S3 credentials are missing. File upload functionality will not work correctly.');
}

/**
 * Validates if the file type is allowed
 */
export const isFileTypeAllowed = (mimetype: string): boolean => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ];
  
  return allowedTypes.includes(mimetype);
};

/**
 * Generates a unique file key for S3
 */
export const generateFileKey = (userId: string, originalname: string): string => {
  // Get file extension
  const fileExtension = originalname.split('.').pop() || '';
  
  // Generate a unique ID
  const uniqueId = randomUUID();
  
  // Format: users/{userId}/{uniqueId}.{extension}
  return `users/${userId}/${uniqueId}.${fileExtension}`;
};

/**
 * Uploads a file to S3 and returns the URL
 */
export const uploadFileToS3 = async (
  fileBuffer: Buffer,
  fileKey: string,
  mimetype: string
): Promise<string> => {
  // Check if S3 credentials are configured
  if (!bucketName) {
    throw new Error('AWS S3 bucket name is not configured.');
  }
  
  try {
    // Configure the upload parameters
    const params = {
      Bucket: bucketName,
      Key: fileKey,
      Body: fileBuffer,
      ContentType: mimetype
    };
    
    // Upload the file to S3
    await s3Client.send(new PutObjectCommand(params));
    
    // Return the public URL
    return urlPrefix ? `${urlPrefix}/${fileKey}` : `https://${bucketName}.s3.amazonaws.com/${fileKey}`;
  } catch (error) {
    console.error('Error uploading file to S3:', error);
    throw new Error('Failed to upload file to S3.');
  }
};

/**
 * Deletes a file from S3
 */
export const deleteFileFromS3 = async (fileKey: string): Promise<void> => {
  // Check if S3 credentials are configured
  if (!bucketName) {
    throw new Error('AWS S3 bucket name is not configured.');
  }
  
  try {
    // Configure the delete parameters
    const params = {
      Bucket: bucketName,
      Key: fileKey
    };
    
    // Delete the file from S3
    await s3Client.send(new DeleteObjectCommand(params));
  } catch (error) {
    console.error('Error deleting file from S3:', error);
    throw new Error('Failed to delete file from S3.');
  }
};

/**
 * Extracts the file key from a full S3 URL
 */
export const getFileKeyFromUrl = (url: string): string => {
  if (urlPrefix && url.startsWith(urlPrefix)) {
    // Remove URL prefix if present
    return url.substring(urlPrefix.length + 1); // +1 for the trailing slash
  }
  
  // Extract from standard S3 URL
  const matches = url.match(/https:\/\/.*\.s3\.amazonaws\.com\/(.*)/);
  if (matches && matches[1]) {
    return matches[1];
  }
  
  // If it's already a key (not a full URL)
  if (!url.startsWith('http')) {
    return url;
  }
  
  throw new Error('Invalid S3 URL format');
};

/**
 * Generates a presigned URL for a file in S3 that expires after a specified duration
 */
export const generatePresignedUrl = async (
  fileKey: string,
  expiresIn = 3600 // 1 hour by default
): Promise<string> => {
  // Check if S3 credentials are configured
  if (!bucketName) {
    throw new Error('AWS S3 bucket name is not configured.');
  }
  
  try {
    // Configure the parameters
    const params = {
      Bucket: bucketName,
      Key: fileKey
    };
    
    // Generate a presigned URL for the object
    const command = new PutObjectCommand(params);
    const url = await getSignedUrl(s3Client, command, { expiresIn });
    
    return url;
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    throw new Error('Failed to generate presigned URL.');
  }
};

export default {
  isFileTypeAllowed,
  generateFileKey,
  uploadFileToS3,
  deleteFileFromS3,
  getFileKeyFromUrl,
  generatePresignedUrl
};