const API_BASE = String(window.WESTONE_API_BASE || '').replace(/\/$/, '');
const AUTH_KEY = 'westone_access_token';
const DRAFT_KEY = 'westone_application_draft';
const PAGE_KEY = 'westone_application_page';
const $ = (s,p=document)=>p.querySelector(s); const $$=(s,p=document)=>[...p.querySelectorAll(s)];
const state={user:null,form:null,page:0,answers:{},applications:[],adminTab:'overview',adminPages:[],adminPageId:null,profileOpen:false,editingMemberId:null};
const api=async(path,opts={})=>{const headers={'Content-Type':'application/json',...(opts.headers||{})};const token=localStorage.getItem(AUTH_KEY);if(token&&!headers.Authorization)headers.Authorization=`Bearer ${token}`;const r=await fetch(API_BASE+path,{...opts,credentials:'include',headers});let d={};try{d=await r.json()}catch{}if(!r.ok)throw Object.assign(new Error(d.error||'حدث خطأ غير متوقع'),{data:d,status:r.status});return d};
const toast=(m)=>{const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),3000)};
const openModal=id=>{$('#'+id).classList.add('open');document.body.classList.add('lock')};const closeModal=id=>{$('#'+id).classList.remove('open');if(!$$('.modal.open').length)document.body.classList.remove('lock')};
window.addEventListener('mousemove',e=>{if(innerWidth>900){$('#cursor').style.left=e.clientX+'px';$('#cursor').style.top=e.clientY+'px'}});
const observer=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)e.target.classList.add('show')}),{threshold:.1}); $$('.reveal').forEach(x=>observer.observe(x));
$$('[data-close]').forEach(b=>b.onclick=()=>closeModal(b.dataset.close));
$$('.faq-item').forEach(x=>x.onclick=()=>x.classList.toggle('open'));
$$('[data-action="apply"]').forEach(b=>b.onclick=()=>openApplication());
$('#discordNav')?.addEventListener('click',()=>connectDiscord());
$('#userNav')?.addEventListener('click',(e)=>{e.stopPropagation();toggleProfilePanel()});
$('[data-close-profile]').forEach(x=>x.addEventListener('click',closeProfilePanel));
$('#profileAccountAction')?.addEventListener('click',()=>{closeProfilePanel();state.user?.role==='ADMIN'?openAdmin():openDashboard()});
$('#profileLogout')?.addEventListener('click',logoutDiscord);
$('#copyDiscordId')?.addEventListener('click',copyDiscordId);
$('[data-close-staff]').forEach(x=>x.addEventListener('click',closeStaffEditor));
$('#staffImageFile')?.addEventListener('change',handleStaffFile);
$('#staffImageInput')?.addEventListener('input',()=>{const v=$('#staffImageInput').value.trim();if(v)$('#staffPreview').src=v});
$('#saveStaffBtn')?.addEventListener('click',saveStaffEditor);
$$('[data-close-admin-editor]').forEach(x=>x.addEventListener('click',closeAdminEditor));
$('#saveAdminEditorBtn')?.addEventListener('click',saveAdminEditor);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeProfilePanel()});
async function boot(){
  try{
    const hash=new URLSearchParams(location.hash.startsWith('#')?location.hash.slice(1):location.hash);
    const oauthToken=hash.get('auth');
    if(oauthToken){
      localStorage.setItem(AUTH_KEY,oauthToken);
      history.replaceState({},'',`${location.pathname}#home`);
      toast('تم ربط حساب Discord بنجاح');
    }
    const d=await api('/api/auth/me');
    state.user=normalizeUser(d.user || d);
    renderIdentity();
    if(state.user && location.hash==='#dashboard') setTimeout(openDashboard,120);
  }catch(e){
    localStorage.removeItem(AUTH_KEY);
    state.user=null;
    renderIdentity();
  }
  loadMembers();
}
function connectDiscord(){
  location.href=API_BASE+'/api/auth/discord';
}
function normalizeUser(raw){
  const u=raw||{};
  const d=u.discord||u.discord_user||{};
  const id=u.discord_id||u.discordId||d.id||d.user_id||'';
  const username=u.discord_username||u.discordUsername||d.username||d.user?.username||'';
  const globalName=u.discord_global_name||u.discordGlobalName||d.global_name||d.globalName||d.user?.global_name||username||'Discord User';
  const avatarRaw=u.discord_avatar??u.discordAvatar??d.avatar??d.avatar_hash??d.user?.avatar??'';
  let avatar='';
  if(avatarRaw && /^https?:\/\//i.test(String(avatarRaw))) avatar=String(avatarRaw);
  else if(avatarRaw && id) avatar=`https://cdn.discordapp.com/avatars/${id}/${avatarRaw}.png?size=256`;
  else avatar='https://cdn.discordapp.com/embed/avatars/0.png';
  return {...u,discord_id:String(id),discord_username:String(username),discord_global_name:String(globalName),discord_avatar:avatar,role:String(u.role||u.user_role||'USER').toUpperCase()};
}
function discordAvatar(user){return user?.discord_avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}
function renderIdentity(){
  const connect=$('#discordNav'), wrap=$('#profileWrap');
  if(!state.user){wrap?.classList.add('hidden');connect?.classList.remove('hidden');return}
  connect?.classList.add('hidden');wrap?.classList.remove('hidden');
  const avatar=discordAvatar(state.user);
  $('#userAvatar').src=avatar; $('#panelAvatar').src=avatar;
  const name=state.user.discord_global_name||state.user.discord_username||'Discord User';
  const username=state.user.discord_username||'user';
  const id=state.user.discord_id||'—';
  $('#panelAvatar').alt=name;
  $('#profileTitle').textContent=name;
  $('#panelUsername').textContent='@'+username;
  $('#panelUsernameCopy').textContent='@'+username;
  $('#panelId').textContent=id;
  $('#panelRole').textContent=state.user.role==='ADMIN'?'ADMIN':'USER';
  $('#profileAccountAction').textContent=state.user.role==='ADMIN'?'لوحة التحكم':'لوحة حسابي';
}
function toggleProfilePanel(){
  const panel=$('#profileModal'); const opening=!panel.classList.contains('open');
  panel.classList.toggle('open',opening); panel.setAttribute('aria-hidden',String(!opening));
  document.body.classList.toggle('lock',opening || $$('.modal.open').length>0);
  $('#userNav')?.setAttribute('aria-expanded',String(opening));
}
function closeProfilePanel(){
  const panel=$('#profileModal'); panel?.classList.remove('open'); panel?.setAttribute('aria-hidden','true');
  if(!$$('.modal.open').length)document.body.classList.remove('lock');
  $('#userNav')?.setAttribute('aria-expanded','false');
}
async function copyDiscordId(){
  const id=state.user?.discord_id;if(!id)return;
  try{await navigator.clipboard.writeText(id);toast('تم نسخ Discord ID');}catch{toast(id)}
}
async function logoutDiscord(){
  try{await api('/api/auth/logout',{method:'POST'});}catch{}
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(DRAFT_KEY);
  localStorage.removeItem(PAGE_KEY);
  state.user=null; closeProfilePanel(); renderIdentity(); toast('تم تسجيل الخروج من Discord');
}
async function openApplication(){if(!state.user){toast('يجب ربط حساب Discord أولاً.');setTimeout(connectDiscord,450);return}openModal('appModal');$('#appContent').innerHTML='<div class="login-box"><div class="big">…</div><h2>جاري تجهيز طلبك</h2><p>نحمّل صفحات التقديم والأسئلة من النظام.</p></div>';try{const d=await api('/api/application/form');if(!d.open){$('#appContent').innerHTML=`<div class="closed-box"><div class="big">×</div><h2>التقديم مغلق حالياً</h2><p>${esc(d.message||'التقديم غير متاح')}</p></div>`;return}state.form=d;
      const saved=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');
      state.page=Math.min(Math.max(Number(localStorage.getItem(PAGE_KEY)||0),0),Math.max((d.pages||[]).length-1,0));
      state.answers=saved&&typeof saved==='object'?saved:{};
      renderApplication();}catch(e){$('#appContent').innerHTML=`<div class="closed-box"><div class="big">!</div><h2>تعذر تحميل التقديم</h2><p>${esc(e.message)}</p></div>`}}
function renderApplication(){const pages=state.form.pages||[];$('#appStepCounter').textContent=`${String(state.page+1).padStart(2,'0')} / ${String(pages.length+1).padStart(2,'0')}`;$('#appProgress').style.width=((state.page+1)/(pages.length+1)*100)+'%';let h=`<div class="app-header"><div><span class="eyebrow"><i></i> APPLICATION / ${String(state.page+1).padStart(2,'0')}</span><h2>${esc(pages[state.page]?.title||'مراجعة الطلب')}</h2><p>${esc(pages[state.page]?.description||'راجع معلوماتك قبل الإرسال.')}</p></div><div class="app-user"><img src="${escAttr(state.user.discord_avatar||'https://cdn.discordapp.com/embed/avatars/0.png')}"><b>${esc(state.user.discord_global_name||state.user.discord_username)}</b></div></div>`;if(state.page<pages.length){h+=renderPage(pages[state.page]);h+=`<div class="app-controls"><button class="app-prev" onclick="appPrev()" ${state.page===0?'style="visibility:hidden"':''}>السابق</button><button class="app-next" onclick="appNext()">${state.page===pages.length-1?'مراجعة الطلب':'التالي'} <span>→</span></button></div>`}else{h+=renderReview(pages);h+=`<div class="app-controls"><button class="app-prev" onclick="appPrev()">السابق</button><button class="app-next" onclick="submitApplication()">إرسال الطلب ↗</button></div>`}$('#appContent').innerHTML=h;restoreInputs();}
function renderPage(p){return (p.questions||[]).map(q=>{const req=q.required?'<em>* مطلوب</em>':'';let body='';const type=q.type; if(type==='SHORT_TEXT'||type==='NUMBER')body=`<input data-q="${q.id}" type="${type==='NUMBER'?'number':'text'}" placeholder="${escAttr(q.placeholder||'اكتب إجابتك هنا...')}">`;else if(type==='LONG_TEXT')body=`<textarea data-q="${q.id}" placeholder="${escAttr(q.placeholder||'اكتب إجابتك هنا...')}"></textarea>`;else if(type==='YES_NO')body=choice(q,[{label:'نعم',value:'YES'},{label:'لا',value:'NO'}],false);else if(['SELECT','MULTI_SELECT','CHECKBOX'].includes(type))body=choice(q,q.options||[],type==='MULTI_SELECT'||type==='CHECKBOX');return `<div class="question"><label>${esc(q.question)} ${req}</label>${q.description?`<div class="desc">${esc(q.description)}</div>`:''}${body}</div>`}).join('')||'<div class="review-box"><h4>صفحة بدون أسئلة</h4><p>هذه الصفحة تمت إضافتها من لوحة الإدارة ويمكن تعبئتها لاحقاً.</p></div>'}
function choice(q,opts,multi){return `<div class="choice-grid">${opts.map(o=>`<label class="choice"><input data-q="${q.id}" data-multi="${multi}" type="${multi?'checkbox':'radio'}" name="q_${q.id}" value="${escAttr(o.value)}"> <span>${esc(o.label)}</span></label>`).join('')}</div>`}
function renderReview(){let n=0;for(const p of state.form.pages||[])for(const q of p.questions||[])if(state.answers[q.id]!==undefined)n++;return `<div class="review-box"><span class="eyebrow"><i></i> FINAL REVIEW</span><h4>راجع إجاباتك قبل الإرسال.</h4><p>تمت تعبئة ${n} إجابة. بعد الإرسال سيظهر لك رقم طلب خاص مثل <b>APP-00001</b> وتبدأ الإدارة بمراجعة طلبك.</p><label class="check"><input id="confirmReview" type="checkbox"> أقر بأن المعلومات التي قدمتها صحيحة.</label></div>`}
function restoreInputs(){ $$('.question [data-q]').forEach(el=>{const v=state.answers[el.dataset.q];if(el.type==='checkbox')el.checked=Array.isArray(v)&&v.includes(el.value);else if(el.type==='radio')el.checked=String(v)===el.value;else if(v!==undefined)el.value=v}); $$('.choice input').forEach(i=>i.addEventListener('change',()=>{i.closest('.choice').classList.toggle('selected',i.checked);captureAnswer(i.dataset.q)}));$$('.question input:not([type=radio]):not([type=checkbox]),.question textarea,.question select').forEach(i=>i.addEventListener('input',()=>captureAnswer(i.dataset.q)));}
function captureAnswer(id){const els=$$(`[data-q="${CSS.escape(String(id))}"]`);if(!els.length)return;const first=els[0];if(first.type==='checkbox')state.answers[id]=els.filter(x=>x.checked).map(x=>x.value);else if(first.type==='radio'){const x=els.find(x=>x.checked);state.answers[id]=x?.value||''}else state.answers[id]=first.value;saveDraft()}
function saveDraft(){try{localStorage.setItem(DRAFT_KEY,JSON.stringify(state.answers));localStorage.setItem(PAGE_KEY,String(state.page))}catch{}}
function validatePage(){for(const q of state.form.pages[state.page].questions||[]){captureAnswer(q.id);if(q.required){const v=state.answers[q.id];if(v===undefined||v===null||v===''||(Array.isArray(v)&&!v.length)){toast(`أكمل السؤال: ${q.question}`);return false}}}return true}
window.appNext=()=>{if(!validatePage())return;state.page++;saveDraft();renderApplication()};window.appPrev=()=>{if(state.page>0){state.page--;saveDraft();renderApplication()}};
window.submitApplication=async()=>{if(!$('#confirmReview')?.checked){toast('يرجى تأكيد صحة المعلومات قبل الإرسال.');return}try{const d=await api('/api/application/submit',{method:'POST',body:JSON.stringify({answers:state.answers})});toast(`تم إرسال طلبك ${d.application.application_number}`);localStorage.removeItem(DRAFT_KEY);localStorage.removeItem(PAGE_KEY);setTimeout(()=>{closeModal('appModal');openDashboard()},700)}catch(e){toast(e.message)}};
async function openDashboard(){openModal('dashboardModal');$('#dashboardContent').innerHTML='<div class="closed-box"><div class="big">…</div><h2>جاري تحميل الطلبات</h2></div>';try{const d=await api('/api/application/my');state.applications=d.applications||[];renderDashboard()}catch(e){$('#dashboardContent').innerHTML=`<div class="closed-box"><div class="big">!</div><h2>تعذر تحميل الحساب</h2><p>${esc(e.message)}</p></div>`}}
function renderDashboard(){const total=state.applications.length, pending=state.applications.filter(x=>x.status==='PENDING').length, review=state.applications.filter(x=>x.status==='UNDER_REVIEW').length, accepted=state.applications.filter(x=>x.status==='ACCEPTED').length;$('#dashboardContent').innerHTML=`<div class="dash-head"><div><span class="eyebrow"><i></i> MY WESTONE</span><h2>لوحة حسابك</h2></div><div class="dash-user"><img src="${escAttr(state.user.discord_avatar||'https://cdn.discordapp.com/embed/avatars/0.png')}"><span>${esc(state.user.discord_global_name||state.user.discord_username)}</span></div></div><div class="dash-grid"><div class="stat"><small>إجمالي الطلبات</small><b>${total}</b></div><div class="stat"><small>قيد الانتظار</small><b>${pending}</b></div><div class="stat"><small>قيد المراجعة</small><b>${review}</b></div><div class="stat"><small>مقبول</small><b>${accepted}</b></div></div><div class="application-list">${state.applications.length?state.applications.map(a=>`<div class="application-row"><div><strong>${esc(a.application_number)}</strong><small>${esc(new Date(a.submitted_at||a.created_at).toLocaleString('ar-SA'))}</small></div><span class="status ${a.status}">${statusAr(a.status)}</span><button class="row-btn" onclick="viewOwnApplication(${a.id})">عرض التفاصيل</button></div>`).join(''):'<div class="review-box"><h4>لا توجد طلبات.</h4><p>ابدأ أول طلب لك من زر التقديم.</p></div>'}</div>`}
window.viewOwnApplication=async id=>{try{const d=await api('/api/application/my/'+id);const a=d.application;$('#dashboardContent').innerHTML=`<div class="dash-head"><div><span class="eyebrow"><i></i> ${esc(a.application_number)}</span><h2>${statusAr(a.status)}</h2></div><span class="status ${a.status}">${statusAr(a.status)}</span></div><div class="review-box"><p>تم الإرسال: ${esc(new Date(a.submitted_at).toLocaleString('ar-SA'))}</p><p>Discord: ${esc(a.discord_global_name||a.discord_username)}</p></div><div class="application-list" style="margin-top:12px">${d.answers.map(x=>`<div class="application-row"><div><strong>${esc(x.question_snapshot.question||'سؤال')}</strong><small>${esc(x.page_title||x.question_snapshot.page_title||'')}</small></div><span></span><span>${esc(formatAnswer(x.answer))}</span></div>`).join('')}</div><div class="app-controls"><button class="app-prev" onclick="renderDashboard()">← العودة</button></div>`}catch(e){toast(e.message)}};
async function openAdmin(){if(state.user?.role!=='ADMIN'){toast('هذه الصفحة متاحة للإدارة فقط.');return}openModal('adminModal');loadAdminTab('overview')}
$$('.admin-tab').forEach(b=>b.onclick=()=>{ $$('.admin-tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');loadAdminTab(b.dataset.adminTab)});
async function loadAdminTab(tab){state.adminTab=tab;const c=$('#adminContent');c.innerHTML='<div class="closed-box"><div class="big">…</div><h2>جاري التحميل</h2></div>';try{if(tab==='overview')return renderAdminOverview(await api('/api/admin/stats'));if(tab==='applications')return renderAdminApplications();if(tab==='builder')return renderBuilder();if(tab==='team')return renderAdminTeam();if(tab==='settings')return renderAdminSettings()}catch(e){c.innerHTML=`<div class="closed-box"><div class="big">!</div><h2>حدث خطأ</h2><p>${esc(e.message)}</p></div>`}}
function renderAdminOverview(s){$('#adminContent').innerHTML=`<div class="admin-title"><div><span class="eyebrow"><i></i> CONTROL CENTER</span><h2>نظرة عامة</h2><p>لوحة تحكم كاملة لإدارة تجربة التقديم.</p></div></div><div class="admin-stats">${[['كل الطلبات',s.total],['انتظار',s.pending],['مراجعة',s.under_review],['مقبول',s.accepted],['مرفوض',s.rejected]].map(x=>`<div class="admin-stat"><small>${x[0]}</small><b>${x[1]}</b></div>`).join('')}</div><div class="review-box"><h4>إدارة المحتوى</h4><p>من تبويب منشئ التقديم تقدر تضيف صفحات، تعدلها، تنسخها، وتضيف الأسئلة بكل أنواعها. ومن الطلبات تقدر تغير حالة كل متقدم وتضيف ملاحظات إدارية.</p></div>`}
async function renderAdminApplications(){const d=await api('/api/admin/applications?limit=200');state.adminApplications=d.applications||[];$('#adminContent').innerHTML=`<div class="admin-title"><div><span class="eyebrow"><i></i> APPLICATIONS</span><h2>طلبات التقديم</h2><p>${d.total} طلب إجمالي</p></div><div class="admin-actions"><button class="small-btn" onclick="loadAdminTab('applications')">تحديث</button></div></div><div class="admin-filter-bar"><input id="adminAppSearch" placeholder="ابحث بالاسم أو Discord ID أو رقم الطلب..." oninput="filterAdminApplications()"><select id="adminAppStatus" onchange="filterAdminApplications()"><option value="ALL">كل الحالات</option><option value="PENDING">قيد الانتظار</option><option value="UNDER_REVIEW">قيد المراجعة</option><option value="ACCEPTED">مقبول</option><option value="REJECTED">مرفوض</option></select></div><div id="adminApplicationsTable" class="admin-table"></div>`;renderAdminApplicationsTable();}
function renderAdminApplicationsTable(){const q=String($('#adminAppSearch')?.value||'').trim().toLowerCase();const status=$('#adminAppStatus')?.value||'ALL';const rows=state.adminApplications.filter(a=>{const hay=[a.discord_global_name,a.discord_username,a.discord_id,a.application_number].join(' ').toLowerCase();return (!q||hay.includes(q))&&(status==='ALL'||a.status===status)});$('#adminApplicationsTable').innerHTML=rows.length?`<div class="table-head"><span>المتقدم</span><span>رقم الطلب</span><span>الحالة</span><span>إجراء</span></div>${rows.map(a=>`<div class="table-row"><span><img class="admin-avatar" src="${escAttr(a.discord_avatar||'https://cdn.discordapp.com/embed/avatars/0.png')}">${esc(a.discord_global_name||a.discord_username)}<small style="display:block;color:#647069;margin-right:40px">${esc(a.discord_id)}</small></span><span>${esc(a.application_number)}</span><span><i class="pill ${pillClass(a.status)}">${statusAr(a.status)}</i></span><button class="small-btn" onclick="openAdminApplication(${a.id})">فتح</button></div>`).join('')}`:'<div class="admin-empty">لا توجد نتائج مطابقة.</div>';}
window.filterAdminApplications=()=>renderAdminApplicationsTable();
window.openAdminApplication=async id=>{const d=await api('/api/admin/applications/'+id),a=d.application;$('#adminContent').innerHTML=`<div class="admin-title"><div><span class="eyebrow"><i></i> ${esc(a.application_number)}</span><h2>${esc(a.discord_global_name||a.discord_username)}</h2><p>${esc(a.discord_id)}</p></div><div class="admin-actions"><button class="small-btn" onclick="loadAdminTab('applications')">عودة</button></div></div><div class="review-box"><h4>تغيير الحالة</h4><div class="admin-actions"><button class="small-btn" onclick="setAppStatus(${a.id},'PENDING')">قيد الانتظار</button><button class="small-btn" onclick="setAppStatus(${a.id},'UNDER_REVIEW')">قيد المراجعة</button><button class="small-btn green" onclick="setAppStatus(${a.id},'ACCEPTED')">مقبول</button><button class="small-btn" onclick="setAppStatus(${a.id},'REJECTED')">مرفوض</button></div></div><div class="application-list" style="margin-top:12px">${d.answers.map(x=>`<div class="application-row"><div><strong>${esc(x.question_snapshot.question||'سؤال')}</strong><small>${esc(x.page_title||'')}</small></div><span></span><span>${esc(formatAnswer(x.answer))}</span></div>`).join('')}</div><div class="review-box" style="margin-top:12px"><h4>ملاحظة إدارية</h4><textarea id="adminNote" style="width:100%;background:#070b09;border:1px solid #ffffff0d;color:#fff;padding:12px;min-height:90px" placeholder="اكتب ملاحظة..."></textarea><button class="small-btn green" style="margin-top:10px" onclick="addAdminNote(${a.id})">إضافة الملاحظة</button></div><div class="review-box" style="margin-top:12px"><h4>سجل الملاحظات</h4>${(d.notes||[]).map(n=>`<p style="border-bottom:1px solid #ffffff08;padding:10px 0;color:#829089;font-size:10px"><b>${esc(n.admin_username)}</b> — ${esc(n.note)}</p>`).join('')||'<p>لا توجد ملاحظات.</p>'}</div>`};
window.setAppStatus=async(id,status)=>{try{await api('/api/admin/applications/'+id+'/status',{method:'PATCH',body:JSON.stringify({status})});toast('تم تحديث حالة الطلب');openAdminApplication(id)}catch(e){toast(e.message)}};window.addAdminNote=async id=>{const n=$('#adminNote').value.trim();if(!n)return toast('اكتب الملاحظة أولاً');try{await api('/api/admin/applications/'+id+'/notes',{method:'POST',body:JSON.stringify({note:n})});toast('تمت إضافة الملاحظة');openAdminApplication(id)}catch(e){toast(e.message)}};
async function renderBuilder(){const d=await api('/api/admin/pages');state.adminPages=d.pages;state.adminPageId=state.adminPageId||d.pages[0]?.id;$('#adminContent').innerHTML=`<div class="admin-title"><div><span class="eyebrow"><i></i> FORM BUILDER</span><h2>منشئ التقديم</h2><p>تحكم كامل بالصفحات والأسئلة.</p></div><button class="small-btn green" onclick="createPage()">+ إضافة صفحة</button></div><div class="builder"><div class="builder-list">${d.pages.map(p=>`<div class="list-item ${p.id===state.adminPageId?'active':''}" onclick="selectAdminPage(${p.id})"><b>${esc(p.title)}</b><small style="display:block;color:#66736c;margin-top:5px">${p.question_count} سؤال</small></div>`).join('')}</div><div class="builder-editor" id="builderEditor">اختر صفحة.</div></div>`;if(state.adminPageId)selectAdminPage(state.adminPageId)}
window.selectAdminPage=async id=>{state.adminPageId=id;const p=state.adminPages.find(x=>x.id===id);const d=await api('/api/admin/pages/'+id+'/questions');$('#builderEditor').innerHTML=`<div class="admin-title"><div><h3>${esc(p.title)}</h3><p>${esc(p.description||'')}</p></div><div class="admin-actions"><button class="small-btn" onclick="editPage(${id})">تعديل الصفحة</button><button class="small-btn" onclick="duplicatePage(${id})">نسخ</button><button class="small-btn" onclick="deletePage(${id})">حذف</button><button class="small-btn green" onclick="createQuestion(${id})">+ سؤال</button></div></div><div>${d.questions.map(q=>`<div class="question-admin"><span><b>${esc(q.question)}</b><small style="display:block;color:#647069;margin-top:4px">${esc(q.type)} ${q.required?'· مطلوب':''}</small></span><span class="admin-actions"><button class="small-btn" onclick="editQuestion(${q.id},${id})">تعديل</button><button class="small-btn" onclick="deleteQuestion(${q.id},${id})">حذف</button></span></div>`).join('')||'<div class="review-box">لا توجد أسئلة في هذه الصفحة.</div>'}</div>`};
let adminEditorState={type:null,id:null,pageId:null};
function openAdminEditor(type,data={}){
  adminEditorState={type,id:data.id||null,pageId:data.pageId||null};
  const body=$('#adminEditorBody');
  $('#adminEditorTitle').textContent=type==='page'?(data.id?'تعديل الصفحة':'إضافة صفحة'):(data.id?'تعديل السؤال':'إضافة سؤال');
  if(type==='page'){
    body.innerHTML=`<label>اسم الصفحة<input id="editorTitle" value="${escAttr(data.title||'')}" maxlength="160" placeholder="مثال: المعلومات الشخصية"></label><label>وصف الصفحة<textarea id="editorDescription" placeholder="وصف مختصر يظهر للمتقدم">${esc(data.description||'')}</textarea></label>`;
  }else{
    const types=[['SHORT_TEXT','نص قصير'],['LONG_TEXT','نص طويل'],['NUMBER','رقم'],['YES_NO','نعم / لا'],['SELECT','اختيار واحد'],['MULTI_SELECT','اختيارات متعددة'],['CHECKBOX','مربعات اختيار']];
    const opts=Array.isArray(data.options)?data.options.map(o=>o.label||o.value).join('\n'):'';
    body.innerHTML=`<label>السؤال<input id="editorQuestion" value="${escAttr(data.question||'')}" maxlength="500" placeholder="اكتب السؤال"></label><div class="editor-row"><label>نوع السؤال<select id="editorType">${types.map(t=>`<option value="${t[0]}" ${data.type===t[0]?'selected':''}>${t[1]}</option>`).join('')}</select></label><label class="toggle" style="margin-top:27px"><input id="editorRequired" type="checkbox" ${data.required?'checked':''}> سؤال إجباري</label></div><label>الوصف<input id="editorDescription" value="${escAttr(data.description||'')}" placeholder="شرح إضافي اختياري"></label><label>النص الإرشادي<input id="editorPlaceholder" value="${escAttr(data.placeholder||'')}" placeholder="اكتب إجابتك هنا..."></label><label id="editorOptionsWrap">الخيارات<textarea id="editorOptions" placeholder="كل خيار في سطر مستقل">${esc(opts)}</textarea><div class="admin-field-hint">يستخدم هذا الحقل مع الاختيار الواحد والمتعدد ومربعات الاختيار.</div></label>`;
    const select=$('#editorType');const wrap=$('#editorOptionsWrap');const sync=()=>wrap.style.display=['SELECT','MULTI_SELECT','CHECKBOX'].includes(select.value)?'block':'none';select.addEventListener('change',sync);sync();
  }
  const modal=$('#adminEditorModal');modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.classList.add('lock');
}
function closeAdminEditor(){const modal=$('#adminEditorModal');modal?.classList.remove('open');modal?.setAttribute('aria-hidden','true');if(!$$('.modal.open,.profile-modal.open,.form-modal.open').length)document.body.classList.remove('lock');adminEditorState={type:null,id:null,pageId:null};}
async function saveAdminEditor(){
  try{
    const t=adminEditorState.type;
    if(t==='page'){
      const title=$('#editorTitle').value.trim();if(!title)return toast('اسم الصفحة مطلوب.');
      const payload={title,description:$('#editorDescription').value.trim()};
      const isEdit=Boolean(adminEditorState.id);
      const url=isEdit?`/api/admin/pages/${adminEditorState.id}`:'/api/admin/pages';
      const result=await api(url,{method:isEdit?'PATCH':'POST',body:JSON.stringify(payload)});
      if(!isEdit&&result.page?.id)state.adminPageId=result.page.id;
      closeAdminEditor();await renderBuilder();toast(isEdit?'تم تحديث الصفحة':'تمت إضافة الصفحة');
    }else{
      const question=$('#editorQuestion').value.trim();if(!question)return toast('نص السؤال مطلوب.');
      const type=$('#editorType').value;const options=['SELECT','MULTI_SELECT','CHECKBOX'].includes(type)?$('#editorOptions').value.split('\n').map(x=>x.trim()).filter(Boolean).map(x=>({label:x,value:x})):[];
      if(['SELECT','MULTI_SELECT','CHECKBOX'].includes(type)&&!options.length)return toast('أضف خياراً واحداً على الأقل.');
      const payload={question,type,required:$('#editorRequired').checked,description:$('#editorDescription').value.trim(),placeholder:$('#editorPlaceholder').value.trim(),options};
      const isEdit=Boolean(adminEditorState.id);
      const url=isEdit?`/api/admin/questions/${adminEditorState.id}`:`/api/admin/pages/${adminEditorState.pageId}/questions`;
      const pageId=adminEditorState.pageId;
      await api(url,{method:isEdit?'PATCH':'POST',body:JSON.stringify(payload)});
      closeAdminEditor();await selectAdminPage(pageId);toast(isEdit?'تم تحديث السؤال':'تمت إضافة السؤال');
    }
  }catch(e){toast(e.message)}
}
window.createPage=()=>openAdminEditor('page');
window.editPage=async id=>{const p=state.adminPages.find(x=>x.id===id);if(p)openAdminEditor('page',p)};
window.duplicatePage=async id=>{try{const d=await api('/api/admin/pages/'+id+'/duplicate',{method:'POST'});state.adminPageId=d.page.id;await renderBuilder();toast('تم نسخ الصفحة مع أسئلتها')}catch(e){toast(e.message)}};
window.deletePage=async id=>{if(!confirm('حذف الصفحة؟ سيتم الحفاظ على الإجابات التاريخية.'))return;try{await api('/api/admin/pages/'+id,{method:'DELETE'});state.adminPageId=null;await renderBuilder();toast('تم حذف الصفحة')}catch(e){toast(e.message)}};
window.createQuestion=pageId=>openAdminEditor('question',{pageId});
window.editQuestion=async(qid,pageId)=>{try{const d=await api('/api/admin/pages/'+pageId+'/questions');const q=d.questions.find(x=>x.id===qid);if(q)openAdminEditor('question',{...q,pageId})}catch(e){toast(e.message)}};
window.deleteQuestion=async(qid,pageId)=>{if(!confirm('حذف السؤال؟'))return;try{await api('/api/admin/questions/'+qid,{method:'DELETE'});await selectAdminPage(pageId);toast('تم حذف السؤال')}catch(e){toast(e.message)}};
async function renderAdminTeam(){const d=await api('/api/admin/members');$('#adminContent').innerHTML=`<div class="admin-title"><div><span class="eyebrow"><i></i> THE CREW</span><h2>طاقم الإدارة</h2><p>أضف اسم الإداري، المسمى، ورابط الصورة بسهولة.</p></div><button class="small-btn green" onclick="createMember()">+ إضافة إداري</button></div><div class="team-grid">${d.members.map(m=>`<article class="member-card"><img src="${escAttr(m.image_url||'https://cdn.discordapp.com/embed/avatars/0.png')}"><div class="member-info"><small>${esc(m.role)}</small><h3>${esc(m.name)}</h3><p>${m.enabled?'ظاهر في الموقع':'مخفي'}</p><div class="admin-actions" style="margin-top:9px"><button class="small-btn" onclick="editMember(${m.id})">تعديل</button><button class="small-btn" onclick="deleteMember(${m.id})">حذف</button></div></div></article>`).join('')}</div>`};
window.createMember=async()=>openStaffEditor();
function openStaffEditor(memberId=null){
  state.editingMemberId=memberId;
  $('#staffEditorTitle').textContent=memberId?'تعديل الإداري':'إضافة إداري';
  $('#staffNameInput').value='';$('#staffRoleInput').value='';$('#staffImageInput').value='';$('#staffEnabledInput').checked=true;$('#staffPreview').src='https://cdn.discordapp.com/embed/avatars/0.png';$('#staffPreview').dataset.uploaded='';
  if(memberId){api('/api/admin/members').then(d=>{const m=d.members.find(x=>x.id===memberId);if(!m)return;$('#staffNameInput').value=m.name||'';$('#staffRoleInput').value=m.role||'';$('#staffImageInput').value=(m.image_url||'').startsWith('data:')?'':(m.image_url||'');$('#staffEnabledInput').checked=m.enabled!==false;$('#staffPreview').src=m.image_url||'https://cdn.discordapp.com/embed/avatars/0.png';$('#staffPreview').dataset.uploaded=(m.image_url||'').startsWith('data:')?m.image_url:''}).catch(e=>toast(e.message));}
  const modal=$('#staffEditorModal');modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.classList.add('lock');
}
function closeStaffEditor(){const modal=$('#staffEditorModal');modal?.classList.remove('open');modal?.setAttribute('aria-hidden','true');if(!$$('.modal.open,.profile-modal.open,.form-modal.open').length)document.body.classList.remove('lock');state.editingMemberId=null;}
function handleStaffFile(e){const file=e.target.files?.[0];if(!file)return;if(file.size>8*1024*1024){toast('حجم الصورة كبير. الحد 8MB.');e.target.value='';return}const reader=new FileReader();reader.onload=()=>{const img=new Image();img.onload=()=>{const maxW=700,maxH=900,scale=Math.min(1,maxW/img.width,maxH/img.height),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);const data=canvas.toDataURL('image/jpeg',.78);$('#staffPreview').src=data;$('#staffPreview').dataset.uploaded=data};img.src=reader.result};reader.readAsDataURL(file)}
async function saveStaffEditor(){
 const typedUrl=$('#staffImageInput').value.trim();const uploaded=$('#staffPreview').dataset.uploaded||'';const payload={name:$('#staffNameInput').value.trim(),role:$('#staffRoleInput').value.trim(),image_url:typedUrl||uploaded,enabled:$('#staffEnabledInput').checked};
 if(!payload.name||!payload.role){toast('أدخل اسم الإداري والمسمى الإداري.');return}
 try{const id=state.editingMemberId;await api(id?'/api/admin/members/'+id:'/api/admin/members',{method:id?'PATCH':'POST',body:JSON.stringify(payload)});closeStaffEditor();await renderAdminTeam();await loadMembers();toast(id?'تم تحديث الإداري':'تمت إضافة الإداري')}catch(e){toast(e.message)}
}
window.editMember=async id=>openStaffEditor(id);
window.deleteMember=async id=>{if(!confirm('حذف الإداري؟'))return;try{await api('/api/admin/members/'+id,{method:'DELETE'});renderAdminTeam();loadMembers();toast('تم الحذف')}catch(e){toast(e.message)}};
async function renderAdminSettings(){const d=await api('/api/admin/settings'),s=d.settings;$('#adminContent').innerHTML=`<div class="admin-title"><div><span class="eyebrow"><i></i> SETTINGS</span><h2>إعدادات التقديم</h2><p>تحكم في حالة التقديم والسماح بتعدد الطلبات.</p></div></div><div class="review-box editor-form"><label class="toggle"><input id="openApps" type="checkbox" ${s.applications_open?'checked':''}> التقديم مفتوح</label><label class="toggle"><input id="multiApps" type="checkbox" ${s.allow_multiple_applications?'checked':''}> السماح بأكثر من طلب</label><button class="small-btn green" onclick="saveSettings()">حفظ الإعدادات</button></div>`};window.saveSettings=async()=>{try{await api('/api/admin/settings',{method:'PATCH',body:JSON.stringify({applications_open:$('#openApps').checked,allow_multiple_applications:$('#multiApps').checked})});toast('تم حفظ الإعدادات')}catch(e){toast(e.message)}};
async function loadMembers(){try{const d=await api('/api/members');$('#teamGrid').innerHTML=(d.members||[]).map(m=>`<article class="member-card reveal show"><img src="${escAttr(m.image_url||'https://cdn.discordapp.com/embed/avatars/0.png')}"><div class="member-info"><small>${esc(m.role)}</small><h3>${esc(m.name)}</h3><p>WESTONE ADMINISTRATION</p></div></article>`).join('')||'<div class="review-box">طاقم الإدارة سيظهر هنا عند إضافته من لوحة التحكم.</div>'}catch{}}
function statusAr(s){return({PENDING:'قيد الانتظار',UNDER_REVIEW:'قيد المراجعة',ACCEPTED:'مقبول',REJECTED:'مرفوض'})[s]||s}function pillClass(s){return({PENDING:'pending',UNDER_REVIEW:'review',ACCEPTED:'accepted',REJECTED:'rejected'})[s]||''}function formatAnswer(v){try{const x=JSON.parse(v);return Array.isArray(x)?x.join('، '):String(x)}catch{return String(v??'')}}function esc(s){return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}function escAttr(s){return esc(s)}
boot();
