import './styles.css';
(function(){
"use strict";
/* ---------- dates ---------- */
const TODAY=(()=>{const d=new Date();d.setHours(0,0,0,0);return d})();
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const pad=n=>String(n).padStart(2,'0');
const iso=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const parse=s=>{const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
const diff=(a,b)=>Math.round((a-b)/864e5);
const fmt=s=>parse(s).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});
const T=iso(TODAY), off=n=>iso(addDays(TODAY,n));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $=s=>document.querySelector(s);

/* ---------- data ---------- */
const DEFAULT_PEOPLE=[
 {id:'chris',name:'Chris',role:'CEO',dept:'Management',exec:true},
 {id:'andrew',name:'Andrew',role:'GM',dept:'General Management',exec:true},
 {id:'joann',name:'Joann',role:'HR',dept:'HR',exec:false},
 {id:'cannie',name:'Cannie',role:'Sales & Ops Manager',dept:'Sales & Ops',exec:false},
 {id:'yangmei',name:'Yang Mei',role:'CFO',dept:'Finance',exec:true},
 {id:'eileen',name:'Eileen',role:'Fabrication Manager',dept:'Fabrication',exec:false}];
let PEOPLE=DEFAULT_PEOPLE;
const depts=()=>[...new Set(PEOPLE.filter(p=>p.id!=='chris').map(p=>p.dept))];
const P=id=>PEOPLE.find(p=>p.id===id)||PEOPLE[0];
const hue=id=>{let h=0;for(const c of id)h=(h*31+c.charCodeAt(0))%360;return h};
const initials=n=>n.split(' ').map(w=>w[0]).join('').slice(0,2);
const STATUS={todo:'Not started',doing:'In progress',blocked:'Blocked',done:'Done'};
const PRI={high:'High',med:'Medium',low:'Low'};

function demo(){
 const mk=(id,title,owner,pri,due,status,progress,src,o={})=>({id,title,owner,pri,due:off(due),status,progress,src,conf:!!o.conf,carried:o.carried||0,
   created:off(o.created??-14),doneOn:o.doneOn!=null?off(o.doneOn):null,log:o.log||[{d:off(o.created??-14),who:'Chris',text:'Created from '+src}]});
 const arr=[
 mk(1,'Follow up on the 10 units of 80-100t crawler cranes still to be leased out','cannie','high',-2,'doing',30,'Monday Ops Meeting',{created:-12}),
 mk(2,'Follow up on finding temporary yard space of 5,000 sq ft','andrew','med',3,'doing',40,"Directors' Meeting",{created:-9}),
 mk(3,'Follow up on the Changsha trip on 26 Mar 2027 for the company incentive travel','joann','low',4,'todo',0,'HR Catch-up',{created:-6}),
 mk(4,'Follow up on the fleet payback period analysis','yangmei','med',5,'doing',20,'Finance Weekly',{created:-8})];
 arr[1].req={to:off(7),reason:'Landlord quotes arrive next week',by:'andrew',d:T};
 return arr;
}

/* ---------- state ---------- */
const KEY='pollisum-tracker-v4';
function todoDemo(){return {chris:[{id:1,text:'Review the crawler crane leasing pipeline with Cannie',done:false,due:off(1)},{id:2,text:'Prepare talking points for Monday management meeting',done:false,due:off(3)},{id:3,text:'Sign off the incentive trip budget',done:true,due:null}]}}
let S={rules:{remind:2,nudge:1,gm:3,ceo:7},actions:demo(),isDemo:true,nextId:100,people:DEFAULT_PEOPLE.map(p=>({...p})),todos:todoDemo()};
let UI={cal:{y:TODAY.getFullYear(),m:TODAY.getMonth()},calOwner:'all',calDay:T,tab:'dash',viewer:'chris',filter:'all',q:'',open:null,modal:false,seg:{pri:'med',conf:false}};
try{const raw=localStorage.getItem(KEY);if(raw){const j=JSON.parse(raw);if(j&&Array.isArray(j.actions))S=j}}catch(e){}
S.people=Array.isArray(S.people)&&S.people.length?S.people:DEFAULT_PEOPLE.map(p=>({...p}));S.todos=S.todos||{};S.rules=Object.assign({remind:2,nudge:1,gm:3,ceo:7},S.rules||{});PEOPLE=S.people;
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
const viewer=()=>P(UI.viewer);
const visible=a=>viewer().exec||!a.conf||a.owner===UI.viewer;
const A=()=>S.actions.filter(visible);
const byId=id=>S.actions.find(a=>a.id===id);

/* ---------- derived ---------- */
const isOpen=a=>a.status!=='done';
const over=a=>isOpen(a)?Math.max(0,diff(TODAY,parse(a.due))):0;
const left=a=>diff(parse(a.due),TODAY);
function esc_level(a){if(!isOpen(a))return null;const d=over(a),R=S.rules;if(d>=R.ceo&&R.ceo>0)return 'ceo';if(d>=R.gm&&R.gm>0)return 'director';if(d>=Math.max(1,R.nudge))return 'nudge';if(left(a)===0)return 'due';if(left(a)>=0&&left(a)<=R.remind)return 'remind';return null}
function dueTxt(a){
 if(a.status==='done')return {t:'Done '+fmt(a.doneOn||a.due),c:'ok'};
 const l=left(a);
 if(l<0)return {t:'Overdue '+(-l)+(l===-1?' day':' days'),c:'over'};
 if(l===0)return {t:'Due today',c:'soon'};
 if(l===1)return {t:'Due tomorrow',c:'soon'};
 return {t:'Due '+fmt(a.due),c:l<=3?'soon':'ok'};
}
function reasons(a){const r=[];const d=over(a);if(d)r.push(d+(d===1?' day':' days')+' overdue');if(a.status==='blocked')r.push('blocked');if(a.carried>=2)r.push('carried over '+a.carried+' times');if(a.pri==='high')r.push('high priority');return r}
function score(a){return over(a)*2+(a.pri==='high'?6:a.pri==='med'?2:0)+a.carried*4+(a.status==='blocked'?5:0)}
function metrics(list){
 const done=list.filter(a=>a.status==='done'), open=list.filter(isOpen), ov=open.filter(a=>over(a)>0);
 const ontime=done.filter(a=>(a.doneOn||a.due)<=a.due).length;
 return {open:open.length,overdue:ov.length,week:open.filter(a=>left(a)>=0&&left(a)<=7).length,high:open.filter(a=>a.pri==='high').length,
  rate:done.length?Math.round(ontime/done.length*100):null,
  avgOver:ov.length?(ov.reduce((s,a)=>s+over(a),0)/ov.length).toFixed(1):'0',
  avgDays:done.length?(done.reduce((s,a)=>s+diff(parse(a.doneOn||a.due),parse(a.created)),0)/done.length).toFixed(1):'-',
  doneN:done.length,ov,openL:open};
}
function sorted(list){return [...list].sort((a,b)=>(isOpen(b)-isOpen(a))||(isOpen(a)?(left(a)-left(b)):(parse(b.doneOn||b.due)-parse(a.doneOn||a.due))))}
const first=n=>n.split(' ')[0];

/* ---------- small pieces ---------- */
const av=id=>'<span class="av" style="--h:'+hue(id)+'">'+esc(initials(P(id).name))+'</span>';
const who=id=>'<span class="who">'+av(id)+'<span>'+esc(P(id).name)+'</span></span>';
const pills=a=>'<span class="pill p-'+a.pri+'">'+PRI[a.pri]+'</span><span class="pill s-'+a.status+'">'+STATUS[a.status]+'</span>';
const dueEl=a=>{const d=dueTxt(a);return '<span class="due '+d.c+'">'+esc(d.t)+'</span>'};
const lockEl=a=>a.conf?'<span class="lock"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>Confidential</span>':'';
const art='<svg width="120" height="96" viewBox="0 0 120 96" fill="none" aria-hidden="true"><circle cx="86" cy="26" r="14" fill="var(--accent-soft)"/><circle cx="86" cy="26" r="7" fill="var(--accent)"/><path d="M18 88h84" stroke="var(--line)" stroke-width="3" stroke-linecap="round"/><path d="M34 88V30l40 6M54 33v22" stroke="var(--muted)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M54 55v6a5 5 0 1 1-5-5" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/><path d="M40 88l-6-24m12 24l-6-24" stroke="var(--line)" stroke-width="2.5" stroke-linecap="round"/></svg>';
function empty(title,msg,btn){return '<div class="card empty">'+art+'<h3>'+title+'</h3><p>'+msg+'</p>'+(btn||'')+'</div>'}
function actionCard(a,big){
 return '<article class="acard'+(a.status==='done'?' done':'')+'" tabindex="0" role="button" data-act="open" data-id="'+a.id+'">'
 +'<div class="pills">'+pills(a)+'</div><h3>'+esc(a.title)+'</h3>'
 +'<div class="foot">'+who(a.owner)+dueEl(a)+'</div>'
 +(a.status!=='done'?'<div class="bar" title="'+a.progress+'% complete"><i style="width:'+a.progress+'%"></i></div>':'')
 +'<div class="src">'+esc(a.src)+(a.conf?' &middot; ':'')+lockEl(a)+(a.carried?' &middot; carried over '+a.carried+'x':'')+(a.req?' &middot; deadline request pending':'')+(a.repeat&&a.repeat!=='none'?' &middot; repeats '+a.repeat:'')+(a.files&&a.files.length?' &middot; '+a.files.length+' attached':'')+'</div>'
 +(big&&a.status!=='done'?'<div class="acts"><button class="btn" data-act="open" data-id="'+a.id+'">Update</button><button class="btn primary" data-act="done" data-id="'+a.id+'">Mark done</button></div>':'')
 +'</article>';
}

/* ---------- views ---------- */
function brief(m,list){
 const ov=m.ov.sort((a,b)=>score(b)-score(a));
 const deptOver={};ov.forEach(a=>{const d=P(a.owner).dept;deptOver[d]=(deptOver[d]||0)+1});
 const topDept=Object.entries(deptOver).sort((a,b)=>b[1]-a[1])[0];
 const slip=m.openL.filter(a=>a.carried>=2);
 const ceoLevel=ov.filter(a=>over(a)>=S.rules.ceo).length;
 let head,txt;
 if(!list.length){head='Nothing to review yet.';txt='Add your first action from a meeting or a WhatsApp message and this brief will start to fill in.'}
 else if(!m.overdue){head='Everything is on track.';txt=m.open+' actions are open and none are past their deadline. '+m.week+' fall due in the next 7 days.'}
 else{
  head=m.overdue+(m.overdue===1?' action needs':' actions need')+' your attention.';
  txt=m.open+' actions are open and '+m.overdue+(m.overdue===1?' is':' are')+' past due, averaging '+m.avgOver+' days late. '
   +(topDept?topDept[0]+' has the most overdue items ('+topDept[1]+'). ':'')
   +(slip.length?slip.length+' have been carried over two or more times. ':'')
   +(ceoLevel?ceoLevel+' have reached CEO escalation ('+S.rules.ceo+'+ days late). ':'')
   +(m.rate!==null?'Completed actions have closed on time '+m.rate+'% of the time.':'');
 }
 const picks=m.openL.filter(a=>over(a)>0||a.status==='blocked'||a.carried>=2).sort((a,b)=>score(b)-score(a)).slice(0,3);
 const ask=picks.map(a=>'<div class="ask-item"><div><b>'+esc(a.title)+'</b><span class="sub">'+esc(P(a.owner).name)+' &middot; '+esc(reasons(a).slice(0,3).join(', '))+'</span></div><span class="acts">'+nudgeBtn(a)+'<button class="btn sm" data-act="open" data-id="'+a.id+'">Open</button></span></div>').join('');
 return '<section class="card brief"><span class="tag"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.8 5.6L19.5 9l-5.7 1.4L12 16l-1.8-5.6L4.5 9l5.7-1.4z"/></svg>AI summary</span>'
  +'<h2>'+esc(head)+'</h2><p class="t">'+esc(txt)+'</p>'+(ask?'<div class="ask">'+ask+'</div>':'')
  +'<p class="note" style="color:var(--red)">Written from your live data in this preview. Connect Claude later for natural-language briefs.</p></section>';
}
const wa=(ph,text)=>'https://wa.me/'+(ph?String(ph).replace(/\D/g,''):'')+'?text='+encodeURIComponent(text);
function nudgeMsg(a){
 const o=P(a.owner),d=over(a),me=viewer().name,t='"'+a.title+'"';
 let body;
 if(d>0)body=t+' is '+d+(d===1?' day':' days')+' overdue (it was due '+fmt(a.due)+').\n\nPlease follow up on it now and post an update in the tracker. If you cannot close it, request an extension in the tracker with a new date and a reason.';
 else if(left(a)===0)body='Today is the due date for '+t+'.\n\nPlease follow up on it now. If it cannot be done today, request an extension in the tracker with a new date and a reason. Otherwise please post an update when it is done.';
 else body=t+' is due '+fmt(a.due)+' ('+left(a)+(left(a)===1?' day':' days')+' away).\n\nPlease follow up on it and post an update. If you will need more time, request an extension in the tracker early.';
 return 'Hi '+first(o.name)+', this is a reminder from '+me+' (Pollisum Action Tracker).\n\n'+body+'\n\nThank you.';
}
function escMsg(a){const gm=PEOPLE.find(p=>/GM/.test(p.role))||P('chris');return 'Hi '+first(gm.name)+', escalation from the Pollisum Action Tracker.\n\n"'+a.title+'" is owned by '+P(a.owner).name+' and is '+over(a)+' days overdue (due '+fmt(a.due)+').\n\nPlease help unblock it or agree a new date with '+first(P(a.owner).name)+'.'}
const waBtn=(ph,text,label,id)=>'<a class="btn sm" href="'+wa(ph,text)+'" target="_blank" rel="noopener" data-act="nudgelog" data-id="'+id+'" data-lbl="'+esc(label)+'">'+esc(label)+'</a>';
const nudgeBtn=(a,cls)=>'<a class="'+(cls||'btn sm')+'" href="'+wa(P(a.owner).phone,nudgeMsg(a))+'" target="_blank" rel="noopener" data-act="nudgelog" data-id="'+a.id+'" data-lbl="Nudge '+esc(first(P(a.owner).name))+'">Nudge '+esc(first(P(a.owner).name))+' on WhatsApp</a>';
function feed(list){
 const items=list.filter(a=>esc_level(a)).sort((a,b)=>score(b)-score(a)||left(a)-left(b)).slice(0,8);
 if(!items.length)return '<p class="sub" style="margin-top:12px">No reminders are due. Nobody is running late.</p>';
 return '<div class="feed">'+items.map(a=>{
  const lv=esc_level(a),o=P(a.owner),d=over(a),fn=first(o.name),gm=PEOPLE.find(p=>/GM/.test(p.role))||P('chris');let cls=lv,msg,btn=waBtn(o.phone,nudgeMsg(a),'Remind '+fn,a.id);
  if(lv==='remind'){cls='remind';msg='Reminder for <b>'+esc(fn)+'</b>. Due in '+left(a)+(left(a)===1?' day.':' days.')}
  else if(lv==='due'){cls='nudge';msg='<b>'+esc(fn)+'</b> reached the due date today. Follow up, or ask for an extension.'}
  else if(lv==='nudge'){cls='nudge';msg='Overdue nudge for <b>'+esc(fn)+'</b>. '+d+(d===1?' day':' days')+' late.'}
  else if(lv==='director'){cls='director';msg='Escalate to <b>'+esc(first(gm.name))+'</b>. '+d+' days overdue.';btn+=waBtn(gm.phone,escMsg(a),'Message '+first(gm.name),a.id)}
  else{cls='ceo';msg='<b>Needs you.</b> '+d+' days overdue.'}
  return '<div class="ev"><span class="dot d-'+cls+'"></span><div><div>'+msg+'</div><div class="sub">'+esc(a.title.length>64?a.title.slice(0,62)+'...':a.title)+'</div><div class="acts" style="margin-top:8px;flex-wrap:wrap">'+btn+'</div></div></div>';
 }).join('')+'</div>';
}
function deptBars(list){
 return depts().map(d=>{
  const l=list.filter(a=>P(a.owner).dept===d),m=metrics(l),n=l.length||1;
  const ontrack=m.open-m.overdue;
  return '<div class="dept"><span>'+esc(d)+'</span><div class="stack" title="'+m.doneN+' done, '+ontrack+' on track, '+m.overdue+' overdue"><i class="g" style="width:'+m.doneN/n*100+'%"></i><i class="a" style="width:'+ontrack/n*100+'%"></i><i class="r" style="width:'+m.overdue/n*100+'%"></i></div><span class="'+(m.overdue?'num-crit':'sub')+'" style="text-align:right">'+m.overdue+' late</span></div>';
 }).join('')+'<div class="legend"><span style="--c:var(--navy)">Done</span><span style="--c:#E9A3AA">On track</span><span style="--c:var(--signal)">Overdue</span></div>';
}
function peopleTable(list){
 const rows=PEOPLE.filter(p=>p.id!=='chris').map(p=>{const m=metrics(list.filter(a=>a.owner===p.id));return {p,m}}).filter(r=>r.m.open+r.m.doneN>0).sort((a,b)=>b.m.overdue-a.m.overdue||a.m.rate-b.m.rate);
 return '<div class="tw"><table><thead><tr><th>Owner</th><th>Open</th><th>Overdue</th><th>On time</th></tr></thead><tbody>'
 +rows.map(r=>'<tr><td>'+who(r.p.id)+'</td><td>'+r.m.open+'</td><td class="'+(r.m.overdue?'num-crit':'')+'">'+r.m.overdue+'</td><td>'+(r.m.rate===null?'-':r.m.rate+'%')+'</td></tr>').join('')+'</tbody></table></div>';
}
function dashboard(){
 const list=A(),m=metrics(list),h=new Date().getHours(),g=h<12?'Good morning':h<18?'Good afternoon':'Good evening';
 if(!list.length)return '<div class="hello"><h1>'+g+', '+esc(first(viewer().name))+'</h1><p>'+TODAY.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})+'</p></div>'+empty('A clean slate','Capture the first decision from your next meeting. It takes one sentence, for example "Cannie to chase the lease enquiries by Friday".','<button class="btn primary" data-act="new">Add the first action</button>');
 const need=m.openL.filter(a=>over(a)>0||a.status==='blocked'||a.carried>=2).sort((a,b)=>score(b)-score(a)).slice(0,5);
 const slip=m.openL.filter(a=>a.carried>=2).sort((a,b)=>b.carried-a.carried);
 const k=(n,l,cls,f)=>'<button class="kpi '+cls+'" data-act="goto" data-f="'+f+'"><div class="n">'+n+'</div><div class="l">'+l+'</div></button>';
 return '<div class="hello"><h1>'+g+', '+esc(first(viewer().name))+'</h1><p>'+TODAY.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})+'. Here is what needs you today.</p></div>'+'<div class="acts" style="max-width:440px"><button class="btn" data-act="digest">Weekly digest</button></div>'+reqCard()
 +brief(m,list)
 +'<div class="kpis">'+k(m.open,'Outstanding','','open')+k(m.overdue,'Overdue','crit','overdue')+k(m.week,'Due in 7 days','','week')+k(m.high,'High priority open','','high')+k(m.rate===null?'-':m.rate+'%','Closed on time','good','done')+'</div>'
 +'<div class="grid2"><section class="card"><h2>Needs your intervention</h2><p class="sub">Overdue, blocked or repeatedly carried over.</p><div class="list">'
 +(need.length?need.map((a,i)=>'<button class="row" data-act="open" data-id="'+a.id+'"><div class="rl"><span class="num">'+(i+1)+'</span><div><div class="rt">'+esc(a.title)+'</div><div class="rm">'+who(a.owner)+'<span>'+esc(reasons(a).slice(0,2).join(' · '))+'</span></div></div></div>'+pillsMini(a)+'</button>').join(''):'<p class="sub" style="margin-top:8px">Nothing needs you right now.</p>')
 +'</div></section><section class="card"><h2>Reminders and escalations</h2><p class="sub">Messages ready to send on WhatsApp.</p>'+feed(list)+'<p class="note">Each button opens WhatsApp with the message already written. You tap send. Sending without a tap needs the WhatsApp Business API, which your IT would set up.</p></section></div>'
 +'<div class="grid2"><section class="card"><h2>Overdue by department</h2><p class="sub">Where actions are not closing.</p>'+deptBars(list)+'</section>'
 +'<section class="card"><h2>By owner</h2><p class="sub">Open load and track record.</p>'+peopleTable(list)+'</section></div>'
 +'<div class="grid2"><section class="card"><h2>Keeps slipping</h2><p class="sub">Carried over two or more times.</p><div class="list">'
 +(slip.length?slip.map(a=>'<button class="row" data-act="open" data-id="'+a.id+'"><div><div class="rt">'+esc(a.title)+'</div><div class="rm">'+who(a.owner)+'</div></div><span class="pill p-high">'+a.carried+'x carried</span></button>').join(''):'<p class="sub">No repeat misses.</p>')
 +'</div></section><section class="card"><h2>Productivity</h2><p class="sub">Across all visible actions.</p>'
 +'<table><tbody><tr><td>Closed on time</td><td><b>'+(m.rate===null?'-':m.rate+'%')+'</b></td></tr><tr><td>Average days overdue</td><td><b>'+m.avgOver+'</b></td></tr><tr><td>Average days to complete</td><td><b>'+m.avgDays+'</b></td></tr><tr><td>Overdue right now</td><td><b>'+m.overdue+'</b></td></tr><tr><td>Repeat misses</td><td><b>'+slip.length+'</b></td></tr></tbody></table></section></div>';
}
function pillsMini(a){return '<span class="pill p-'+a.pri+'">'+PRI[a.pri]+'</span>'}

const FILTERS=[['all','All'],['open','Open'],['overdue','Overdue'],['week','Due this week'],['high','High priority'],['done','Done']];
function matchF(a,f){switch(f){case 'open':return isOpen(a);case 'overdue':return over(a)>0;case 'week':return isOpen(a)&&left(a)>=0&&left(a)<=7;case 'high':return isOpen(a)&&a.pri==='high';case 'done':return a.status==='done';default:return true}}
function actionsView(){
 const l=A();
 return '<div class="toolbar"><div class="chips" id="chips"></div><input class="search" id="q" type="search" placeholder="Search actions or people" value="'+esc(UI.q)+'" aria-label="Search actions"><span style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><span class="seg" role="group" aria-label="View"><button data-act="view" data-v="board" aria-pressed="'+(UI.view==='board')+'">Board</button><button data-act="view" data-v="list" aria-pressed="'+(UI.view!=='board')+'">List</button></span>'+(UI.view==='board'?'<label class="grp"><span class="lab">Group by</span><select id="grp"><option value="status"'+((UI.group||'status')==='status'?' selected':'')+'>Status</option><option value="owner"'+(UI.group==='owner'?' selected':'')+'>Owner</option></select></label>':'')+'<button class="btn sm" data-act="export">Export</button></span></div>'+(paneMode()?'<div class="split"><div id="list"></div><div id="pane"></div></div>':'<div id="list"></div>');
}
function chips(){
 const l=A();$('#chips').innerHTML=FILTERS.map(f=>'<button class="chip" data-act="filter" data-f="'+f[0]+'" aria-pressed="'+(UI.filter===f[0])+'">'+f[1]+'<small>'+l.filter(a=>matchF(a,f[0])).length+'</small></button>').join('');
}
function renderList(){
 const q=UI.q.trim().toLowerCase();
 const l=sorted(A().filter(a=>matchF(a,UI.filter)&&(!q||(a.title+' '+P(a.owner).name+' '+a.src+' '+P(a.owner).dept).toLowerCase().includes(q))));
 if(UI.view==='board'&&A().length){$('#list').innerHTML=boardHTML(l);return}
 $('#list').innerHTML=l.length?(paneMode()?'<div class="rowlist">'+l.map(listRow).join('')+'</div>':'<div class="cards">'+l.map(a=>actionCard(a)).join('')+'</div>'):
  (A().length?empty('Nothing matches','Try a different filter or clear the search.','<button class="btn" data-act="filter" data-f="all">Show everything</button>'):empty('No actions yet','Actions from your meetings and instructions will gather here, with an owner and a deadline on each.','<button class="btn primary" data-act="new">Add an action</button>'));
 if(paneMode())renderPane();
}
function myView(){
 const me=viewer(),l=sorted(S.actions.filter(a=>a.owner===me.id&&visible(a)));
 const od=l.filter(a=>over(a)>0),wk=l.filter(a=>isOpen(a)&&over(a)===0&&left(a)<=7),lt=l.filter(a=>isOpen(a)&&left(a)>7),dn=l.filter(a=>a.status==='done').slice(0,3);
 const sec=(t,arr)=>arr.length?'<section class="sec"><h3>'+t+' ('+arr.length+')</h3><div class="cards">'+arr.map(a=>actionCard(a,t!=='Recently done')).join('')+'</div></section>':'';
 const openN=od.length+wk.length+lt.length;
 return '<div class="me"><div class="hello"><h1>Your actions, '+esc(first(me.name))+'</h1><p>'+(openN?openN+' open'+(od.length?', '+od.length+' overdue':'')+'. Tap one to update it.':'Nothing waiting on you.')+'</p></div>'
 +needCard([...od,...wk.filter(a=>left(a)===0)])+(openN?sec('Overdue',od)+sec('Due this week',wk)+sec('Later',lt):empty('All clear, '+esc(first(me.name)),'You have no open actions. When something is assigned to you, it will appear here and you will get a reminder before it is due.'))
 +sec('Recently done',dn)+'</div>';
}


/* ---------- calendar ---------- */
function calendarView(){
 const {y,m}=UI.cal,first1=new Date(y,m,1),startOff=(first1.getDay()+6)%7;
 const gridStart=addDays(first1,-startOff);
 const list=A().filter(a=>UI.calOwner==='all'||a.owner===UI.calOwner);
 const myTodos=(S.todos[UI.viewer]||[]).map((t,i)=>({...t,i})).filter(t=>t.due&&(UI.calOwner==='all'||UI.calOwner===UI.viewer));
 const tdBy={};myTodos.forEach(t=>{(tdBy[t.due]=tdBy[t.due]||[]).push(t)});
 const byDay={};list.forEach(a=>{(byDay[a.due]=byDay[a.due]||[]).push(a)});
 const title=first1.toLocaleDateString('en-GB',{month:'long',year:'numeric'});
 let cells='';
 for(let i=0;i<42;i++){
  const d=addDays(gridStart,i),k=iso(d),items=byDay[k]||[],tds=tdBy[k]||[],cls=['cd'];
  if(d.getMonth()!==m)cls.push('out');if(k===T)cls.push('today');if(k===UI.calDay)cls.push('sel');
  const chip=a=>'<i class="cc'+(a.status==='done'?' done':over(a)>0?' over':'')+(a.owner===UI.viewer?' mine':'')+'" title="'+esc(P(a.owner).name+': '+a.title)+'">'+esc(first(P(a.owner).name))+'</i>';
  const tchip=t=>'<i class="cc todo'+(t.done?' done':'')+'" title="'+esc('My to-do: '+t.text)+'">To-do</i>';
  const chips=items.map(chip).concat(tds.map(tchip));
  cells+='<button class="'+cls.join(' ')+'" data-act="calday" data-d="'+k+'" aria-label="'+esc(fmt(k))+', '+chips.length+' due"><span class="dn">'+d.getDate()+'</span><span class="cdots">'+chips.slice(0,2).join('')+'</span>'+(chips.length>2?'<span class="more">+'+(chips.length-2)+' more</span>':'')+'</button>';
 }
 const day=sorted(list.filter(a=>a.due===UI.calDay));const dayT=myTodos.filter(t=>t.due===UI.calDay);
 const next=list.filter(isOpen).sort((a,b)=>left(a)-left(b)).slice(0,6);
 const row=a=>'<button class="row" data-act="open" data-id="'+a.id+'"><div><div class="rt">'+esc(a.title)+'</div><div class="rm">'+who(a.owner)+dueEl(a)+'</div></div>'+pillsMini(a)+'</button>';
 const owners=PEOPLE.filter(p=>p.id!=='chris'&&A().some(a=>a.owner===p.id));
 return '<div class="calhead"><h2>'+esc(title)+'</h2><div class="calnav"><button class="btn sm" data-act="calprev" aria-label="Previous month">Prev</button><button class="btn sm" data-act="caltoday">Today</button><button class="btn sm" data-act="calnext" aria-label="Next month">Next</button></div></div>'
 +'<div class="chips"><button class="chip" data-act="calowner" data-o="all" aria-pressed="'+(UI.calOwner==='all')+'">Everyone</button>'+owners.map(p=>'<button class="chip" data-act="calowner" data-o="'+p.id+'" aria-pressed="'+(UI.calOwner===p.id)+'">'+esc(p.name)+'</button>').join('')+'</div>'
 +'<div class="card" style="padding:14px"><div class="calgrid">'+['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(w=>'<div class="wd">'+w+'</div>').join('')+cells+'</div><div class="legend" style="margin-top:12px"><span style="--c:var(--signal)">Overdue</span><span style="--c:var(--blush)">Open</span><span style="--c:var(--line)">Done</span><span style="--c:var(--navy)">My to-do (only you see these)</span></div></div>'
 +'<div class="grid2"><section class="card"><h2>'+esc(fmt(UI.calDay))+(UI.calDay===T?' (today)':'')+'</h2><p class="sub">'+(day.length+dayT.length)+((day.length+dayT.length)===1?' item':' items')+' due</p><div class="list">'+((day.length||dayT.length)?day.map(row).join('')+dayT.map(t=>'<div class="row" style="cursor:default"><div><div class="rt">'+esc(t.text)+'</div><div class="rm"><span class="pill s-todo">My to-do</span>'+(t.done?'<span class="due ok">Done</span>':'')+'</div></div><button class="tick" data-act="tdtoggle" data-i="'+t.i+'" aria-label="Toggle done" style="'+(t.done?'background:var(--signal);border-color:var(--signal)':'')+'">'+(t.done?'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>':'')+'</button></div>').join(''):'<p class="sub" style="margin-top:8px">Nothing is due on this day.</p>')+'</div></section>'
 +'<section class="card"><h2>Coming up</h2><p class="sub">Next deadlines'+(UI.calOwner==='all'?' for everyone':' for '+esc(P(UI.calOwner).name))+'.</p><div class="list">'+(next.length?next.map(row).join(''):'<p class="sub" style="margin-top:8px">No open actions.</p>')+'</div></section></div>';
}

/* ---------- personal to-do ---------- */
function todoView(){
 const me=viewer(),l=(S.todos[me.id]||[]).map((t,i)=>({...t,i}));
 const od=[...l.filter(t=>!t.done),...l.filter(t=>t.done)];
 const n=l.filter(t=>!t.done).length;
 return '<div class="todo"><div class="hello"><h1>My to-do, '+esc(first(me.name))+'</h1><p>Private to you. Not shared with anyone, and separate from actions assigned by management.</p></div>'
 +'<form class="tdf" id="tdf"><label class="lab" for="td-text" style="width:100%">Add something for yourself</label><input type="text" id="td-text" placeholder="For example: prepare for Monday meeting" autocomplete="off" required><input type="date" id="td-due" aria-label="Optional date"><button class="btn primary" type="submit">Add</button></form>'
 +(od.length?'<div class="tds">'+od.map(t=>'<div class="td'+(t.done?' done':'')+'"><button class="tick" data-act="tdtoggle" data-i="'+t.i+'" aria-label="'+(t.done?'Mark not done':'Mark done')+'">'+(t.done?'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>':'')+'</button><span class="tt">'+esc(t.text)+'</span>'+(t.due?'<span class="due '+(!t.done&&t.due<T?'over':'ok')+'">'+esc(fmt(t.due))+'</span>':'')+'<button class="x" data-act="tddel" data-i="'+t.i+'" aria-label="Delete">&times;</button></div>').join('')+'</div><p class="sub">'+n+' to do</p>':empty('Your list is empty','Jot down the small things you do not want to forget. Only you can see them.'))
 +'</div>';
}

/* ---------- team ---------- */
function teamView(){
 const ppl=PEOPLE.filter(p=>p.id!=='chris');
 return '<div class="calhead"><div class="hello"><h1>Your team</h1><p>People who can be assigned actions. Add someone and give them their first action.</p></div><button class="btn primary" data-act="addperson">Add person</button></div>'
 +'<div class="cards">'+ppl.map(p=>{const m=metrics(S.actions.filter(a=>a.owner===p.id));
  return '<article class="card pcard"><div class="top2">'+av(p.id)+'<div style="min-width:0"><h3>'+esc(p.name)+'</h3><div class="sub">'+esc(p.role)+' &middot; '+esc(p.dept)+'</div></div></div>'
  +'<div class="stats"><div><b>'+m.open+'</b><small>Open</small></div><div><b style="'+(m.overdue?'':'color:var(--muted)')+'">'+m.overdue+'</b><small>Overdue</small></div></div>'
  +'<div class="field"><label for="ph-'+p.id+'">WhatsApp number</label><input id="ph-'+p.id+'" data-phone="'+p.id+'" inputmode="tel" placeholder="65 9123 4567" value="'+esc(p.phone||'')+'"></div>'
  +'<div style="display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap"><span class="pill '+(p.exec?'s-doing':'s-todo')+'">'+(p.exec?'Management view':'Owner')+'</span><button class="btn sm" data-act="new" data-owner="'+p.id+'">Assign action</button></div></article>'}).join('')+'</div>'+rulesCard();
}
function personModal(){
 return '<div class="scrim center" data-act="close"><form class="modal" id="pf" data-stop role="dialog" aria-label="Add person"><div style="display:flex;justify-content:space-between;align-items:center"><h2 style="font-size:24px">Add person</h2><button type="button" class="btn sm ghost" data-act="close">Cancel</button></div>'
 +'<div class="field"><label for="p-name">Name</label><input id="p-name" required autocomplete="off"></div>'
 +'<div class="two"><div class="field"><label for="p-role">Role</label><input id="p-role" placeholder="For example: Yard Supervisor" autocomplete="off"></div>'
 +'<div class="field"><label for="p-dept">Department</label><input id="p-dept" list="depts" placeholder="For example: Operations" autocomplete="off"><datalist id="depts">'+depts().map(d=>'<option value="'+esc(d)+'">').join('')+'</datalist></div></div>'
 +'<div class="field"><label for="p-phone">WhatsApp number</label><input id="p-phone" inputmode="tel" placeholder="65 9123 4567" autocomplete="off"></div>'
 +'<label class="chk"><input type="checkbox" id="p-exec"><span>Management view. Can see the dashboard, the team and confidential actions.</span></label>'
 +'<button class="btn primary" type="submit" style="justify-content:center;padding-block:12px">Add to team</button></form></div>';
}


/* ---------- upgrades: requests, files, minutes, meetings, digest, export, rules ---------- */
let inFrame=false;try{inFrame=window.self!==window.top}catch(e){inFrame=true}
const mention=h=>h.replace(/@([A-Za-z]+)/g,'<b>@$1</b>');
function doneAction(a){
 a.status='done';a.progress=100;a.doneOn=T;log(a,a.due<T?'Marked done, '+diff(TODAY,parse(a.due))+' days late':'Marked done on time');
 let msg='Marked done. Nice work.';
 if(a.repeat&&a.repeat!=='none'){
  const base=parse(a.due)>TODAY?parse(a.due):TODAY;
  const nd=a.repeat==='weekly'?addDays(base,7):new Date(base.getFullYear(),base.getMonth()+1,base.getDate());
  S.actions.push({...a,id:S.nextId++,status:'todo',progress:0,due:iso(nd),created:T,doneOn:null,carried:0,req:undefined,files:[],log:[{d:T,who:viewer().name,text:'Repeat of the earlier action. Scheduled automatically.'}]});
  msg='Marked done. Next one is due '+fmt(iso(nd))+'.';
 }
 save();toast(msg);render();
}
function reqBlock(a,m){
 if(a.req){return '<div class="req"><div><b>Deadline request pending.</b> '+esc(P(a.req.by).name)+' asks for '+esc(fmt(a.req.to))+' (now '+esc(fmt(a.due))+'). Reason: '+esc(a.req.reason)+'</div>'+(m.exec?'<div class="acts"><button class="btn primary sm" data-act="rqok" data-id="'+a.id+'">Approve</button><button class="btn sm" data-act="rqno" data-id="'+a.id+'">Decline</button></div>':'<div class="sub">Waiting for management to approve.</div>')+'</div>'}
 if(!m.exec&&isOpen(a)){return '<div class="field"><span class="lab">Need more time?</span><div class="two"><input type="date" id="rq-date" min="'+T+'" aria-label="New deadline"><input id="rq-reason" placeholder="Short reason" aria-label="Reason"></div><div><button class="btn sm" data-act="rqsend">Request new deadline</button></div></div>'}
 return '';
}
function fileBlock(a){
 const f=a.files||[];
 const pdfIc='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M6 2h9l5 5v15H6z"/><path d="M14 2v6h6"/></svg>';
 return '<div class="field"><span class="lab">Pictures and PDFs</span>'+(f.length?'<div class="thumbs">'+f.map((x,i)=>x.img?'<div class="thumb"><img src="'+x.img+'" alt="'+esc(x.name)+'" data-act="viewfile" data-i="'+i+'" style="cursor:zoom-in"><button class="x" data-act="rmfile" data-i="'+i+'" aria-label="Remove">&times;</button></div>':'<span class="fchip">'+pdfIc+'<button class="lnk" data-act="viewfile" data-i="'+i+'">'+esc(x.name)+'</button><button class="x" data-act="rmfile" data-i="'+i+'" aria-label="Remove" style="padding:0 4px">&times;</button></span>').join('')+'</div>':'')
 +'<input type="file" id="d-file" accept="image/*,application/pdf" multiple><span class="sub">Add site photos or PDFs such as certificates and quotations. PDFs up to 1.5 MB. Tap one to view.</span></div>';
}
function openFile(a,i){
 const f=a&&a.files&&a.files[i];if(!f)return;const old=document.getElementById('lb');old&&old.remove();
 const d=document.createElement('div');d.id='lb';d.className='scrim center';d.setAttribute('data-act','lbclose');d.style.zIndex=50;
 let inner;
 if(f.img)inner='<img src="'+f.img+'" alt="'+esc(f.name)+'" style="max-width:100%;max-height:78vh;border-radius:6px;background:#fff">';
 else{let u='';try{const b=atob(f.pdf.split(',')[1]),arr=new Uint8Array(b.length);for(let k=0;k<b.length;k++)arr[k]=b.charCodeAt(k);u=URL.createObjectURL(new Blob([arr],{type:'application/pdf'}))}catch(e){}
  inner='<iframe src="'+u+'" title="'+esc(f.name)+'" style="width:min(820px,92vw);height:76vh;border:0;border-radius:6px;background:#fff"></iframe><span style="color:#fff;font-size:12px">If the PDF stays blank, open the HTML file in your browser to view it.</span>'}
 d.innerHTML='<div style="display:flex;flex-direction:column;gap:10px;align-items:flex-end;max-width:100%"><button class="btn sm" style="background:#fff" data-act="lbclose">Close</button>'+inner+'</div>';
 document.body.appendChild(d);
}
function needCard(arr){
 if(!arr.length)return '';
 return '<section class="card brief"><h2 style="font-size:20px;text-transform:uppercase;color:var(--red)">Follow up today</h2><p class="sub" style="color:var(--ink)">These are due today or overdue. Post an update, or ask for more time.</p><div class="ask">'+arr.map(a=>'<div class="ask-item"><div><b>'+esc(a.title)+'</b><span class="sub">'+dueTxt(a).t+'</span></div><span class="acts" style="flex:none"><button class="btn sm" data-act="open" data-id="'+a.id+'">Update or ask for time</button></span></div>').join('')+'</div></section>';
}
function reqCard(){
 const l=S.actions.filter(a=>a.req&&visible(a));if(!l.length||!viewer().exec)return '';
 return '<section class="card"><h2>Deadline requests</h2><p class="sub">Owners asking for more time. Approve or decline.</p><div class="list">'+l.map(a=>'<div class="row" style="cursor:default"><div><div class="rt">'+esc(a.title)+'</div><div class="rm">'+who(a.req.by)+'<span>asks for '+esc(fmt(a.req.to))+' (now '+esc(fmt(a.due))+'). '+esc(a.req.reason)+'</span></div></div><span class="acts" style="flex:none"><button class="btn primary sm" data-act="rqok" data-id="'+a.id+'">Approve</button><button class="btn sm" data-act="rqno" data-id="'+a.id+'">Decline</button></span></div>').join('')+'</div></section>';
}
function rulesCard(){
 const R=S.rules,f=(k,l)=>'<div class="field"><label for="rule-'+k+'">'+l+'</label><input type="number" min="0" max="60" id="rule-'+k+'" data-rule="'+k+'" value="'+R[k]+'"></div>';
 return '<section class="card"><h2>Reminder and escalation rules</h2><p class="sub">Set when the system reminds owners and escalates. Use 0 to switch a step off. The Reminders card on the dashboard shows what is due.</p><div class="rules">'
 +f('remind','Remind owner, days before deadline')+f('nudge','Nudge owner, days overdue')+f('gm','Escalate to Andrew (GM), days overdue')+f('ceo','Escalate to you (CEO), days overdue')+'</div></section>'
 +'<section class="card"><h2>Use it on your phone</h2><p class="sub">Open the app on your phone, tap Share, then Add to Home Screen. It opens full screen like an app.</p></section>';
}
function meetingsView(){
 const l=A(),g={};l.forEach(a=>{(g[a.src]=g[a.src]||[]).push(a)});
 const ms=Object.entries(g).map(([name,arr])=>({name,arr,last:arr.reduce((m,a)=>a.created>m?a.created:m,'')})).sort((a,b)=>b.last.localeCompare(a.last));
 const agenda=l.filter(a=>isOpen(a)&&(over(a)>0||a.carried>0||a.status==='blocked'||a.req)).sort((a,b)=>score(b)-score(a));
 if(!l.length)return '<div class="hello"><h1>Meetings</h1></div>'+empty('No meetings yet','Add an action and give it a meeting name. Actions are grouped here by meeting.','<button class="btn primary" data-act="new">Add an action</button>');
 const row=a=>'<button class="row" data-act="open" data-id="'+a.id+'"><div><div class="rt">'+esc(a.title)+'</div><div class="rm">'+who(a.owner)+dueEl(a)+'</div></div><span class="pill s-'+a.status+'">'+STATUS[a.status]+'</span></button>';
 return '<div class="calhead"><div class="hello"><h1>Meetings</h1><p>Actions grouped by the meeting they came from.</p></div><button class="btn primary" data-act="new">New action</button></div>'
 +'<section class="card brief"><h2>Review first at the next meeting</h2><p class="sub" style="color:var(--ink)">Overdue, blocked, carried over or waiting on a decision.</p><div class="ask">'
 +(agenda.length?agenda.map(a=>'<div class="ask-item"><div><b>'+esc(a.title)+'</b><span class="sub">'+esc(P(a.owner).name)+' &middot; '+esc(a.src)+' &middot; '+esc((reasons(a).filter(r=>r!=='high priority').concat(a.req?['deadline request']:[])).join(', ')||'open')+'</span></div><button class="btn sm" data-act="open" data-id="'+a.id+'">Open</button></div>').join(''):'<div class="ask-item"><div><b>Nothing to carry forward.</b></div></div>')+'</div></section>'
 +'<div class="cards">'+ms.map(m=>{const c=metrics(m.arr);return '<section class="card"><h2 style="font-size:18px;text-transform:none;color:var(--ink)">'+esc(m.name)+'</h2><p class="sub">Last action added '+esc(fmt(m.last))+'</p><div class="stats" style="margin-top:12px"><div><b>'+c.open+'</b><small>Open</small></div><div><b style="'+(c.overdue?'':'color:var(--muted)')+'">'+c.overdue+'</b><small>Overdue</small></div><div><b style="color:var(--muted)">'+c.doneN+'</b><small>Done</small></div></div><div class="list">'+sorted(m.arr).slice(0,4).map(row).join('')+'</div><div style="margin-top:12px"><button class="btn sm" data-act="new" data-src="'+esc(m.name)+'">Add action</button></div></section>'}).join('')+'</div>';
}
function digestData(){
 const l=A(),m=metrics(l);
 return {l,m,ov:m.ov.slice().sort((a,b)=>score(b)-score(a)),wk:m.openL.filter(a=>left(a)>=0&&left(a)<=7).sort((a,b)=>left(a)-left(b)),slip:m.openL.filter(a=>a.carried>=2),rq:l.filter(a=>a.req)};
}
function waDigest(){
 const {m,ov,wk,slip,rq}=digestData();
 const ln=a=>'• '+a.title+' - '+first(P(a.owner).name)+(over(a)?' ('+over(a)+'d late)':' (due '+fmt(a.due)+')');
 const o=['*POLLISUM WEEKLY DIGEST*','Week of '+fmt(T),'','*'+m.open+' open  |  '+m.overdue+' overdue  |  '+m.week+' due in 7 days*','Closed on time: '+(m.rate===null?'n/a':m.rate+'%'),''];
 o.push('*Overdue*');o.push(...(ov.length?ov.map(ln):['• None']));o.push('','*Due this week*');o.push(...(wk.length?wk.map(ln):['• None']));
 if(slip.length){o.push('','*Keeps slipping*');o.push(...slip.map(a=>ln(a)+', carried over '+a.carried+'x'))}
 if(rq.length){o.push('','*Needs your decision*');o.push(...rq.map(a=>'• '+first(P(a.req.by).name)+' asks to move "'+a.title+'" to '+fmt(a.req.to)+'. '+a.req.reason))}
 return o.join('\n');
}
function digestModal(){
 const {m,ov,wk,slip,rq}=digestData();
 const logo=(document.querySelector('.logo')||{}).src||'';
 const row=(a,tag,cls)=>'<div class="dgr">'+av(a.owner)+'<div class="dgt"><b>'+esc(a.title)+'</b><small>'+esc(P(a.owner).name)+' &middot; '+esc(P(a.owner).dept)+'</small></div><span class="pill '+cls+'">'+esc(tag)+'</span></div>';
 const sec=(t,arr,fn,none)=>'<section class="dgs"><h3>'+t+(arr.length?' ('+arr.length+')':'')+'</h3>'+(arr.length?arr.map(fn).join(''):'<p class="sub">'+none+'</p>')+'</section>';
 const tile=(n,l,c)=>'<div class="dgk"><b style="'+(c||'')+'">'+n+'</b><small>'+l+'</small></div>';
 return '<div class="scrim center" data-act="close"><div class="modal dg" data-stop role="dialog" aria-label="Weekly digest">'
 +'<div class="dgh"><img src="'+logo+'" alt="Pollisum" style="height:30px;width:auto"><button type="button" class="btn sm" style="color:#fff;border-color:#fff;background:transparent" data-act="close">Close</button></div>'
 +'<div class="dgb"><div><span class="lab">Weekly management digest</span><h2 style="font-size:28px;margin-top:6px">Week of '+esc(fmt(T))+'</h2><p class="sub" style="margin-top:6px">'+(m.overdue?m.overdue+(m.overdue===1?' action is overdue and needs':' actions are overdue and need')+' follow-up.':'Nothing is overdue this week.')+'</p></div>'
 +'<div class="dgkk">'+tile(m.open,'Open')+tile(m.overdue,'Overdue','color:var(--signal)')+tile(m.week,'Due in 7 days')+tile(m.rate===null?'-':m.rate+'%','Closed on time','color:var(--good)')+'</div>'
 +sec('Overdue',ov,a=>row(a,over(a)+(over(a)===1?' day late':' days late'),'p-high'),'Nothing overdue.')
 +sec('Due this week',wk,a=>row(a,left(a)===0?'Today':fmt(a.due),'p-med'),'Nothing due in the next 7 days.')
 +(slip.length?sec('Keeps slipping',slip,a=>row(a,'Carried over '+a.carried+'x','p-high'),''):'')
 +(rq.length?sec('Needs your decision',rq,a=>'<div class="dgr">'+av(a.req.by)+'<div class="dgt"><b>'+esc(first(P(a.req.by).name))+' asks to move "'+esc(a.title)+'" to '+esc(fmt(a.req.to))+'</b><small>'+esc(a.req.reason)+'</small></div></div>',''):'')
 +'<div class="acts" style="flex-wrap:wrap"><a class="btn primary" href="'+wa('',waDigest())+'" target="_blank" rel="noopener">Send to WhatsApp</a><button class="btn" data-act="copy" data-t="x-dg">Copy WhatsApp text</button></div><p class="note" style="margin:0">WhatsApp opens with this summary written out. Choose who to send it to and tap send.</p>'
 +'<textarea id="x-dg" readonly aria-hidden="true" tabindex="-1" style="position:absolute;left:-9999px;top:0">'+esc(waDigest())+'</textarea></div></div></div>';
}
function csvText(){
 const q=v=>'"'+String(v).replace(/"/g,'""')+'"';
 const rows=[['Action','Owner','Department','Priority','Status','Progress %','Due date','Days overdue','Source','Carried over','Repeats']];
 sorted(A()).forEach(a=>rows.push([a.title,P(a.owner).name,P(a.owner).dept,PRI[a.pri],STATUS[a.status],a.progress,a.due,over(a),a.src,a.carried,a.repeat||'none']));
 return rows.map(r=>r.map(q).join(',')).join('\n');
}
function exportModal(){
 return '<div class="scrim center" data-act="close"><div class="modal" data-stop role="dialog" aria-label="Export"><div style="display:flex;justify-content:space-between;align-items:center"><h2 style="font-size:24px">Export actions</h2><button type="button" class="btn sm ghost" data-act="close">Close</button></div><p class="sub">'+A().length+' actions you can see. Copy and paste into Excel, or '+(inFrame?'open the HTML file for download and print buttons.':'download the file.')+'</p><textarea class="mono" id="x-csv" readonly>'+esc(csvText())+'</textarea><div class="acts"><button class="btn primary" data-act="copy" data-t="x-csv">Copy CSV</button>'+(inFrame?'':'<button class="btn" data-act="dl">Download CSV</button><button class="btn" data-act="print">Print</button>')+'</div></div></div>';
}

/* ---------- drawer & modal ---------- */
function bCard(a,grp){
 const can=viewer().exec||a.owner===UI.viewer;
 return '<article class="bc'+(a.status==='done'?' done':'')+'" draggable="'+(can?'true':'false')+'" data-act="open" data-id="'+a.id+'" tabindex="0" role="button" aria-label="'+esc(a.title)+'"><b>'+esc(a.title)+'</b>'
 +'<div class="bm">'+(grp==='owner'?'<span class="pill s-'+a.status+'">'+STATUS[a.status]+'</span>':who(a.owner))+dueEl(a)+'</div>'
 +'<div class="bm" style="justify-content:flex-start"><span class="pill p-'+a.pri+'">'+PRI[a.pri]+'</span>'+(a.req?'<span class="pill p-med">Deadline request</span>':'')+(a.files&&a.files.length?'<span class="src">'+a.files.length+' attached</span>':'')+(a.repeat&&a.repeat!=='none'?'<span class="src">Repeats</span>':'')+'</div>'
 +(isOpen(a)&&a.progress?'<div class="bar" title="'+a.progress+'% complete"><i style="width:'+a.progress+'%"></i></div>':'')+'</article>';
}
function boardHTML(list){
 const grp=UI.group||'status';
 const cols=grp==='owner'?PEOPLE.filter(p=>p.id!=='chris').map(p=>({key:p.id,title:first(p.name),sub:p.role,cls:'own',own:p.id,items:list.filter(a=>a.owner===p.id)}))
  :[['todo','Not started'],['doing','In progress'],['blocked','Blocked'],['done','Done']].map(([k,t])=>({key:k,title:t,cls:k,items:list.filter(a=>a.status===k)}));
 return '<div class="board">'+cols.map(c=>'<section class="col '+c.cls+'" data-col="'+c.key+'" data-grp="'+grp+'"><header><span class="ct">'+(c.own?av(c.own)+' ':'')+esc(c.title)+'</span><span class="cn">'+c.items.length+(c.items.length===1?' item':' items')+'</span></header>'
  +(c.items.length?sorted(c.items).map(a=>bCard(a,grp)).join(''):'<p class="sub" style="padding:6px 4px">Nothing here.</p>')
  +(c.key==='done'&&grp==='status'?'':'<button class="addi" data-act="new" '+(c.own?'data-owner="'+c.own+'"':'data-status="'+c.key+'"')+'>+ Add item</button>')+'</section>').join('')+'</div>';
}
function moveCard(a,grp,key){
 const m=viewer();
 if(grp==='status'){
  if(a.status===key)return;
  if(!(m.exec||a.owner===m.id)){toast('Only the owner or management can move this action');return}
  if(key==='done'){doneAction(a);return}
  const was=a.status;a.status=key;a.doneOn=null;
  if(key==='todo')a.progress=0;else if(was==='done')a.progress=Math.min(a.progress,90);else if(was==='todo'&&a.progress===0)a.progress=10;
  log(a,'Moved to '+STATUS[key]);save();render();toast('Moved to '+STATUS[key]);
 }else{
  if(a.owner===key)return;
  if(!m.exec){toast('Only management can reassign actions');return}
  a.owner=key;log(a,'Reassigned to '+P(key).name);save();render();toast('Reassigned to '+first(P(key).name));
 }
}
const wide=()=>window.matchMedia('(min-width:1000px)').matches;
const paneMode=()=>wide()&&UI.tab==='all'&&UI.view!=='board';
function dHead(a){
 return '<div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><div class="pills" style="display:flex;gap:6px;flex-wrap:wrap">'+pills(a)+(a.conf?'<span class="pill s-todo">Confidential</span>':'')+'</div><button class="btn sm ghost" data-act="close" aria-label="Close">Close</button></div><h2>'+esc(a.title)+'</h2>';
}
function dTabs(a){
 const nA=a.log.length,nF=(a.files||[]).length,t=UI.dtab||'details';
 const b=(id,l,n)=>'<button class="dtab" role="tab" data-act="dtab" data-t="'+id+'" aria-selected="'+(t===id)+'">'+l+(n?'<small>'+n+'</small>':'')+'</button>';
 return '<div class="dtabs" role="tablist">'+b('details','Details')+b('activity','Activity',nA)+b('files','Files',nF)+'</div>';
}
function dBody(a){
 const m=viewer(),t=UI.dtab||'details';
 if(t==='activity')return '<div class="field"><label for="d-note">Add an update</label><textarea id="d-note" placeholder="Short note. Use @Name to tag someone."></textarea><div><button class="btn sm" data-act="note">Post update</button></div></div>'
  +'<div class="tl">'+[...a.log].reverse().map(e=>'<div>'+mention(esc(e.text))+'<small>'+esc(fmt(e.d))+' &middot; '+esc(e.who)+'</small></div>').join('')+'</div>';
 if(t==='files')return fileBlock(a);
 return '<div class="two"><div class="field"><label for="d-owner">Owner</label><select id="d-owner" data-field="owner"'+(m.exec?'':' disabled')+'>'+PEOPLE.filter(p=>p.id!=='chris').map(p=>'<option value="'+p.id+'"'+(p.id===a.owner?' selected':'')+'>'+esc(p.name)+'</option>').join('')+'</select></div>'
 +(m.exec||!isOpen(a)?'<div class="field"><label for="d-due">Deadline</label><input type="date" id="d-due" data-field="due" value="'+a.due+'"'+(isOpen(a)?'':' disabled')+'></div>':'<div class="field"><span class="lab">Deadline</span><div style="padding:10px 0;font-weight:700">'+esc(fmt(a.due))+'</div></div>')+'</div>'
 +'<div class="kv"><span>Priority</span><span><span class="pill p-'+a.pri+'">'+PRI[a.pri]+'</span></span><span>Role</span><span>'+esc(P(a.owner).role)+'</span><span>Department</span><span>'+esc(P(a.owner).dept)+'</span><span>From</span><span>'+esc(a.src)+'</span><span>Repeats</span><span>'+(a.repeat&&a.repeat!=='none'?esc(a.repeat):'No')+'</span><span>Carried over</span><span>'+(a.carried?a.carried+' time'+(a.carried>1?'s':''):'Never')+'</span></div>'
 +reqBlock(a,m)+(isOpen(a)?'<div class="field"><span class="lab">Status</span><div class="seg">'+['todo','doing','blocked'].map(s=>'<button data-act="status" data-s="'+s+'" aria-pressed="'+(a.status===s)+'">'+STATUS[s]+'</button>').join('')+'</div></div>'
 +'<div class="field"><label for="d-prog">Progress: <span id="pv">'+a.progress+'%</span></label><input type="range" id="d-prog" data-field="progress" min="0" max="100" step="10" value="'+a.progress+'"></div>':'');
}
function dFoot(a){
 const m=viewer(),canNudge=a.owner!==m.id&&isOpen(a);
 return '<div class="acts">'+(isOpen(a)?'<button class="btn primary" data-act="done" data-id="'+a.id+'">Mark done</button>':'<button class="btn" data-act="reopen">Reopen</button>')+(canNudge?nudgeBtn(a,'btn'):'')+'</div>';
}
function drawer(a){
 return '<div class="scrim" data-act="close"><aside class="sheet" role="dialog" aria-label="Action detail" data-stop>'+dHead(a)+dTabs(a)+dBody(a)+'<div style="position:sticky;bottom:0;background:var(--surface);padding-top:8px">'+dFoot(a)+'</div></aside></div>';
}
function paneHTML(a){
 if(!a||!visible(a))return '<aside class="pane"><div class="pbody"><div class="empty" style="background:none;padding:40px 10px">'+art+'<h3 style="font-size:20px">Pick an action</h3><p>Select one from the list to see its details, activity and files here.</p></div></div></aside>';
 return '<aside class="pane" aria-label="Action detail"><div class="pbody">'+dHead(a)+dTabs(a)+dBody(a)+'</div><div class="pfoot">'+dFoot(a)+'</div></aside>';
}
function renderPane(reset){
 const el=$('#pane');if(!el)return;
 const cur=document.querySelector('#pane .pbody');
 const keep=reset?0:(cur?cur.scrollTop:(UI._ps||0));
 const a=UI.open!=null?byId(UI.open):null;
 el.innerHTML=paneHTML(a);
 const nb=document.querySelector('#pane .pbody');if(nb)nb.scrollTop=keep;
}
function listRow(a){
 const sel=UI.open===a.id;
 return '<button class="lr'+(sel?' sel':'')+(a.status==='done'?' done':'')+'" data-act="open" data-id="'+a.id+'" aria-pressed="'+sel+'"><span class="st '+a.status+'" title="'+STATUS[a.status]+'"></span><span style="min-width:0"><b>'+esc(a.title)+'</b><small>'+who(a.owner)+'<span>'+esc(a.src)+'</span>'+(a.files&&a.files.length?'<span>'+a.files.length+' attached</span>':'')+(a.req?'<span style="color:var(--red);font-weight:700">Deadline request</span>':'')+'</small></span><span class="rt2">'+dueEl(a)+'<span class="pill p-'+a.pri+'">'+PRI[a.pri]+'</span></span></button>';
}
function modal(){
 const me=viewer();
 return '<div class="scrim center" data-act="close"><form class="modal" id="nf" data-stop role="dialog" aria-label="New action"><div style="display:flex;justify-content:space-between;align-items:center"><h2 style="font-size:22px">New action</h2><button type="button" class="btn sm ghost" data-act="close">Cancel</button></div>'
 +'<div class="field"><label for="n-quick">Type it the way you would say it</label><input id="n-quick" placeholder="Cannie to chase the lease enquiries by Friday, urgent" autocomplete="off"><div class="parsed" id="parsed">Owner, deadline and priority fill in as you type.</div></div>'
 +'<div class="field"><label for="n-title">What needs to happen</label><input id="n-title" required></div>'
 +'<div class="two"><div class="field"><label for="n-owner">Owner</label><select id="n-owner">'+PEOPLE.filter(p=>p.id!=='chris').map(p=>'<option value="'+p.id+'">'+esc(p.name)+'</option>').join('')+'</select></div>'
 +'<div class="field"><label for="n-due">Deadline</label><input type="date" id="n-due" required value="'+off(7)+'" min="'+T+'"></div></div>'
 +'<div class="two"><div class="field"><span class="lab">Priority</span><div class="seg" id="n-pri">'+['high','med','low'].map(p=>'<button type="button" data-act="npri" data-p="'+p+'" aria-pressed="'+(p==='med')+'">'+PRI[p]+'</button>').join('')+'</div></div>'
 +'<div class="field"><label for="n-src">From meeting or project</label><input id="n-src" list="srcs" value="Directors\' Meeting"><datalist id="srcs">'+[...new Set(S.actions.map(a=>a.src))].map(s=>'<option value="'+esc(s)+'">').join('')+'</datalist></div></div>'
 +'<label style="display:flex;gap:10px;align-items:center;font-size:14px"><input type="checkbox" id="n-conf"> Confidential. Only the CEO, GM, CFO and the owner can see it.</label>'
 +'<div class="field"><label for="n-rep">Repeats</label><select id="n-rep"><option value="none">Does not repeat</option><option value="weekly">Every week</option><option value="monthly">Every month</option></select></div>'
 +'<button class="btn primary" type="submit" style="justify-content:center;padding-block:12px">Assign action</button></form></div>';
}

/* ---------- parsing the quick sentence ---------- */
function parseQuick(t){
 const out={};let s=t.trim();if(!s)return out;
 const low=s.toLowerCase();
 const p=PEOPLE.find(p=>p.id!=='chris'&&low.includes(first(p.name).toLowerCase()));
 if(p)out.owner=p.id;
 if(/\b(urgent|asap|critical|immediately)\b/i.test(s))out.pri='high';else if(/\b(whenever|low priority|no rush)\b/i.test(s))out.pri='low';
 const days=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
 const short={sun:0,mon:1,tue:2,wed:3,thu:4,fri:5,sat:6};
 let m;
 if(/\b(today|eod)\b/.test(low))out.due=T;
 else if(/\btomorrow\b/.test(low))out.due=off(1);
 else if((m=low.match(/in (\d+) days?/)))out.due=off(+m[1]);
 else if(/next week/.test(low))out.due=off(7);
 else if(/end of (the )?month/.test(low))out.due=iso(new Date(TODAY.getFullYear(),TODAY.getMonth()+1,0));
 else{
  const w=low.match(/\b(sun|mon|tue|wed|thu|fri|sat)[a-z]*\b/);
  if(w){const target=short[w[1]];let n=(target-TODAY.getDay()+7)%7;if(n===0)n=7;out.due=off(n)}
 }
 let title=s.replace(/\b(urgent|asap|critical|immediately)\b[,.]?/ig,'').replace(/\s*\b(by|before|on|this)?\s*(today|tomorrow|next week|end of (the )?month|in \d+ days?|(sun|mon|tue|wed|thu|fri|sat)[a-z]*)\b\.?/ig,'').replace(/[\s,]+$/,'').trim();
 if(p)title=title.replace(new RegExp('^'+p.name+'\\s*(to|will|should)?\\s*','i'),'').replace(new RegExp('^'+first(p.name)+'\\s*(to|will|should)?\\s*','i'),'');
 out.title=title?title.charAt(0).toUpperCase()+title.slice(1):'';
 return out;
}

/* ---------- actions on data ---------- */
function log(a,text){a.log.push({d:T,who:viewer().name,text})}
function toast(msg){const el=document.createElement('div');el.className='toast';el.textContent=msg;el.setAttribute('role','status');$('#toast-slot').appendChild(el);setTimeout(()=>el.remove(),2600)}

/* ---------- render ---------- */
function layer(){
 const L=$('#layer');
 if(UI.more){L.innerHTML=moreSheet();return}
 if(typeof UI.modal==='string'){const f={person:personModal,digest:digestModal,export:exportModal}[UI.modal];L.innerHTML=f();setTimeout(()=>{const n=$('#p-name')||$('#m-text');n&&n.focus()},30);return}
 if(UI.modal){L.innerHTML=modal();bindModal();return}
 const a=UI.open!=null?byId(UI.open):null;
 if(paneMode()){renderPane();L.innerHTML='';return}
 const keepScroll=L.querySelector('.sheet')?L.querySelector('.sheet').scrollTop:0;
 L.innerHTML=a?drawer(a):'';
 if(a&&keepScroll)L.querySelector('.sheet').scrollTop=keepScroll;
}
const ICON={
 dash:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/></svg>',
 all:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7l2 2 3-3.5M4 16l2 2 3-3.5M13 8h7M13 17h7"/></svg>',
 cal:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
 me:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c.8-3.6 3.8-5.5 7.5-5.5s6.7 1.9 7.5 5.5"/></svg>',
 todo:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.3l2.4 2.4 4.6-5"/></svg>',
 meet:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 5h16v11H9.5L5 20v-4H4z"/></svg>',
 team:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="9" r="3.3"/><circle cx="17" cy="10" r="2.5"/><path d="M3 19c.6-3.2 3-4.8 6-4.8s5.4 1.6 6 4.8M16 14.5c2.6 0 4.5 1.2 5 4"/></svg>',
 more:'<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><circle cx="5.5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="18.5" cy="12" r="2"/></svg>'};
function navDefs(){
 const ex=viewer().exec;
 return [{id:'dash',label:'Dashboard',short:'Home',ex:1},{id:'all',label:'Actions',short:'Actions'},{id:'meet',label:'Meetings',short:'Meetings',sub:'Actions grouped by meeting'},{id:'cal',label:'Calendar',short:'Calendar'},{id:'me',label:'My actions',short:'My actions'},{id:'todo',label:'My to-do',short:'To-do',sub:'Your private list'},{id:'team',label:'Team',short:'Team',ex:1,sub:'People, WhatsApp numbers and reminder rules'}].filter(x=>!x.ex||ex);
}
function moreSheet(){
 const items=navDefs().filter(x=>['meet','todo','team'].includes(x.id));
 return '<div class="scrim bottom" data-act="close"><div class="msheet" data-stop role="dialog" aria-label="More"><div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:6px"><h3 style="font-size:18px">More</h3><button class="btn sm ghost" data-act="close">Close</button></div>'
 +items.map(x=>'<button class="mrow" data-act="tab" data-t="'+x.id+'"><span class="mic">'+ICON[x.id]+'</span><span><b>'+x.label+'</b><small>'+x.sub+'</small></span></button>').join('')+'</div></div>';
}
function tabs(){
 const ex=viewer().exec,defs=navDefs();
 if(!defs.some(x=>x.id===UI.tab))UI.tab=ex?'dash':'me';
 $('#tabs').innerHTML=defs.map(x=>'<button class="tab" role="tab" data-act="tab" data-t="'+x.id+'" aria-selected="'+(UI.tab===x.id)+'">'+x.label+'</button>').join('');
 const l=A(),od=l.filter(a=>over(a)>0).length,mine=l.filter(a=>a.owner===UI.viewer&&isOpen(a)&&left(a)<=0).length;
 const prim=ex?['dash','all','cal','me']:['all','cal','me','todo','meet'];
 const bd=id=>id==='all'&&ex?od:id==='me'?mine:0;
 let h=prim.map(id=>{const x=defs.find(d=>d.id===id),n=bd(id);return '<button data-act="tab" data-t="'+id+'"'+(UI.tab===id?' aria-current="page"':'')+'>'+ICON[id]+'<span>'+x.short+'</span>'+(n?'<i class="bdg">'+n+'</i>':'')+'</button>'}).join('');
 if(ex){const inMore=['meet','todo','team'].includes(UI.tab);h+='<button data-act="more"'+(inMore?' aria-current="page"':'')+'>'+ICON.more+'<span>More</span></button>'}
 $('#bbar').innerHTML=h;
}
function render(){
 tabs();
 const mn=$('#main');
 {const ps=document.querySelector('#pane .pbody');if(ps)UI._ps=ps.scrollTop}
 mn.innerHTML=UI.tab==='dash'?dashboard():UI.tab==='all'?actionsView():UI.tab==='cal'?calendarView():UI.tab==='meet'?meetingsView():UI.tab==='todo'?todoView():UI.tab==='team'?teamView():myView();
 if(UI.tab==='all'){chips();renderList()}
 $('#fab').hidden=false;
 $('#foot-note').textContent=S.isDemo?'Showing sample data for Pollisum. Nothing here is real.':'Your data. Saved in this browser only in this preview.';
 $('#demo-toggle').textContent=S.isDemo?'Clear sample data':'Load sample data';
 layer();
}
function setViewer(){$('#viewer').innerHTML=PEOPLE.map(p=>'<option value="'+p.id+'"'+(p.id===UI.viewer?' selected':'')+'>'+esc(p.name)+' ('+esc(p.role)+')</option>').join('')}

/* ---------- events ---------- */
document.addEventListener('click',e=>{
 const t=e.target.closest('[data-act]');if(!t)return;
 const act=t.dataset.act,id=t.dataset.id?+t.dataset.id:null;
 if(act==='close'){if(t.classList.contains('scrim')&&e.target!==t)return;UI.open=null;UI.modal=false;UI.more=false;layer();if(paneMode()&&$('#list'))renderList();return}
 const a=id?byId(id):(UI.open!=null?byId(UI.open):null);
 switch(act){
  case 'tab':UI.tab=t.dataset.t;UI.more=false;render();window.scrollTo(0,0);break;
  case 'more':UI.more=true;layer();break;
  case 'goto':UI.tab='all';UI.filter=t.dataset.f==='open'?'open':t.dataset.f;render();break;
  case 'filter':UI.filter=t.dataset.f;if(UI.tab==='all'){chips();renderList()}else{UI.tab='all';render()}break;
  case 'open':
   if(wide()&&!['all','me','todo'].includes(UI.tab)){UI.tab='all';UI.filter='all';UI.q='';UI.open=id;UI._ps=0;UI.dtab='details';render();window.scrollTo(0,0)}
   else if(paneMode()){UI.open=id;UI.dtab='details';renderList();renderPane(true)}
   else{UI.open=id;UI.dtab='details';layer()}
   break;
  case 'view':UI.view=t.dataset.v;UI.open=null;render();break;
  case 'dtab':UI.dtab=t.dataset.t;layer();break;
  case 'new':UI.newStatus=t.dataset.status||'todo';UI.modal=true;UI.seg.pri='med';layer();{const ow=t.dataset.owner;if(ow){const sel=$('#n-owner');if(sel)sel.value=ow}const sr=t.dataset.src;if(sr){const el=$('#n-src');if(el)el.value=sr}}setTimeout(()=>{const q=$('#n-quick');q&&q.focus()},30);break;
  case 'addperson':UI.modal='person';layer();break;
  case 'calprev':{let {y,m}=UI.cal;m--;if(m<0){m=11;y--}UI.cal={y,m};render()}break;
  case 'calnext':{let {y,m}=UI.cal;m++;if(m>11){m=0;y++}UI.cal={y,m};render()}break;
  case 'caltoday':UI.cal={y:TODAY.getFullYear(),m:TODAY.getMonth()};UI.calDay=T;render();break;
  case 'calday':UI.calDay=t.dataset.d;{const d=parse(UI.calDay);UI.cal={y:d.getFullYear(),m:d.getMonth()}}render();break;
  case 'calowner':UI.calOwner=t.dataset.o;render();break;
  case 'tdtoggle':{const l=S.todos[UI.viewer];if(l&&l[+t.dataset.i]){l[+t.dataset.i].done=!l[+t.dataset.i].done;save();render()}}break;
  case 'tddel':{const l=S.todos[UI.viewer];if(l){l.splice(+t.dataset.i,1);save();render()}}break;
  case 'npri':UI.seg.pri=t.dataset.p;document.querySelectorAll('#n-pri button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.p===UI.seg.pri));break;
  case 'status':if(a){a.status=t.dataset.s;if(a.status==='todo')a.progress=0;log(a,'Status set to '+STATUS[a.status]);save();render()}break;
  case 'done':if(a)doneAction(a);break;
  case 'reopen':if(a){a.status='doing';a.doneOn=null;a.progress=Math.min(a.progress,90);log(a,'Reopened');save();render()}break;
  case 'note':{const n=$('#d-note');if(a&&n&&n.value.trim()){const txt=n.value.trim();log(a,txt);const tagged=[...txt.matchAll(/@([A-Za-z]+)/g)].map(x=>PEOPLE.find(p=>first(p.name).toLowerCase()===x[1].toLowerCase())).filter(Boolean);save();toast(tagged.length?'Update posted. '+tagged.map(p=>first(p.name)).join(', ')+' notified (preview).':'Update posted');layer()}else toast('Write a short note first')}break;
  case 'digest':UI.modal='digest';layer();break;
  case 'nudgelog':if(a){log(a,t.dataset.lbl+' (WhatsApp opened)');save();toast('WhatsApp opened. Tap send there.');setTimeout(()=>{if(UI.open!=null)layer()},400)}break;
  case 'viewfile':if(a||UI.open!=null){openFile(byId(UI.open),+t.dataset.i)}break;
  case 'lbclose':{const lb=document.getElementById('lb');lb&&lb.remove()}break;
  case 'export':UI.modal='export';layer();break;
  case 'copy':{const el=$('#'+t.dataset.t);if(el){el.select();let ok=false;try{navigator.clipboard.writeText(el.value).then(()=>toast('Copied'),()=>{document.execCommand&&document.execCommand('copy');toast('Copied')});ok=true}catch(e){}if(!ok){try{document.execCommand('copy');toast('Copied')}catch(e){toast('Select the text and copy it')}}}}break;
  case 'dl':{try{const b=new Blob([$('#x-csv').value],{type:'text/csv'});const u=URL.createObjectURL(b);const l=document.createElement('a');l.href=u;l.download='pollisum-actions-'+T+'.csv';document.body.appendChild(l);l.click();l.remove()}catch(e){toast('Use Copy CSV instead')}}break;
  case 'print':window.print();break;
  case 'rqsend':{const d=$('#rq-date').value,r=$('#rq-reason').value.trim();if(!a||!d||d===a.due){toast('Pick a new date');break}if(!r){toast('Add a short reason');break}a.req={to:d,reason:r,by:UI.viewer,d:T};log(a,'Asked to move the deadline to '+fmt(d)+'. Reason: '+r);save();toast('Request sent to Chris (preview)');render()}break;
  case 'rqok':if(a&&a.req){const old=a.due;a.due=a.req.to;if(a.due>old)a.carried++;log(a,'Deadline moved from '+fmt(old)+' to '+fmt(a.due)+' (request approved)');delete a.req;save();toast('Approved');render()}break;
  case 'rqno':if(a&&a.req){log(a,'Deadline request declined. Deadline stays '+fmt(a.due));delete a.req;save();toast('Declined');render()}break;
  case 'rmfile':if(a&&a.files){a.files.splice(+t.dataset.i,1);save();layer()}break;
 }
});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&(UI.open!=null||UI.modal||UI.more)){UI.open=null;UI.modal=false;UI.more=false;layer();if(paneMode()&&$('#list'))renderList()}
 if((e.key==='Enter'||e.key===' ')&&e.target.matches&&e.target.matches('.acard,.bc')){e.preventDefault();UI.open=+e.target.dataset.id;layer()}
});
document.addEventListener('input',e=>{
 if(e.target.id==='q'){UI.q=e.target.value;renderList()}
 if(e.target.id==='d-prog'){$('#pv').textContent=e.target.value+'%'}
});
document.addEventListener('change',e=>{
 const tg=e.target;
 if(tg.id==='grp'){UI.group=tg.value;render();return}
 if(tg.id==='d-file'){const a=byId(UI.open);if(!a)return;[...tg.files].forEach(f=>{
  if(f.type.startsWith('image/')){const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const sc=Math.min(1,1280/Math.max(im.width,im.height));const c=document.createElement('canvas');c.width=Math.round(im.width*sc);c.height=Math.round(im.height*sc);c.getContext('2d').drawImage(im,0,0,c.width,c.height);(a.files=a.files||[]).push({name:f.name,img:c.toDataURL('image/jpeg',.78)});log(a,'Picture added: '+f.name);save();layer()};im.src=r.result};r.readAsDataURL(f)}
  else if(f.type==='application/pdf'){if(f.size>1500000){toast(f.name+' is over 1.5 MB. Use a smaller PDF.');return}const r=new FileReader();r.onload=()=>{(a.files=a.files||[]).push({name:f.name,pdf:r.result,size:f.size});log(a,'PDF added: '+f.name);save();layer()};r.readAsDataURL(f)}
  else toast('Only pictures and PDF files can be added.')});tg.value='';return}
 if(tg.dataset&&tg.dataset.phone){const p=P(tg.dataset.phone);p.phone=tg.value.trim();save();toast('Number saved');return}
 if(tg.dataset&&tg.dataset.rule){S.rules[tg.dataset.rule]=Math.max(0,Math.round(+tg.value||0));save();render();toast('Rule saved');return}
 const f=e.target.dataset&&e.target.dataset.field;if(!f)return;
 const a=byId(UI.open);if(!a)return;
 if(f==='owner'){a.owner=e.target.value;log(a,'Reassigned to '+P(a.owner).name)}
 if(f==='due'&&e.target.value){const old=a.due;if(e.target.value>old)a.carried++;a.due=e.target.value;log(a,'Deadline moved from '+fmt(old)+' to '+fmt(a.due))}
 if(f==='progress'){a.progress=+e.target.value;if(a.progress>0&&a.status==='todo')a.status='doing';log(a,'Progress updated to '+a.progress+'%')}
 save();render();
});
$('#viewer').addEventListener('change',e=>{UI.viewer=e.target.value;UI.open=null;UI.modal=false;UI.tab=viewer().exec?'dash':'me';render()});
$('#demo-toggle').addEventListener('click',()=>{S=S.isDemo?{rules:S.rules,actions:[],isDemo:false,nextId:100,people:S.people,todos:{}}:{rules:S.rules,actions:demo(),isDemo:true,nextId:100,people:S.people,todos:todoDemo()};save();render();toast(S.isDemo?'Sample data loaded':'Sample data cleared')});

function bindModal(){
 const q=$('#n-quick');
 q.addEventListener('input',()=>{
  const r=parseQuick(q.value),bits=[];
  if(r.title)$('#n-title').value=r.title;
  if(r.owner){$('#n-owner').value=r.owner;bits.push('Owner: '+P(r.owner).name)}
  if(r.due){$('#n-due').value=r.due;bits.push('Due: '+fmt(r.due))}
  if(r.pri){UI.seg.pri=r.pri;document.querySelectorAll('#n-pri button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.p===r.pri));bits.push('Priority: '+PRI[r.pri])}
  $('#parsed').textContent=bits.length?bits.join('  |  '):'Owner, deadline and priority fill in as you type.';
 });
 $('#nf').addEventListener('submit',e=>{
  e.preventDefault();
  const title=$('#n-title').value.trim();if(!title)return;
  const id=S.nextId++;
  S.actions.push({id,title,owner:$('#n-owner').value,pri:UI.seg.pri,due:$('#n-due').value,status:UI.newStatus||'todo',progress:(UI.newStatus==='doing'?10:0),src:$('#n-src').value.trim()||'Direct instruction',conf:$('#n-conf').checked,repeat:$('#n-rep').value,carried:0,created:T,doneOn:null,log:[{d:T,who:viewer().name,text:'Created and assigned to '+P($('#n-owner').value).name}]});
  S.isDemo=S.isDemo;save();UI.modal=false;
  if(UI.tab==='dash'&&!viewer().exec)UI.tab='me';
  render();toast('Assigned to '+first(P($('#n-owner').value).name)+'. They will be notified (preview).');
 });
}

document.addEventListener('submit',e=>{
 if(e.target.id==='tdf'){
  e.preventDefault();const tx=$('#td-text').value.trim();if(!tx)return;
  const l=S.todos[UI.viewer]=S.todos[UI.viewer]||[];
  l.push({id:Date.now(),text:tx,done:false,due:$('#td-due').value||null});save();render();setTimeout(()=>{const i=$('#td-text');i&&i.focus()},20);
 }
 if(e.target.id==='pf'){
  e.preventDefault();const name=$('#p-name').value.trim();if(!name)return;
  let id=name.toLowerCase().replace(/[^a-z0-9]+/g,'')||'user';let base=id,n=2;while(PEOPLE.some(p=>p.id===id))id=base+(n++);
  PEOPLE.push({id,name,role:$('#p-role').value.trim()||'Team member',dept:$('#p-dept').value.trim()||'General',exec:$('#p-exec').checked,phone:$('#p-phone').value.trim()});
  save();UI.modal=false;setViewer();render();toast(name+' added. You can now assign actions to them.');
 }
});
function tick(){const n=new Date();const c=$('#clock');if(c)c.innerHTML='<b>'+n.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})+'</b><span>'+n.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'})+'</span>'}
tick();setInterval(tick,15000);
document.addEventListener('dragstart',e=>{const c=e.target.closest&&e.target.closest('.bc');if(c){e.dataTransfer.setData('text/plain',c.dataset.id);e.dataTransfer.effectAllowed='move';c.classList.add('drag')}});
document.addEventListener('dragend',()=>{document.querySelectorAll('.drag,.over').forEach(x=>x.classList.remove('drag','over'))});
document.addEventListener('dragover',e=>{const col=e.target.closest&&e.target.closest('.col');if(col){e.preventDefault();col.classList.add('over')}});
document.addEventListener('dragleave',e=>{const col=e.target.closest&&e.target.closest('.col');if(col&&!col.contains(e.relatedTarget))col.classList.remove('over')});
document.addEventListener('drop',e=>{const col=e.target.closest&&e.target.closest('.col');if(!col)return;e.preventDefault();col.classList.remove('over');const a=byId(+e.dataTransfer.getData('text/plain'));if(a)moveCard(a,col.dataset.grp,col.dataset.col)});
UI.view=wide()?'board':'list';
try{window.matchMedia('(min-width:1000px)').addEventListener('change',()=>{UI.open=null;render()})}catch(e){}
setViewer();render();
})();
