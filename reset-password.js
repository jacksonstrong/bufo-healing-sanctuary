(() => {
 'use strict';
 const fragment=new URLSearchParams(location.hash.slice(1));
 let token=fragment.get('type')==='recovery'?fragment.get('access_token'):null;
 history.replaceState(null,'',location.pathname);
 const config=window.PORTAL_CONFIG||{};
 const form=document.getElementById('reset-form');
 const status=document.getElementById('reset-status');
 const fieldset=form.querySelector('fieldset');
 const password=document.getElementById('new-password');
 const confirmation=document.getElementById('confirm-password');
 const ready=/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config.url)&&config.publishableKey;
 if(!token||!ready){status.textContent='Please open a fresh password recovery email to use this page.';return;}
 async function start(){
  try {
   const response=await fetch(config.url+'/auth/v1/user',{headers:{apikey:config.publishableKey,Authorization:'Bearer '+token},cache:'no-store',credentials:'omit'});
   if(!response.ok)throw new Error();
   fieldset.disabled=false;status.textContent='Choose a new password for your facilitator account.';
  }catch{token=null;status.textContent='This recovery link could not be verified. Please request a new email.';}
 }
 form.onsubmit=async e=>{
  e.preventDefault();
  if(!token)return;
  if(password.value!==confirmation.value){status.textContent='The two passwords do not match.';return;}
  fieldset.disabled=true;
  try{
   const response=await fetch(config.url+'/auth/v1/user',{method:'PUT',headers:{apikey:config.publishableKey,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({password:password.value}),cache:'no-store',credentials:'omit'});
   if(!response.ok){status.textContent='The password could not be changed. Try a different password, or request a fresh recovery email.';fieldset.disabled=false;return;}
   form.reset();form.hidden=true;status.textContent='Your password has been changed. You can close this page.';
   await fetch(config.url+'/auth/v1/logout',{method:'POST',headers:{apikey:config.publishableKey,Authorization:'Bearer '+token},credentials:'omit'}).catch(()=>{});
   token=null;
  }catch{status.textContent='The connection was interrupted. Please request a fresh recovery email before trying again.';token=null;form.reset();}
 };
 window.addEventListener('pageshow',e=>{if(e.persisted){token=null;form.reset();fieldset.disabled=true;status.textContent='Please open a fresh recovery email.';}});
 start();
})();
