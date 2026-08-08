import { Link } from 'react-router-dom';
import { Section, SecHead, Reveal, ProductCard } from '../components';
import { useLanding } from '../context';
import { SAMPLES } from '../data';
import { C } from '../theme';

export default function LiveMarketplace() {
  const { tx, listings, Arrow } = useLanding();
  const realList = listings.slice(0, 8);
  const showingSamples = realList.length < 3;
  const gridItems = showingSamples ? [...realList, ...SAMPLES].slice(0, 6) : realList.slice(0, 6);
  // صدقٌ في العنوان: «إعلانات حقيقيّة» تُقال **فقط** حين تكون حقيقيّة. حين نعرض
  // أمثلةً (السوق ما زال يمتلئ) نقولها صراحةً بدل ادّعاءٍ يكذّبه المستخدم بنقرة.
  const sub = showingSamples ? tx('liveSampleSub') : tx('liveSub');

  return (
    <Section id="live" alt>
      <Reveal><SecHead title={tx('liveTitle')} sub={sub} /></Reveal>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%,200px), 1fr))', gap: 16, marginTop: 30 }}>
        {gridItems.map((it, i) => <Reveal key={it.id} delay={(i % 4) * 70}><ProductCard it={it} big /></Reveal>)}
      </div>
      <div style={{ textAlign: 'center', marginTop: 26 }}>
        <Link to="/market" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, padding: '13px 26px', borderRadius: 14, background: C.surface, color: C.ink, fontSize: 15, fontWeight: 800, textDecoration: 'none', border: `1px solid ${C.borderH}` }}>{tx('liveViewAll')} <Arrow size={16} /></Link>
      </div>
    </Section>
  );
}
