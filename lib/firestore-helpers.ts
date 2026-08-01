import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  increment,
} from 'firebase/firestore';
import { db } from './firebase';
import { ModelMetadata, UserProfile } from './schemas';

// ============ USER / CREDITS ============

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      ...data,
      createdAt: data.createdAt?.toDate?.() || new Date(),
    } as UserProfile;
  } catch {
    return null;
  }
}

export async function createUserProfile(user: {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}): Promise<UserProfile> {
  const profile: UserProfile = {
    id: user.uid,
    email: user.email || '',
    name: user.displayName || 'User',
    avatar: user.photoURL || undefined,
    credits: 100,
    modelCount: 0,
    createdAt: new Date(),
  };
  await setDoc(doc(db, 'users', user.uid), {
    ...profile,
    createdAt: profile.createdAt,
  });
  return profile;
}

export async function getUserCredits(userId: string): Promise<number> {
  const profile = await getUserProfile(userId);
  return profile?.credits ?? 0;
}

export async function deductCredit(userId: string): Promise<void> {
  await updateDoc(doc(db, 'users', userId), {
    credits: increment(-1),
  });
}

export async function refundCredit(userId: string): Promise<void> {
  await updateDoc(doc(db, 'users', userId), {
    credits: increment(1),
  });
}

// ============ MODELS ============

export async function saveModel(model: ModelMetadata): Promise<void> {
  await setDoc(doc(db, 'models', model.id), {
    ...model,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
  });
}

export async function getModel(modelId: string): Promise<ModelMetadata | null> {
  try {
    const snap = await getDoc(doc(db, 'models', modelId));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      ...data,
      createdAt: data.createdAt?.toDate?.() || new Date(),
      updatedAt: data.updatedAt?.toDate?.() || new Date(),
    } as ModelMetadata;
  } catch {
    return null;
  }
}

export async function updateModel(
  modelId: string,
  updates: Partial<ModelMetadata>
): Promise<void> {
  await updateDoc(doc(db, 'models', modelId), {
    ...updates,
    updatedAt: new Date(),
  });
}

export async function getPublicModels(limitCount = 50): Promise<ModelMetadata[]> {
  try {
    const q = query(
      collection(db, 'models'),
      where('status', '==', 'completed'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
      } as ModelMetadata;
    });
  } catch {
    return [];
  }
}

export async function getUserModels(userId: string): Promise<ModelMetadata[]> {
  try {
    const q = query(
      collection(db, 'models'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
      } as ModelMetadata;
    });
  } catch {
    return [];
  }
}

export async function incrementModelViews(modelId: string): Promise<void> {
  await updateDoc(doc(db, 'models', modelId), { views: increment(1) });
}

export async function incrementModelDownloads(modelId: string): Promise<void> {
  await updateDoc(doc(db, 'models', modelId), { downloads: increment(1) });
}
