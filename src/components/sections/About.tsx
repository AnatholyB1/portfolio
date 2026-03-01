'use client';

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
  return (
    <section id="about" className="py-20 px-4 bg-black/30">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-4 bg-linear-to-r from-indigo-500 to-cyan-500 bg-clip-text text-transparent">
          About Me
        </h2>
        <div className="w-20 h-1 bg-linear-to-r from-indigo-500 to-cyan-500 mx-auto mb-12 rounded-full" />
        
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <p className="text-gray-300 text-lg leading-relaxed">
              I&apos;m a backend-oriented developer passionate about building scalable systems
               and intelligent digital solutions. With a 
               strong foundation in modern web architectures, APIs, 
               and cloud-based infrastructures, I design and develop 
               robust back-end systems that power seamless user experiences.
            </p>
            <p className="text-gray-300 text-lg leading-relaxed">
               My journey in tech started with curiosity and evolved into 
               a deep focus on engineering reliable, high-performance applications
               . Today, I specialize in backend development, AI integration, 
               and system architecture — building secure APIs, microservices, 
               and data-driven platforms that transform complex ideas into production-ready solutions.
            </p>
            <p className="text-gray-300 text-lg leading-relaxed">
              Beyond backend and AI, I also work on advanced 3D web integrations,
              creating immersive and interactive experiences using modern WebGL technologies.
            </p>
            <p className="text-gray-300 text-lg leading-relaxed">
              I&apos;m also the co-founder of <a href="https://selenium-studio.com" target="_blank" rel="noopener noreferrer" className="text-cyan-500 hover:underline">Selenium Studio</a>
              , where we design and develop innovative digital 
              products at the intersection of engineering, creativity, and performance.
            </p>
            <p className="text-gray-300 text-lg leading-relaxed">
              When I&apos;m not architecting systems or experimenting with AI models, I explore emerging technologies, 
              contribute to innovative projects, and push the boundaries of interactive web experiences.
            </p>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white mb-6">My Skills</h3>
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
