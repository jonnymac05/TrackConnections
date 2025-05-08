import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

// Create S3 client instance
const s3Client = new S3Client({
  region: process.env.AWS_REGION as string,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
});

// S3 bucket name
const bucketName = process.env.AWS_S3_BUCKET_TRACKCONNECTIONS as string;

// Validate that we have all required environment variables
if (!process.env.AWS_REGION || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !bucketName) {
  console.warn('WARNING: Missing AWS S3 environment variables. File upload functionality will not work.');
}

/**
 * Generate a unique file key for S3
 * @param userId User ID
 * @param originalFilename Original filename
 * @returns A unique file key
 */
export function generateFileKey(userId: string, originalFilename: string): string {
  const uniqueId = randomUUID();
  const ext = originalFilename.split('.').pop() || '';
  return `${userId}/${uniqueId}.${ext}`;
}

/**
 * Check if the file type is allowed
 * @param mimeType MIME type of the file
 * @returns True if the file type is allowed, false otherwise
 */
export function isFileTypeAllowed(mimeType: string): boolean {
  // Only allow image files for now
  return mimeType.startsWith('image/');
}

/**
 * Upload a file to S3
 * @param fileBuffer File buffer
 * @param fileKey S3 key for the file
 * @param contentType MIME type of the file
 * @returns URL of the uploaded file
 */
export async function uploadFileToS3(fileBuffer: Buffer, fileKey: string, contentType: string): Promise<string> {
  if (!bucketName) {
    throw new Error('AWS_S3_BUCKET_TRACKCONNECTIONS environment variable is not set');
  }

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileKey,
    Body: fileBuffer,
    ContentType: contentType,
  });

  try {
    await s3Client.send(command);
    
    // Return the URL of the uploaded file
    // Check if we have a URL prefix from env vars, otherwise construct S3 URL
    if (process.env.AWS_S3_URL_PREFIX) {
      return `${process.env.AWS_S3_URL_PREFIX}/${fileKey}`;
    } else {
      return `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;
    }
  } catch (error) {
    console.error('Error uploading file to S3:', error);
    throw new Error('Failed to upload file to S3');
  }
}

/**
 * Delete a file from S3
 * @param fileKey S3 key for the file
 */
export async function deleteFileFromS3(fileKey: string): Promise<void> {
  if (!bucketName) {
    throw new Error('AWS_S3_BUCKET_TRACKCONNECTIONS environment variable is not set');
  }

  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: fileKey,
  });

  try {
    await s3Client.send(command);
  } catch (error) {
    console.error('Error deleting file from S3:', error);
    throw new Error('Failed to delete file from S3');
  }
}

/**
 * Generate a presigned URL for a file in S3
 * @param fileKey S3 key for the file
 * @param expiresIn Expiration time in seconds (default: 3600)
 * @returns Presigned URL
 */
export async function generatePresignedUrl(fileKey: string, expiresIn = 3600): Promise<string> {
  if (!bucketName) {
    throw new Error('AWS_S3_BUCKET_TRACKCONNECTIONS environment variable is not set');
  }

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileKey,
  });

  try {
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    return signedUrl;
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    throw new Error('Failed to generate presigned URL');
  }
}