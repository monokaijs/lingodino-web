import {NextRequest} from 'next/server';
import {withApi} from '@/lib/utils/withApi';
import {UserRole} from '@/lib/types/models/user';
import {AttachmentType} from '@/lib/types/models/attachment';

function getAttachmentType(mimeType: string): AttachmentType {
  if (mimeType.startsWith('image/')) return AttachmentType.Image;
  if (mimeType.startsWith('video/')) return AttachmentType.Video;
  if (mimeType.startsWith('audio/')) return AttachmentType.Audio;
  return AttachmentType.Document;
}

async function postHandler(request: NextRequest) {
  const {r2, R2_BUCKET, makeKey} = await import('@/lib/services/r2');
  const {PutObjectCommand} = await import('@aws-sdk/client-s3');

  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    const error = new Error('File is required');
    (error as any).code = 400;
    throw error;
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = makeKey(file.name);

  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    })
  );

  const publicUrl = `${process.env.R2_PUBLIC_URL || ''}/${key}`;

  return {
    _id: key,
    name: file.name,
    type: getAttachmentType(file.type),
    url: publicUrl,
  };
}

export const POST = withApi(postHandler, {protected: true, roles: [UserRole.Admin]});
