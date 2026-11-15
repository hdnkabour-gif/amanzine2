import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = p => fs.readFileSync(new URL('../'+p, import.meta.url),'utf8');

test('mobile field visit CTA sits above bottom navigation and below dialogs', () => {
  const css=read('src/index.css');
  const nav=css.match(/\.mobile-bottom-nav\s*\{[^}]+\}/)?.[0] || '';
  const action=css.match(/\.field-visit-action-bar\s*\{[^}]+\}/)?.[0] || '';
  assert.match(nav,/height:\s*72px/);
  assert.match(nav,/z-index:\s*200/);
  assert.match(action,/z-index:\s*220/);
  assert.match(css,/\.field-visit-action-bar\s*\{[^}]*bottom:\s*calc\(72px \+ env\(safe-area-inset-bottom/);
  const jsx=read('src/components/VisitFlow.tsx');
  assert.match(jsx,/className="field-visit-action-bar"/);
  assert.match(jsx,/paddingBottom:\s*180/);
  assert.match(jsx,/role="status" aria-live="polite"/);
});

test('field visit only writes user-confirmed concepts, never all inferred fuzzy matches', () => {
  const form=read('src/components/VisitFlow.tsx');
  const page=read('src/pages/FieldVisit.tsx');
  assert.match(form,/aria-pressed=\{chosen\.includes\(id\)\}/);
  assert.match(form,/conceptIds:\s*next, conceptId:\s*next\[0\]/);
  assert.match(page,/confirmedConcepts\.map\(\(id, i\)/);
  assert.doesNotMatch(page,/concepts:\s*found\.map/);
});

test('field-visit shop delivery is not confused with craft mobility or appointments', () => {
  const page = read('src/pages/FieldVisit.tsx');
  assert.match(page, /kind === 'shop' \? asked\.find\(a => a\.id === 'delivery'\)/);
  assert.doesNotMatch(page, /asked\.find\(a => a\.kind === 'yesno'\)/);
});
