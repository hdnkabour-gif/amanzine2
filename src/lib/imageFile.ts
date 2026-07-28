// ============================================================
// imageFile — ضغطُ الصور قبل الرفع. كانت هذه الدالّة حبيسةَ AssistantPage
//   بينما يحتاجها كلُّ مَن ينشر صورة. استُخرجت لتُشارَك بلا تكرار.
// ============================================================

// ضغطُ صورةٍ إلى حدٍّ أقصى للبُعد الأكبر → data URL (jpeg). النشر يحتاج جودةً
// أعلى من الرؤية: الصورة تُعرَض للزبون، ولا تُقرأ من نموذجٍ فقط.
export function shrinkImage(file: File, max = 512, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const cx = cv.getContext('2d'); if (!cx) return reject(new Error('no ctx'));
      cx.drawImage(img, 0, 0, w, h);
      resolve(cv.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    const fr = new FileReader();
    fr.onload = () => { img.src = String(fr.result); };
    fr.onerror = reject; fr.readAsDataURL(file);
  });
}

// صورُ الإعلان: أكبر وأوضح من صور الرؤية (1280px / 0.82).
export const shrinkForListing = (f: File) => shrinkImage(f, 1280, 0.82);

export const MAX_PHOTOS = 6;
