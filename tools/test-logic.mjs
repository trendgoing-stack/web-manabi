// 出題ロジック（js/quiz-gen.js）とライトナー方式（js/leitner.js）のテスト。
//   node tools/test-logic.mjs
// data/ を読み込み、メモリ上で一部の項目を確認済みにして確かめる（ファイルは変更しない）。
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const R = pathToFileURL(ROOT + '/').href;
const { buildStore } = await import(R+'js/data.js');
const Q = await import(R+'js/quiz-gen.js');
const L = await import(R+'js/leitner.js');
const D = await import(R+'js/date.js');
const rd = (p)=>JSON.parse(readFileSync(join(ROOT,'data',p),'utf8'));
const meta=rd('meta.json');
const raw={meta,apps:rd('apps.json'),glossary:rd('glossary.json'),quiz:rd('quiz.json'),topicFiles:meta.categories.map(c=>({path:`topics/${c.id}.json`,data:rd(`topics/${c.id}.json`)})),failed:[]};
const plain=(s)=>s.replace(/\[\[([^\]]+)\]\]|`([^`]+)`|\*\*([^*]+)\*\*/g,(_,a,b,c)=>a??b??c);
// data/ の確認状態に左右されないよう、テストごとに全件を未確認に戻してから始める
const fresh=()=>{ const st=buildStore(structuredClone(raw)); st.topics.forEach(t=>{ t.verified=false; }); return st; };
let ok=0, ng=0; const assert=(c,m)=>{ if(c) ok++; else { ng++; console.log('NG', m); } };

// 未確認だけ → 開始できない
let store=fresh();
let r=Q.checkStart(store,{kind:'all'},'normal',{}, '2026-09-26');
assert(!r.ok && r.message.includes('0 件'), 'all unverified: '+r.message);
assert(Q.buildQuiz(store,{kind:'all'},'normal',{},'2026-09-26',plain).length===0,'no questions when unverified');

// 3件だけ確認済み → 開始できない（クイズ）、カードは可
store=fresh();
store.topics.slice(0,3).forEach(t=>t.verified=true);
assert(!Q.checkStart(store,{kind:'all'},'normal',{},'2026-09-26').ok,'3 verified quiz ng');
assert(Q.checkStart(store,{kind:'all'},'normal',{},'2026-09-26','cards').ok,'3 verified cards ok');

// 半分を確認済みに
store=fresh();
const vset=new Set(); store.topics.forEach((t,i)=>{ if(i%2===0){t.verified=true; vset.add(t.id);} });
for (let k=0;k<200;k++){
  const qs=Q.buildQuiz(store,{kind:'all'},'normal',{},'2026-09-26',plain);
  assert(qs.length===10,'10 questions');
  for (const q of qs){
    assert(q.choices.length===4 && new Set(q.choices).size===4,'4 distinct choices '+q.type);
    assert(q.answer>=0&&q.answer<4,'answer idx');
    assert(q.topicIds.every(id=>vset.has(id)),'only verified topics '+q.type+' '+q.topicIds);
    if(q.type==='app-tech'){
      const app=store.apps.find(a=>a.name===q.subject);
      const correctT=store.topics.find(t=>t.title===q.choices[q.answer]);
      assert(correctT.apps.some(a=>a.appId===app.id),'correct uses app');
      q.choices.forEach((c,i)=>{ if(i!==q.answer){ const t=store.topics.find(x=>x.title===c); assert(!t.apps.some(a=>a.appId===app.id),'distractor not used by app'); assert(t.verified,'distractor verified'); }});
    }
    if(q.type==='title-summary'||q.type==='summary-title'){
      // distractors from verified only
      const titles = q.type==='summary-title'? q.choices : null;
      if(titles) titles.forEach(c=>assert(store.topics.find(t=>t.title===c).verified,'distractor verified st'));
    }
  }
}
const types=new Set(); for(let k=0;k<50;k++) Q.buildQuiz(store,{kind:'all'},'normal',{},'2026-09-26',plain).forEach(q=>types.add(q.type));
console.log('出た問題の種類：',[...types].join(','));
// 同じカテゴリ優先
let sameCat=0,total=0;
for(let k=0;k<100;k++) for(const q of Q.buildQuiz(store,{kind:'all'},'normal',{},'2026-09-26',plain)) if(q.type==='summary-title'){ const tgt=store.topics.find(t=>t.title===q.choices[q.answer]); q.choices.forEach((c,i)=>{ if(i!==q.answer){ total++; if(store.topics.find(t=>t.title===c).category===tgt.category) sameCat++; }}); }
console.log('誤答が同じカテゴリだった割合：', (sameCat/total).toFixed(2));
// アプリ範囲
const appScope={kind:'app',id:'lottery-tools'};
const qa=Q.buildQuiz(store,appScope,'normal',{},'2026-09-26',plain);
assert(qa.every(q=>q.topicIds.some(id=>store.topicById.get(id).apps.some(a=>a.appId==='lottery-tools'))),'app scope');
// カテゴリ範囲
const pwaCount=store.topics.filter(t=>t.verified&&t.category==='pwa').length;
console.log('PWA の確認済み', pwaCount, Q.checkStart(store,{kind:'category',id:'pwa'},'normal',{},'2026-09-26').message);

// ライトナー
const t0='2026-09-26';
let p=L.nextProgress(undefined,true,t0); assert(p.box===2&&p.due==='2026-09-28'&&p.correct===1,'first correct -> box2 +2d '+JSON.stringify(p));
p=L.nextProgress(p,true,'2026-09-28'); assert(p.box===3&&p.due==='2026-10-02','box3 +4d');
p=L.nextProgress(p,true,'2026-10-02'); assert(p.box===4&&p.due==='2026-10-10','box4 +8d');
p=L.nextProgress(p,true,'2026-10-10'); assert(p.box===5&&p.due==='2026-10-26','box5 +16d');
p=L.nextProgress(p,true,'2026-10-26'); assert(p.box===5&&p.due==='2026-11-11','stay 5 +16d');
p=L.nextProgress(p,false,'2026-11-11'); assert(p.box===1&&p.due==='2026-11-12'&&p.wrong===1&&p.correct===5,'wrong -> box1 tomorrow');
p=L.nextProgress(undefined,false,'2026-12-31'); assert(p.due==='2027-01-01','year boundary');
assert(D.addDays('2027-02-28',1)==='2027-03-01','feb');
// 今日の復習 / 苦手
const vt=store.topics.filter(t=>t.verified);
const prog={ [vt[0].id]:{box:1,due:'2026-09-26',correct:0,wrong:3}, [vt[1].id]:{box:2,due:'2026-09-27',correct:1,wrong:1}, [vt[2].id]:{box:3,due:'2026-09-20',correct:3,wrong:0}, [store.topics.find(t=>!t.verified).id]:{box:1,due:'2026-09-01',correct:0,wrong:5} };
const today=Q.pickTargets(Q.scopeTopics(store,{kind:'all'}),'today',prog,'2026-09-26');
assert(today.map(t=>t.id).join()===[vt[2].id,vt[0].id].join(),'today due sorted: '+today.map(t=>t.id));
const tomorrow=Q.pickTargets(Q.scopeTopics(store,{kind:'all'}),'today',prog,'2026-09-27');
assert(tomorrow.length===3,'tomorrow includes box2');
const weak=Q.pickTargets(Q.scopeTopics(store,{kind:'all'}),'weak',prog,'2026-09-26');
assert(weak.map(t=>t.id).join()===[vt[0].id,vt[1].id].join(),'weak order, unverified excluded');
const tq=Q.buildQuiz(store,{kind:'all'},'today',prog,'2026-09-26',plain);
for(let k=0;k<300;k++){ const tq=Q.buildQuiz(store,{kind:'all'},'today',prog,'2026-09-26',plain); assert(tq.length===2,'today count '+tq.length); assert(tq.every(q=>q.topicIds.some(id=>id===vt[0].id||id===vt[2].id)),'today related'); assert(tq[0].topicIds.includes(vt[2].id),'oldest first'); const c=Q.checkStart(store,{kind:'all'},'today',prog,'2026-09-26'); assert(c.count===2,'msg count'); }
// 手書き：全 topicIds 確認済みのときだけ
store.topics.forEach(t=>t.verified=true);
const all=[]; for(let k=0;k<30;k++) all.push(...Q.buildQuiz(store,{kind:'all'},'normal',{},'2026-09-26',plain));
assert(all.some(q=>q.type==='manual'),'manual appears when verified');
store.topics.find(t=>t.id==='clipboard-api').verified=false;
const all2=[]; for(let k=0;k<50;k++) all2.push(...Q.buildQuiz(store,{kind:'all'},'normal',{},'2026-09-26',plain));
assert(!all2.some(q=>q.type==='manual'&&q.topicIds.includes('clipboard-api')),'manual excluded when a topic unverified');
console.log(`成功 ${ok} 件、失敗 ${ng} 件`);
process.exit(ng ? 1 : 0);
