import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Linking, Pressable, Text, View } from 'react-native';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { GlassPanel } from '../components/GlassPanel';
import { SapphireScreen, useSapphireStyles } from '../components/SapphireScreen';
import { useSapphire } from '../contexts/ThemeContext';
import { changeEmergencyAlert, listAssignees, listEmergencyAlerts, listEmergencyPhotos, photoSource, type Assignee, type EmergencyAlert, type EmergencyPhoto, type EmergencyStatus } from '../api/emergencyAlerts';
const labels: Record<EmergencyStatus,string>={open:'Nieuw',in_progress:'In behandeling',resolved:'Afgerond'};
export function EmergencyAlertsScreen() {
  const sapphire = useSapphire();
  const s = useSapphireStyles();

 const {user,token}=useAuth();const router=useRouter();
 const [alerts,setAlerts]=useState<EmergencyAlert[]>([]);const [members,setMembers]=useState<Assignee[]>([]);
 const [filter,setFilter]=useState<EmergencyStatus>('open');const [busy,setBusy]=useState(true);const [error,setError]=useState('');
 const [reload,setReload]=useState(0);const [changing,setChanging]=useState(false);const [assigning,setAssigning]=useState<string|null>(null);
 const [photos,setPhotos]=useState<Record<string,EmergencyPhoto[]>>({});const [photoBusy,setPhotoBusy]=useState<string|null>(null);
 useFocusEffect(useCallback(()=>{let active=true;if(!token)return;setBusy(true);setError('');setPhotos({});Promise.all([listEmergencyAlerts(token),listAssignees(token)]).then(([a,m])=>{if(active){setAlerts(a);setMembers(m);}}).catch(()=>{if(active)setError('Spoedmeldingen laden mislukt.');}).finally(()=>{if(active)setBusy(false);});return()=>{active=false;};},[token,reload]));
 async function change(alert:EmergencyAlert, patch:{status?:EmergencyStatus;assignedUserId?:string|null}) {
  if(!token||changing)return;setChanging(true);setError('');
  try {const saved=await changeEmergencyAlert(token,alert,patch);setAlerts(current=>current.map(a=>a.id===saved.id?saved:a));setAssigning(null);}catch(e){setError(e instanceof Error?e.message:'Wijzigen mislukt.');}finally{setChanging(false);}
 }
 async function loadPhotos(alertId:string) {if(!token)return;setPhotoBusy(alertId);try{const p=await listEmergencyPhotos(token,alertId);setPhotos(current=>({...current,[alertId]:p}));}catch{setError('Foto’s laden mislukt. Probeer opnieuw.');}finally{setPhotoBusy(null);}}
 async function open(url:string){try{await Linking.openURL(url);}catch{setError('Bellen of route openen is op dit toestel niet beschikbaar.');}}
 if(!user)return <Redirect href="/login"/>;
 if(user.role==='external')return <SapphireScreen title="Spoedmeldingen"><Text style={s.text}>Dit overzicht is beschikbaar voor medewerkers.</Text></SapphireScreen>;
 return <SapphireScreen title="Spoedmeldingen">
  <Text style={s.muted}>Meldingen registreren en de afhandeling volgen.</Text>
  <Pressable accessibilityRole="button" style={[s.action,{backgroundColor:sapphire.red,marginVertical:16}]} onPress={()=>router.push('/spoed/new')}><Text style={[s.actionText,{color:sapphire.onAccent}]}>＋ Nieuwe spoedmelding</Text></Pressable>
  <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:16}}>{(Object.keys(labels) as EmergencyStatus[]).map(status=><Pressable key={status} accessibilityRole="button" accessibilityState={{selected:filter===status}} onPress={()=>setFilter(status)} style={{borderWidth:1,borderColor:filter===status?sapphire.red:sapphire.edge,padding:12,minHeight:44}}><Text style={s.text}>{labels[status]} {busy||error?'—':alerts.filter(a=>a.status===status).length}</Text></Pressable>)}</View>
  {error!==''&&<View><Text accessibilityRole="alert" style={s.text}>{error}</Text><Pressable accessibilityRole="button" style={s.action} onPress={()=>setReload(n=>n+1)}><Text style={s.actionText}>Opnieuw laden</Text></Pressable></View>}
  {busy&&<ActivityIndicator color={sapphire.blue}/>}
  {!busy&&!error&&alerts.filter(a=>a.status===filter).length===0&&<Text style={s.muted}>Geen meldingen met status ‘{labels[filter]}’.</Text>}
  {!busy&&alerts.filter(a=>a.status===filter).map(alert=><GlassPanel key={alert.id} tone="urgent" style={s.card}>
   <Text style={s.title}>{alert.title}</Text><Text style={s.muted}>{labels[alert.status]} • {new Date(alert.createdAt).toLocaleString('nl-NL',{timeZone:'Europe/Amsterdam'})}</Text>
   <Text style={s.text}>{alert.description}</Text><Text style={s.text}>{alert.address}</Text><Text style={s.muted}>Medewerker: {alert.assignedUserName||'Niet toegewezen'}</Text>
   <View style={{gap:8}}>
    {alert.phone&&<Pressable accessibilityRole="button" style={s.action} onPress={()=>void open(`tel:${alert.phone.replace(/[^+0-9]/g,'')}`)}><Text style={s.actionText}>Bellen</Text></Pressable>}
    {alert.address&&<Pressable accessibilityRole="button" style={s.action} onPress={()=>void open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(alert.address)}`)}><Text style={s.actionText}>Route</Text></Pressable>}
    <Pressable accessibilityRole="button" disabled={changing} style={[s.action,{backgroundColor:sapphire.red}]} onPress={()=>void change(alert,{status:alert.status==='open'?'in_progress':alert.status==='in_progress'?'resolved':'open'})}><Text style={[s.actionText,{color:sapphire.onAccent}]}>{alert.status==='open'?'In behandeling nemen':alert.status==='in_progress'?'Afronden':'Heropenen'}</Text></Pressable>
    <Pressable accessibilityRole="button" disabled={changing} style={s.action} onPress={()=>setAssigning(assigning===alert.id?null:alert.id)}><Text style={s.actionText}>Medewerker wijzigen</Text></Pressable>
    {assigning===alert.id&&[ {id:'',name:'Niet toegewezen'},...members].map(m=><Pressable key={m.id} accessibilityRole="button" disabled={changing} style={s.action} onPress={()=>void change(alert,{assignedUserId:m.id||null})}><Text style={s.actionText}>{m.name}</Text></Pressable>)}
    <Pressable accessibilityRole="button" disabled={photoBusy!==null} style={s.action} onPress={()=>void loadPhotos(alert.id)}><Text style={s.actionText}>{photoBusy===alert.id?'Foto’s laden…':'Foto’s bekijken'}</Text></Pressable>
    {photos[alert.id]?.length===0&&<Text style={s.muted}>Geen foto’s bij deze melding.</Text>}
    {photos[alert.id]?.map(p=><View key={p.id}><Image source={photoSource(token!,alert.id,p.id)} style={{width:'100%',height:220}} resizeMode="contain" onError={()=>setError('Een foto kon niet worden geladen. Probeer opnieuw.')}/><Text style={s.muted}>{p.filename}</Text></View>)}
   </View>
  </GlassPanel>)}
 </SapphireScreen>;
}
