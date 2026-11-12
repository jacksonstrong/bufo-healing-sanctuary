const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('portal.html','utf8');
class Element {
 constructor(){this.value='';this.textContent='';this.hidden=false;this.disabled=false;this.children=[];}
 append(n){this.children.push(n);} replaceChildren(){this.children=[];} focus(){} checkValidity(){return true;}
 querySelectorAll(){return [];} querySelector(){return new Element();} reset(){for(const n of Object.values(this.fields||{}))n.value='';}
}
const nodes=Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],new Element()]));
const fields=Object.fromEntries([...html.matchAll(/name="([^"]+)"/g)].filter(m=>nodes[m[1]]).map(m=>[m[1],nodes[m[1]]]));
nodes['entry-form'].fields=fields;nodes['entry-form'].elements={namedItem:n=>fields[n]};nodes['guest-form'].fields={name:nodes['guest-name']};
const guests=[],entries=[],listeners={};let failSave=false,denyEdit=false,uuid=0;
const context={document:{getElementById:id=>nodes[id],createElement:()=>new Element()},window:{PORTAL_CONFIG:{enabled:true,url:'https://test.supabase.co',publishableKey:'test'},addEventListener:(name,fn)=>listeners[name]=fn},location:{origin:'https://example.com'},crypto:{randomUUID:()=>`id-${++uuid}`},setTimeout:()=>1,clearTimeout(){},confirm:()=>true,fetch:async(url,opts)=>{
 const path=new URL(url).pathname,data=opts.body&&JSON.parse(opts.body);let result;
 if(path.endsWith('/token'))result={access_token:'test-token',expires_in:3600};
 else if(path.endsWith('/facilitators'))result=[{name:'Sample facilitator',active:true}];
 else if(path.endsWith('/guests')){if(data)guests.push({id:'guest-1',...data});result=guests;}
 else if(path.endsWith('/ceremonies')){if(data){if(failSave)return {ok:false,status:503};if(opts.method==='PATCH'){
  assert.equal(data.owner_id,undefined);assert.equal(data.guest_id,undefined);assert.equal(data.id,undefined);
  const id=new URL(url).searchParams.get('id').slice(3);const row=entries.find(e=>e.id===id);
  if(denyEdit)result=[];else {Object.assign(row,data);result=[row];}
 }else {entries.push(data);result=entries;}}else result=entries;}
 else if(path.endsWith('/logout'))return {ok:true,status:204};
 else throw Error('Unexpected path '+path);
 return {ok:true,status:200,json:async()=>structuredClone(result)};
}};
vm.runInNewContext(fs.readFileSync('portal.js','utf8'),context);
const flush=()=>new Promise(r=>setImmediate(r));
async function submit(id){nodes[id].onsubmit({preventDefault(){}});await flush();}
(async()=>{
 nodes.email.value='test@example.com';nodes.password.value='fake';await submit('sign-in');
 assert.equal(nodes.workspace.hidden,false);assert.equal(nodes.password.value,'');
 nodes['guest-name'].value='<img src=x onerror=alert(1)>';await submit('guest-form');
 assert.equal(guests.length,1);assert.equal(nodes['guest-list'].children[0].children[0].textContent,guests[0].name);
 nodes.search.value='missing';nodes.search.oninput();assert.equal(nodes['guest-list'].children.length,0);
 nodes.search.value='';nodes.search.oninput();await nodes['guest-list'].children[0].children[0].onclick();
 nodes.date.value='2026-11-12';nodes.medicine0.value='Synthetic sample';nodes.amount0.value='Unknown';nodes.feelings.value='Sample reflection';nodes['entry-form'].oninput();
 failSave=true;await submit('entry-form');assert.equal(entries.length,0);assert.equal(nodes.feelings.value,'Sample reflection');
 failSave=false;await submit('entry-form');assert.equal(entries.length,1);assert.equal(nodes['history'].children.length,1);assert.equal(nodes.feelings.value,'');
 const edit=()=>nodes.history.children[0].children.at(-1).onclick();
 edit();assert.equal(nodes.feelings.value,'Sample reflection');assert.equal(nodes['save-entry'].textContent,'Save changes');
 nodes.feelings.value='Corrected reflection';failSave=true;await submit('entry-form');assert.equal(nodes.feelings.value,'Corrected reflection');assert.equal(entries[0].feelings,'Sample reflection');
 failSave=false;denyEdit=true;await submit('entry-form');assert.match(nodes.status.textContent,/not saved/);assert.equal(nodes.feelings.value,'Corrected reflection');
 denyEdit=false;await submit('entry-form');assert.equal(entries.length,1);assert.equal(entries[0].feelings,'Corrected reflection');assert.equal(nodes['cancel-edit'].hidden,true);
 edit();nodes.feelings.value='Discard this';nodes['cancel-edit'].onclick();assert.equal(entries[0].feelings,'Corrected reflection');assert.equal(nodes.feelings.value,'');
 edit();
 await nodes.logout.onclick();assert.equal(nodes.workspace.hidden,true);assert.equal(nodes['guest-list'].children.length,0);assert.equal(nodes.history.children.length,0);
 listeners.pageshow({persisted:true});assert.equal(nodes.workspace.hidden,true);
 console.log('PASS: create/search/save; edit prefill, failed/denied edit retention, update without duplicate, cancel, immutable identity payload, sign-out and back-cache clearing. Mock API.');
})().catch(e=>{console.error(e);process.exitCode=1;});
