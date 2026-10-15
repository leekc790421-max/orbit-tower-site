/* 值勤面板・前端掛載（只增不減：找不到容器就只加懸浮芯片，絕不改寫頁面既有元素）
   用處：departments 頁 #rosterDock 渲染完整值勤帶；3D 展館（canvas#scene）右下角加「AI 值勤 n/8」芯片。 */
(function(){
  var HUB='https://xingdeng.tw';
  var LABEL={online:'在崗',no_key:'待配鑰',api_disabled:'待啟用',dev_tool:'開發工具',honorary:'名譽職員',offline:'失聯'};
  var DOT={online:'#22c55e',no_key:'#eab308',api_disabled:'#f97316',dev_tool:'#64748b',honorary:'#94a3b8',offline:'#ef4444'};
  function render(el,data,dense){
    var css = dense ? '' : 'display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin-top:14px';
    el.innerHTML = (dense?'':'<div style="'+css+'">') + data.crew.map(function(c){
      if(dense) return '';
      return '<div style="border:1px solid rgba(148,163,184,.25);border-radius:14px;padding:12px 14px;background:rgba(148,163,184,.05)">'
        +'<b style="display:flex;align-items:center;gap:8px"><i style="width:9px;height:9px;border-radius:50%;background:'+(DOT[c.status]||'#94a3b8')+'"></i>'+c.name+'</b>'
        +'<div style="font-size:13px;opacity:.75;margin:4px 0">'+c.role+'</div>'
        +'<div style="font-size:12px;color:'+(DOT[c.status]||'#94a3b8')+'">'+(LABEL[c.status]||c.status)+'・樓層 '+(c.floors||[]).join('/')+'</div></div>';
    }).join('') + (dense?'':'</div>') + (dense?'':'<div style="font-size:12px;opacity:.55;margin-top:10px">即時探測・60 秒自動更新｜'+data.as_of.slice(0,16).replace('T',' ')+' UTC</div>');
  }
  function chip(data){
    if(document.getElementById('sntRosterChip')) return;
    var d=document.createElement('a'); d.id='sntRosterChip';
    d.href=HUB+'/departments/'; d.target='_blank'; d.rel='noopener';
    d.textContent='🛰 AI 值勤 '+data.on_duty;
    d.style.cssText='position:fixed;right:14px;bottom:86px;z-index:9998;background:rgba(10,11,14,.82);border:1px solid rgba(212,175,55,.35);color:#f3e5ab;font:600 12px/1 "Noto Sans TC",sans-serif;padding:9px 12px;border-radius:999px;text-decoration:none;backdrop-filter:blur(4px)';
    document.body.appendChild(d);
  }
  fetch(HUB+'/api/roster',{mode:'cors'}).then(function(r){return r.json()}).then(function(data){
    var dock=document.getElementById('rosterDock');
    if(dock){ dock.style.color='inherit'; render(dock,data,false); }
    if(document.querySelector('canvas#scene')) chip(data);
  }).catch(function(){});
})();
