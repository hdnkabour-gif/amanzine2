import { CONCEPTS } from './src/lib/akg/kb/concepts';
import { knowledgeStats, resolveConcept } from './src/lib/akg/kb/knowledge';
import { CONCEPTS as GEN } from './src/lib/akg/kb/knowledgeData';
import { EXTRA_CONCEPTS, ENRICH_CONCEPTS } from './src/lib/akg/kb/knowledgeExtra';
import { IMPORTED_CONCEPTS } from './src/lib/akg/kb/knowledgeExtra.generated';
import { PROBLEMS } from './src/lib/akg/kb/problems';
import { PROFESSIONS } from './src/lib/akg/kb/professions';
import { ABILITIES } from './src/lib/abilities';
import { PAGE_IDS } from './src/types';

console.log('CONCEPTS total =', CONCEPTS.length);
console.log('  generated(knowledgeData) =', GEN.length);
console.log('  extra =', EXTRA_CONCEPTS.length, ' enrich =', ENRICH_CONCEPTS.length, ' imported(csv) =', IMPORTED_CONCEPTS.length);
console.log('knowledgeStats =', JSON.stringify(knowledgeStats()));
console.log('PROBLEMS =', (PROBLEMS as any[]).length);
console.log('PROFESSIONS =', (PROFESSIONS as any[]).length);
console.log('ABILITIES =', ABILITIES.length);
console.log('abilities with page=null =', ABILITIES.filter(a=>a.page===null).map(a=>a.id).join(','));
console.log('PAGE_IDS =', (PAGE_IDS as any).length);
// concepts with empty services
console.log('concepts with services[] non-empty =', CONCEPTS.filter(c=>(c.services||[]).length).length);
console.log('concepts with stance =', CONCEPTS.filter(c=>c.stance).length);
console.log('concepts with links =', CONCEPTS.filter(c=>c.links).length);
// variant counts per language
const langCount: Record<string, number> = {};
for (const c of CONCEPTS) for (const [l, v] of Object.entries(c.variants||{})) langCount[l] = (langCount[l]||0) + (v||[]).length;
console.log('variants by lang =', JSON.stringify(langCount));
