import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { StoreProvider } from './store';

const root = document.getElementById('root')!;
createRoot(root).render(
  <ErrorBoundary>
    <BrowserRouter>
      <StoreProvider>
        <App />
      </StoreProvider>
    </BrowserRouter>
  </ErrorBoundary>
);
// شاشةُ البدء لا تُخفى هنا. مهمّتُها تغطيةُ زمن التحميل، وإخفاؤها لحظةَ
// جاهزيّة React (≈300ms) كان يُظهرها ومضةً ثمّ يترك فراغًا قبل بدء فيديو
// البوّابة. التسليمُ صار للبوّابة نفسِها (GateIntro في App.tsx): تُخفيها حين
// تصير جاهزةً للعرض، أو فورًا إن كانت لن تُعرض أصلًا.
// أمانٌ أخير: إن لم يصل أيُّ تسليمٍ، مؤقّتُ index.html يكشف التطبيق وحدَه.

// Service worker is registered once in index.html (avoids double registration).
