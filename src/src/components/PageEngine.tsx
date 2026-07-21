import { useStore } from '../store';
import { getPageDef } from '../lib/akg';
import CreateFlow from './CreateFlow';

// ============================================================
// PageEngine — الصفحة صارت بيانات. يقرأ معرّف الصفحة (من prop صريح أو من
//   الراوتر/currentPage)، يجلب تعريفها من Page Registry، ثمّ يرسمها بالمحرّك
//   المناسب. لا يعرف «Products» ولا «Cars» — يعرف تعريفًا فقط.
//   <PageEngine page="products.create" />  أو  <PageEngine /> (من الراوتر).
// ============================================================

// ربط مسار التطبيق الحاليّ (currentPage) بمعرّف صفحة في السجلّ.
const ROUTE_TO_PAGE: Record<string, string> = {
  publish: 'universal.create',
};

export default function PageEngine({ page }: { page?: string }) {
  const { currentPage } = useStore();
  const id = page || ROUTE_TO_PAGE[currentPage] || 'universal.create';
  const def = getPageDef(id) || getPageDef('universal.create')!;

  if (def.renderer === 'create') return <CreateFlow def={def} />;
  return null;
}
