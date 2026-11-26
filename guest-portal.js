(() => {
 'use strict';
 const $ = id => document.getElementById(id), config = window.PORTAL_CONFIG;
 let token = '', timer, generation = 0, busy = false, pendingEmail = '';
 const status = text => { $('guest-status').textContent = text; };
 function clear() {
  token = ''; generation++; clearTimeout(timer); pendingEmail = '';
  $('guest-content').hidden = true; $('guest-login').hidden = false;
  $('guest-email-form').hidden = false; $('guest-code-form').hidden = true;
  $('guest-code').value = '';
 }
 async function request(path, data, access = token) {
  const response = await fetch(config.url + path, {
   method: data === undefined ? 'GET' : 'POST', cache: 'no-store', credentials: 'omit',
   headers: { apikey: config.publishableKey, 'Content-Type': 'application/json', ...(access ? {Authorization: `Bearer ${access}`} : {}) },
   body: data === undefined ? undefined : JSON.stringify(data)
  });
  if (!response.ok) throw new Error('We could not complete that step. Check your details or contact Marla for help.');
  return response.status === 204 ? null : response.json();
 }
 async function run(button, task) {
  if (busy) return;
  busy = true; button.disabled = true;
  try { await task(); } catch (error) { status(error.message); }
  finally { busy = false; button.disabled = false; }
 }
 $('guest-email-form').onsubmit = event => {
  event.preventDefault();
  run(event.submitter || $('guest-email-form').querySelector('[type=submit]'), async () => {
   if (!config?.guestEnabled) throw new Error('Guest sign-in is being prepared. Please contact Marla for access.');
   const email = $('guest-email').value.trim();
   if (!email) throw new Error('Enter your email first.');
   await request('/auth/v1/otp', {email, create_user: false}, '');
   pendingEmail = email;
   $('guest-email-form').hidden = true; $('guest-code-form').hidden = false;
   status('If this email is approved, a sign-in code is on its way. Check your inbox and spam folder.');
   $('guest-code').focus();
  });
 };
 $('guest-resend').onclick = () => run($('guest-resend'), async () => {
  if (!pendingEmail) throw new Error('Enter your email first.');
  await request('/auth/v1/otp', {email: pendingEmail, create_user: false}, '');
  status('A new code is on its way. Check your inbox and spam folder.');
 });
 $('guest-code-form').onsubmit = event => {
  event.preventDefault();
  run(event.submitter || $('guest-code-form').querySelector('[type=submit]'), async () => {
   await signIn(pendingEmail, $('guest-code').value.trim());
  });
 };
 // Approval is enforced by database and storage policies, not by this display check.
 async function signIn(email, code) {
  const current = generation;
  const session = await request('/auth/v1/verify', {email, token: code, type: 'email'}, '');
  if (current !== generation) return;
  try {
   const [profiles, facilitators] = await Promise.all([
    request('/rest/v1/guest_members?select=active', undefined, session.access_token),
    request('/rest/v1/facilitators?select=active', undefined, session.access_token)
   ]);
   if (current !== generation) return;
   if (!(profiles.length === 1 && profiles[0].active) && !(facilitators.length === 1 && facilitators[0].active)) throw new Error('Your guest access is not active. Please contact Marla.');
  } catch (error) {
   await request('/auth/v1/logout', {}, session.access_token).catch(() => {});
   throw error;
  }
  token = session.access_token;
  $('guest-login').hidden = true; $('guest-content').hidden = false;
  $('guest-code').value = '';
  timer = setTimeout(() => { clear(); status('Please sign in again.'); }, Math.max(0, session.expires_in - 30) * 1000);
  status('Welcome. Your resources are ready.');
 }
 $('guest-logout').onclick = () => {
  const access = token; clear(); status('Signed out.');
  if (access) request('/auth/v1/logout', {}, access).catch(() => {});
 };
 document.querySelectorAll('[data-document]').forEach(button => {
  button.onclick = () => run(button, async () => {
   if (!token) throw new Error('Please sign in first.');
   const current = generation;
   const response = await fetch(config.url + '/storage/v1/object/authenticated/guest-resources/' + button.dataset.document, {
    headers: {apikey: config.publishableKey, Authorization: `Bearer ${token}`}, cache: 'no-store', credentials: 'omit'
   });
   if (!response.ok) throw new Error('This download is unavailable. Please contact Marla.');
   const blob = await response.blob();
   if (current !== generation) return;
   const url = URL.createObjectURL(blob), link = document.createElement('a');
   link.href = url; link.download = button.dataset.document; link.click();
   setTimeout(() => URL.revokeObjectURL(url), 60000);
   status('Your download is ready.');
  });
 });
 window.addEventListener('pageshow', event => { if (event.persisted) clear(); });
 if (!config?.guestEnabled) status('Guest sign-in is being prepared. Please contact Marla for access.');
})();
