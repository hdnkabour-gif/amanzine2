'use strict';
// ============================================================
// Live Status + Smart Availability — يؤثّران على البحث/الترتيب/الخريطة
// الحالة تُشتقّ من ساعات العمل + تجاوز يدوي (إجازة/انشغال/بموعد/توصيل فقط).
// التوفّر الذكي يُشتقّ من جدول التوفّر الأسبوعي (متاح اليوم/غداً/هذا الأسبوع).
// كلها دوال نقيّة — لا حالة مخزّنة.
// ============================================================

const STATUS = {
  open:        { code: 'open',        label: 'مفتوح الآن',      color: '#22c55e' }, // 🟢
  busy:        { code: 'busy',        label: 'مشغول',           color: '#f59e0b' }, // 🟠
  closed:      { code: 'closed',      label: 'مغلق',            color: '#ef4444' }, // 🔴
  appointment: { code: 'appointment', label: 'بموعد مسبق',      color: '#a855f7' }, // 🟣
  delivery:    { code: 'delivery',    label: 'توصيل فقط',        color: '#3b82f6' }, // 🔵
  quick:       { code: 'quick',       label: 'ردّ سريع (<5د)',   color: '#eab308' }, // 🟡
  offline:     { code: 'offline',     label: 'غير متصل',         color: '#6b7280' }, // ⚫
};

const OVERRIDES = new Set(['busy', 'closed', 'appointment', 'delivery', 'quick', 'offline', 'vacation']);
const toMin = (hhmm) => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '')); return m ? +m[1] * 60 + +m[2] : null; };

// الحالة الحيّة: تجاوز يدوي أولاً، ثم ساعات العمل، وإلا null (غير معروف)
function computeStatus({ workStart, workEnd, override } = {}, now = new Date()) {
  if (override && OVERRIDES.has(override)) return STATUS[override === 'vacation' ? 'closed' : override] || null;
  const s = toMin(workStart), e = toMin(workEnd);
  if (s == null || e == null) return null; // لا ساعات → لا نحكم
  const cur = now.getHours() * 60 + now.getMinutes();
  const openWindow = s <= e ? (cur >= s && cur < e) : (cur >= s || cur < e); // يدعم ما بعد منتصف الليل
  return openWindow ? STATUS.open : STATUS.closed;
}

// التوفّر الذكي من جدول أسبوعي [{weekday,startTime,endTime}]
// weekday: 0=الأحد..6=السبت
function smartAvailability(templates = [], now = new Date()) {
  if (!Array.isArray(templates) || !templates.length) return null;
  const days = new Set(templates.map(t => +t.weekday));
  const today = now.getDay();
  if (days.has(today)) {
    // هل تبقّى وقت اليوم؟
    const cur = now.getHours() * 60 + now.getMinutes();
    const stillToday = templates.some(t => +t.weekday === today && (toMin(t.endTime) ?? 0) > cur);
    return stillToday ? { code: 'today', label: 'متاح اليوم' } : { code: 'today_full', label: 'مكتمل اليوم — متاح قريباً' };
  }
  for (let i = 1; i <= 7; i++) {
    const d = (today + i) % 7;
    if (days.has(d)) return { code: i === 1 ? 'tomorrow' : 'week', label: i === 1 ? 'متاح غداً' : 'متاح هذا الأسبوع' };
  }
  return null;
}

module.exports = { STATUS, computeStatus, smartAvailability };
