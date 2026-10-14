/* 戰略長名單留存：email＋產業＋痛點＋對話摘要 → 日誌持久化（待接 DB/ESP 零改動） */
const A = 'https://api.vercel.com';
module.exports = async function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Headers','content-type');
  res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');
  if (req.method==='OPTIONS') return res.status(204).end();
  if (req.method!=='POST') return res.status(405).json({error:'POST only'});
  let b={};
  try {
    b = (req.body && typeof req.body==='object' && Object.keys(req.body).length) ? req.body
      : JSON.parse((await new Promise(r=>{const c=[];req.on('data',x=>c.push(x));req.on('end',()=>r(Buffer.concat(c).toString('utf8')))}))||'{}');
  } catch { return res.status(400).json({error:'json required'}); }
  const email = String(b.email||'').trim().slice(0,120);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({error:'valid email required'});
  const lead = {
    kind:'strategist-chat', email,
    industry:String(b.industry||'').slice(0,40),
    pain:String(b.pain||'').slice(0,300),
    page:String(b.page||'').slice(0,160),
    transcript:Array.isArray(b.transcript)?b.transcript.slice(-8).map(m=>({r:String(m.r||m.role||''),c:String(m.c||m.content||'').slice(0,400)}):[],
    at:new Date().toISOString(), ip:(req.headers||{})['x-forwarded-for']||''
  };
  console.log('LEAD '+JSON.stringify(lead));
  // 持久化預留：env SUPABASE_URL/SUPABASE_SERVICE_KEY 就緒後此處雙寫（現行以函式日誌＝維修台工單池）
  res.status(200).json({ok:true,note:'已收到。戰略长的 90 天排程與方案報價將寄至你的信箱。'});
};
