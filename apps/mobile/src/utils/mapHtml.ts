import type { MapPoint } from '@glaszetter/shared';
export function nativeMapHtml(points: MapPoint[]) {
  const data = JSON.stringify(
    points.map((point) => ({
      location: point.location,
      jobs: point.jobs.map(({ job }) => ({ id: job.id, name: job.name })),
      suppliers: (point.suppliers ?? []).map((s) => ({ name: s.name })),
    }))
  )
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  return `<!doctype html><html lang="nl"><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=5"><meta name="referrer" content="strict-origin-when-cross-origin"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="anonymous"><style>html,body,#map{height:100%;margin:0}body{font-family:Arial;color:#172b43}button{min-height:44px;color:#075da4;background:white;border:1px solid #075da4;margin:4px;padding:8px}.leaflet-popup-content{max-height:220px;overflow:auto}</style></head><body><div id="map" role="region" aria-label="Kaart met klussen en leveranciers"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin="anonymous" onerror="window.ReactNativeWebView.postMessage(JSON.stringify({type:'error'}))"></script><script>
 const points=${data};
 if(typeof L!=='undefined'){
 const map=L.map('map').setView([52.4,4.85],10);
 L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,referrerPolicy:'strict-origin-when-cross-origin',attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).on('tileerror',()=>window.ReactNativeWebView.postMessage(JSON.stringify({type:'error'}))).addTo(map);
 const group=L.featureGroup().addTo(map);
 points.forEach(point=>{const node=document.createElement('div');const title=document.createElement('strong');title.textContent=point.location.label;node.append(title);if(point.location.precision==='straat'){const note=document.createElement('p');note.textContent='Straatniveau';node.append(note);}
 point.jobs.forEach(job=>{const button=document.createElement('button');button.textContent=job.name;button.onclick=()=>window.ReactNativeWebView.postMessage(JSON.stringify({type:'job',id:job.id}));node.append(document.createElement('br'),button);});
 point.suppliers.forEach(supplier=>{const p=document.createElement('p');p.textContent='Leverancier: '+supplier.name;node.append(p);});
 L.circleMarker([point.location.lat,point.location.lon],{radius:10,color:'#075da4',fillColor:point.suppliers.length?(point.jobs.length?'#8051d4':'#19824a'):point.jobs.length>1?'#E30613':'#00A0E6',fillOpacity:0.9}).bindPopup(node).addTo(group);});
 if(points.length)map.fitBounds(group.getBounds(),{padding:[25,25],maxZoom:15});
 }
 </script></body></html>`;
}

export function mapJobMessage(raw: string, allowedIds: string[]): string | null {
  if (raw.length > 4096) return null;
  try {
    const message = JSON.parse(raw);
    return message?.type === 'job' &&
      typeof message.id === 'string' &&
      allowedIds.includes(message.id)
      ? message.id
      : null;
  } catch {
    return null;
  }
}
