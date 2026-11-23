import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readJournal, journalMarkdown } from '../src/journal.js';
const base=process.env.UNSAID_TEST_URL || 'http://127.0.0.1:8001/api/';
class Client {
 cookie=''; csrf='';
 async call(path,method='GET',body) {
  const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json',Cookie:this.cookie,'X-CSRF-Token':this.csrf},...(body?{body:JSON.stringify(body)}:{})});
  if(response.headers.getSetCookie().length) this.cookie=response.headers.getSetCookie().map(s=>s.split(';')[0]).join('; ');
  const data=await response.json();if(data.csrf)this.csrf=data.csrf;
  return {status:response.status,data};
 }
}
const fixture=(stamp,action)=>execFileSync('php',['-d','extension=pdo_mysql','tests/journal-fixture.php',`--stamp=${stamp}`,`--action=${action}`],{windowsHide:true,encoding:'utf8'});
test('journal: owner-only mood, literal/Unicode search, date filters, validation, edits and complete export',async(t)=>{
 const stamp=String(Date.now());fixture(stamp,'create');t.after(()=>fixture(stamp,'cleanup'));
 const a=new Client(),b=new Client(),anon=new Client();
 for(const [client,prefix] of [[a,'a'],[b,'b']]) {
  await client.call('session');assert.equal((await client.call('login','POST',{email:`test-${prefix}-${stamp}@unsaid.invalid`,password:'Journal-fixture-password-42'})).status,200);
 }
 assert.equal((await anon.call('posts?scope=journal')).status,401);
 const all=await readJournal(async(path)=>{const r=await a.call(path);assert.equal(r.status,200);return r.data;});
 assert.equal(all.length,16); assert.ok(all.every(p=>p.is_owner));assert.ok(all.some(p=>p.status==='draft'));
 const searched=await a.call('posts?scope=journal&q='+encodeURIComponent('100%_'));assert.equal(searched.data.posts.length,1);
 assert.equal((await a.call('posts?scope=journal&q='+encodeURIComponent('မြန်မာ'))).data.posts.length,1);
 assert.equal((await a.call('posts?scope=journal&q='+encodeURIComponent("' OR 1=1 --"))).data.posts.length,0);
 const filtered=await a.call('posts?scope=journal&date=2026-10-11&mood=sad');assert.equal(filtered.data.posts.length,2);
 assert.ok(filtered.data.posts.every(p=>p.mood==='sad'&&p.created_at.startsWith('2026-10-11')));
 const others=await b.call('posts?scope=journal&q='+encodeURIComponent('100%_'));assert.equal(others.data.posts.length,1);assert.notEqual(others.data.posts[0].id,searched.data.posts[0].id);
 for(const suffix of ['date=2026-02-30','mood=invalid','q[]=bad','date[]=bad']) assert.equal((await a.call('posts?scope=journal&'+suffix)).status,400,suffix);
 const publicPosts=await a.call('posts?scope=mine');const pub=publicPosts.data.posts.find(p=>p.title==='Public reflection');assert.equal(pub.mood,'anxious');
 assert.equal((await b.call('posts/'+pub.id)).data.post.mood,'');assert.equal((await anon.call('posts/'+pub.id)).data.post.mood,'');
 assert.equal((await b.call('posts/'+all[0].id)).status,404);
 const target=searched.data.posts[0];const payload={body:target.body,title:target.title,category_id:target.category_id,visibility:'private',status:'published',response:'Just listening'};
 const saved=await a.call('posts/'+target.id,'PATCH',{...payload,mood:'calm'});assert.equal(saved.status,200);assert.equal(saved.data.post.mood,'calm');
 const retained=await a.call('posts/'+target.id,'PATCH',payload);assert.equal(retained.data.post.mood,'calm');
 assert.equal((await a.call('posts/'+target.id,'PATCH',{...payload,mood:'invalid'})).status,400);
 const md=journalMarkdown(all);assert.ok(md.includes('Entry 14'));assert.ok(md.includes('Unfinished reflection'));assert.ok(!md.includes('Other account private entry'));assert.ok(!md.includes('Public fixture'));
});
