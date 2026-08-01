import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

async function verifyToken(request: NextRequest): Promise<string | null> {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(auth.slice(7));
    return decoded.uid;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const userId = await verifyToken(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const snap = await adminDb.collection('users').doc(userId).get();
  if (!snap.exists) {
    return NextResponse.json({ credits: 0, modelCount: 0 });
  }

  const data = snap.data()!;
  return NextResponse.json({
    credits: data.credits ?? 0,
    modelCount: data.modelCount ?? 0,
  });
}
