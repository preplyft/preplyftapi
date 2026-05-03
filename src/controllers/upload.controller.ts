import { Response } from 'express';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { s3, S3_BUCKET } from '../config/s3';
import { AuthRequest, VALID_S3_FOLDERS, S3Folder } from '../types/type';

// POST /upload/presigned-url 🔒 instructor
export const getPresignedUrl = async (req: AuthRequest, res: Response): Promise<void> => {
  const { fileName, fileType, folder } = req.body;

  if (!fileName || !fileType || !folder) {
    res.status(400).json({ message: 'fileName, fileType, and folder are required' });
    return;
  }

  if (!VALID_S3_FOLDERS.includes(folder as S3Folder)) {
    res.status(400).json({ message: `Invalid folder. Must be one of: ${VALID_S3_FOLDERS.join(', ')}` });
    return;
  }

  const ext = fileName.split('.').pop();
  const key = `${folder}/${uuidv4()}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: fileType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

  res.json({ uploadUrl, key, expiresIn: 3600 });
};
