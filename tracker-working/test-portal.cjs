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
const guests=[],entries=[],listeners={};let failSave=false,uuid=0;
const context={document:{getElementById:id=>nodes[id],createElement:()=>new Element()},window:{PORTAL_CONFIG:{enabled:true,url:'https://test.supabase.co',publishableKey:'test'},addEventListener:(name,fn)=>listeners[name]=fn},location:{origin:'https://example.com'},crypto:{randomUUID:()=>`id-${++uuid}`},setTimeout:()=>1,clearTimeout(){},confirm:()=>true,fetch:async(url,opts)=>{
 const path=new URL(url).pathname,data=opts.body&&JSON.parse(opts.body);let result;
 if(path.endsWith('/token'))result={access_token:'test-token',expires_in:3600};
 else if(path.endsWith('/facilitators'))result=[{name:'Sample facilitator',active:true}];
 else if(path.endsWith('/guests')){if(data)guests.push({id:'guest-1',...data});result=guests;}
 else if(path.endsWith('/ceremonies')){if(data){if(failSave)return {ok:false,status:503};entries.push(data);}result=entries;}
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
 await nodes.logout.onclick();assert.equal(nodes.workspace.hidden,true);assert.equal(nodes['guest-list'].children.length,0);assert.equal(nodes.history.children.length,0);
 listeners.pageshow({persisted:true});assert.equal(nodes.workspace.hidden,true);
 console.log('PASS: login, password clearing, guest creation/search, safe text rendering, failed-save retention, successful save/history, sign-out and back-cache clearing. Mock API.');
})().catch(e=>{console.error(e);process.exitCode=1;});
