import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { API_URL, tokenStore } from '@/api/client';

export interface PickedImage {
  uri: string;
  fileName: string;
  mimeType: string;
}

/**
 * გალერეიდან სურათის არჩევა კვადრატულ ჩარჩოში.
 *
 * ავატარები ყოველთვის წრეშია, ამიტომ 1:1 კადრირებას თავად ვთხოვთ —
 * წინააღმდეგ შემთხვევაში წრეში მოხვედრილი ნაწილი შემთხვევითი იქნებოდა.
 */
export class PermissionDeniedError extends Error {
  constructor() {
    super('permission-denied');
    this.name = 'PermissionDeniedError';
  }
}

export async function pickImage(): Promise<PickedImage | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  // ჩუმად null-ის დაბრუნება ბაგად აღიქმებოდა — მომხმარებელი აჭერდა
  // და არაფერი ხდებოდა. უარყოფა ცალკე შეცდომაა.
  if (!permission.granted) throw new PermissionDeniedError();

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    // 0.8 — ხარისხსა და ატვირთვის დროს შორის გონივრული ბალანსი
    quality: 0.8,
  });

  if (result.canceled || !result.assets.length) return null;

  const asset = result.assets[0];
  const extension = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg';

  return {
    uri: asset.uri,
    fileName: asset.fileName ?? `avatar.${extension}`,
    mimeType: asset.mimeType ?? `image/${extension === 'jpg' ? 'jpeg' : extension}`,
  };
}

/**
 * ატვირთვა და საჯარო URL-ის დაბრუნება.
 *
 * `fetch` + `FormData` განზრახ არ გამოიყენება: React Native-ის ახალ
 * არქიტექტურაში ფაილის `{uri, name, type}` ობიექტი FormData-ში აღარ
 * მუშაობს და „unsupported FormData" შეცდომას აგდებს.
 *
 * `uploadAsync` ფაილს პირდაპირ დისკიდან კითხულობს და multipart მოთხოვნას
 * ნატიურად აწყობს — JS-ში ფაილის გატარება საერთოდ არ ხდება.
 */
export async function uploadAvatar(image: PickedImage): Promise<string> {
  const token = await tokenStore.access();

  const result = await FileSystem.uploadAsync(`${API_URL}/media/avatar`, image.uri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: 'file',
    mimeType: image.mimeType,
    parameters: { filename: image.fileName },
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (result.status < 200 || result.status >= 300) {
    const payload = safeParse(result.body);
    throw new Error(payload?.message ?? 'ფოტოს ატვირთვა ვერ მოხერხდა');
  }

  const payload = safeParse(result.body);
  if (!payload?.url) throw new Error('სერვერმა სურათის მისამართი არ დააბრუნა');

  return payload.url;
}

function safeParse(body: string): { url?: string; message?: string } | null {
  try {
    return JSON.parse(body) as { url?: string; message?: string };
  } catch {
    return null;
  }
}


export interface PickedVideo {
  uri: string;
  fileName: string;
  mimeType: string;
}

/** ვიდეოს არჩევა გალერეიდან — კადრირების გარეშე. */
export async function pickVideo(): Promise<PickedVideo | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new PermissionDeniedError();

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['videos'],
    // quality აქ არ გამოიყენება — ვიდეოს ხელახლა კოდირება ატვირთვას
    // მნიშვნელოვნად ანელებს
    allowsEditing: false,
  });

  if (result.canceled || !result.assets.length) return null;

  const asset = result.assets[0];
  const extension = asset.uri.split('.').pop()?.toLowerCase() ?? 'mp4';

  return {
    uri: asset.uri,
    fileName: asset.fileName ?? `video.${extension}`,
    mimeType: asset.mimeType ?? `video/${extension}`,
  };
}

/** ვიდეოს ატვირთვა — აბრუნებს შექმნილი Video ჩანაწერის id-ს. */
export async function uploadVideo(video: PickedVideo, title: string): Promise<string> {
  const token = await tokenStore.access();

  const result = await FileSystem.uploadAsync(`${API_URL}/media/video`, video.uri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: 'file',
    mimeType: video.mimeType,
    parameters: { filename: video.fileName, title },
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (result.status < 200 || result.status >= 300) {
    const payload = safeParse(result.body) as { message?: string } | null;
    throw new Error(payload?.message ?? 'ვიდეოს ატვირთვა ვერ მოხერხდა');
  }

  const payload = safeParse(result.body) as { videoId?: string } | null;
  if (!payload?.videoId) throw new Error('სერვერმა ვიდეოს id არ დააბრუნა');

  return payload.videoId;
}
