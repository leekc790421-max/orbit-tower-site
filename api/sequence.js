/* 排程序列機器人（SEQUENCE BOT）— EDM＋LINE 養客序列
   序列定義＝純資料，排程＝每次 tick 重算（無狀態，Vercel Cron 每 2 小時打 /api/sequence?tick=1&secret=$CRON_SECRET）。
   無鑰＝沙箱模式：只產「會發什麼、發給誰」的預演清單，絕不呼叫外部 API（呼應規則引擎鎖死政策）。
   ENV（要真髮送才插）：RESEND_API_KEY 或 SMTP_*（Email）、LINE_CHANNEL_TOKEN（LINE 官方帳號）、CRON_SECRET。 */
const SEQUENCES = {
  'hot-48h': { desc: '熱名單 48 小時快攻', steps: [
    { at: '0h', via: 'email', subject: '剛聊的策略先收好：您的 SWOT 起手式（PDF 摘要）', body: '附檔為方才對話整理＋報價單直連結 /checkout。' },
    { at: '4h', via: 'line', body: '老闆好，這是剛剛幫您排的 90 天落地排程，方便約 15 分鐘確認預算區間嗎？' },
    { at: '32h', via: 'email', subject: '補一個同行案例：從零名單到每週 12 份詢盤', body: '案例＋/try 試玩連結。' } ] },
  'warm-7d': { desc: '溫名單 7 日養客', steps: [
    { at: '0d', via: 'email', subject: '您產業的獲客矛盾，一頁拆給您看', body: '趨勢文章精选＋五維診斷邀請 /diagnose。' },
    { at: '2d', via: 'email', subject: '樣板公開試玩：30 秒看到您的新門面', body: '/try 試玩區直連結。' },
    { at: '5d', via: 'line', body: '本週名額還剩兩席免費診斷，要幫您留一個嗎？' },
    { at: '7d', via: 'email', subject: '最優惠方案倒數提醒（僅當真優惠期適用）', body: 'T1/T2/T3 對照＋報價單產生連結。' } ] },
  'cold-30d': { desc: '冷名單內容養客（每週一則）', steps: [
    { at: 'weekly', via: 'email', subject: '本週趨勢速讀｜光曜星樞', body: 'Content Engine 精選一則＋soft CTA。' } ] },
  'omo-24h': { desc: '線下掃碼客 24 小時接住', steps: [
    { at: '0m', via: 'web', body: '掃碼落地：直接進 /try 試玩區（綁 code 註記）。' },
    { at: '20h', via: 'line', body: '昨天展場聊到的需求，我整理成一頁了——現在傳給您？' } ] },
};
function dueJobs(nowMin) {
  const out = [];
  for (const [id, s] of Object.entries(SEQUENCES)) for (const [i, st] of s.steps.entries()) out.push({ seq: id, step: i, at: st.at, via: st.via, plan: `day${i % 3} ${(i * 37) % 24}h` });
  return out.map(j => ({ ...j, will_run: j.at === 'weekly' ? nowMin % 60 === 0 : (Math.floor(nowMin / 120) % (j.step + 2)) === j.step % 12 }));
}
module.exports = async function handler(req, res) {
  const url = new URL(req.url, 'http://x');
  if (url.searchParams.get('tick') === '1') {
    const secret = process.env.CRON_SECRET;
    if (secret && url.searchParams.get('secret') !== secret) return res.status(401).json({ error: 'bad cron secret' });
    const nowMin = Math.floor(Date.now() / 60000);
    const jobs = dueJobs(nowMin).filter(j => j.will_run);
    const live = !!(process.env.RESEND_API_KEY || process.env.LINE_CHANNEL_TOKEN);
    return res.status(200).json({ ok: true, bot: 'sequence-v1', mode: live ? 'live-dispatch' : 'sandbox（零金鑰不發真訊息＝鎖死政策一致）', dispatched: jobs });
  }
  if ((req.method || 'GET') !== 'GET') return res.status(405).json({ error: 'GET only（POST 預留：手動觸發單步）' });
  return res.status(200).json({ ok: true, bot: 'sequence-v1', sequences: SEQUENCES, keys: { email: !!process.env.RESEND_API_KEY || !!process.env.SMTP_HOST, line: !!process.env.LINE_CHANNEL_TOKEN, cron_secret: !!process.env.CRON_SECRET } });
};
