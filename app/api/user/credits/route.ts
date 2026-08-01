import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

const RESET_DAYS = 15;
const STARTING_CREDITS = 100;

async function verifyToken(req: NextRequest): Promise<string | null> {
  const h = req.headers.get('authorization');
  if (!h?.startsWith('Bearer ')) return null;
  try {
    const d = await adminAuth.verifyIdToken(h.slice(7));
    return d.uid;
  } catch {
    return null;
  }
}

// GET /api/user/credits — returns credits, resets every 15 days
export async function GET(request: NextRequest) {
  const userId = await verifyToken(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const snap = await adminDb.collection('users').doc(userId).get();
  if (!snap.exists) return NextResponse.json({ credits: 0 });

  const data = snap.data()!;
  let credits: number = data.credits ?? 0;

  // 15-day reset check
  const lastReset: Date =
    data.lastCreditReset?.toDate?.() ||
    data.createdAt?.toDate?.() ||
    new Date();
  const daysSince = (Date.now() - lastReset.getTime()) / 86_400_000;

  if (daysSince >= RESET_DAYS) {
    credits = STARTING_CREDITS;
    await adminDb.collection('users').doc(userId).update({
      credits: STARTING_CREDITS,
      lastCreditReset: new Date(),
    });
  }

  return NextResponse.json({ credits });
}

// POST /api/user/credits — create profile if missing (called right after sign-up/sign-in)
export async function POST(request: NextRequest) {
  const userId = await verifyToken(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));

  const snap = await adminDb.collection('users').doc(userId).get();
  if (snap.exists) {
    const data = snap.data()!;
    return NextResponse.json({ credits: data.credits ?? 0, created: false });
  }

  const now = new Date();
  await adminDb.collection('users').doc(userId).set({
    id: userId,
    email: body.email || '',
    name: body.name || 'User',
    avatar: body.photoURL || null,
    credits: STARTING_CREDITS,
    modelCount: 0,
    createdAt: now,
    lastCreditReset: now,
  });

  return NextResponse.json({ credits: STARTING_CREDITS, created: true });
}
