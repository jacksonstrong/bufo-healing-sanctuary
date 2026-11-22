(() => {
 'use strict';
 const $=id=>document.getElementById(id),config=window.PORTAL_CONFIG;
 const form=$('create-account'),fieldset=form.querySelector('fieldset');
 const status=message=>{$('account-status').textContent=message;};
 const fragment=new URLSearchParams(location.hash.slice(1));
 const access=fragment.get('type')==='signup'?fragment.get('access_token'):null;
 if(location.hash)history.replaceState(null,'',location.pathname);
 async function request(path,data,token){
  const response=await fetch(config.url+path,{method:data===undefined?'GET':'POST',headers:{apikey:config.publishableKey,'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:data===undefined?undefined:JSON.stringify(data),cache:'no-store',credentials:'omit'});
  if(!response.ok)throw new Error('Account setup could not be completed. Please contact Marla, or use Forgot password if you already have an account.');
  return response.status===204?null:response.json();
 }
 async function start(){
  if(access){
   await request('/auth/v1/user',undefined,access);
   form.hidden=true;status('Your email is confirmed. Once Marla approves your access, you can sign in below.');
   await request('/auth/v1/logout',{},access).catch(()=>{});return;
  }
  const settings=await request('/auth/v1/settings');
  if(settings.disable_signup || !config.registrationEnabled){status('New account setup is being prepared. Please submit your access request. Marla will contact you when your login can be created.');return;}
  fieldset.disabled=false;status('Use the same email address as your access request.');
 }
 form.onsubmit=async event=>{
  event.preventDefault();
  if(fieldset.disabled)return;
  if($('new-password').value!==$('repeat-password').value){status('The passwords do not match.');return;}
  fieldset.disabled=true;
  try{
   const result=await request('/auth/v1/signup?redirect_to='+encodeURIComponent(location.origin+'/create-account'),{email:$('new-email').value.trim(),password:$('new-password').value});
   form.reset();form.hidden=true;
   if(result.access_token)await request('/auth/v1/logout',{},result.access_token).catch(()=>{});
   status('Check your inbox and spam folder for a confirmation email. Your resources stay locked until Marla approves access. If you already have an account, use the sign-in links below.');
  }catch(error){status(error.message);fieldset.disabled=false;}
  finally{$('new-password').value='';$('repeat-password').value='';}
 };
 start().catch(error=>status(error.message));
})();
