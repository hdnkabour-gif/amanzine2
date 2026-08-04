import { useState } from 'react';

// ============================================================
// «هاد الرابط ديالك» — اللحظةُ التي يملك فيها التاجرُ شيئًا.
//
//   الزيارةُ الميدانيّةُ تكسر حلقةَ البيضةِ والدجاجة من الطرف الصحيح: سوقٌ
//   بلا تجّارٍ لا يجذب زبناء، وبلا زبناءَ لا يجذب تجّارًا. والحلُّ أن يربح
//   التاجرُ **قبل** وصول أيّ زبون — رابطٌ يشاركه في واتساب اليوم.
//
//   وكان التطبيقُ يملك الصفحةَ العامّة (`/store/:userId`) ولا يملك **اللحظة**:
//   ينشر التاجرُ ثمّ لا يرى شيئًا يأخذه معه. صفحةٌ بلا رابطٍ في اليد كأنّها
//   لم تُنشَر.
//
//   وثلاثةُ أزرارٍ لا واحد، لأنّ المغربيَّ يشارك بواتساب لا بالنسخ:
//     • واتساب — الطريقُ الفعليّ لِتصل الزبناء
//     • نسخ    — لِمن يريد وضعَه في «البيو»
//     • فتح    — ليرى بعينه أنّ الصفحةَ حقيقيّةٌ وتعمل
// ============================================================

interface Props {
  /** مُعرِّفُ صاحب المتجر — يبني `/store/:userId`. */
  userId: string;
  /** اسمُ المحلّ أو المهنة — يدخل في نصّ المشاركة. */
  name?: string;
  /** المدينةُ والحيّ — «قريب منك» هي ما يُقنع الزبون. */
  where?: string;
  compact?: boolean;
}

export default function ShareShop({ userId, name = 'المحلّ ديالي', where, compact }: Props) {
  const [copied, setCopied] = useState(false);
  if (!userId) return null;

  // الأصلُ من المتصفّح لا ثابتٌ في الكود: التطبيقُ يعمل على نطاقاتٍ مختلفة
  // (محلّيّ · Railway · نطاقٌ خاصٌّ لاحقًا)، ورابطٌ مكتوبٌ بيدٍ يكذب في أحدها.
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const url = `${origin}/store/${encodeURIComponent(userId)}`;

  const msg = `سلام 👋 هادي الصفحة ديال ${name}${where ? ` — ${where}` : ''}\n${url}`;
  const wa = `https://wa.me/?text=${encodeURIComponent(msg)}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true); setTimeout(() => setCopied(false), 2200);
    } catch {
      // متصفّحٌ يمنع الحافظة (أو سياقٌ غير آمن) — نُظهر الرابطَ ليُنسَخ يدويًّا
      // بدل زرٍّ يبدو أنّه عمل ولم يعمل.
      setCopied(false);
      window.prompt('انسخ الرابط:', url);
    }
  };

  return (
    <div style={{
      border: '1px solid var(--amz-emerald,#0a8f6f)', borderRadius: 14,
      padding: compact ? 12 : 16, display: 'flex', flexDirection: 'column', gap: 10,
      background: 'color-mix(in srgb, var(--amz-emerald,#0a8f6f) 8%, transparent)',
    }}>
      {!compact && (
        <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--ink1)' }}>
          🎉 المحلّ ديالك واجد!
        </div>
      )}
      <div style={{ fontSize: 12.5, color: 'var(--ink3)', lineHeight: 1.7 }}>
        هادا الرابط ديالك — صيفطو لزبنائك فواتساب، ولّا حطّو فالبيو.
      </div>

      <div style={{
        padding: '9px 12px', borderRadius: 10, background: 'var(--panel,rgba(0,0,0,.18))',
        border: '1px solid var(--border2,rgba(255,255,255,.14))',
        fontSize: 12.5, fontWeight: 700, color: 'var(--ink1)',
        direction: 'ltr', textAlign: 'start', overflowX: 'auto', whiteSpace: 'nowrap',
      }}>{url}</div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <a href={wa} target="_blank" rel="noreferrer" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px',
          borderRadius: 11, background: '#25D366', color: '#fff',
          fontSize: 13, fontWeight: 800, textDecoration: 'none',
        }}>📲 صيفط فواتساب</a>

        <button type="button" onClick={copy} style={{
          padding: '10px 16px', borderRadius: 11, cursor: 'pointer',
          border: '1px solid var(--border2,rgba(255,255,255,.18))',
          background: 'transparent', color: 'var(--ink1)',
          fontSize: 13, fontWeight: 800, fontFamily: 'inherit',
        }}>{copied ? '✓ تنسخ' : '📋 نسخ الرابط'}</button>

        <a href={url} target="_blank" rel="noreferrer" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px',
          borderRadius: 11, border: '1px solid var(--border2,rgba(255,255,255,.18))',
          color: 'var(--ink1)', fontSize: 13, fontWeight: 800, textDecoration: 'none',
        }}>👁️ شوف الصفحة</a>
      </div>
    </div>
  );
}
