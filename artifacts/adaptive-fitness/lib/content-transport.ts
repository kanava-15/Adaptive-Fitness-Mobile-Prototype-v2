import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import { CONTENT_LIMITS, utf8Size } from '@workspace/activity-catalog';

function checkedText(text: string): string {
  if (utf8Size(text) > CONTENT_LIMITS.bytes) throw new Error('Input exceeds 2 MiB. Choose a smaller JSON file.');
  if (text.includes('\uFFFD') || text.includes('\u0000')) throw new Error('Invalid text encoding. Choose a UTF-8 JSON file.');
  return text;
}
export async function pickContentFile(): Promise<string | null> {
  // expo-document-picker supplies the web File without remote URL access.
  const result = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain'], copyToCacheDirectory: true, multiple: false, base64: false });
  if (result.canceled) return null;
  const asset = result.assets[0];
  // Some browsers dispatch change with an empty FileList rather than cancel.
  if (!asset) return null;
  if (Platform.OS === 'web') {
    if (!asset.file) throw new Error('This browser did not return a readable file. Paste JSON instead.');
    try {
      if ((asset.size ?? 0) > CONTENT_LIMITS.bytes) throw new Error('File exceeds 2 MiB. Choose a smaller JSON file.');
      const buffer = await asset.file.arrayBuffer();
      return checkedText(new TextDecoder('utf-8', { fatal: true }).decode(buffer));
    }
    catch (error) {
      if (error instanceof TypeError) throw new Error('Invalid text encoding. Choose a UTF-8 JSON file.');
      throw error;
    }
    finally { if (asset.uri.startsWith('blob:')) URL.revokeObjectURL(asset.uri); }
  }
  const file = new File(asset.uri);
  try {
    if ((asset.size ?? 0) > CONTENT_LIMITS.bytes || file.size > CONTENT_LIMITS.bytes) throw new Error('File exceeds 2 MiB. Choose a smaller JSON file.');
    return checkedText(await file.text());
  } finally {
    // Only the copied cache file, never the user's original document.
    if (file.uri.startsWith(Paths.cache.uri) && file.exists) file.delete();
  }
}
export async function shareContentFile(json: string, filename = 'svasthic-content.json'): Promise<void> {
  checkedText(json);
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '-');
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = safeName; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  if (!await Sharing.isAvailableAsync()) throw new Error('File sharing is unavailable. Copy the JSON instead.');
  const file = new File(Paths.cache, `${Date.now()}-${safeName}`);
  try {
    file.write(json);
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Share selected fitness content' });
  } finally { if (file.exists) file.delete(); }
}
export async function copyText(text: string): Promise<void> {
  if (!await Clipboard.setStringAsync(text)) throw new Error('Clipboard is unavailable. Select and copy the JSON manually.');
}
