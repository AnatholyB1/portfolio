'use client';

import { useRouter } from 'next/navigation';
import { PROJECT_COPY } from '@/lib/projects/copy';
import './project.css';

type Props = { projects: { id: string; title: string }[]; activeId: string };

// Sélecteur affiché seulement avec plusieurs projets (D-10).
export default function ProjectSelector({ projects, activeId }: Props) {
  const router = useRouter();
  if (projects.length < 2) return null;
  return (
    <div className="pt-project-select">
      <label htmlFor="project-select">{PROJECT_COPY.portal.projectSelect}</label>
      <select
        id="project-select"
        value={activeId}
        onChange={(e) => router.push(`?projet=${encodeURIComponent(e.target.value)}`)}
      >
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.title}
          </option>
        ))}
      </select>
    </div>
  );
}
