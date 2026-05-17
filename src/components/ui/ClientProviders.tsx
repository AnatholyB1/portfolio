'use client';

import dynamic from 'next/dynamic';

const CustomCursor = dynamic(() => import('@/components/ui/CustomCursor'), { ssr: false });
const CinemaIntro = dynamic(() => import('@/components/ui/CinemaIntro'), { ssr: false });

export const MethodologySectionLazy = dynamic(
  () => import('@/components/sections/MethodologySection'),
  { ssr: false }
);

export default function ClientProviders() {
  return (
    <>
      <CustomCursor />
      <CinemaIntro />
    </>
  );
}
