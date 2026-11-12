(() => {
 'use strict';
 const $ = id => document.getElementById(id);
 const config = window.PORTAL_CONFIG || {};
 let token = '', guests = [], selected = null, expiry, entryId = null, busy = false, sessionVersion = 0;
 const status = message => { $('status').textContent = message; };
 const show = (id, yes) => { $(id).hidden = !yes; };
 const value = name => $('entry-form').elements.namedItem(name).value.trim();
 const configured = config.enabled === true && /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config.url) && !!config.publishableKey;
 function clearSession() {
  sessionVersion++; token=''; guests=[]; selected=null; entryId=null; clearTimeout(expiry);
  $('entry-form').reset(); $('guest-form').reset(); $('password').value=''; $('search').value='';
  $('guest-list').replaceChildren(); $('history').replaceChildren(); $('account-name').textContent='';
  $('guest-title').textContent=''; $('guest-form').reset();
  show('workspace',false);show('guest-record',false);show('login',true);
 }
 async function request(path, method='GET', data, authenticated=true) {
  if (!configured || (authenticated && !token)) throw new Error('Please sign in to continue.');
  const requestVersion=sessionVersion;
  const headers={apikey:config.publishableKey,'Content-Type':'application/json'};
  if(authenticated) headers.Authorization=`Bearer ${token}`;
  if(method==='POST' && path.startsWith('/rest/')) headers.Prefer='return=representation';
  const response=await fetch(config.url+path,{method,headers,body:data===undefined?undefined:JSON.stringify(data),cache:'no-store',credentials:'omit'});
  if(requestVersion!==sessionVersion)throw new Error('Signed out. Please sign in to continue.');
  if(!response.ok){
   if(response.status===401){clearSession();throw new Error('Your session ended. Please sign in again.');}
   if(response.status===409) throw new Error('This entry may already be saved. Open the guest history before trying again.');
   throw new Error('We could not complete that step. Please check your connection and try again.');
  }
  const result=response.status===204?null:await response.json();
  if(requestVersion!==sessionVersion)throw new Error('Signed out. Please sign in to continue.');
  return result;
 }
 async function action(form, task) {
  if(busy)return;busy=true;
  const controls=[...form.querySelectorAll('button,input,textarea')];
  const states=controls.map(control=>control.disabled);controls.forEach(control=>control.disabled=true);
  try{await task();}catch(error){status(error.message);}finally{busy=false;controls.forEach((control,i)=>control.disabled=states[i]);}
 }
 function renderGuests(){
  const matches=guests.filter(g=>g.name.toLowerCase().includes($('search').value.trim().toLowerCase()));
  $('guest-list').replaceChildren();
  for(const guest of matches){
   const li=document.createElement('li'),button=document.createElement('button');
   button.type='button';button.className='btn btn-ghost';button.textContent=guest.name;
   button.onclick=()=>action($('workspace'),async()=>{
    if(entryId && !confirm('Leave this unsaved entry?'))return;
    selected=guest;entryId=null;$('entry-form').reset();
    $('guest-title').textContent=guest.name;show('guest-record',true);
    await history();$('guest-title').focus();status('Guest record opened.');
   });li.append(button);$('guest-list').append(li);
  }
  $('guest-count').textContent=matches.length?`${matches.length} guest${matches.length===1?'':'s'} found.`:'No guests found. Add a guest to begin.';
 }
 async function loadGuests(){guests=await request('/rest/v1/guests?select=id,name&order=name.asc&limit=1000');renderGuests();}
 async function history(){
  $('history').replaceChildren();
  const rows=await request(`/rest/v1/ceremonies?guest_id=eq.${encodeURIComponent(selected.id)}&select=*&order=ceremony_date.desc,created_at.desc&limit=1000`);
  for(const row of rows){
   const article=document.createElement('article');article.className='entry';
   const heading=document.createElement('h3');heading.textContent=row.ceremony_date;article.append(heading);
   const lines=[['Preparation time',row.preparation_minutes==null?'':`${row.preparation_minutes} minutes`],['Ceremony start',row.start_time],['Ceremony end',row.end_time],['Intention / before',row.intention],
    ...row.medicines.map(m=>['Medicine',[m.medicine,m.amount,m.time].filter(Boolean).join(' · ')]),['Guest feelings',row.feelings],['Integration',row.integration]];
   for(const [label,content] of lines){if(content){const p=document.createElement('p');p.textContent=`${label}: ${content}`;article.append(p);}}
   $('history').append(article);
  }
  $('history-note').textContent=rows.length?'Saved entries, newest first.':'No entries yet for this guest.';
 }
 $('recover').onclick=()=>action($('sign-in'),async()=>{
  if(!$('email').value.trim() || !$('email').checkValidity())throw new Error('Enter your account email first.');
  await request('/auth/v1/recover?redirect_to='+encodeURIComponent(location.origin+'/reset-password'),'POST',{email:$('email').value.trim()},false);
  status('If this email has an account, a recovery email will be sent. Check your inbox and spam folder.');
 });
 $('sign-in').onsubmit=e=>{e.preventDefault();action($('sign-in'),async()=>{
  let session;
  try{session=await request('/auth/v1/token?grant_type=password','POST',{email:$('email').value.trim(),password:$('password').value},false);}finally{$('password').value='';}
  token=session.access_token;
  try{
   const profiles=await request('/rest/v1/facilitators?select=name,active');
   if(profiles.length!==1 || !profiles[0].active)throw new Error('Your facilitator access is not active. Please contact Marla.');
   $('account-name').textContent=profiles[0].name;
   await loadGuests();show('login',false);show('workspace',true);
   expiry=setTimeout(()=>{clearSession();status('Your session ended. Please sign in again.');},Math.max(0,(session.expires_in-30)*1000));
   status('Welcome. Your guest list is ready.');
  }catch(error){clearSession();throw error;}
 });};
 $('logout').onclick=async()=>{const pending=token?request('/auth/v1/logout','POST'):Promise.resolve();clearSession();try{await pending;}catch{}status('Signed out.');};
 $('search').oninput=renderGuests;
 $('guest-form').onsubmit=e=>{e.preventDefault();action($('guest-form'),async()=>{
  const name=$('guest-name').value.trim();if(!name)throw new Error('Please enter the guest’s name.');
  if(guests.some(g=>g.name.toLowerCase()===name.toLowerCase()))throw new Error('That name is already in your list. Open the existing guest record.');
  await request('/rest/v1/guests','POST',{name});$('guest-form').reset();await loadGuests();status('Guest added. Select their name to open the tracker.');
 });};
 $('entry-form').oninput=()=>{entryId ||= crypto.randomUUID();};
 $('entry-form').onsubmit=e=>{e.preventDefault();action($('entry-form'),async()=>{
  if(!selected)throw new Error('Select a guest first.');
  const medicines=[0,1,2].map(i=>({medicine:value(`medicine${i}`),amount:value(`amount${i}`),time:value(`time${i}`)})).filter(m=>m.medicine||m.amount||m.time);
  if(!medicines.length||medicines.some(m=>!m.medicine))throw new Error('Enter a medicine name for each amount or time recorded.');
  entryId ||= crypto.randomUUID();
  await request('/rest/v1/ceremonies','POST',{id:entryId,guest_id:selected.id,ceremony_date:value('date'),intention:value('intention'),preparation_minutes:value('preparation')===''?null:Number(value('preparation')),start_time:value('start')||null,end_time:value('end')||null,medicines,feelings:value('feelings'),integration:value('integration')});
  entryId=null;$('entry-form').reset();status('Entry saved.');await history();
 });};
 window.addEventListener('beforeunload',e=>{if(entryId){e.preventDefault();e.returnValue='';}});
 window.addEventListener('pageshow',e=>{if(e.persisted){clearSession();status('Please sign in again.');}});
 if(!configured){$('sign-in').querySelector('fieldset').disabled=true;status('Facilitator sign-in is being prepared. Please check back soon.');}
})();
