'use client';

import { useReveals } from '@/hooks/useReveals';

// Mounts the scroll-reveal sweep (IntersectionObserver is browser-only). Kept as a tiny
// client island so the home page itself can be a server component and fetch its review
// excerpt on the server.
export default function RevealsMount() {
  useReveals();
  return null;
}
