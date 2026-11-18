/* SNT v6.0 — 隱蔽式動態物調定價引擎（後端專用）
   成本與毛利結構只存在於此檔與伺服器記憶體，永不回傳前端。
   公式：售價 = ROUND( 標準成本 × 物調係數 ÷ (1 − 目標毛利率), -3 )
   來源：SNT 單價.xlsx（儀表板與物調總覽 / 套餐與動態報價矩陣 / 功能庫總表）
*/

'use strict';

/* ---------- 物調參數（可由後台調整，僅存後端） ---------- */
const PARAMS = {
  inflation: 1.0,        // 物調係數 1.00 ~ 1.03
  targetMargin: 0.35,    // 目標商業毛利率（鎖定）
  vatRate: 0.05,         // 加值營業稅
  minInflation: 1.0,
  maxInflation: 1.03
};

/* ---------- 套餐基礎成本（TWD，來自單價表「標準成本」欄） ---------- */
const PLANS = {
  Personal:     { name: 'Personal',     audience: '個人品牌／單一服務者', purpose: '精簡網站驗證可信度並收集詢問', hours: 120,   cost: 94250 },
  Business:     { name: 'Business',     audience: '中小企業／專業服務',   purpose: '多頁服務站、雙語內容與可追蹤名單', hours: 240,   cost: 201500 },
  Store:        { name: 'Store',        audience: '商品型品牌／零售',     purpose: '商品／會員／訂單骨架，PSP 僅在核准後接 live', hours: 725.6, cost: 877500 },
  Professional: { name: 'Professional', audience: '顧問、B2B、數位服務商', purpose: '內容、名單分流、報價與 API 自動化', hours: 950,   cost: 1202500 },
  Enterprise:   { name: 'Enterprise',   audience: '多品牌／高治理需求組織', purpose: '多語、多系統串接、權限稽核與正式運維', hours: 1280,  cost: 1690000 },
  Custom:       { name: 'Custom',       audience: '範圍未定／特殊整合',   purpose: '先做發現與規格；選定功能後按工時計價', hours: 40,    cost: 37700 }
};

/* ---------- 功能庫（客變報價用；工時成本 = PERT 工時 × 每小時成本） ---------- */
const FEATURES = {
  'WEB-001': { name: 'Global Navigation & Footer',        cat: 'navigation',      cx: 'S',  hours: 15.2 },
  'WEB-002': { name: 'Hero / Value Proposition',          cat: 'marketing',       cx: 'S',  hours: 15.2 },
  'PAY-001': { name: 'Pricing Tiers & Comparison',        cat: 'commerce',        cx: 'M',  hours: 36.4 },
  'CRM-001': { name: 'Contact Lead Capture',              cat: 'lead-generation', cx: 'M',  hours: 36.4 },
  'CRM-002': { name: 'Lead Magnet / AI Assessment',       cat: 'lead-generation', cx: 'M',  hours: 39.8 },
  'API-001': { name: 'Site Search / RAG-style Analyze',   cat: 'search',          cx: 'L',  hours: 78.6 },
  'AI-001':  { name: 'AI Chat Widget',                    cat: 'support',         cx: 'S',  hours: 15.6 },
  'PAY-003': { name: 'Payment Checkout / Subscriptions',  cat: 'payments',        cx: 'XL', hours: 154.2 },
  'AI-002':  { name: 'Operations / AI Agent Matrix',      cat: 'automation',      cx: 'XL', hours: 156.4 },
  'ADM-001': { name: 'Dashboard / Admin',                 cat: 'admin',           cx: 'XL', hours: 148.5 },
  'AI-901':  { name: 'AI 對話／名單分流',                  cat: 'proposed',        cx: 'L',  hours: 78.6 },
  'PAY-902': { name: '第三方支付服務整合',                  cat: 'proposed',        cx: 'L',  hours: 78.6 }
};

/* 每小時成本基準：以 Business 套餐的 成本/工時 為錨（839.6/hr），
   客變工時沿用同一費率，確保與套餐定價邏輯一致。 */
const HOURLY_COST = PLANS.Business.cost / PLANS.Business.hours;

/* ---------- 核心計算（唯一出口，永不外流成本） ---------- */
function roundToThousand(n) {
  return Math.round(n / 1000) * 1000;
}

function clampInflation(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return PARAMS.inflation;
  return Math.min(PARAMS.maxInflation, Math.max(PARAMS.minInflation, n));
}

/** 由成本推導售價（ex-VAT），四捨五入至千元 */
function priceFromCost(cost, inflation) {
  const inf = clampInflation(inflation);
  const raw = (cost * inf) / (1 - PARAMS.targetMargin);
  return roundToThousand(raw);
}

/** 單一套餐報價（對外可公開的欄位） */
function quotePlan(key, inflation) {
  const p = PLANS[key];
  if (!p) return null;
  const inf = clampInflation(inflation);
  const price = priceFromCost(p.cost, inf);
  const vat = Math.round(price * PARAMS.vatRate);
  return {
    plan: p.name,
    audience: p.audience,
    purpose: p.purpose,
    hours: p.hours,
    inflation: inf,
    price_ex_vat: price,
    vat,
    price_incl_vat: price + vat,
    currency: 'TWD'
  };
}

/** 客變報價：選定功能 → 工時 → 成本 → 售價 */
function quoteCustom(featureIds, inflation, extraHours) {
  const inf = clampInflation(inflation);
  const ids = Array.isArray(featureIds) ? featureIds : [];
  const picked = [];
  let hours = 0;
  for (const id of ids) {
    const f = FEATURES[String(id).toUpperCase()];
    if (!f) continue;
    picked.push({ id: String(id).toUpperCase(), name: f.name, category: f.cat, complexity: f.cx, hours: f.hours });
    hours += f.hours;
  }
  const extra = Math.max(0, Number(extraHours) || 0);
  hours += extra;
  const cost = hours * HOURLY_COST;
  const price = priceFromCost(cost, inf);
  const vat = Math.round(price * PARAMS.vatRate);
  return {
    features: picked,
    extra_hours: extra,
    total_hours: Math.round(hours * 10) / 10,
    inflation: inf,
    price_ex_vat: price,
    vat,
    price_incl_vat: price + vat,
    currency: 'TWD'
  };
}

/** 全套餐矩陣（後台用；仍不含成本） */
function matrix(inflation) {
  return Object.keys(PLANS).map(k => quotePlan(k, inflation));
}

module.exports = {
  PARAMS, PLANS, FEATURES, HOURLY_COST,
  clampInflation, priceFromCost, quotePlan, quoteCustom, matrix, roundToThousand
};
