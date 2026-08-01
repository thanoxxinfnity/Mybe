import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const snap = await adminDb.collection('models').doc(id).get();
  if (!snap.exists) {
    return NextResponse.json({ error: 'Model not found' }, { status: 404 });
  }

  const data = snap.data()!;

  // Increment views (fire and forget)
  adminDb
    .collection('models')
    .doc(id)
    .update({ views: FieldValue.increment(1) })
    .catch(() => {});

  return NextResponse.json({
    success: true,
    model: {
      id: data.id,
      name: data.name,
      prompt: data.prompt,
      userId: data.userId,
      userName: data.userName,
      userAvatar: data.userAvatar,
      format: data.format,
      modelUrl: data.modelUrl,
      thumbnailUrl: data.thumbnailUrl,
      status: data.status,
      views: data.views || 0,
      downloads: data.downloads || 0,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    },
  });
}
