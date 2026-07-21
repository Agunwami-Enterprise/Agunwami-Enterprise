import Preloader from '@/components/Preloader';

// Next.js route-level loading state — automatically shown while a page segment
// is loading. Also re-exported for manual use anywhere a loading state is needed.
export default function Loading() {
  return <Preloader />;
}
