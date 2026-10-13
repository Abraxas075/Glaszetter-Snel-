import { useEffect, useRef, useState } from 'react';
import { Alert, Image, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { Redirect, useNavigation, useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { SapphireScreen, sapphireStyles as s } from '../components/SapphireScreen';
import { GlassPanel } from '../components/GlassPanel';
import { sapphire } from '../constants/sapphire';
import { useVoiceCapture } from '../hooks/useVoiceCapture';
import { pickPhotoFromLibrary, takePhotoWithCamera } from '../hooks/usePhotoPicker';
import type { PickedPhoto } from '../api/photos';
import { createEmergencyAlert, listAssignees, newClientId, uploadEmergencyPhoto, type Assignee, type EmergencyAlert, type EmergencyDraft } from '../api/emergencyAlerts';
const empty = (): EmergencyDraft => ({title:'',description:'',address:'',phone:'',assignedUserId:null});
export function NewEmergencyAlertScreen() {
 const {user,token}=useAuth();const router=useRouter();const navigation=useNavigation();const voice=useVoiceCapture();
 const [draft,setDraft]=useState<EmergencyDraft>(empty);const [members,setMembers]=useState<Assignee[]>([]);const [memberError,setMemberError]=useState(false);
 const [photos,setPhotos]=useState<(PickedPhoto&{id:string})[]>([]);const [busy,setBusy]=useState(false);const [picking,setPicking]=useState(false);const [error,setError]=useState('');
 const [saved,setSaved]=useState<EmergencyAlert|null>(null);const savedRef=useRef<EmergencyAlert|null>(null);const saveLock=useRef(false);const bypass=useRef(false);const creationId=useRef(newClientId());
 const dirty=!!draft.title||!!draft.description||!!draft.address||!!draft.phone||!!draft.assignedUserId||photos.length>0||!!voice.transcript;
 useEffect(()=>{let active=true;if(token)listAssignees(token).then(m=>{if(active){setMembers(m);setMemberError(false);}}).catch(()=>{if(active)setMemberError(true);});return()=>{active=false;};},[token]);
 useEffect(()=>navigation.addListener('beforeRemove',event=>{
  if(bypass.current||!dirty)return;event.preventDefault();
  if(saveLock.current){setError('Wacht tot het opslaan klaar is.');return;}
  const leave=()=>{bypass.current=true;voice.stop();navigation.dispatch(event.data.action);};
  const message=savedRef.current?'De melding is online opgeslagen, maar geselecteerde foto’s kunnen nog niet zijn geüpload. Dit scherm sluiten?':'Je invoer en geselecteerde foto’s zijn nog niet opgeslagen. Dit scherm sluiten?';
  if(Platform.OS==='web'){if(window.confirm(message))leave();}
  else Alert.alert('Scherm sluiten?',message,[{text:'Blijven',style:'cancel'},{text:'Sluiten',onPress:leave}]);
 }),[navigation,dirty,voice.stop]);
 async function pick(camera:boolean){if(busy||picking)return;setPicking(true);setError('');try{const p=await(camera?takePhotoWithCamera():pickPhotoFromLibrary());if(p)setPhotos(current=>[...current,{...p,id:newClientId()}]);}catch{setError('Foto kiezen is mislukt. Probeer opnieuw.');}finally{setPicking(false);}}
 async function save(){
  if(!token||saveLock.current)return;if(!draft.title.trim()){setError('Vul een titel in.');return;}
  saveLock.current=true;setBusy(true);setError('');voice.stop();
  try{
   const alert=savedRef.current??await createEmergencyAlert(token,draft,creationId.current);savedRef.current=alert;setSaved(alert);
   const failed:typeof photos=[];
   for(const photo of photos){try{await uploadEmergencyPhoto(token,alert.id,photo);}catch{failed.push(photo);}}
   setPhotos(failed);
   if(failed.length){setError(`Melding online opgeslagen. ${failed.length} foto('s) niet geüpload. Je kunt de foto’s opnieuw uploaden.`);return;}
   bypass.current=true;router.replace('/spoed');
  }catch(e){setError(e instanceof Error?e.message:'Opslaan mislukt. Je invoer blijft staan.');}
  finally{saveLock.current=false;setBusy(false);}
 }
 const input={backgroundColor:sapphire.background,color:sapphire.text,borderWidth:1,borderColor:sapphire.edge,padding:12,minHeight:48};
 if(!user)return <Redirect href="/login"/>;
 if(user.role==='external')return <SapphireScreen title="Nieuwe spoedmelding"><Text style={s.text}>Alleen medewerkers kunnen spoedmeldingen registreren.</Text></SapphireScreen>;
 return <SapphireScreen title="Nieuwe spoedmelding">
  <GlassPanel tone="urgent" style={s.card}>
   {saved&&<Text style={s.muted}>Melding online opgeslagen. Upload de resterende foto’s hieronder.</Text>}
   {(['title','description','address','phone'] as const).map(key=><View key={key} style={{gap:6}}><Text style={s.text}>{({title:'Titel *',description:'Omschrijving',address:'Adres',phone:'Telefoonnummer'})[key]}</Text><TextInput accessibilityLabel={({title:'Titel',description:'Omschrijving',address:'Adres',phone:'Telefoonnummer'})[key]} style={[input,key==='description'&&{minHeight:110,textAlignVertical:'top'}]} multiline={key==='description'} keyboardType={key==='phone'?'phone-pad':'default'} maxLength={key==='title'?120:key==='description'?2000:key==='address'?300:60} editable={!busy&&!saved} value={draft[key]} onChangeText={v=>setDraft(current=>({...current,[key]:v}))}/></View>)}
   {!saved&&<View style={{gap:8}}>
    <Pressable accessibilityRole="button" disabled={busy} style={s.action} onPress={()=>{if(voice.isListening)voice.stop();else void voice.start().catch(()=>setError('Spraak starten is mislukt.'));}}><Text style={s.actionText}>{voice.isListening?'Stop spraakinvoer':'🎙 Omschrijving inspreken'}</Text></Pressable>
    {voice.error&&<Text style={s.muted}>{voice.error}</Text>}
    {!!voice.transcript&&<><Text style={s.text}>{voice.transcript}</Text><Pressable accessibilityRole="button" disabled={voice.isListening||busy} style={s.action} onPress={()=>{const combined=[draft.description.trim(),voice.transcript.trim()].filter(Boolean).join('\n');if(combined.length>2000){setError('De omschrijving mag maximaal 2000 tekens bevatten. Kort je tekst eerst in.');return;}setDraft(current=>({...current,description:combined}));voice.reset();}}><Text style={s.actionText}>Spraak aan omschrijving toevoegen</Text></Pressable></>}
   </View>}
   <Text style={s.text}>Toewijzen aan medewerker</Text>
   {memberError&&<Text style={s.muted}>Medewerkers konden niet worden geladen. Je kunt de melding zonder toewijzing opslaan.</Text>}
   {!saved&&[{id:'',name:'Niet toegewezen'},...members].map(member=><Pressable key={member.id} accessibilityRole="radio" accessibilityState={{checked:(draft.assignedUserId||'')===member.id}} disabled={busy} style={[s.action,{backgroundColor:(draft.assignedUserId||'')===member.id?sapphire.red:sapphire.glass}]} onPress={()=>setDraft(current=>({...current,assignedUserId:member.id||null}))}><Text style={s.actionText}>{member.name}</Text></Pressable>)}
   {saved&&<Text style={s.muted}>{saved.assignedUserName||'Niet toegewezen'}</Text>}
   <Text style={s.text}>Foto’s (JPG of PNG, maximaal 15 MiB per foto)</Text>
   <View style={{gap:8}}><Pressable accessibilityRole="button" disabled={busy||picking||photos.length>=10} style={s.action} onPress={()=>void pick(true)}><Text style={s.actionText}>Foto maken</Text></Pressable><Pressable accessibilityRole="button" disabled={busy||picking||photos.length>=10} style={s.action} onPress={()=>void pick(false)}><Text style={s.actionText}>Foto uit galerij</Text></Pressable></View>
   {photos.map(photo=><View key={photo.id}><Image source={{uri:photo.uri}} style={{width:'100%',height:180}} resizeMode="contain"/><Text style={s.muted}>{photo.fileName}</Text><Pressable accessibilityRole="button" disabled={busy} style={s.action} onPress={()=>setPhotos(current=>current.filter(p=>p.id!==photo.id))}><Text style={s.actionText}>Selectie verwijderen</Text></Pressable></View>)}
   {!!error&&<Text accessibilityRole="alert" style={s.text}>{error}</Text>}
   <Pressable accessibilityRole="button" disabled={busy||picking||voice.isListening} style={[s.action,{backgroundColor:sapphire.red}]} onPress={()=>void save()}><Text style={s.actionText}>{busy?'Opslaan…':saved?'Foto’s opnieuw uploaden':'Melding opslaan'}</Text></Pressable>
   <Pressable accessibilityRole="button" disabled={busy} style={s.action} onPress={()=>router.back()}><Text style={s.actionText}>Sluiten</Text></Pressable>
  </GlassPanel>
 </SapphireScreen>;
}
