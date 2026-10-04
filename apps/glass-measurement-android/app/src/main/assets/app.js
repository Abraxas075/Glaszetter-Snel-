const STORE='glaszetter_snel_projects_v1';
let projects=[],storageReady=true;
const failedDraftProjects=new Set();
try { projects=JSON.parse(localStorage.getItem(STORE)||'[]');if(!Array.isArray(projects))throw new Error('Ongeldige projectopslag'); } catch { storageReady=false;alert('Projecten konden niet worden geladen. Heropen de app; sla nu niets op.'); }

let currentProjectId=null;
const $=id=>document.getElementById(id);
const save=()=>{if(!storageReady)throw new Error('Opslag kon niet worden geladen');localStorage.setItem(STORE,JSON.stringify(projects));renderAll()};
const fmt=n=>Number(n||0).toLocaleString('nl-NL',{minimumFractionDigits:2,maximumFractionDigits:2});

function showPage(id){document.querySelectorAll('.page').forEach(x=>x.classList.toggle('active',x.id===id));document.querySelectorAll('nav button').forEach(x=>x.classList.toggle('selected',x.dataset.page===id));scrollTo(0,0);if(id==='projects')renderProjects();if(id==='home')renderAll()}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>showPage(b.dataset.page));

function openNewProject(){currentProjectId=null;$('projectTitle').textContent='Nieuw project';$('projectForm').reset();$('editingId').value='';$('paneArea').hidden=true;$('meetbonArea').hidden=true;showPage('project')}
function openProject(id){const p=projects.find(x=>x.id===id);if(!p)return;currentProjectId=id;$('projectTitle').textContent=p.customer;$('customer').value=p.customer;$('address').value=p.address;$('notes').value=p.notes;$('editingId').value=id;$('paneArea').hidden=false;renderPanes(p);renderMeetbon(p);showPage('project')}
$('projectForm').onsubmit=e=>{e.preventDefault();const id=$('editingId').value||Date.now().toString();const old=projects.find(x=>x.id===id);const p={id,customer:$('customer').value.trim(),address:$('address').value.trim(),notes:$('notes').value.trim(),created:old?.created||new Date().toISOString(),panes:old?.panes||[],meetbon:old?.meetbon,meetbonDraft:old?.meetbonDraft};projects=old?projects.map(x=>x.id===id?p:x):[p,...projects];currentProjectId=id;$('editingId').value=id;$('projectTitle').textContent=p.customer;$('paneArea').hidden=false;save();renderPanes(p);renderMeetbon(p)};

function openPaneForm(){if(!currentProjectId)return;$('paneForm').reset();updateSize();showPage('pane')}
function backToProject(){openProject(currentProjectId)}
['width','height','deduction'].forEach(id=>$(id).addEventListener('input',updateSize));
function updateSize(){const w=+$('width').value||0,h=+$('height').value||0,d=+$('deduction').value||0,ow=Math.max(0,w-d),oh=Math.max(0,h-d);$('orderSize').textContent=(ow||'—')+' × '+(oh||'—')+' mm';$('area').textContent=fmt(ow*oh/1e6)+' m²'}
$('paneForm').onsubmit=e=>{e.preventDefault();const p=projects.find(x=>x.id===currentProjectId);if(!p)return;const w=+$('width').value,h=+$('height').value,d=+$('deduction').value;if(w<=d||h<=d){alert('De bestelmaat moet positief zijn. Controleer de maten en aftrek.');return;}p.panes.push({quantity:Number($('quantity').value),id:Date.now().toString(),width:w,height:h,deduction:d,orderWidth:w-d,orderHeight:h-d,glassType:$('glassType').value,composition:$('composition').value.trim(),position:$('position').value.trim()});save();openProject(p.id)};
function deletePane(pid){const p=projects.find(x=>x.id===currentProjectId);if(!p||!confirm('Deze ruit verwijderen?'))return;p.panes=p.panes.filter(x=>x.id!==pid);save();renderPanes(p)}
function deleteProject(id){if(!confirm('Project en alle ruiten verwijderen?'))return;projects=projects.filter(x=>x.id!==id);save();showPage('projects')}

function projectArea(p){return p.panes.reduce((s,x)=>s+(x.quantity||1)*x.orderWidth*x.orderHeight/1e6,0)}
function renderProjects(){const box=$('projectList');box.innerHTML=projects.length?projects.map(p=>`<article class="card" onclick="openProject('${p.id}')"><h3>${esc(p.customer)}</h3><p>${esc(p.address||'Geen adres')}</p><div class="meta"><span>${p.panes.reduce((n,x)=>n+(x.quantity||1),0)} ruit(en) · ${fmt(projectArea(p))} m²</span><button onclick="event.stopPropagation();deleteProject('${p.id}')">Verwijder</button></div></article>`).join(''):'<div class="empty">Nog geen projecten opgeslagen.</div>'}
function renderPanes(p){$('paneList').innerHTML=p.panes.length?p.panes.map(x=>`<article class="card"><h3>${esc(x.position||'Ruit')}</h3><p><b>${x.quantity||1} × ${x.orderWidth} × ${x.orderHeight} mm</b> · ${esc(x.glassType)}</p><p>${esc(x.composition||'Opbouw nog niet ingevuld')} · ${fmt(x.orderWidth*x.orderHeight/1e6)} m²</p><button onclick="deletePane('${x.id}')">Verwijder</button></article>`).join(''):'<div class="empty">Voeg de eerste ruit van dit project toe.</div>'}
function renderAll(){const panes=projects.flatMap(p=>p.panes);$('projectCount').textContent=projects.length;$('paneCount').textContent=panes.reduce((n,x)=>n+(x.quantity||1),0);$('areaTotal').textContent=fmt(panes.reduce((s,x)=>s+(x.quantity||1)*x.orderWidth*x.orderHeight/1e6,0));$('recent').innerHTML=projects.length?projects.slice(0,3).map(p=>`<article class="card" onclick="openProject('${p.id}')"><h3>${esc(p.customer)}</h3><p>${p.panes.reduce((n,x)=>n+(x.quantity||1),0)} ruit(en) · ${fmt(projectArea(p))} m²</p></article>`).join(''):'Nog geen projecten opgeslagen.';renderProjects()}
function esc(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
$('thicknessSlider').oninput=e=>{const v=e.target.value;$('thicknessValue').textContent=v+' mm';$('blueLine').style.left=(38+Math.min(48,v*1.6))+'%'};
renderAll();

function renderMeetbon(p){
  $('meetbonArea').hidden=false;
  const draft=p.meetbonDraft;
  const usableDraft=draft && draft.base===JSON.stringify(p.meetbon||null);
  const d=usableDraft?draft.data:(p.meetbon||{fields:{},checks:{}});
  $('meetbonStatus').textContent=failedDraftProjects.has(p.id)?'Concept bewaren is mislukt. Je invoer blijft in dit scherm; probeer opnieuw op te slaan.':usableDraft?'Concept hersteld. Sla de meetbon op om dit definitief te maken.':draft?'Er is een ouder concept beschikbaar. De nieuwste opgeslagen bon wordt getoond.':'';
  $('meetbonFields').innerHTML=MEETBON_SECTIONS.map(s=>`<fieldset><legend>${esc(s.title)}</legend>${s.fields.map(f=>`<label>${esc(f.label)}<input maxlength="2000" data-field="${f.key}" value="${esc(d.fields[f.key]?? (f.key==='name'?p.customer:f.key==='street'?p.address:''))}"></label>`).join('')}${s.checks.map(c=>`<label style="display:flex;align-items:center;gap:10px"><input style="width:auto" type="checkbox" data-check="${c.key}" ${d.checks[c.key]?'checked':''}>${esc(c.label)}</label>`).join('')}</fieldset>`).join('');
}
function readMeetbonForm(){
  const data={fields:{},checks:{}};
  $('meetbonFields').querySelectorAll('[data-field]').forEach(x=>data.fields[x.dataset.field]=x.value);
  $('meetbonFields').querySelectorAll('[data-check]').forEach(x=>data.checks[x.dataset.check]=x.checked);
  return data;
}
function saveMeetbonDraft(){
  const p=projects.find(x=>x.id===currentProjectId);if(!p)return;
  p.meetbonDraft={base:JSON.stringify(p.meetbon||null),data:readMeetbonForm()};
  try{if(!storageReady)throw new Error('Opslag kon niet worden geladen');localStorage.setItem(STORE,JSON.stringify(projects));failedDraftProjects.delete(p.id);$('meetbonStatus').textContent='Concept automatisch bewaard op dit toestel.';}
  catch{failedDraftProjects.add(p.id);$('meetbonStatus').textContent='Concept bewaren mislukt. Je invoer staat nog in het scherm, maar is niet veilig na afsluiten. Probeer opnieuw op te slaan.';}
}
$('meetbonFields').addEventListener('input',saveMeetbonDraft);
$('meetbonFields').addEventListener('change',saveMeetbonDraft);
$('meetbonForm').onsubmit=e=>{
  e.preventDefault();const p=projects.find(x=>x.id===currentProjectId);if(!p)return;
  const data=readMeetbonForm();
  const previous=p.meetbon,previousDraft=p.meetbonDraft;p.meetbon=data;delete p.meetbonDraft;
  try{save();failedDraftProjects.delete(p.id);$('meetbonStatus').textContent='Meetbon opgeslagen op dit toestel. De glasmaten staan bij Ruiten.';}
  catch{p.meetbon=previous;p.meetbonDraft=previousDraft;$('meetbonStatus').textContent='Opslaan mislukt. Je invoer blijft staan.';}
};
