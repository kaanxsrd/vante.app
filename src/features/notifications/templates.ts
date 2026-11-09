import type { Severity } from '@/features/settings/schema';
import { type EmailBrand, emailLayout, escapeHtml } from '@/lib/email';
import { countryName, formatDateTime } from '@/lib/format';

export interface SecurityAlertData {
  title: string;
  summary: string;
  severity: Severity;
  classificationLabel: string;
  occurredAt: Date;
  keyPrefix: string | null;
  endpoint: string | null;
  method: string | null;
  ip: string | null;
  country: string | null;
  origin: string | null;
  statusCode: number | null;
  actionTaken: string | null;
  recommendedActions: string[];
  dashboardUrl: string | null;
}

const SEVERITY_COLORS: Record<Severity, string> = {
  info: '#64748b',
  low: '#0ea5e9',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
};

function metaRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:7px 0;font-size:13px;color:#8b8b98;width:130px;vertical-align:top;">${escapeHtml(label)}</td>
    <td style="padding:7px 0;font-size:13px;color:#e2e8f0;font-family:'SFMono-Regular',Menlo,Consolas,monospace;word-break:break-all;">${escapeHtml(value)}</td>
  </tr>`;
}

function metadataPairs(data: SecurityAlertData): Array<[string, string]> {
  const pairs: Array<[string, string]> = [
    ['Severity', data.severity.toUpperCase()],
    ['Assessment', data.classificationLabel],
    ['Time', formatDateTime(data.occurredAt)],
  ];
  if (data.keyPrefix) pairs.push(['API key', data.keyPrefix]);
  if (data.endpoint) {
    pairs.push(['Endpoint', data.method ? `${data.method} ${data.endpoint}` : data.endpoint]);
  }
  if (data.statusCode) pairs.push(['Status', String(data.statusCode)]);
  if (data.ip) pairs.push(['IP address', data.ip]);
  if (data.country) pairs.push(['Country (approx.)', countryName(data.country)]);
  if (data.origin) pairs.push(['Origin', data.origin]);
  return pairs;
}

export function securityAlertEmail(data: SecurityAlertData, brand: EmailBrand) {
  const accent = SEVERITY_COLORS[data.severity];
  const pairs = metadataPairs(data);

  const actionBanner = data.actionTaken
    ? `<tr><td style="padding-bottom:20px;">
        <div style="font-size:13px;color:#fecaca;background-color:#2a1215;border:1px solid #7f1d1d;border-radius:10px;padding:12px 14px;">
          <strong>Action taken:</strong> ${escapeHtml(data.actionTaken)}
        </div>
      </td></tr>`
    : '';

  const button = data.dashboardUrl
    ? `<tr><td style="padding-top:24px;" align="center">
        <a href="${escapeHtml(data.dashboardUrl)}" style="display:inline-block;background-color:#f1f5f9;color:#0a0a0a;font-size:14px;font-weight:600;text-decoration:none;padding:11px 28px;border-radius:10px;">Open incident</a>
      </td></tr>`
    : '';

  const html = emailLayout(
    `<tr><td style="padding-bottom:16px;">
        <span style="display:inline-block;font-size:11px;font-weight:700;letter-spacing:1px;color:${accent};border:1px solid ${accent};border-radius:999px;padding:2px 10px;">${escapeHtml(data.severity.toUpperCase())}</span>
        <div style="font-size:18px;font-weight:600;color:#f1f5f9;line-height:1.35;margin-top:12px;">${escapeHtml(data.title)}</div>
        <div style="font-size:14px;color:#94a3b8;line-height:1.6;margin-top:6px;">${escapeHtml(data.summary)}</div>
      </td></tr>
      ${actionBanner}
      <tr><td style="padding-bottom:20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#0a0a0c;border:1px solid #1e1e24;border-radius:10px;padding:10px 16px;">
          ${pairs.map(([label, value]) => metaRow(label, value)).join('')}
        </table>
      </td></tr>
      <tr><td>
        <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1.2px;color:#8b8b98;margin-bottom:10px;">Recommended actions</div>
        <ol style="margin:0;padding-left:18px;color:#cbd5e1;font-size:14px;line-height:1.7;">
          ${data.recommendedActions.map((action) => `<li>${escapeHtml(action)}</li>`).join('')}
        </ol>
      </td></tr>
      ${button}`,
    `Sent by the ${escapeHtml(brand.siteName)} security monitor. Secrets are never included in alerts. Change these notifications in your dashboard.`,
    accent,
  );

  const text = [
    `[${data.severity.toUpperCase()}] ${data.title}`,
    '',
    data.summary,
    '',
    ...(data.actionTaken ? [`Action taken: ${data.actionTaken}`, ''] : []),
    ...pairs.map(([label, value]) => `${label}: ${value}`),
    '',
    'Recommended actions:',
    ...data.recommendedActions.map((action, index) => `${index + 1}. ${action}`),
    ...(data.dashboardUrl ? ['', `Open incident: ${data.dashboardUrl}`] : []),
  ].join('\n');

  return {
    subject: `[${data.severity.toUpperCase()}] ${data.title}`,
    html,
    text,
  };
}

export function testEmail(brand: EmailBrand) {
  const siteName = escapeHtml(brand.siteName);
  const html = emailLayout(
    `<tr><td>
      <div style="font-size:18px;font-weight:600;color:#f1f5f9;">Notifications are working</div>
      <div style="font-size:14px;color:#94a3b8;line-height:1.6;margin-top:6px;">This is a test from the ${siteName} dashboard. Security alerts will arrive at this address.</div>
    </td></tr>`,
    `Sent by the ${siteName} security monitor.`,
  );
  return {
    subject: `Test notification from ${brand.siteName}`,
    html,
    text: 'Notifications are working. Security alerts will arrive at this address.',
  };
}
