import { supabase } from '@/integrations/supabase/client';

export type MediaProvider = 'supabase';

export type UploadOptions = {
  folder?: string;
  teamId?: string | null;
  bucket?: string;
  fileName?: string;
  maxWidth?: number;
  maxHeight?: number;
  maxBytes?: number;
  quality?: number;
};

const DEFAULT_BUCKET = 'produtos';
const DEFAULT_MAX_BYTES = 3 * 1024 * 1024; // 3MB
const DEFAULT_MAX_DIM = 1280;
const DEFAULT_QUALITY = 0.85;

export const getMediaUrl = (keyOrUrl: string, bucket: string = DEFAULT_BUCKET): string => {
  if (!keyOrUrl) return '';
  if (/^https?:\/\//i.test(keyOrUrl)) return keyOrUrl;
  const { data } = supabase.storage.from(bucket).getPublicUrl(keyOrUrl);
  return data?.publicUrl || keyOrUrl;
};

export const uploadMedia = async (
  file: File,
  opts: UploadOptions = {}
): Promise<{ url: string; key: string }> => {
  const bucket = opts.bucket || DEFAULT_BUCKET;
  const folderRoot = opts.teamId ? `teams/${opts.teamId}` : 'public';
  const folder = opts.folder ? `${folderRoot}/${opts.folder}` : folderRoot;
  const fileExt = file.name.split('.').pop() || 'jpg';
  const nameBase = opts.fileName || `${Math.random().toString(36).slice(2)}_${Date.now()}`;
  const key = `${folder}/${nameBase}.${fileExt.toLowerCase()}`;

  const processed = await resizeAndCompressImage(file, {
    maxWidth: opts.maxWidth ?? DEFAULT_MAX_DIM,
    maxHeight: opts.maxHeight ?? DEFAULT_MAX_DIM,
    quality: opts.quality ?? DEFAULT_QUALITY,
    maxBytes: opts.maxBytes ?? DEFAULT_MAX_BYTES,
  });

  const { error } = await supabase.storage.from(bucket).upload(key, processed, {
    upsert: false,
    contentType: 'image/jpeg',
  });
  if (error) throw error;

  const url = getMediaUrl(key, bucket);
  return { url, key };
};

export const resizeAndCompressImage = async (
  file: File,
  opts: { maxWidth: number; maxHeight: number; quality: number; maxBytes: number }
): Promise<Blob> => {
  const img = await readImage(file);
  const { width, height } = fitContain(img.width, img.height, opts.maxWidth, opts.maxHeight);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');
  ctx.drawImage(img, 0, 0, width, height);

  let quality = opts.quality;
  let blob = await toBlob(canvas, quality);
  let rounds = 0;
  while (blob.size > opts.maxBytes && quality > 0.4 && rounds < 5) {
    quality -= 0.1;
    blob = await toBlob(canvas, quality);
    rounds += 1;
  }
  if (blob.size > opts.maxBytes) {
    throw new Error('Imagem excede o limite após compressão');
  }
  return blob;
};

const fitContain = (srcW: number, srcH: number, maxW: number, maxH: number) => {
  const ratio = Math.min(maxW / srcW, maxH / srcH, 1);
  return { width: Math.round(srcW * ratio), height: Math.round(srcH * ratio) };
};

const readImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = String(reader.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const toBlob = (canvas: HTMLCanvasElement, quality: number): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error('Falha ao gerar blob'));
        resolve(blob);
      },
      'image/jpeg',
      quality
    );
  });
