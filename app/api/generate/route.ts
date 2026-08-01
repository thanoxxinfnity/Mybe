import { NextRequest, NextResponse, after } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const maxDuration = 60;

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

// POST /api/generate — returns instantly, processes in background
export async function POST(request: NextRequest) {
  const userId = await verifyToken(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const prompt: string = body?.prompt?.trim();
  if (!prompt) return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });

  // Check credits
  const userSnap = await adminDb.collection('users').doc(userId).get();
  if (!userSnap.exists) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  const userData = userSnap.data()!;
  const currentCredits: number = userData.credits ?? 0;
  if (currentCredits < 1) {
    return NextResponse.json({ error: 'No credits remaining. You have used all 100 credits.' }, { status: 402 });
  }

  const modelId = uuidv4();
  const now = new Date();

  // Deduct 1 credit immediately
  await adminDb.collection('users').doc(userId).update({ credits: currentCredits - 1 });

  // Create Firestore record
  await adminDb.collection('models').doc(modelId).set({
    id: modelId,
    userId,
    userName: userData.name || 'User',
    userAvatar: userData.avatar || null,
    name: prompt.slice(0, 80),
    prompt,
    format: 'glb',
    modelUrl: '',
    thumbnailUrl: null,
    status: 'processing',
    nvidiaRequestId: null,
    error: null,
    createdAt: now,
    updatedAt: now,
    downloads: 0,
    views: 0,
  });

  // Run the heavy NVIDIA pipeline AFTER this response is sent
  after(async () => {
    try {
      const { generateImageFromText, submitTrellisGeneration, pollTrellisStatus } = await import('@/lib/nvidia-api');
      const { uploadModelToBlob, uploadImageToBlob } = await import('@/lib/blob-storage');
      const { FieldValue } = await import('firebase-admin/firestore');
      const axios = (await import('axios')).default;

      // Step 1 — Text → High-quality image (SDXL)
      const imageBase64 = await generateImageFromText(prompt);

      // Save thumbnail to Vercel Blob
      const thumbnailUrl = await uploadImageToBlob(imageBase64, userId, modelId).catch(() => null);
      await adminDb.collection('models').doc(modelId).update({ thumbnailUrl, updatedAt: new Date() });

      // Step 2 — Image → 3D (TRELLIS)
      const submission = await submitTrellisGeneration(imageBase64);
      await adminDb.collection('models').doc(modelId).update({
        nvidiaRequestId: submission.requestId,
        updatedAt: new Date(),
      });

      let glbUrl: string | undefined;

      if (submission.directResult?.glbUrl) {
        glbUrl = submission.directResult.glbUrl;
      } else {
        // Poll NVIDIA until done (max ~5 min)
        for (let i = 0; i < 60; i++) {
          await sleep(5000);
          const s = await pollTrellisStatus(submission.requestId);
          if (s.status === 'fulfilled' && s.result?.glbUrl) {
            glbUrl = s.result.glbUrl;
            break;
          }
          if (s.status === 'rejected') throw new Error(s.error || 'TRELLIS generation rejected');
        }
      }

      if (!glbUrl) throw new Error('Generation timed out — no model returned from NVIDIA');

      // Download GLB from NVIDIA CDN
      const glbResp = await axios.get(glbUrl, {
        responseType: 'arraybuffer',
        timeout: 120000,
        headers: { Authorization: `Bearer ${process.env.NVIDIA_API_KEY}` },
      });
      const glbBuffer = Buffer.from(glbResp.data);

      // Upload GLB to Vercel Blob (permanent storage)
      const blobUrl = await uploadModelToBlob(glbBuffer, `${modelId}.glb`, userId);

      // Mark complete
      await adminDb.collection('models').doc(modelId).update({
        modelUrl: blobUrl,
        status: 'completed',
        updatedAt: new Date(),
      });
      await adminDb.collection('users').doc(userId).update({
        modelCount: FieldValue.increment(1),
      });
    } catch (err) {
      // Refund credit on failure
      const { FieldValue } = await import('firebase-admin/firestore');
      await adminDb.collection('users').doc(userId).update({ credits: FieldValue.increment(1) });
      await adminDb.collection('models').doc(modelId).update({
        status: 'failed',
        error: err instanceof Error ? err.message : 'Unknown error',
        updatedAt: new Date(),
      });
      console.error('[generate] Pipeline failed:', err);
    }
  });

  return NextResponse.json({ success: true, modelId, status: 'processing' });
}

// GET /api/generate?id=xxx — poll status
export async function GET(request: NextRequest) {
  const userId = await verifyToken(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const modelId = request.nextUrl.searchParams.get('id');
  if (!modelId) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const snap = await adminDb.collection('models').doc(modelId).get();
  if (!snap.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const d = snap.data()!;
  return NextResponse.json({
    status: d.status,
    modelId: d.id,
    modelUrl: d.modelUrl || null,
    thumbnailUrl: d.thumbnailUrl || null,
    error: d.error || null,
  });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
