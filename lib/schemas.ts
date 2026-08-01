import { z } from 'zod';

export const Model3DFormats = {
  GLB: 'glb',
  OBJ: 'obj',
  GLTF: 'gltf',
  FBX: 'fbx',
  STL: 'stl',
} as const;

export type Model3DFormat = typeof Model3DFormats[keyof typeof Model3DFormats];

export const ModelMetadataSchema = z.object({
  id: z.string(),
  userId: z.string(),
  userName: z.string(),
  userAvatar: z.string().optional(),
  name: z.string().min(1).max(255),
  prompt: z.string(),
  format: z.enum(['glb', 'obj', 'gltf', 'fbx', 'stl']),
  modelUrl: z.string(),
  thumbnailUrl: z.string().optional(),
  status: z.enum(['processing', 'completed', 'failed']),
  error: z.string().optional(),
  nvidiaRequestId: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  downloads: z.number().default(0),
  views: z.number().default(0),
});

export type ModelMetadata = z.infer<typeof ModelMetadataSchema>;

export const UserProfileSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  avatar: z.string().optional(),
  credits: z.number().default(100),
  modelCount: z.number().default(0),
  createdAt: z.date(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;
