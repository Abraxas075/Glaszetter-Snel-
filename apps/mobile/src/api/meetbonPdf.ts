import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export async function shareMeetbonPdf(jobId: string, token: string): Promise<void> {
  const url = `${API_BASE_URL}/jobs/${encodeURIComponent(jobId)}/meetbon/pdf`;
  if (Platform.OS === 'web') {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error('PDF downloaden is mislukt.');
    const objectUrl = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = objectUrl; link.download = 'Meetbon.pdf';
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    return;
  }
  if (!FileSystem.cacheDirectory || !(await Sharing.isAvailableAsync())) {
    throw new Error('PDF delen is op dit toestel niet beschikbaar. Gebruik de webapp.');
  }
  const directory = `${FileSystem.cacheDirectory}meetbon-pdfs/`;
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  const oldFiles = await FileSystem.readDirectoryAsync(directory);
  await Promise.all(oldFiles.filter(name => /^Meetbon-\d+\.pdf$/.test(name) && Number(name.slice(8, -4)) < Date.now() - 86400000)
    .map(name => FileSystem.deleteAsync(`${directory}${name}`, { idempotent: true }).catch(() => {})));
  const uri = `${directory}Meetbon-${Date.now()}.pdf`;
  let shared = false;
  try {
    const result = await FileSystem.downloadAsync(url, uri, { headers: { Authorization: `Bearer ${token}` } });
    if (result.status !== 200) throw new Error('PDF downloaden is mislukt.');
    await Sharing.shareAsync(result.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Meetbon opslaan of delen' });
    shared = true;
  } finally {
    // Android can resolve the chooser before the recipient reads its URI.
    // Keep successful exports in cache; remove stale ones on the next export.
    if (!shared) await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
  }
}
