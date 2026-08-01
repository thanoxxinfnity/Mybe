import axios, { AxiosError } from 'axios';

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;

// Step 1: Generate a high-quality image from text using NVIDIA NIM (SDXL)
export async function generateImageFromText(prompt: string): Promise<string> {
  if (!NVIDIA_API_KEY) throw new Error('NVIDIA_API_KEY not configured');

  const enhancedPrompt = `${prompt}, ultra detailed, 8K photorealistic render, PBR materials, physically based rendering, studio lighting, sharp focus, high resolution textures, professional CGI, octane render quality, subsurface scattering, ray tracing`;

  const response = await axios.post(
    'https://ai.api.nvidia.com/v1/genai/stabilityai/stable-diffusion-xl',
    {
      text_prompts: [
        { text: enhancedPrompt, weight: 1 },
        { text: 'blurry, low quality, distorted, ugly, watermark, text, flat, cartoon, anime', weight: -1 },
      ],
      cfg_scale: 8,
      sampler: 'K_EULER_ANCESTRAL',
      seed: 0,
      steps: 50,
      height: 1024,
      width: 1024,
    },
    {
      headers: {
        Authorization: `Bearer ${NVIDIA_API_KEY}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      timeout: 120000,
    }
  );

  const base64Image: string = response.data.artifacts?.[0]?.base64;
  if (!base64Image) throw new Error('No image returned from NVIDIA API');

  return base64Image; // returns base64 PNG
}

// Step 2: Submit image to TRELLIS for 3D generation
// Returns requestId for async polling
export async function submitTrellisGeneration(imageBase64: string): Promise<{ requestId: string; directResult?: TrellisResult }> {
  if (!NVIDIA_API_KEY) throw new Error('NVIDIA_API_KEY not configured');

  const response = await axios.post(
    'https://ai.api.nvidia.com/v1/genai/microsoft/trellis',
    {
      image: `data:image/png;base64,${imageBase64}`,
      mesh_simplify: 0.98,
      texture_size: 2048,
      render_mode: 'mesh',
      sparse_structure_sampler_params: {
        steps: 20,
        cfg_strength: 7.5,
      },
      slat_sampler_params: {
        steps: 20,
        cfg_strength: 3.5,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${NVIDIA_API_KEY}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'NVCF-POLL-SECONDS': '0',
      },
      timeout: 300000,
      validateStatus: (status) => status === 200 || status === 202,
    }
  );

  if (response.status === 200) {
    return {
      requestId: response.headers['nvcf-request-id'] || 'direct',
      directResult: parseTrellisResponse(response.data),
    };
  }

  // 202 Accepted - async, need to poll
  const requestId = response.headers['nvcf-request-id'];
  if (!requestId) throw new Error('No NVCF-REQUEST-ID in response headers');

  return { requestId };
}

export interface TrellisResult {
  glbUrl?: string;
  videoUrl?: string;
  rawData?: unknown;
}

function parseTrellisResponse(data: unknown): TrellisResult {
  const d = data as Record<string, unknown>;
  return {
    glbUrl: (d.glb_url || d.model_url || d.output_url) as string | undefined,
    videoUrl: (d.video_url) as string | undefined,
    rawData: data,
  };
}

// Poll NVIDIA for TRELLIS job status
export async function pollTrellisStatus(requestId: string): Promise<{
  status: 'pending' | 'fulfilled' | 'rejected';
  result?: TrellisResult;
  error?: string;
}> {
  if (!NVIDIA_API_KEY) throw new Error('NVIDIA_API_KEY not configured');

  const response = await axios.get(
    `https://api.nvcf.nvidia.com/v2/nvcf/pexec/status/${requestId}`,
    {
      headers: {
        Authorization: `Bearer ${NVIDIA_API_KEY}`,
        Accept: 'application/json',
      },
      timeout: 30000,
      validateStatus: (status) => status === 200 || status === 202,
    }
  );

  if (response.status === 202) {
    return { status: 'pending' };
  }

  const data = response.data as Record<string, unknown>;
  const responseStatus = (data.status as string) || 'fulfilled';

  if (responseStatus === 'rejected' || responseStatus === 'failed') {
    return {
      status: 'rejected',
      error: (data.detail as string) || 'Generation failed',
    };
  }

  // fulfilled - parse the actual result
  const responseBody = (data.response || data) as Record<string, unknown>;
  return {
    status: 'fulfilled',
    result: parseTrellisResponse(responseBody),
  };
}

// Download the GLB model file as a Buffer
export async function downloadModelFile(url: string): Promise<Buffer> {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 120000,
    headers: {
      Authorization: `Bearer ${NVIDIA_API_KEY}`,
    },
  });
  return Buffer.from(response.data);
}
