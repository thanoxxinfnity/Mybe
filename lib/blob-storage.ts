import { put, del } from '@vercel/blob';

export async function uploadModelToBlob(
  buffer: Buffer,
  filename: string,
  userId: string
): Promise<string> {
  const path = `models/${userId}/${Date.now()}-${filename}`;
  const blob = await put(path, buffer, {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'model/gltf-binary',
  });
  return blob.url;
}

export async function uploadImageToBlob(
  base64Data: string,
  userId: string,
  modelId: string
): Promise<string> {
  const buffer = Buffer.from(base64Data, 'base64');
  const path = `thumbnails/${userId}/${modelId}.png`;
  const blob = await put(path, buffer, {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'image/png',
  });
  return blob.url;
}

export async function deleteFromBlob(url: string): Promise<void> {
  await del(url);
}
