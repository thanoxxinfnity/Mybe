import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import {
  generateImageFromText,
  submitTrellisGeneration,
  pollTrellisStatus,
  downloadModelFile,
} from '@/lib/nvidia-api';
import { uploadModelToBlob, uploadImageToBlob } from '@/lib/blob-storage';

export const maxDuration = 300; // 5 minutes for Render / Node.js server

async function verifyToken(request: NextRequest): Promise<string | null> {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

// POST /api/generate - Start a new text-to-3D generation
export async function POST(request: NextRequest) {
  const userId = await verifyToken(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { prompt } = await request.json();
  if (!prompt?.trim()) {
    return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
  }

  // Check credits
  const userSnap = await adminDb.collection('users').doc(userId).get();
  if (!userSnap.exists) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  const userData = userSnap.data()!;
  if ((userData.credits || 0) < 1) {
    return NextResponse.json(
      { error: 'Insufficient credits. You need at least 1 credit to generate a model.' },
      { status: 402 }
    );
  }

  const modelId = uuidv4();
  const now = new Date();

  // Deduct credit immediately
  await adminDb.collection('users').doc(userId).update({
    credits: (userData.credits || 0) - 1,
  });

  // Save initial model record
  await adminDb.collection('models').doc(modelId).set({
    id: modelId,
    userId,
    userName: userData.name || 'User',
    userAvatar: userData.avatar || null,
    name: prompt.trim().slice(0, 80),
    prompt: prompt.trim(),
    format: 'glb',
    modelUrl: '',
    thumbnailUrl: null,
    status: 'processing',
    nvidiaRequestId: null,
    createdAt: now,
    updatedAt: now,
    downloads: 0,
    views: 0,
  });

  // Start the full pipeline (runs within the request - works on Render's Node.js server)
  try {
    // Step 1: Text → Image (SDXL)
    const imageBase64 = await generateImageFromText(prompt.trim());

    // Save thumbnail
    const thumbnailUrl = await uploadImageToBlob(imageBase64, userId, modelId).catch(() => null);

    // Step 2: Submit image to TRELLIS
    const submission = await submitTrellisGeneration(imageBase64);

    await adminDb.collection('models').doc(modelId).update({
      thumbnailUrl,
      nvidiaRequestId: submission.requestId,
      updatedAt: new Date(),
    });

    // Step 3: If direct result available (200), process immediately
    if (submission.directResult?.glbUrl) {
      await finishGeneration(modelId, userId, submission.directResult.glbUrl, thumbnailUrl);
      return NextResponse.json({ success: true, modelId, status: 'completed' });
    }

    // Otherwise poll until done
    const requestId = submission.requestId;
    let attempts = 0;
    const maxAttempts = 40; // ~3 min total polling

    while (attempts < maxAttempts) {
      await sleep(5000);
      attempts++;

      const statusResult = await pollTrellisStatus(requestId);

      if (statusResult.status === 'fulfilled' && statusResult.result?.glbUrl) {
        await finishGeneration(modelId, userId, statusResult.result.glbUrl, thumbnailUrl);
        return NextResponse.json({ success: true, modelId, status: 'completed' });
      }

      if (statusResult.status === 'rejected') {
        throw new Error(statusResult.error || 'TRELLIS generation failed');
      }
    }

    throw new Error('Generation timed out after 3 minutes');
  } catch (error) {
    // Refund credit on failure
    const currentSnap = await adminDb.collection('users').doc(userId).get();
    const currentCredits = currentSnap.data()?.credits || 0;
    await adminDb.collection('users').doc(userId).update({
      credits: currentCredits + 1,
    });

    await adminDb.collection('models').doc(modelId).update({
      status: 'failed',
      error: error instanceof Error ? error.message : 'Generation failed',
      updatedAt: new Date(),
    });

    console.error('[generate] Pipeline error:', error);
    return NextResponse.json(
      { error: 'Generation failed', modelId, status: 'failed' },
      { status: 500 }
    );
  }
}

async function finishGeneration(
  modelId: string,
  userId: string,
  glbUrl: string,
  thumbnailUrl: string | null
) {
  // Download GLB from NVIDIA CDN and upload to Vercel Blob for permanence
  const glbBuffer = await downloadModelFile(glbUrl);
  const blobUrl = await uploadModelToBlob(glbBuffer, `${modelId}.glb`, userId);

  const { FieldValue } = await import('firebase-admin/firestore');

  await adminDb.collection('models').doc(modelId).update({
    modelUrl: blobUrl,
    thumbnailUrl: thumbnailUrl || null,
    status: 'completed',
    updatedAt: new Date(),
  });

  await adminDb.collection('users').doc(userId).update({
    modelCount: FieldValue.increment(1),
  });
}

// GET /api/generate?id=xxx - Check generation status
export async function GET(request: NextRequest) {
  const userId = await verifyToken(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const modelId = request.nextUrl.searchParams.get('id');
  if (!modelId) {
    return NextResponse.json({ error: 'Model ID required' }, { status: 400 });
  }

  const snap = await adminDb.collection('models').doc(modelId).get();
  if (!snap.exists) {
    return NextResponse.json({ error: 'Model not found' }, { status: 404 });
  }

  const data = snap.data()!;
  return NextResponse.json({
    success: true,
    model: {
      id: data.id,
      status: data.status,
      modelUrl: data.modelUrl,
      thumbnailUrl: data.thumbnailUrl,
      error: data.error,
    },
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
