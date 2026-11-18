'use strict';
/* SNT v7.2 — YouTube Shorts 自動化排程管線（Omni-Ad Bot 內容供給端）
   ----------------------------------------------------------------------------
   設計原則
   1. 不新增 Serverless Function：本檔以底線開頭，只被 api/health.js?mode=shorts
      與 api/corps.js?bot=shorts 匯入。
   2. 零金鑰＝明確回報 not_configured，絕不假造數據。
   3. 只讀公開頻道資料（channels / playlistItems / videos），不寫入、不上傳、
      不呼叫需要 OAuth 的端點。上傳仍需人工或 OAuth，本管線只做「選題＋排程＋
      成效回收」。
   4. 所有對外數字都標 source，避免把推估當實測。
*/

const YT = 'https://www.googleapis.com/youtube/v3';

function cfg() {
  return {
    key: process.env.YOUTUBE_API_KEY || '',
    channelId: process.env.YOUTUBE_CHANNEL_ID || '',
    // Shorts 判定：時長 <= 180 秒（YouTube 現行上限）且為直式
    maxShortsSeconds: Number(process.env.SHORTS_MAX_SECONDS || 180)
  };
}

function status() {
  const c = cfg();
  return {
    configured: !!(c.key && c.channelId),
    has_key: !!c.key,
    has_channel: !!c.channelId,
    channel_id: c.channelId || null,
    max_shorts_seconds: c.maxShortsSeconds
  };
}

async function ytGet(path, params, timeoutMs = 6000) {
  const c = cfg();
  if (!c.key) throw new Error('YOUTUBE_API_KEY missing');
  const qs = new URLSearchParams({ ...params, key: c.key }).toString();
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const r = await fetch(`${YT}/${path}?${qs}`, { signal: ac.signal });
    clearTimeout(t);
    const body = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = (body && body.error && body.error.message) || `HTTP ${r.status}`;
      const err = new Error(msg);
      err.status = r.status;
      err.reason = body && body.error && body.error.errors && body.error.errors[0] && body.error.errors[0].reason;
      throw err;
    }
    return body;
  } catch (e) {
    clearTimeout(t);
    throw e;
  }
}

/* ISO8601 時長 → 秒 */
function isoToSeconds(iso) {
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(String(iso || ''));
  if (!m) return 0;
  const [, d, h, mi, s] = m;
  return (Number(d) || 0) * 86400 + (Number(h) || 0) * 3600 + (Number(mi) || 0) * 60 + (Number(s) || 0);
}

/* 頻道基本盤 + 最近上傳 */
async function channelSnapshot() {
  const c = cfg();
  if (!c.key || !c.channelId) {
    return { ok: false, configured: false, note: 'YOUTUBE_API_KEY 或 YOUTUBE_CHANNEL_ID 未設定' };
  }
  const ch = await ytGet('channels', {
    part: 'snippet,statistics,contentDetails',
    id: c.channelId
  });
  const item = (ch.items || [])[0];
  if (!item) return { ok: false, configured: true, note: 'channel not found', channel_id: c.channelId };

  const uploads = item.contentDetails && item.contentDetails.relatedPlaylists && item.contentDetails.relatedPlaylists.uploads;
  let recent = [];
  if (uploads) {
    const pl = await ytGet('playlistItems', {
      part: 'snippet,contentDetails',
      playlistId: uploads,
      maxResults: '20'
    });
    recent = (pl.items || []).map(x => ({
      video_id: x.contentDetails && x.contentDetails.videoId,
      title: x.snippet && x.snippet.title,
      published_at: x.contentDetails && x.contentDetails.videoPublishedAt
    })).filter(x => x.video_id);
  }

  /* 取時長判定是否 Shorts */
  let durations = {};
  if (recent.length) {
    const vd = await ytGet('videos', {
      part: 'contentDetails,statistics',
      id: recent.map(x => x.video_id).join(',')
    });
    for (const v of vd.items || []) {
      durations[v.id] = {
        seconds: isoToSeconds(v.contentDetails && v.contentDetails.duration),
        views: Number((v.statistics && v.statistics.viewCount) || 0),
        likes: Number((v.statistics && v.statistics.likeCount) || 0),
        comments: Number((v.statistics && v.statistics.commentCount) || 0)
      };
    }
  }

  const enriched = recent.map(x => {
    const d = durations[x.video_id] || {};
    return {
      ...x,
      seconds: d.seconds || 0,
      is_shorts: (d.seconds || 0) > 0 && d.seconds <= c.maxShortsSeconds,
      views: d.views || 0,
      likes: d.likes || 0,
      comments: d.comments || 0
    };
  });

  const shorts = enriched.filter(x => x.is_shorts);
  const st = item.statistics || {};

  return {
    ok: true,
    configured: true,
    source: 'youtube_data_api_v3',
    channel: {
      id: item.id,
      title: item.snippet && item.snippet.title,
      custom_url: item.snippet && item.snippet.customUrl,
      published_at: item.snippet && item.snippet.publishedAt,
      subscribers: Number(st.subscriberCount || 0),
      total_views: Number(st.viewCount || 0),
      video_count: Number(st.videoCount || 0)
    },
    recent_uploads: enriched.length,
    recent_shorts: shorts.length,
    shorts_ratio: enriched.length ? Number((shorts.length / enriched.length).toFixed(3)) : 0,
    latest: enriched.slice(0, 5),
    shorts_top: shorts.sort((a, b) => b.views - a.views).slice(0, 5)
  };
}

/* 排程建議：以現有素材與站點主題產生「下一批 Shorts 選題」
   純規則、零成本、可重現；不是 LLM 生成，避免幻覺。 */
const TOPIC_BANK = [
  { id: 'S-01', site: 'orbit', hook: '3D 環繞 15 秒：走進還沒蓋好的家', cta: 'orbit.xingdeng.tw', intent: 'traffic' },
  { id: 'S-02', site: 'decoration', hook: '衣櫃一尺多少錢？中部行情直接講', cta: 'decoration.xingdeng.tw', intent: 'lead' },
  { id: 'S-03', site: 'tower', hook: '統包商為什麼接不到案？問題不在價格', cta: 'tower.xingdeng.tw', intent: 'b2b' },
  { id: 'S-04', site: 'tower', hook: '22 萬做一套會自動接單的 LINE 系統，長什麼樣', cta: 'tower.xingdeng.tw/pricing', intent: 'b2b' },
  { id: 'S-05', site: 'vip', hook: '黑卡會員的算力排程，跟一般人有什麼不同', cta: 'vip.xingdeng.tw', intent: 'vip' },
  { id: 'S-06', site: 'xingdeng', hook: '五個網站、一個後台：我們怎麼把流量接起來', cta: 'xingdeng.tw', intent: 'brand' },
  { id: 'S-07', site: 'decoration', hook: '老屋翻新最常被追加的三個項目', cta: 'decoration.xingdeng.tw', intent: 'lead' },
  { id: 'S-08', site: 'orbit', hook: '把平面圖丟進去，30 秒看到成品', cta: 'orbit.xingdeng.tw', intent: 'traffic' }
];

function schedulePlan({ perWeek = 3, weeks = 4, startDate = null } = {}) {
  const start = startDate ? new Date(startDate) : new Date();
  const total = Math.max(1, Math.min(52, perWeek * weeks));
  const plan = [];
  /* 台灣 = UTC+8。上片時段固定「台灣時間 20:00」＝ UTC 12:00。
     一律以 UTC 運算，避免伺服器時區（Vercel 為 UTC）造成偏移。 */
  const TW_OFFSET_MS = 8 * 3600 * 1000;
  const SLOT_HOUR_TW = 20;
  /* 以「台灣時間的當週週一」為錨點，週內固定偏移：週二 +1、週四 +3、週六 +5。
     這樣 seq 一定隨時間遞增，不會出現第 1 支排在最後的問題。 */
  const startTw = new Date(start.getTime() + TW_OFFSET_MS);
  const dow = startTw.getUTCDay();               // 0=日 … 6=六
  const backToMon = (dow + 6) % 7;               // 距離本週週一幾天
  const mondayTwMs = Date.UTC(
    startTw.getUTCFullYear(), startTw.getUTCMonth(), startTw.getUTCDate() - backToMon
  );
  const SLOT_OFFSET = [1, 3, 5];                 // 週二 / 週四 / 週六
  /* 若本週第一個時段（週二 20:00 TW）已過，整週往後推，避免排出過期時段。
     以「整週平移」而非逐筆平移，確保 seq 與時間嚴格遞增。 */
  const nowMs = Date.now();
  let anchorMs = mondayTwMs;
  const firstSlotMs = anchorMs + SLOT_OFFSET[0] * 86400000 + (SLOT_HOUR_TW - 8) * 3600000;
  while (firstSlotMs + (anchorMs - mondayTwMs) < nowMs) anchorMs += 7 * 86400000;
  for (let i = 0; i < total; i++) {
    const t = TOPIC_BANK[i % TOPIC_BANK.length];
    const weekIdx = Math.floor(i / perWeek);
    const dayOffset = SLOT_OFFSET[i % perWeek];
    const d = new Date(anchorMs + (weekIdx * 7 + dayOffset) * 86400000 + (SLOT_HOUR_TW - 8) * 3600000);
    plan.push({
      seq: i + 1,
      topic_id: t.id,
      site: t.site,
      hook: t.hook,
      cta: t.cta,
      intent: t.intent,
      publish_at: d.toISOString(),
      publish_at_tw: d.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }),
      status: 'planned',
      note: '需人工或 OAuth 上傳；本管線只排程與回收成效'
    });
  }
  return {
    ok: true,
    per_week: perWeek,
    weeks,
    total,
    timezone: 'Asia/Taipei',
    slots: '週二/四/六 20:00',
    plan
  };
}

/* 一鍵體檢：金鑰 → 頻道 → 最近上傳 → Shorts 佔比 → 排程 */
async function diagnose() {
  const out = { ok: true, schema: 'snt-shorts-v1', at: new Date().toISOString(), config: status() };
  if (!out.config.configured) {
    out.ok = false;
    out.verdict = 'not_configured';
    out.note = '缺少 YOUTUBE_API_KEY 或 YOUTUBE_CHANNEL_ID，管線未啟動';
    return out;
  }
  try {
    const snap = await channelSnapshot();
    out.channel = snap;
    out.verdict = snap.ok ? 'live' : 'channel_error';
    out.schedule = schedulePlan({ perWeek: 3, weeks: 4 });
  } catch (e) {
    out.ok = false;
    out.verdict = 'api_error';
    out.error = String(e.message || e).slice(0, 200);
    out.http_status = e.status || 0;
    out.reason = e.reason || null;
  }
  return out;
}

module.exports = { status, channelSnapshot, schedulePlan, diagnose, isoToSeconds, TOPIC_BANK };
