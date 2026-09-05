const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let DATA=null, engineExpanded=false;
const esc=(v='')=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
const pct=v=>typeof v==='number'?Math.round(v*100):null;
const progressText=p=>typeof p.progress==='number'?`${pct(p.progress)}%`:'—';
const qualityShort=q=>q==='Достаточно данных'?'подтверждено':'недостаточно данных';
function clsStatus(s){if(s==='Выполнено')return'done';if(s==='В работе')return'work';if(s==='Заблокировано')return'blocked';if(s==='Нет подтверждения')return'unconfirmed';return''}
function metric(label,value,sub,accent=false){return `<div class="metric"><div class="label">${esc(label)}</div><div class="value ${accent?'accent':''}">${esc(value)}</div><div class="sub">${sub}</div></div>`}
function renderMetrics(){
  const m=DATA.metrics;
  $('#metrics').innerHTML=[
    metric('Полный реестр',m.totalFull,`${m.totalPublic} проектов показано публично`),
    metric('Активные P0–P1',m.activeP01,'активно или работает'),
    metric('Достаточно данных',m.sufficientData,`${m.totalPublic-m.sufficientData} пока без итогового процента`),
    metric('Средний прогресс',m.averageProgress==null?'—':`${pct(m.averageProgress)}%`,'только проекты с достаточным покрытием',true),
    metric('Общие модули',m.sharedModules,'компонентов для повторного использования'),
    metric('Ручные корректировки',m.manualCorrections, m.manualCorrections?'учтены в расчёте':'пока не внесены')
  ].join('');
}
function renderMap(){
  const map=$('#portfolioMap'); map.querySelectorAll('.map-node,.map-line').forEach(x=>x.remove());
  const entries=Object.entries(DATA.portfolioCounts).sort((a,b)=>b[1]-a[1]);
  const classes=['n1','n2','n3','n4'];
  entries.slice(0,4).forEach(([name,count],i)=>{
    const node=document.createElement('div'); node.className=`map-node ${classes[i]}`;
    const avg=DATA.projects.filter(p=>p.portfolio===name&&typeof p.progress==='number');
    const avgv=avg.length?Math.round(avg.reduce((s,p)=>s+p.progress,0)/avg.length*100):null;
    node.innerHTML=`<div>${esc(name.replace('Клиентские цифровые проекты','Клиентские проекты').replace('ИИ / навыки / платформа','ИИ и навыки').replace('Исследования / инфраструктура','Исследования'))}<em>${count} проектов${avgv!=null?` · ${avgv}%*`:''}</em></div>`;
    node.onclick=()=>{ $('#portfolioFilter').value=name; renderRegistry(); location.hash='registry'; };
    map.appendChild(node);
  });
}
function renderPriorities(){
  const ps=DATA.projects.filter(p=>p.priority==='P0').slice(0,6);
  $('#priorities').innerHTML=ps.map((p,i)=>{
    const w=typeof p.progress==='number'?pct(p.progress):pct(p.coverage)||0;
    return `<div class="priority-row" data-project="${p.id}"><div class="rank">${i+1}</div><div><div class="pname">${esc(p.name)}</div><div class="pmeta">${esc(p.processes.find(x=>x.progress!==1)?.name||p.stage)}</div><div class="progressline ${p.progress==null?'insufficient':''}"><i style="width:${w}%"></i></div></div><div class="percent">${progressText(p)}<small>${p.progress==null?`${pct(p.coverage)}% покрытие`:'прогресс'}</small></div></div>`
  }).join('');
  $$('#priorities [data-project]').forEach(x=>x.onclick=()=>openProject(x.dataset.project));
}
function renderNext(){
  $('#nextActions').innerHTML=DATA.focus.slice(0,6).map(x=>`<div class="next-item" data-project="${x.projectId}"><span class="dot work"></span><div><div class="item-title">${esc(x.project)}</div><div class="item-sub">${esc(x.process)} · ${esc(x.action)} <span class="tag">${esc(x.status)}</span></div></div></div>`).join('');
  $$('#nextActions [data-project]').forEach(x=>x.onclick=()=>openProject(x.dataset.project));
}
function renderFavorites(){
  const ps=DATA.projects.filter(p=>['P0','P1'].includes(p.priority)).slice(0,8);
  $('#favorites').innerHTML=ps.map(p=>`<div class="trow" data-project="${p.id}"><div class="name">${esc(p.name)}</div><span class="prio ${p.priority.toLowerCase()}">${p.priority}</span><div class="mini ${p.progress==null?'missing':''}"><i style="width:${p.progress!=null?pct(p.progress):pct(p.coverage)}%"></i></div><span class="quality">${p.progress!=null?`${pct(p.progress)}%`:`покр. ${pct(p.coverage)}%`}</span></div>`).join('');
  $$('#favorites [data-project]').forEach(x=>x.onclick=()=>openProject(x.dataset.project));
}
function renderStates(){
  const preferred=['Активно','Проектирование','Идея','Исследование','Работает','Приостановлено','Завершено'];
  const max=Math.max(...Object.values(DATA.stateCounts));
  $('#stateBars').innerHTML=preferred.filter(k=>DATA.stateCounts[k]).map(k=>`<div class="statebar"><span>${esc(k)}</span><div class="bar"><i style="width:${DATA.stateCounts[k]/max*100}%"></i></div><b>${DATA.stateCounts[k]}</b></div>`).join('');
}
function renderEngines(){
  const es=engineExpanded?DATA.engines:DATA.engines.slice(0,6);
  $('#engineGrid').innerHTML=es.map(e=>`<div class="engine" title="${esc(e.recommendation)}"><b>${esc(e.name)}</b><span class="maturity">${esc(e.maturity)}</span><span>${esc(e.contains)}</span></div>`).join('');
  $('#toggleEngines').textContent=engineExpanded?'свернуть ↑':'все →';
}
function renderAttention(){
  $('#attentionList').innerHTML=DATA.attention.length?DATA.attention.map(x=>`<div class="attention-item" data-project="${x.projectId}"><span class="dot ${x.kind==='Блокировка'?'block':'missing'}"></span><div><div class="item-title">${esc(x.project)} <span class="tag">${esc(x.kind)}</span></div><div class="item-sub">${esc(x.text)}</div></div></div>`).join(''):`<div class="item-sub">Критических сигналов нет.</div>`;
  $$('#attentionList [data-project]').forEach(x=>x.onclick=()=>openProject(x.dataset.project));
}
function fillFilters(){
  const fill=(id,vals)=>{const s=$(id);[...new Set(vals)].sort().forEach(v=>{let o=document.createElement('option');o.value=v;o.textContent=v;s.appendChild(o)})};
  fill('#portfolioFilter',DATA.projects.map(p=>p.portfolio));
  fill('#statusFilter',DATA.projects.map(p=>p.status));
  fill('#priorityFilter',DATA.projects.map(p=>p.priority));
}
function haystack(p){return [p.name,p.portfolio,p.status,p.stage,p.priority,p.goal,p.nextStep,...p.processes.flatMap(pr=>[pr.name,...pr.actions.flatMap(a=>[a.subprocess,a.action,a.status])])].join(' ').toLowerCase()}
function renderRegistry(){
  const q=$('#globalSearch').value.trim().toLowerCase(),pf=$('#portfolioFilter').value,st=$('#statusFilter').value,pr=$('#priorityFilter').value,qu=$('#qualityFilter').value;
  let ps=DATA.projects.filter(p=>(!q||haystack(p).includes(q))&&(!pf||p.portfolio===pf)&&(!st||p.status===st)&&(!pr||p.priority===pr)&&(!qu||p.quality===qu));
  ps.sort((a,b)=>({P0:0,P1:1,P2:2,P3:3}[a.priority]-{P0:0,P1:1,P2:2,P3:3}[b.priority])||a.name.localeCompare(b.name,'ru'));
  $('#registryCount').textContent=`Показано ${ps.length} из ${DATA.projects.length}. Нажми на проект, чтобы раскрыть процессы и действия.`;
  $('#projectRegistry').innerHTML=ps.map(p=>`<div class="project-card" data-project="${p.id}">
    <div class="pc-top"><b>${esc(p.name)}</b><span class="prio ${p.priority.toLowerCase()}">${p.priority}</span></div>
    <div class="pc-meta"><span>${esc(p.status)}</span><span>•</span><span>${esc(p.stage)}</span></div>
    <div class="pc-prog"><div class="mini ${p.progress==null?'missing':''}"><i style="width:${p.progress!=null?pct(p.progress):pct(p.coverage)}%"></i></div><strong>${p.progress!=null?`${pct(p.progress)}%`:'—'}</strong></div>
    <div class="pc-bottom"><span>Покрытие ${pct(p.coverage)}%</span><span>${p.counts.done}/${p.counts.total} выполнено</span><span>${p.manualCorrections?`ручных правок ${p.manualCorrections}`:qualityShort(p.quality)}</span></div>
  </div>`).join('');
  $$('#projectRegistry [data-project]').forEach(x=>x.onclick=()=>openProject(x.dataset.project));
}
function openProject(id){
  const p=DATA.projects.find(x=>x.id===id);if(!p)return;
  const progress=p.progress!=null?`${pct(p.progress)}%`:'не показывается';
  $('#drawerContent').innerHTML=`
    <h2 class="d-title">${esc(p.name)}</h2>
    <div class="d-meta">${esc(p.portfolio)} · ${esc(p.status)} · ${esc(p.stage)} · ${esc(p.priority)}</div>
    <div class="d-kpis">
      <div class="d-kpi"><span>Итоговый прогресс</span><strong>${progress}</strong></div>
      <div class="d-kpi"><span>Покрытие контрольного списка</span><strong>${pct(p.coverage)}%</strong></div>
      <div class="d-kpi"><span>Выполнено действий</span><strong>${p.counts.done}/${p.counts.total}</strong></div>
      <div class="d-kpi"><span>Ручных корректировок</span><strong>${p.manualCorrections}</strong></div>
    </div>
    <div class="rulebox"><strong>Цель:</strong> ${esc(p.goal||'—')}<br><strong>Следующий шаг:</strong> ${esc(p.nextStep||'—')}<br><strong>Качество оценки:</strong> ${esc(p.quality)}.</div>
    ${p.processes.map((pr,i)=>`<section class="d-section ${i===0?'open':''}">
      <div class="d-sec-head"><div><b>${pr.number}. ${esc(pr.name)}</b><small>Вес ${pr.weight}% · покрытие ${pct(pr.coverage)}% · ${pr.progress!=null?`прогресс ${pct(pr.progress)}%`:'итоговый процент не показывается'}</small></div><span>⌄</span></div>
      <div class="d-sec-body">${pr.actions.map(a=>`<div class="d-action">
        <span class="statusmark ${clsStatus(a.status)}"></span>
        <div><b>${esc(a.subprocess)} — ${esc(a.action)}${a.manualOverride?'<span class="manual-badge">ручная правка</span>':''}</b></div>
        <span class="st">${esc(a.status)}</span>
      </div>`).join('')}</div>
    </section>`).join('')}`;
  $('#drawer').classList.add('open');document.body.style.overflow='hidden';
  $$('#drawerContent .d-sec-head').forEach(h=>h.onclick=()=>h.parentElement.classList.toggle('open'));
}
function closeDrawer(){ $('#drawer').classList.remove('open');document.body.style.overflow=''; }
function normalizeData(raw){
  if(raw.projects) return raw;
  return {
    metrics:raw.m,stateCounts:raw.sc,portfolioCounts:raw.oc,focus:raw.f,attention:raw.a,engines:raw.e,
    projects:raw.p.map(p=>({
      id:p.i,name:p.n,portfolio:p.o,typeModel:p.t,status:p.s,stage:p.g,priority:p.r,goal:p.d,nextStep:p.x,
      counts:{total:p.c[0],done:p.c[1],inProgress:p.c[2],blocked:p.c[3],notStarted:p.c[4],unconfirmed:p.c[5]},
      coverage:p.v,progress:p.p,quality:p.q,manualCorrections:p.m,
      processes:p.z.map(pr=>({
        number:pr[0],name:pr[1],weight:pr[2],
        counts:{total:pr[3][0],done:pr[3][1],inProgress:pr[3][2],blocked:pr[3][3],notStarted:pr[3][4],unconfirmed:pr[3][5]},
        coverage:pr[4],progress:pr[5],quality:pr[6],
        actions:pr[7].map(a=>({code:a[0],subprocess:a[1],action:a[2],weight:a[3],status:a[4],manualOverride:a[5]}))
      }))
    }))
  };
}
async function readCompressedData(){
  if(!('DecompressionStream' in window)) throw new Error('Браузер не поддерживает распаковку данных панели');
  const r=await fetch('./projects.dat',{cache:'no-store'});if(!r.ok)throw new Error('Не удалось загрузить данные панели');
  const b64=(await r.text()).trim();
  const bin=atob(b64), bytes=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
  const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return JSON.parse(await new Response(stream).text());
}
async function boot(){
  DATA=normalizeData(await readCompressedData()); renderMetrics();renderMap();renderPriorities();renderNext();renderFavorites();renderStates();renderEngines();renderAttention();fillFilters();renderRegistry();
  ['#portfolioFilter','#statusFilter','#priorityFilter','#qualityFilter'].forEach(id=>$(id).addEventListener('change',renderRegistry));
  $('#globalSearch').addEventListener('input',renderRegistry);
  $('#toggleEngines').onclick=()=>{engineExpanded=!engineExpanded;renderEngines()};
  $('#openRegistry').onclick=()=>location.hash='registry';
  $$('[data-filter-priority]').forEach(b=>b.onclick=()=>{$('#priorityFilter').value=b.dataset.filterPriority;renderRegistry();location.hash='registry'});
  $('#drawerClose').onclick=closeDrawer;$('#drawerBack').onclick=closeDrawer;document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDrawer()});
}
boot().catch(e=>{document.querySelector('.main').innerHTML=`<section class="card" style="padding:25px"><h2>Панель временно недоступна</h2><p>${esc(e.message)}</p></section>`});