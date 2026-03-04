'use client';

import { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Text, RoundedBox, Float, Environment, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

interface Project {
  title: string;
  description: string;
  tech: string[];
  github: string;
  live: string;
  icon: string;
}

const projects: Project[] = [
  {
    title: 'AI-Powered Sports Performance App',
    description: 'Intelligent sports application currently in development featuring a custom-built AI model that detects exercises, corrects form, and acts as an autonomous agent to manage training variables (volume, intensity, recovery, progression).',
    tech: ['Next.js', 'Node.js', 'TensorFlow', 'Computer Vision', 'PostgreSQL'],
    github: '',
    live: '',
    icon: '🏋️‍♂️',
  },
  {
    title: 'Dance Studio CRM Platform',
    description: 'Custom CRM system developed for a dance company including client management, scheduling, payments tracking, and internal workflow automation.',
    tech: ['React', 'Node.js', 'PostgreSQL', 'REST API'],
    github: '',
    live: '',
    icon: '💃',
  },
  {
    title: 'ERP Deployment Automation Solution',
    description: 'Collaborated in a team to develop a scalable solution for automated ERP deployment and configuration, focusing on backend architecture and infrastructure reliability.',
    tech: ['Node.js', 'Docker', 'CI/CD', 'Cloud Infrastructure'],
    github: '',
    live: '',
    icon: '🏢',
  },
  {
    title: 'Visual CMS Builder (Canva-like)',
    description: 'Designed and developed a dynamic CMS platform inspired by Canva’s architecture, enabling drag-and-drop layout building and real-time content editing.',
    tech: ['Next.js', 'TypeScript', 'Three.js', 'WebGL'],
    github: '',
    live: '',
    icon: '🎨',
  },
  {
    title: 'Engineering Simulation Platform',
    description: 'Contributed to the development of a technical simulation platform used to model and simulate construction and engineering workflows.',
    tech: ['React', 'Node.js', 'Microservices', 'Cloud Architecture'],
    github: '',
    live: '',
    icon: '🏗️',
  },
  {
    title: 'Jarvis AI Personal Agent',
    description: 'Developed a personal AI agent capable of automating daily tasks, integrating APIs, managing workflows, and acting as a productivity co-pilot.',
    tech: ['Python', 'LLM Integration', 'AI Automation', 'N8n'],
    github: '',
    live: '',
    icon: '🤖',
  },
];

// Particules holographiques flottantes
function HoloParticles({ count = 100 }) {
  const mesh = useRef<THREE.Points>(null);
  
  const particles = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 15;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return positions;
  }, [count]);

  useFrame((state) => {
    if (mesh.current) {
      mesh.current.rotation.y = state.clock.elapsedTime * 0.02;
      mesh.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.01) * 0.1;
    }
  });

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[particles, 3]}
          count={count}
        />
      </bufferGeometry>
      <pointsMaterial size={0.02} color="#00d4ff" transparent opacity={0.6} sizeAttenuation />
    </points>
  );
}

// Grille de sol style Stark
function HoloGrid() {
  const gridRef = useRef<THREE.GridHelper>(null);
  
  useFrame((state) => {
    if (gridRef.current) {
      gridRef.current.position.z = (state.clock.elapsedTime * 0.5) % 1;
    }
  });

  return (
    <group position={[0, -2, 0]}>
      <gridHelper ref={gridRef} args={[30, 30, '#00d4ff', '#004466']} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[30, 30]} />
        <meshBasicMaterial color="#000a14" transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

// Cercle de navigation Arc Reactor style
function ArcReactorNav({ 
  activeIndex, 
  total, 
  onSelect 
}: { 
  activeIndex: number; 
  total: number; 
  onSelect: (i: number) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.z = state.clock.elapsedTime * 0.1;
    }
  });

  return (
    <group position={[0, -1.5, 2]} rotation={[-Math.PI / 4, 0, 0]}>
      {/* Anneau extérieur */}
      <mesh>
        <torusGeometry args={[1.5, 0.02, 16, 100]} />
        <meshBasicMaterial color="#00d4ff" transparent opacity={0.8} />
      </mesh>
      
      {/* Anneau intérieur rotatif */}
      <group ref={groupRef}>
        <mesh>
          <torusGeometry args={[1.2, 0.015, 16, 100]} />
          <meshBasicMaterial color="#00ffff" transparent opacity={0.5} />
        </mesh>
      </group>
      
      {/* Points de navigation */}
      {Array.from({ length: total }).map((_, i) => {
        const angle = (i / total) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(angle) * 1.5;
        const y = Math.sin(angle) * 1.5;
        const isActive = i === activeIndex;
        
        return (
          <group key={i} position={[x, y, 0]}>
            <mesh
              onClick={() => onSelect(i)}
              onPointerOver={(e) => {
                document.body.style.cursor = 'pointer';
                e.stopPropagation();
              }}
              onPointerOut={() => {
                document.body.style.cursor = 'auto';
              }}
            >
              <sphereGeometry args={[isActive ? 0.12 : 0.08, 16, 16]} />
              <meshBasicMaterial 
                color={isActive ? '#00ffff' : '#0088aa'} 
                transparent 
                opacity={isActive ? 1 : 0.7} 
              />
            </mesh>
            {isActive && (
              <mesh>
                <sphereGeometry args={[0.2, 16, 16]} />
                <meshBasicMaterial color="#00ffff" transparent opacity={0.2} />
              </mesh>
            )}
          </group>
        );
      })}
      
      {/* Centre Arc Reactor */}
      <mesh>
        <circleGeometry args={[0.3, 32]} />
        <meshBasicMaterial color="#00d4ff" transparent opacity={0.3} />
      </mesh>
      <mesh>
        <ringGeometry args={[0.25, 0.3, 32]} />
        <meshBasicMaterial color="#00ffff" />
      </mesh>
    </group>
  );
}

// Panneau holographique principal
function HoloPanel({ 
  project, 
  isActive,
  position 
}: { 
  project: Project; 
  isActive: boolean;
  position: [number, number, number];
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  
  useFrame((state) => {
    if (groupRef.current) {
      // Effet de flottement
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.05;
      
      // Scale animation
      const targetScale = isActive ? 1 : 0.3;
      groupRef.current.scale.x = THREE.MathUtils.lerp(groupRef.current.scale.x, targetScale, 0.1);
      groupRef.current.scale.y = THREE.MathUtils.lerp(groupRef.current.scale.y, targetScale, 0.1);
      groupRef.current.scale.z = THREE.MathUtils.lerp(groupRef.current.scale.z, targetScale, 0.1);
      
      // Opacity based on active state
      const targetOpacity = isActive ? 1 : 0;
      groupRef.current.visible = groupRef.current.scale.x > 0.35;
    }
  });

  if (!isActive) return null;

  return (
    <Float speed={2} rotationIntensity={0.1} floatIntensity={0.3}>
      <group ref={groupRef} position={position}>
        {/* Cadre principal holographique */}
        <RoundedBox
          args={[4, 2.5, 0.05]}
          radius={0.05}
          smoothness={4}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          <meshStandardMaterial
            color="#003344"
            transparent
            opacity={0.85}
            metalness={0.3}
            roughness={0.4}
          />
        </RoundedBox>
        
        {/* Bordure lumineuse */}
        <mesh position={[0, 0, -0.03]}>
          <planeGeometry args={[4.1, 2.6]} />
          <meshBasicMaterial color="#00d4ff" transparent opacity={0.1} />
        </mesh>
        
        {/* Lignes de scan */}
        {[...Array(5)].map((_, i) => (
          <mesh key={i} position={[0, -1 + i * 0.5, 0.03]}>
            <planeGeometry args={[3.8, 0.005]} />
            <meshBasicMaterial color="#00d4ff" transparent opacity={0.3} />
          </mesh>
        ))}
        
        {/* Titre du projet */}
        <Text
          position={[0, 0.8, 0.05]}
          fontSize={0.25}
          color="#00ffff"
          anchorX="center"
          anchorY="middle"
        >
          {project.title}
        </Text>
        
        {/* Ligne sous le titre */}
        <mesh position={[0, 0.55, 0.04]}>
          <planeGeometry args={[2, 0.01]} />
          <meshBasicMaterial color="#00d4ff" />
        </mesh>
        
        {/* Description */}
        <Text
          position={[0, 0.2, 0.05]}
          fontSize={0.1}
          color="#88ddff"
          anchorX="center"
          anchorY="middle"
          maxWidth={3.5}
          textAlign="center"
        >
          {project.description}
        </Text>
        
        {/* Technologies */}
        <group position={[0, -0.3, 0.05]}>
          {project.tech.map((tech, i) => (
            <group key={tech} position={[(i - (project.tech.length - 1) / 2) * 1, 0, 0]}>
              <RoundedBox args={[0.9, 0.25, 0.02]} radius={0.05}>
                <meshBasicMaterial color="#004466" transparent opacity={0.8} />
              </RoundedBox>
              <Text
                position={[0, 0, 0.02]}
                fontSize={0.08}
                color="#00ffff"
                anchorX="center"
                anchorY="middle"
              >
                {tech}
              </Text>
            </group>
          ))}
        </group>
        
        {/* Boutons d'action */}
        <group position={[0, -0.8, 0.05]}>
          <group position={[-0.6, 0, 0]}>
            <RoundedBox
              args={[1, 0.35, 0.02]}
              radius={0.05}
              onClick={() => window.open(project.github, '_blank')}
              onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
              onPointerOut={() => { document.body.style.cursor = 'auto'; }}
            >
              <meshBasicMaterial color="#00d4ff" transparent opacity={0.3} />
            </RoundedBox>
            <Text position={[0, 0, 0.02]} fontSize={0.1} color="#00ffff" anchorX="center" anchorY="middle">
              ▸ GitHub
            </Text>
          </group>
          
          <group position={[0.6, 0, 0]}>
            <RoundedBox
              args={[1, 0.35, 0.02]}
              radius={0.05}
              onClick={() => window.open(project.live, '_blank')}
              onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
              onPointerOut={() => { document.body.style.cursor = 'auto'; }}
            >
              <meshBasicMaterial color="#00ffff" transparent opacity={0.5} />
            </RoundedBox>
            <Text position={[0, 0, 0.02]} fontSize={0.1} color="#003344" anchorX="center" anchorY="middle">
              ▸ Live Demo
            </Text>
          </group>
        </group>
        
        {/* Coins décoratifs */}
        {[[-1.9, 1.15], [1.9, 1.15], [-1.9, -1.15], [1.9, -1.15]].map(([x, y], i) => (
          <group key={i} position={[x, y, 0.04]}>
            <mesh rotation={[0, 0, (i * Math.PI) / 2]}>
              <planeGeometry args={[0.2, 0.02]} />
              <meshBasicMaterial color="#00ffff" />
            </mesh>
            <mesh rotation={[0, 0, (i * Math.PI) / 2 + Math.PI / 2]}>
              <planeGeometry args={[0.2, 0.02]} />
              <meshBasicMaterial color="#00ffff" />
            </mesh>
          </group>
        ))}
        
        {/* Indicateur de données */}
        <group position={[1.7, 0.9, 0.04]}>
          <Text fontSize={0.06} color="#00d4ff" anchorX="right" anchorY="middle">
            SELENIUM STUDIO
          </Text>
        </group>
      </group>
    </Float>
  );
}

// Mini panneaux latéraux pour aperçu des autres projets
function MiniPanel({ 
  project, 
  position, 
  onClick,
  index,
  activeIndex
}: { 
  project: Project; 
  position: [number, number, number];
  onClick: () => void;
  index: number;
  activeIndex: number;
}) {
  const meshRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  
  const isVisible = Math.abs(index - activeIndex) <= 2;
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 1.5 + index) * 0.03;
      const targetScale = hovered ? 1.1 : 1;
      meshRef.current.scale.setScalar(THREE.MathUtils.lerp(meshRef.current.scale.x, targetScale, 0.1));
    }
  });

  if (!isVisible || index === activeIndex) return null;

  return (
    <group 
      ref={meshRef} 
      position={position}
      onClick={onClick}
      onPointerOver={() => {
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
    >
      <RoundedBox args={[1.2, 0.8, 0.02]} radius={0.03}>
        <meshBasicMaterial color="#003344" transparent opacity={0.6} />
      </RoundedBox>
      
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[1.3, 0.9]} />
        <meshBasicMaterial color="#00d4ff" transparent opacity={hovered ? 0.2 : 0.1} />
      </mesh>
      
      <Text
        position={[0, 0.15, 0.02]}
        fontSize={0.1}
        color="#00ffff"
        anchorX="center"
        anchorY="middle"
        maxWidth={1}
      >
        {project.title}
      </Text>
      
      <Text
        position={[0, -0.15, 0.02]}
        fontSize={0.15}
        anchorX="center"
        anchorY="middle"
      >
        {project.icon}
      </Text>
    </group>
  );
}

// Camera controller for smooth transitions
function CameraController({ 
  isDetailView, 
  targetPosition 
}: { 
  isDetailView: boolean; 
  targetPosition: [number, number, number];
}) {
  const { camera } = useThree();
  const targetPos = useRef(new THREE.Vector3(...targetPosition));
  
  useEffect(() => {
    targetPos.current.set(...targetPosition);
  }, [targetPosition]);

  useFrame(() => {
    if (isDetailView) {
      camera.position.lerp(new THREE.Vector3(0, 0, 4), 0.05);
    } else {
      camera.position.lerp(new THREE.Vector3(0, 0, 5), 0.05);
    }
  });

  return null;
}

// Vue détaillée décomposée du projet
function DetailedProjectView({ 
  project,
  onBack
}: { 
  project: Project;
  onBack: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // Animation d'entrée
  useFrame((state) => {
    if (groupRef.current) {
      // Rotation lente automatique
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
    }
  });

  const panelPositions: [number, number, number][] = [
    [0, 1.2, 0],      // Titre en haut
    [-1.2, 0, 0.5],     // Description à gauche
    [1.2, 0, 0.5],      // Technologies à droite
    [0, -1.2, 0],     // Actions en bas
    [-2, 1.1, 0.9], // Stats panel - gauche extérieur
    [2, 1.1, 0.9],  // Info panel - droite extérieur
  ];

  return (
    <group ref={groupRef}>
      {/* Panneau principal - Titre */}
      <Float speed={1.5} rotationIntensity={0.05} floatIntensity={0.2}>
        <group position={panelPositions[0]}>
          <RoundedBox args={[3, 0.6, 0.03]} radius={0.03}>
            <meshBasicMaterial color="#003344" transparent opacity={mounted ? 0.9 : 0} />
          </RoundedBox>
          <mesh position={[0, 0, -0.02]}>
            <planeGeometry args={[3.1, 0.7]} />
            <meshBasicMaterial color="#00d4ff" transparent opacity={0.15} />
          </mesh>
          <Text
            position={[0, 0, 0.02]}
            fontSize={0.15}
            color="#00ffff"
            anchorX="center"
            anchorY="middle"
          >
            {project.title}
          </Text>
          {/* Coins décoratifs */}
          {[[-1.4, 0.25], [1.4, 0.25], [-1.4, -0.25], [1.4, -0.25]].map(([x, y], i) => (
            <mesh key={i} position={[x, y, 0.02]}>
              <circleGeometry args={[0.03, 8]} />
              <meshBasicMaterial color="#00ffff" />
            </mesh>
          ))}
        </group>
      </Float>

      {/* Panneau Description - gauche */}
      <Float speed={1.8} rotationIntensity={0.08} floatIntensity={0.3}>
        <group position={panelPositions[1]} rotation={[0, 0.3, 0]}>
          <RoundedBox args={[2.2, 1.5, 0.03]} radius={0.03}>
            <meshBasicMaterial color="#002233" transparent opacity={mounted ? 0.85 : 0} />
          </RoundedBox>
          <mesh position={[0, 0, -0.02]}>
            <planeGeometry args={[2.3, 1.6]} />
            <meshBasicMaterial color="#00d4ff" transparent opacity={0.1} />
          </mesh>
          <Text
            position={[0, 0.55, 0.02]}
            fontSize={0.1}
            color="#00d4ff"
            anchorX="center"
            anchorY="middle"
          >
            // DESCRIPTION
          </Text>
          <mesh position={[0, 0.4, 0.02]}>
            <planeGeometry args={[1.8, 0.005]} />
            <meshBasicMaterial color="#00d4ff" />
          </mesh>
          <Text
            position={[0, 0, 0.02]}
            fontSize={0.08}
            color="#88ddff"
            anchorX="center"
            anchorY="middle"
            maxWidth={1.9}
            textAlign="center"
          >
            {project.description}
          </Text>
        </group>
      </Float>

      {/* Panneau Technologies - droite */}
      <Float speed={2} rotationIntensity={0.08} floatIntensity={0.3}>
        <group position={panelPositions[2]} rotation={[0, -0.3, 0]}>
          <RoundedBox args={[2.2, 1.5, 0.03]} radius={0.03}>
            <meshBasicMaterial color="#002233" transparent opacity={mounted ? 0.85 : 0} />
          </RoundedBox>
          <mesh position={[0, 0, -0.02]}>
            <planeGeometry args={[2.3, 1.6]} />
            <meshBasicMaterial color="#00ffaa" transparent opacity={0.1} />
          </mesh>
          <Text
            position={[0, 0.55, 0.02]}
            fontSize={0.1}
            color="#00ffaa"
            anchorX="center"
            anchorY="middle"
          >
            // TECH STACK
          </Text>
          <mesh position={[0, 0.4, 0.02]}>
            <planeGeometry args={[1.8, 0.005]} />
            <meshBasicMaterial color="#00ffaa" />
          </mesh>
          {project.tech.map((tech, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            return (
              <group key={tech} position={[-0.45 + col * 0.9, 0.22 - row * 0.22, 0.02]}>
                <RoundedBox args={[0.85, 0.18, 0.01]} radius={0.03}>
                  <meshBasicMaterial color="#004433" transparent opacity={0.8} />
                </RoundedBox>
                <Text
                  position={[0, 0, 0.01]}
                  fontSize={0.055}
                  color="#00ffaa"
                  anchorX="center"
                  anchorY="middle"
                >
                  ▸ {tech}
                </Text>
              </group>
            );
          })}
        </group>
      </Float>

      {/* Panneau Actions - bas */}
      <Float speed={1.5} rotationIntensity={0.05} floatIntensity={0.2}>
        <group position={panelPositions[3]}>
          <group position={[-0.8, 0, 0]}>
            <RoundedBox
              args={[1.2, 0.5, 0.03]}
              radius={0.05}
              onClick={() => window.open(project.github, '_blank')}
              onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
              onPointerOut={() => { document.body.style.cursor = 'auto'; }}
            >
              <meshBasicMaterial color="#00d4ff" transparent opacity={0.4} />
            </RoundedBox>
            <Text position={[0, 0, 0.02]} fontSize={0.12} color="#00ffff" anchorX="center" anchorY="middle">
              ▸ VIEW CODE
            </Text>
          </group>
          
          <group position={[0.8, 0, 0]}>
            <RoundedBox
              args={[1.2, 0.5, 0.03]}
              radius={0.05}
              onClick={() => window.open(project.live, '_blank')}
              onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
              onPointerOut={() => { document.body.style.cursor = 'auto'; }}
            >
              <meshBasicMaterial color="#00ffff" transparent opacity={0.6} />
            </RoundedBox>
            <Text position={[0, 0, 0.02]} fontSize={0.12} color="#003344" anchorX="center" anchorY="middle">
              ▸ LIVE DEMO
            </Text>
          </group>
        </group>
      </Float>

      {/* Panneau Stats - gauche extérieur */}
      <Float speed={2.2} rotationIntensity={0.1} floatIntensity={0.4}>
        <group position={panelPositions[4]} rotation={[0, 0.2, 0]}>
          <RoundedBox args={[1.2, 0.8, 0.02]} radius={0.03}>
            <meshBasicMaterial color="#001122" transparent opacity={mounted ? 0.8 : 0} />
          </RoundedBox>
          <Text
            position={[0, 0.25, 0.02]}
            fontSize={0.07}
            color="#0088ff"
            anchorX="center"
            anchorY="middle"
          >
            STATUS
          </Text>
          <Text
            position={[0, 0, 0.02]}
            fontSize={0.12}
            color="#00ff88"
            anchorX="center"
            anchorY="middle"
          >
            ● ACTIVE
          </Text>
          <Text
            position={[0, -0.25, 0.02]}
            fontSize={0.06}
            color="#006688"
            anchorX="center"
            anchorY="middle"
          >
            v2.0.0
          </Text>
        </group>
      </Float>

      {/* Panneau Info - droite extérieur */}
      <Float speed={2.5} rotationIntensity={0.1} floatIntensity={0.4}>
        <group position={panelPositions[5]} rotation={[0, -0.2, 0]}>
          <RoundedBox args={[1.2, 0.8, 0.02]} radius={0.03}>
            <meshBasicMaterial color="#001122" transparent opacity={mounted ? 0.8 : 0} />
          </RoundedBox>
          <Text
            position={[0, 0.25, 0.02]}
            fontSize={0.07}
            color="#0088ff"
            anchorX="center"
            anchorY="middle"
          >
            TYPE
          </Text>
          <Text
            position={[0, 0, 0.02]}
            fontSize={0.1}
            color="#00d4ff"
            anchorX="center"
            anchorY="middle"
          >
            {project.icon}
          </Text>
          <Text
            position={[0, -0.25, 0.02]}
            fontSize={0.06}
            color="#006688"
            anchorX="center"
            anchorY="middle"
          >
            FULL STACK
          </Text>
        </group>
      </Float>

      {/* Anneaux décoratifs centraux */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <torusGeometry args={[1.8, 0.01, 8, 64]} />
        <meshBasicMaterial color="#00d4ff" transparent opacity={0.3} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <torusGeometry args={[2.2, 0.005, 8, 64]} />
        <meshBasicMaterial color="#00ffff" transparent opacity={0.2} />
      </mesh>
      
      {/* Particules locales */}
      <HoloParticles count={50} />
    </group>
  );
}

function Scene({ 
  activeIndex, 
  setActiveIndex,
  isDetailView,
  setIsDetailView
}: { 
  activeIndex: number; 
  setActiveIndex: (i: number) => void;
  isDetailView: boolean;
  setIsDetailView: (v: boolean) => void;
}) {
  return (
    <>
      <color attach="background" args={['#000a14']} />
      <fog attach="fog" args={['#000a14', 5, 20]} />
      
      <ambientLight intensity={0.2} />
      <pointLight position={[0, 5, 5]} intensity={1} color="#00d4ff" />
      <pointLight position={[-5, 2, 0]} intensity={0.5} color="#0088ff" />
      <pointLight position={[5, 2, 0]} intensity={0.5} color="#00ffaa" />
      
      <CameraController isDetailView={isDetailView} targetPosition={[0, 0, isDetailView ? 3 : 5]} />
      
      {/* OrbitControls uniquement en vue détaillée */}
      {isDetailView && (
        <OrbitControls 
          enableZoom={true}
          enablePan={false}
          minDistance={1}
          maxDistance={20}
          autoRotate={false}
          maxPolarAngle={Math.PI * 1.4}
          minPolarAngle={Math.PI * 0.4}
        />
      )}
      
      {!isDetailView && (
        <>
          <HoloParticles />
          <HoloGrid />
          
          {/* Panneau principal - cliquable pour détail */}
          <group onClick={() => setIsDetailView(true)}>
            <HoloPanel 
              project={projects[activeIndex]} 
              isActive={true}
              position={[0, 0.5, 0]}
            />
          </group>
          
          {/* Mini panneaux latéraux */}
          {projects.map((project, i) => {
            const offset = i - activeIndex;
            return (
              <MiniPanel
                key={i}
                project={project}
                index={i}
                activeIndex={activeIndex}
                position={[offset * 1.8, 0.5, -2]}
                onClick={() => setActiveIndex(i)}
              />
            );
          })}
          
          {/* Navigation Arc Reactor */}
          <ArcReactorNav 
            activeIndex={activeIndex} 
            total={projects.length} 
            onSelect={setActiveIndex}
          />
        </>
      )}
      
      {isDetailView && (
        <DetailedProjectView 
          project={projects[activeIndex]}
          onBack={() => setIsDetailView(false)}
        />
      )}
      
      <Environment preset="night" />
    </>
  );
}

export default function StarkDisplay() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [contextLost, setContextLost] = useState(false);
  const [isDetailView, setIsDetailView] = useState(false);
  
  const nextProject = () => setActiveIndex((prev) => (prev + 1) % projects.length);
  const prevProject = () => setActiveIndex((prev) => (prev - 1 + projects.length) % projects.length);

  // Fallback UI when WebGL context is lost
  if (contextLost) {
    return (
      <div className="relative w-full h-175 bg-[#000a14] flex items-center justify-center">
        <div className="text-center">
          <div className="text-cyan-400 font-mono text-lg mb-4">DISPLAY OFFLINE</div>
          <button 
            onClick={() => setContextLost(false)}
            className="px-6 py-2 border border-cyan-500 text-cyan-400 rounded hover:bg-cyan-500/20"
          >
            RECONNECT
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-175">
      <Canvas 
        camera={{ position: [0, 0, 5], fov: 60 }}
        dpr={[1, 1.5]}
        performance={{ min: 0.5 }}
        gl={{ 
          antialias: true,
          alpha: false,
          powerPreference: 'default',
          failIfMajorPerformanceCaveat: false
        }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            console.warn('WebGL context lost');
            setContextLost(true);
          });
          gl.domElement.addEventListener('webglcontextrestored', () => {
            console.log('WebGL context restored');
            setContextLost(false);
          });
        }}
      >
        <Scene 
          activeIndex={activeIndex} 
          setActiveIndex={setActiveIndex}
          isDetailView={isDetailView}
          setIsDetailView={setIsDetailView}
        />
      </Canvas>
      
      {/* Bouton retour en vue détaillée */}
      {isDetailView && (
        <button
          onClick={() => setIsDetailView(false)}
          title="Back to projects"
          aria-label="Back to projects"
          className="absolute top-4 left-4 flex items-center gap-2 px-4 py-2 bg-cyan-900/50 border border-cyan-500/50 rounded-lg text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-400 transition-all font-mono text-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          BACK TO LIST
        </button>
      )}
      
      {/* Overlay UI */}
      {!isDetailView && (
        <div className="absolute top-4 left-4 text-cyan-400 font-mono text-sm opacity-70">
          <div>SELENIUM STUDIO</div>
          <div className="text-xs text-cyan-600">PROJECT DISPLAY v3.0</div>
        </div>
      )}
      
      {/* Instructions en vue détaillée */}
      {isDetailView && (
        <div className="absolute top-4 right-4 text-cyan-400 font-mono text-sm opacity-70 text-right">
          <div>INTERACTIVE MODE</div>
          <div className="text-xs text-cyan-600">DRAG TO ROTATE • SCROLL TO ZOOM</div>
        </div>
      )}
      
      {!isDetailView && (
        <div className="absolute top-4 right-4 text-cyan-400 font-mono text-sm opacity-70 text-right">
          <div>PROJECT {String(activeIndex + 1).padStart(2, '0')}/{String(projects.length).padStart(2, '0')}</div>
          <div className="text-xs text-cyan-600">CLICK TO EXPAND</div>
        </div>
      )}
      
      {/* Navigation flèches - uniquement hors vue détaillée */}
      {!isDetailView && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-8">
          <button
            onClick={prevProject}
            title="Previous project"
            aria-label="Previous project"
            className="group w-14 h-14 rounded-full border-2 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-400 transition-all flex items-center justify-center"
          >
            <svg className="w-6 h-6 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div className="flex gap-3">
            {projects.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                title={`Go to project ${i + 1}`}
                aria-label={`Go to project ${i + 1}`}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  i === activeIndex 
                    ? 'bg-cyan-400 shadow-[0_0_10px_#00d4ff]' 
                    : 'bg-cyan-900 hover:bg-cyan-700'
                }`}
              />
            ))}
          </div>
          
          <button
            onClick={nextProject}
            title="Next project"
            aria-label="Next project"
            className="group w-14 h-14 rounded-full border-2 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-400 transition-all flex items-center justify-center"
          >
            <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
      
      {/* Navigation projets en vue détaillée */}
      {isDetailView && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4">
          <button
            onClick={() => {
              prevProject();
            }}
            title="Previous project"
            aria-label="Previous project"
            className="group w-12 h-12 rounded-full border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20 transition-all flex items-center justify-center"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div className="px-4 py-2 bg-cyan-900/30 border border-cyan-500/30 rounded-lg">
            <span className="text-cyan-400 font-mono text-sm">
              {projects[activeIndex].title}
            </span>
          </div>
          
          <button
            onClick={() => {
              nextProject();
            }}
            title="Next project"
            aria-label="Next project"
            className="group w-12 h-12 rounded-full border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20 transition-all flex items-center justify-center"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
      
      {/* Scanlines effect */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 212, 255, 0.1) 2px, rgba(0, 212, 255, 0.1) 4px)',
        }}
      />
    </div>
  );
}