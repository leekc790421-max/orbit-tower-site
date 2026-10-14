/* 光曜星樞・AI 行銷戰略長 懸浮 Widget（自足：母站白底 / 3D 站深色自動適配）
   暴露 window.SNTChat = { open(), close(), toggle() } 供 3D 場景觸發 */
(function(){
  var HUB='https://xingdeng.tw';                      // API 與資產基準（跨站 CORS 已開）
  var dark = !!document.querySelector('canvas#scene') || location.hostname==='orbit.xingdeng.tw';   // 3D 場景自動深色皮
  var css = document.createElement('style');
  css.textContent = [
  '.snt-fab{position:fixed;right:20px;bottom:88px;z-index:9998;width:58px;height:58px;border:0;cursor:pointer;color:#fff;font:700 11px/1.15 "Noto Sans TC",sans-serif;display:grid;place-items:center;text-align:center;background:linear-gradient(135deg,'+(dark?'#f4d978,#a87a19':'#06B6D4,#2563EB')+');clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%);filter:drop-shadow(0 10px 22px rgba(0,0,0,.35));transition:.25s}',
  '.snt-fab:hover{transform:translateY(-3px) scale(1.04)}',
  '.snt-p{position:fixed;right:20px;bottom:154px;z-index:9999;width:min(368px,calc(100vw - 24px));height:min(520px,calc(100vh - 190px));display:none;flex-direction:column;border-radius:18px;overflow:hidden;font:14.5px/1.6 "Noto Sans TC",system-ui,sans-serif;'+(dark?'background:#101318;color:#e7e8ec;border:1px solid rgba(212,175,55,.35);box-shadow:0 30px 80px rgba(0,0,0,.7)':'background:#fff;color:#0F172A;border:1px solid #E7EEF7;box-shadow:0 30px 70px -18px rgba(15,23,42,.4)')+'}',
  '.snt-p.open{display:flex}',
  '.snt-hd{padding:12px 14px;display:flex;gap:9px;align-items:center;'+(dark?'background:linear-gradient(135deg,#232838,#181c26);border-bottom:1px solid rgba(212,175,55,.28)':'background:linear-gradient(120deg,#2563EB,#06B6D4);color:#fff')+'}',
  '.snt-hd b{font-size:14px;display:block}.snt-hd small{opacity:.75;font-size:11px;display:block}',
  '.snt-hd .x{margin-left:auto;background:none;border:0;color:inherit;font-size:18px;cursor:pointer;opacity:.8}',
  '.snt-log{flex:1;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:10px}',
  '.snt-m{max-width:86%;padding:9px 13px;border-radius:14px;white-space:pre-wrap;word-break:.5em}',
  '.snt-m.ai{align-self:flex-start;background:'+(dark?'#1c2130;border:1px solid #2b3648':'#F1F5F9')+'}',
  '.snt-m.me{align-self:flex-end;background:'+(dark?'#3a3218;color:#f5e7b5':'#2563EB;color:#fff')+'}',
  '.snt-chips{display:flex;flex-wrap:wrap;gap:7px;padding:0 14px 8px}',
  '.snt-chips button{font:12.5px/1 inherit;padding:7px 11px;border-radius:99px;cursor:pointer;background:transparent;border:1px solid '+(dark?'rgba(212,175,55,.5);color:#edcf70':'#CBD5E1;color:#334155')+'}',
  '.snt-in{display:flex;gap:8px;padding:10px;border-top:1px solid '+(dark?'#232a3a':'#EEF2F8')+'}',
  '.snt-in input{flex:1;min-width:0;border-radius:10px;padding:10px 12px;font:inherit;'+(dark?'background:#0b0e13;border:1px solid #2b3648;color:#fff':'background:#F8FAFC;border:1px solid #E2E8F0')+'}',
  '.snt-go{border:0;border-radius:10px;padding:0 16px;font:700 13.5px/1 "Noto Sans TC";cursor:pointer;color:#111;background:linear-gradient(135deg,'+(dark?'#f4d978,#c69a2b':'#2563EB,#06B6D4')+')!important;color:#fff}',
  '.snt-lead{margin:4px 14px 10px;padding:11px 13px;border-radius:12px;font-size:13px;background:'+(dark?'#1a2130;border:1px dashed rgba(212,175,55,.5)':'#EFF6FF;border:1px dashed #2563EB66')+'}',
  '.snt-lead input{width:100%;margin:6px 0;border-radius:8px;padding:8px 10px;font:inherit;'+(dark?'background:#0b0e13;border:1px solid #2b3648;color:#fff':'border:1px solid #CBD5E1')+'}',
  '.snt-lead a.ln{color:'+(dark?'#edcf70':'#2563EB')+';font-weight:700;text-decoration:none}',
  '@media(max-width:520px){.snt-p{right:8px;bottom:140px}.snt-fab{right:10px;bottom:76px}}'
  ].join('\n');
  document.head.appendChild(css);

  var fab=document.createElement('button');fab.className='snt-fab';fab.innerHTML='AI<br>戰略長';fab.setAttribute('aria-label','呼叫 AI 行銷戰略長');
  var P=document.createElement('div');P.className='snt-p';
  P.innerHTML='<div class="snt-hd"><span style="font-size:20px">'+(dark?'👑':'🧠')+'</span><span><b>AI 行銷戰略長</b><small>光曜星樞・B2B × 數位地產・免費開局 SWOT</small></span><button class="x" aria-label="收合">✕</button></div>'+
  '<div class="snt-log" id="sntLog"></div><div class="snt-chips" id="sntChips"></div>'+
  '<div id="sntLeadSlot"></div>'+
  '<form class="snt-in" id="sntF"><input id="sntMsg" placeholder="行業＋痛點，例：餐飲／廣告燒了沒名單" autocomplete="off"><button class="snt-go" type="submit">送出</button></form>';
  document.body.appendChild(fab);document.body.appendChild(P);

  var log=P.querySelector('.snt-log'),his=(function(){try{return JSON.parse(sessionStorage.getItem('sntChat')||'[]')}catch(e){return[]}})();
  var CHIPS=['餐飲／咖啡','Software／SaaS','房地產／建案','manufacture','美容／醫美'];
  CHIPS=['餐飲／咖啡','軟體／SaaS','房地產／建案','製造業／B2B','美容／醫美'];
  function chipRender(){var box=P.querySelector('#sntChips');box.innerHTML='';if(his.length)return;CHIPS.forEach(function(c){var b=document.createElement('button');b.textContent=c;b.onclick=function(){send(c+'的業主，痛點：流量貴、轉換低')};box.appendChild(b)})}
  function bub(cls,txt){var d=document.createElement('div');d.className='snt-m '+cls;d.textContent=txt;log.appendChild(d);log.scrollTop=log.scrollHeight;return d}
  function render(){log.innerHTML='';his.forEach(function(m){bub(m.r==='me'?'me':'ai',m.c)});chipRender()}
  async function send(text){
    text=String(text||'').trim();if(!text)return;
    his.push({r:'me',c:text});bub('me',text);P.querySelector('#sntMsg').value='';chipRender();save();
    var t=bub('ai','⋯⋯ 戰略長思考中');
    try{
      var r=await fetch(HUB+'/api/strategist',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({messages:his.map(function(m){return{role:m.r==='me'?'user':'assistant',content:m.c}})})});
      var j=await r.json();
      var clean=String(j.reply||'（間隔中…稍候重試）').replace('[[LEAD_CAPTURE]]','').trim();
      t.textContent=clean;his.push({r:'ai',c:clean});
      if(/懒人包|懶人包|3D|辦公室|kits|orbit/i.test(clean)&&j.capture)askLead();
    }catch(e){t.textContent='網路打了小盹——再送出一次試試。'}
    save();log.scrollTop=log.scrollHeight;
  }
  function askLead(){
    var slot=P.querySelector('#sntLeadSlot');if(slot.dataset.on)return;slot.dataset.on=1;
    slot.innerHTML='<div class="snt-lead">📥 想把這份策略帶回去執行？留 Email，戰略長給你 <b>90 天落地排程</b>＋方案報價。<input id="sntEm" type="email" placeholder="name@company.com"><div style="display:flex;gap:8px;align-items:center"><button class="snt-go" style="border:0;border-radius:8px;padding:7px 12px;cursor:pointer" id="sntSend">領取策略包</button><span>或 <a class="ln" target="_blank" rel="noopener" href="https://line.me/R/ti/p/@559julyu">LINE 直接聊 ⚡</a></span></div></div>';
    slot.querySelector('#sntSend').onclick=async function(){
      var em=slot.querySelector('#sntEm').value.trim();
      if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)){slot.querySelector('#sntEm').focus();return}
      this.textContent='⋯';
      try{await fetch(HUB+'/api/leads',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:em,industry:(his[0]||{}).c||'',pain:'',page:location.pathname,transcript:his.slice(-8).map(function(m){return{r:m.r,c:m.c}})})});
        slot.innerHTML='<div class="snt-lead" style="border-style:solid">✅ 已送達維修台佇列。想要真人立刻對談：LINE <a class="ln" href="https://line.me/R/ti/p/@559julyu">@559julyu</a>・或先逛 <a class="ln" href="'+HUB+'/kits">懶人包展示櫃</a>。</div>';}
      catch(e){this.textContent='再試一次'}
    };
  }
  function save(){try{sessionStorage.setItem('sntChat',JSON.stringify(his.slice(-30)))}catch(e){}}
  if(!his.length) his.push({r:'ai',c:'我是光曜星樞的 AI 行銷戰略長。報上你的行業與痛點，我當場用 SWOT 幫你拆一局——三分鐘，免費。'});
  render();
  fab.onclick=function(){P.classList.toggle('open');if(P.classList.contains('open'))P.querySelector('#sntMsg').focus()};
  P.querySelector('.x').onclick=function(){P.classList.remove('open')};
  P.querySelector('#sntF').addEventListener('submit',function(e){e.preventDefault();send(P.querySelector('#sntMsg').value)});
  window.SNTChat={open:function(){P.classList.add('open')},close:function(){P.classList.remove('open')},toggle:function(){fab.click()},send:send};
  // 3D 場景：讓頁面知道 widget 就緒
  window.dispatchEvent(new CustomEvent('snt-chat-ready'));
})();
