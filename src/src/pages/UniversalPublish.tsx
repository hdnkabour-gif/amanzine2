import PageEngine from '../components/PageEngine';

// ============================================================
// UniversalPublish — صارت غلافًا رفيعًا فوق PageEngine. الصفحة اختفت تقريبًا:
//   كلّ المنطق في المحرّك + السجلّات. للتوافق مع الراوتر فقط.
// ============================================================

export default function UniversalPublish() {
  return <PageEngine page="universal.create" />;
}
