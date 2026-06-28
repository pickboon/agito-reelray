// ============================================================
// 内容审核 — Next.js Edge Runtime 兼容
// 双防线：① 本地关键词 + RegEx（快速拦截）→ ② 百度文本内容审核 API
// 环境变量：BAIDU_API_KEY / BAIDU_SECRET_KEY（可选，不配则仅本地防线）
// ============================================================

const BLOCKED_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /诈骗|洗钱|赌博|博彩|毒品|枪支/gi, label: "违法犯罪" },
  { pattern: /裸聊|色情|性爱|情色/gi, label: "色情内容" },
  { pattern: /广告推广|加微信|加V信|加qq/gi, label: "广告推广" },
  { pattern: /<script[\s>]/gi, label: "XSS注入" },
  { pattern: /javascript\s*:/gi, label: "XSS注入" },
  { pattern: /on(error|load|click|mouse)\s*=/gi, label: "XSS注入" },
  { pattern: /eval\s*\(/gi, label: "危险代码" },
  { pattern: /document\.cookie/gi, label: "数据窃取" },
  { pattern: /fetch\s*\(\s*['"]https?:\/\/(?!.*(?:supabase|agitoai))/gi, label: "外连请求" },
];

export interface ModerationResult {
  pass: boolean;
  reason?: string;
  label?: string;
}

// ── 百度 access_token 缓存 ──
let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

async function getBaiduToken(): Promise<string | null> {
  const apiKey = process.env.BAIDU_API_KEY;
  const secretKey = process.env.BAIDU_SECRET_KEY;
  if (!apiKey || !secretKey) return null;

  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

  try {
    const params = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: apiKey,
      client_secret: secretKey,
    });

    const res = await fetch(`https://aip.baidubce.com/oauth/2.0/token?${params.toString()}`);
    if (!res.ok) { console.error("[baidu] token 获取失败:", res.status); return null; }

    const data = await res.json();
    if (data.access_token) {
      cachedToken = data.access_token;
      tokenExpiresAt = Date.now() + (data.expires_in || 2592000) * 1000 - 432000000;
      return cachedToken;
    }
    return null;
  } catch {
    return null;
  }
}

async function remoteModerate(text: string): Promise<ModerationResult | null> {
  const token = await getBaiduToken();
  if (!token) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const body = new URLSearchParams({ text });
    const res = await fetch(
      `https://aip.baidubce.com/rest/2.0/solution/v1/text_censor/v2/user_defined?access_token=${token}`,
      { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body.toString(), signal: controller.signal }
    );
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();

    if (data.conclusionType === 1) {
      return { pass: true, label: "baidu_pass" };
    }
    if (data.conclusionType === 4) return null;

    const typeMap: Record<number, string> = {
      11: "违禁词库", 12: "反作弊", 13: "黑名单",
      30: "政治敏感", 31: "暴恐", 33: "色情", 34: "低俗辱骂",
      35: "涉价值观", 36: "广告", 37: "广告法", 38: "隐私信息", 39: "低质灌水",
    };
    const labels = (data.data || []).map((d: { msg?: string; type?: number }) =>
      `${typeMap[d.type || 0] || "违规"}${d.msg ? "：" + d.msg : ""}`
    );

    return {
      pass: false,
      reason: labels.join("; ") || data.conclusion || "内容未通过安全审核",
      label: `baidu_${data.conclusionType === 3 ? "suspicious" : "reject"}`,
    };
  } catch {
    return null;
  }
}

/**
 * 审核文本内容
 * 审核失败/服务不可用时放行（避免阻塞用户操作），仅记录日志
 */
export async function moderateText(text: string): Promise<ModerationResult> {
  if (!text || typeof text !== "string") {
    return { pass: false, reason: "内容为空", label: "empty" };
  }

  // ── 第一防线：本地正则审核 ──
  for (const { pattern, label } of BLOCKED_PATTERNS) {
    if (pattern.test(text)) {
      pattern.lastIndex = 0;
      return { pass: false, reason: `内容触发安全规则：${label}`, label };
    }
  }

  // ── 第二防线：百度远程 AI 审核 ──
  try {
    const remoteResult = await remoteModerate(text);
    if (remoteResult && !remoteResult.pass) return remoteResult;
  } catch {
    // 远程审核异常时放行
    console.warn("[moderation] 远程审核服务不可用，放行");
  }

  return { pass: true };
}
