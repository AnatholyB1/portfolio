'use client';

import { useLanguage } from '@/context/LanguageContext';

const skills = [
{ name: 'React / Next.js', level: 90 },
{ name: 'TypeScript', level: 85 },
{ name: 'Three.js / WebGL', level: 75 },

{ name: 'Node.js', level: 85 },
{ name: 'REST / GraphQL APIs', level: 85 },
{ name: 'Microservices Architecture', level: 80 },

{ name: 'PostgreSQL / SQL', level: 85 },
{ name: 'Database Design', level: 85 },

{ name: 'AI Automation Systems', level: 90 },
{ name: 'LLM Integration (OpenAI, RAG)', level: 85 },
{ name: 'TensorFlow / Model Integration', level: 75 },

{ name: 'Cloud (AWS, Vercel)', level: 85 },
{ name: 'Docker / CI-CD', level: 80 },

];

export default function About() {
  const { t } = useLanguage();

  return (
    <section id="about" className="py-20 px-4 bg-black/30">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-4 bg-linear-to-r from-indigo-500 to-cyan-500 bg-clip-text text-transparent">
          {t.about.title}
        </h2>
        <div className="w-20 h-1 bg-linear-to-r from-indigo-500 to-cyan-500 mx-auto mb-12 rounded-full" />
        
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <p className="text-gray-300 text-lg leading-relaxed">
              <strong className="text-white">{t.about.p1_strong}</strong>{' '}
              <span dangerouslySetInnerHTML={{ __html: t.about.p1 }} />
            </p>
            <p className="text-gray-300 text-lg leading-relaxed">
              <strong className="text-white">{t.about.p2_strong}</strong>{' '}
              <span dangerouslySetInnerHTML={{ __html: t.about.p2 }} />
            </p>
            <p className="text-gray-300 text-lg leading-relaxed">
              <strong className="text-white">{t.about.p3_strong}</strong>{' '}
              <span dangerouslySetInnerHTML={{ __html: t.about.p3 }} />
            </p>
            <p className="text-gray-300 text-lg leading-relaxed">
              {t.about.p4}{' '}<a href="https://selenium-studio.com" target="_blank" rel="noopener noreferrer" className="text-cyan-500 hover:underline font-semibold">Selenium Studio</a>,{' '}
              <strong className="text-white">{t.about.p4_strong}</strong>
            </p>
            <p className="text-gray-300 text-lg leading-relaxed">
              <span className="text-green-400">{t.about.p5_available}</span> &nbsp;
              <span className="text-green-400">{t.about.p5_remote}</span> &nbsp;
              <span className="text-green-400">{t.about.p5_based}</span>
            </p>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white mb-6">{t.about.skills_title}</h3>
            {skills.map((skill) => (
              <div key={skill.name} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">{skill.name}</span>
                  <span className="text-gray-400">{skill.level}%</span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-indigo-500 to-cyan-500 rounded-full transition-all duration-1000"
                    style={{ width: `${skill.level}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
