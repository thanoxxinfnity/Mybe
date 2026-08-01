import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const limitCount = Math.min(parseInt(searchParams.get('limit') || '24'), 100);
    const search = searchParams.get('search') || '';

    const snap = await adminDb
      .collection('models')
      .where('status', '==', 'completed')
      .orderBy('createdAt', 'desc')
      .limit(limitCount)
      .get();

    let models = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: data.id,
        name: data.name,
        prompt: data.prompt,
        userId: data.userId,
        userName: data.userName,
        userAvatar: data.userAvatar,
        format: data.format,
        modelUrl: data.modelUrl,
        thumbnailUrl: data.thumbnailUrl,
        views: data.views || 0,
        downloads: data.downloads || 0,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      };
    });

    if (search) {
      const lower = search.toLowerCase();
      models = models.filter(
        (m) =>
          m.name.toLowerCase().includes(lower) ||
          m.prompt.toLowerCase().includes(lower)
      );
    }

    return NextResponse.json({ success: true, models, total: models.length });
  } catch (error) {
    console.error('[models] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch models' }, { status: 500 });
  }
}
