import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Section, SecHead, Reveal } from '../components';
import { useLanding } from '../context';
import { C } from '../theme';

export default function FAQ() {
  const { tx, isRtl } = useLanding();
  const [open, setOpen] = useState<number | null>(0);
  const items = [1, 2, 3, 4].map(n => ({ q: tx('faqQ' + n), a: tx('faqA' + n) }));

  return (
    <Section id="faq" alt>
      <Reveal><SecHead title={tx('faqTitle')} sub={tx('faqSub')} /></Reveal>
      <div style={{ maxWidth: 720, margin: '30px auto 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map((it, i) => {
          const isOpen = open === i;
          return (
            <Reveal key={i} delay={i * 60}>
              <div onClick={() => setOpen(isOpen ? null : i)} className="lpcard" style={{ background: C.surface, border: `1px solid ${isOpen ? C.orange : C.border}`, borderRadius: 16, padding: '18px 20px', cursor: 'pointer', boxShadow: C.shadow }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ fontWeight: 800, fontSize: 14.5, color: C.ink, textAlign: isRtl ? 'right' : 'left' }}>{it.q}</span>
                  <ChevronDown size={18} color={isOpen ? C.orange : C.ink3} style={{ flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: '.25s' }} />
                </div>
                {isOpen && <p style={{ margin: '12px 0 0', fontSize: 13.5, color: C.ink2, lineHeight: 1.7, textAlign: isRtl ? 'right' : 'left' }}>{it.a}</p>}
              </div>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}
