'use client';

import dynamic from 'next/dynamic';

const StarkDisplay = dynamic(() => import('../three/StarkDisplay'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-175 bg-[#000a14] flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <div className="text-cyan-400 font-mono text-sm">INITIALIZING STARK DISPLAY...</div>
      </div>
    </div>
  ),
});

export default function Projects() {
  return (
    <section id="projects" className="py-20 px-4 bg-[#000a14]">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-4 text-transparent bg-clip-text bg-linear-to-r from-cyan-400 to-blue-500">
          Project Archive
        </h2>
        <p className="text-center text-cyan-600 font-mono text-sm mb-8">
          // ACCESSING CLASSIFIED FILES...
        </p>
        
        <StarkDisplay />
      </div>
    </section>
  );
}
