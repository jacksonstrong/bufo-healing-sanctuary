(() => {
 'use strict';
 const $ = id => document.getElementById(id), config = window.PORTAL_CONFIG;
 let token = '', timer, generation = 0, signingIn = false;
 const status = text => { $('guest-status').textContent = text; };
 function clear() {
  token = ''; generation++; clearTimeout(timer);
  $('guest-content').hidden = true; $('guest-login').hidden = false;
  $('guest-password').value = '';
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
  button.disabled = true;
  try { await task(); } catch (error) { status(error.message); }
  finally { button.disabled = false; }
 }
 $('guest-signin').onsubmit = event => {
  event.preventDefault();
  run(event.submitter || $('guest-signin').querySelector('[type=submit]'), async () => {
   if (!config?.guestEnabled) throw new Error('Guest sign-in is being prepared. Please contact Marla for access.');
   if (signingIn) return;
   signingIn = true;
   const email = $('guest-email').value.trim(), password = $('guest-password').value;
   $('guest-password').value = '';
   try { await signIn(email, password); } finally { signingIn = false; }
  });
 };
 // Approval is enforced by database and storage policies, not by this display check.
 async function signIn(email, password) {
  clear(); const current = generation;
  const session = await request('/auth/v1/token?grant_type=password', {email, password}, '');
  if (current !== generation) return;
  try {
   const profiles = await request('/rest/v1/guest_members?select=active', undefined, session.access_token);
   if (current !== generation) return;
   if (profiles.length !== 1 || !profiles[0].active) throw new Error('Your guest access is not active. Please contact Marla.');
  } catch (error) {
   await request('/auth/v1/logout', {}, session.access_token).catch(() => {});
   throw error;
  }
  token = session.access_token;
  $('guest-login').hidden = true; $('guest-content').hidden = false;
  timer = setTimeout(() => { clear(); status('Please sign in again.'); }, Math.max(0, session.expires_in - 30) * 1000);
  status('Welcome. Your resources are ready.');
 }
 $('guest-recover').onclick = () => run($('guest-recover'), async () => {
  if (!config?.guestEnabled) throw new Error('Guest sign-in is being prepared. Please contact Marla for access.');
  if (!$('guest-email').value || !$('guest-email').checkValidity()) throw new Error('Enter your email first.');
  await request('/auth/v1/recover?redirect_to=' + encodeURIComponent(location.origin + '/reset-password'), {email: $('guest-email').value.trim()}, '');
  status('If this email has an account, a recovery email will be sent.');
 });
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
