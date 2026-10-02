'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { isPrivatePath } from '@/lib/privateRoutes';
import { markIntroDone } from '@/lib/consent/store';

const CustomCursor = dynamic(() => import('@/components/ui/CustomCursor'), { ssr: false });
const CinemaIntro = dynamic(() => import('@/components/ui/CinemaIntro'), { ssr: false });

export const MethodologySectionLazy = dynamic(
  () => import('@/components/sections/MethodologySection'),
  { ssr: false }
);

export default function ClientProviders() {
  const pathname = usePathname();
  // D-11 : pas d'intro cinéma ni de curseur custom sur les zones privées.
  if (isPrivatePath(pathname)) return null;
  return (
    <>
      <CustomCursor />
      <CinemaIntro onDone={markIntroDone} />
    </>
  );
}
