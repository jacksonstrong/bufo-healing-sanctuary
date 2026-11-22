(() => {
 'use strict';
 const $ = id => document.getElementById(id), config = window.PORTAL_CONFIG;
 let token='', generation=0, timer, busy=false;
 const status = message => { $('admin-status').textContent=message; };
 function clear() {
  token='';generation++;clearTimeout(timer);
  $('admin-workspace').hidden=true;$('admin-login').hidden=false;
  $('access-list').replaceChildren();$('access-decision').reset();
  $('admin-password').value='';$('decision-result').textContent='';
 }
 async function request(path, body, access=token) {
  const version=generation;
  const response=await fetch(config.url+path,{method:body===undefined?'GET':'POST',
   headers:{apikey:config.publishableKey,'Content-Type':'application/json',...(access?{Authorization:`Bearer ${access}`}:{})},
   body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',credentials:'omit'});
  if(version!==generation)throw new Error('Please sign in again.');
  if(!response.ok)throw new Error('This step could not be completed. Check your login and connection. Only Marla can manage access.');
  return response.status===204?null:response.json();
 }
 async function action(task) {
  if(busy)return;busy=true;
  const buttons=[...document.querySelectorAll('.portal button')];buttons.forEach(b=>b.disabled=true);
  try{await task();}catch(error){status(error.message);}finally{busy=false;buttons.forEach(b=>b.disabled=false);}
 }
 async function load() {
  const rows=await request('/rest/v1/access_decisions?select=email,name,access,updated_at&order=updated_at.desc&limit=1000');
  $('access-list').replaceChildren();
  for(const row of rows){
   const card=document.createElement('article');card.className='panel';
   const title=document.createElement('h3');title.textContent=row.name;
   const detail=document.createElement('p');detail.textContent=`${row.email}: ${row.access==='declined'?'Declined / revoked':row.access==='facilitator'?'Facilitator (both portals)':'Guest'}`;
   const edit=document.createElement('button');edit.className='btn btn-ghost';edit.textContent='Change access';
   edit.onclick=()=>{$('person-name').value=row.name;$('person-email').value=row.email;$('person-access').value=row.access;$('person-name').focus();};
   card.append(title,detail,edit);$('access-list').append(card);
  }
  if(!rows.length)$('access-list').textContent='No saved decisions yet.';
 }
 $('admin-signin').onsubmit=event=>{event.preventDefault();const password=$('admin-password').value;action(async()=>{
  clear();
  let session;
  try{session=await request('/auth/v1/token?grant_type=password',{email:$('admin-email').value.trim(),password},'');}
  finally{$('admin-password').value='';}
  token=session.access_token;
  try{
   const user=await request('/auth/v1/user');
   if(user.id!=='ee5f61fc-bb15-4da6-86fa-f0d45724f33a')throw new Error('Only Marla can manage access.');
   await load();$('admin-login').hidden=true;$('admin-workspace').hidden=false;
   timer=setTimeout(()=>{clear();status('Your session ended. Please sign in again.');},Math.max(0,session.expires_in-30)*1000);
   status('Welcome, Marla. Your access decisions are ready.');
  }catch(error){const access=token;clear();await request('/auth/v1/logout',{},access).catch(()=>{});throw error;}
 });};
 $('access-decision').onsubmit=event=>{event.preventDefault();action(async()=>{
  const person_email=$('person-email').value.trim().toLowerCase(),person_name=$('person-name').value.trim(),chosen_access=$('person-access').value;
  const label=chosen_access==='facilitator'?'Facilitator access to both portals':chosen_access==='guest'?'Guest access only':'Decline or revoke access to both portals';
  if(!confirm(`${label} for ${person_name} (${person_email})?`))return;
  const result=await request('/rest/v1/rpc/manage_sanctuary_access',{person_email,person_name,chosen_access});
  $('decision-result').textContent=result;status('Access decision saved.');await load();
 });};
 $('admin-refresh').onclick=()=>action(load);
 $('admin-logout').onclick=()=>{const access=token;clear();status('Signed out.');if(access)request('/auth/v1/logout',{},access).catch(()=>{});};
 window.addEventListener('pageshow',event=>{if(event.persisted)clear();});
})();
