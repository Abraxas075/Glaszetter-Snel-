import { Platform } from 'react-native';
import { apiRequest } from './client';
import type { PickedPhoto } from './photos';
export type EmergencyStatus = 'open' | 'in_progress' | 'resolved';
export interface EmergencyAlert { id: string; revision: string; title: string; description: string; address: string; phone: string; status: EmergencyStatus; assignedUserId: string | null; assignedUserName: string | null; createdAt: string; updatedAt: string; }
export interface EmergencyPhoto { id: string; filename: string; contentType: string; createdAt: string; }
export interface Assignee { id: string; name: string; }
export interface EmergencyDraft { title: string; description: string; address: string; phone: string; assignedUserId: string | null; }
export const newClientId = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const n=Math.floor(Math.random()*16);return (c==='x'?n:(n&3)|8).toString(16); });
export const listEmergencyAlerts = (token: string) => apiRequest<EmergencyAlert[]>('/emergency-alerts',{token});
export const listAssignees = (token: string) => apiRequest<Assignee[]>('/emergency-alerts/assignees',{token});
export const createEmergencyAlert = (token: string, draft: EmergencyDraft, id: string) => apiRequest<EmergencyAlert>('/emergency-alerts',{token,method:'POST',body:JSON.stringify({...draft,id})});
export const changeEmergencyAlert = (token: string, alert: EmergencyAlert, patch: {status?:EmergencyStatus;assignedUserId?:string|null}) => apiRequest<EmergencyAlert>(`/emergency-alerts/${alert.id}`,{token,method:'PATCH',body:JSON.stringify({...patch,revision:alert.revision})});
export const listEmergencyPhotos = (token: string, id: string) => apiRequest<EmergencyPhoto[]>(`/emergency-alerts/${id}/photos`,{token});
export const photoSource = (token: string, alertId: string, photoId: string) => ({uri:`${process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'}/emergency-alerts/${alertId}/photos/${photoId}`,headers:{Authorization:`Bearer ${token}`}});
export async function uploadEmergencyPhoto(token: string, alertId: string, photo: PickedPhoto & {id:string}) {
 const body=new FormData();body.append('photoId',photo.id);
 if (Platform.OS==='web') body.append('photo',await(await fetch(photo.uri)).blob(),photo.fileName);
 else body.append('photo',{uri:photo.uri,name:photo.fileName,type:photo.mimeType} as unknown as Blob);
 return apiRequest<EmergencyPhoto>(`/emergency-alerts/${alertId}/photos`,{token,method:'POST',body});
}
