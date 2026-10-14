import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
const errorMessage = (status: number) => status === 422 ? 'Sla eerst een meetbon met ruiten op bij deze klus.' : 'Bestelbon downloaden is mislukt. Probeer opnieuw.';
export async function shareOrderPdf(jobId: string, token: string): Promise<void> {
  const url = `${API_BASE_URL}/jobs/${encodeURIComponent(jobId)}/order/pdf`;
  if (Platform.OS === 'web') {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error(errorMessage(response.status));
    if (!response.headers.get('Content-Type')?.includes('application/pdf')) throw new Error('De server heeft geen PDF teruggegeven.');
    const objectUrl = URL.createObjectURL(await response.blob()), link = document.createElement('a');
    link.href = objectUrl; link.download = 'Bestelbon.pdf'; document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60000); return;
  }
  if (!FileSystem.cacheDirectory || !(await Sharing.isAvailableAsync())) throw new Error('PDF delen is op dit toestel niet beschikbaar. Gebruik de website.');
  const directory = `${FileSystem.cacheDirectory}bestelbon-pdfs/`;
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  const oldFiles = await FileSystem.readDirectoryAsync(directory);
  await Promise.all(oldFiles.filter(name => /^Bestelbon-\d+\.pdf$/.test(name) && Number(name.slice(9, -4)) < Date.now() - 86400000).map(name => FileSystem.deleteAsync(`${directory}${name}`, { idempotent: true }).catch(() => {})));
  const uri = `${directory}Bestelbon-${Date.now()}.pdf`; let shared = false;
  try {
    const result = await FileSystem.downloadAsync(url, uri, { headers: { Authorization: `Bearer ${token}` } });
    if (result.status !== 200) throw new Error(errorMessage(result.status));
    const contentType = Object.entries(result.headers).find(([name]) => name.toLowerCase() === 'content-type')?.[1];
    if (!contentType?.includes('application/pdf')) throw new Error('De server heeft geen PDF teruggegeven.');
    await Sharing.shareAsync(result.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Bestelbon opslaan of delen' });
    shared = true;
  } finally {
    // Keep successful exports while Android recipients read their shared URI.
    if (!shared) await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
  }
}
