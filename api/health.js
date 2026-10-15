/* 運維健康檢查端點：只回presence布林值，絕不回顯任何機敏值 */
module.exports = async function handler(req, res) {
  const env = (k) => !!process.env[k] && String(process.env[k]).length > 0;
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    ok: true,
    ts: new Date().toISOString(),
    version: 'ops-2026.10.15',
    services: {
      gemini: env('GEMINI_API_KEY'),
      serpent_scan: env('SERPAPI_KEY'),
      line: env('LINE_CHANNEL_ACCESS_TOKEN'),
      supabase: env('SUPABASE_URL') && env('SUPABASE_SERVICE_ROLE_KEY'),
      stripe: env('STRIPE_SECRET_KEY'),
      paypal: env('PAYPAL_CLIENT_ID'),
      smtp: process.env.RESEND_API_KEY || process.env.SMTP_HOST || false
    },
    routes: ['/','/3d','/kits','/pricing','/reports','/diagnose','/contact','/checkout','/ops','/articles/a01']
  });
};
