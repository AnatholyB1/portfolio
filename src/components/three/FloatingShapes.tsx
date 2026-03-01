'use client';

import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshDistortMaterial, Sphere, Box, Torus } from '@react-three/drei';
import * as THREE from 'three';

function AnimatedSphere({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime) * 0.3;
      const targetScale = hovered ? 1.2 : 1;
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    }
  });

  return (
    <Sphere 
      ref={meshRef} 
      args={[1, 64, 64]} 
      position={position}
      onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
      onClick={() => setClicked(!clicked)}
    >
      <MeshDistortMaterial
        color={clicked ? "#22c55e" : "#6366f1"}
        attach="material"
        distort={hovered ? 0.6 : 0.4}
        speed={hovered ? 4 : 2}
        roughness={0.2}
        metalness={0.8}
      />
    </Sphere>
  );
}

function AnimatedBox({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);
  const speedMultiplier = useRef(1);

  useFrame((state) => {
    if (meshRef.current) {
      speedMultiplier.current = THREE.MathUtils.lerp(speedMultiplier.current, clicked ? 3 : 1, 0.05);
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.5 * speedMultiplier.current;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.3 * speedMultiplier.current;
      const targetScale = hovered ? 1.3 : 1;
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    }
  });

  return (
    <Box 
      ref={meshRef} 
      args={[0.8, 0.8, 0.8]} 
      position={position}
      onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
      onClick={() => setClicked(!clicked)}
    >
      <meshStandardMaterial
        color={clicked ? "#f59e0b" : "#ec4899"}
        roughness={0.3}
        metalness={0.7}
        emissive={hovered ? "#ec4899" : "#000000"}
        emissiveIntensity={hovered ? 0.3 : 0}
      />
    </Box>
  );
}

function AnimatedTorus({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      const speed = clicked ? 2 : 1;
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.4 * speed;
      meshRef.current.rotation.z = state.clock.elapsedTime * 0.2 * speed;
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime + 1) * 0.2;
      const targetScale = hovered ? 1.3 : 1;
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    }
  });

  return (
    <Torus 
      ref={meshRef} 
      args={[0.5, 0.2, 32, 64]} 
      position={position}
      onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
      onClick={() => setClicked(!clicked)}
    >
      <meshStandardMaterial
        color={clicked ? "#8b5cf6" : "#06b6d4"}
        roughness={0.2}
        metalness={0.9}
        emissive={hovered ? "#06b6d4" : "#000000"}
        emissiveIntensity={hovered ? 0.3 : 0}
      />
    </Torus>
  );
}

export default function FloatingShapes() {
  return (
    <group>
      <AnimatedSphere position={[-2.5, 0, -1]} />
      <AnimatedBox position={[2.5, 0.5, -0.5]} />
      <AnimatedTorus position={[0, -1.5, 0]} />
      <AnimatedBox position={[-1.5, 1.5, -2]} />
      <AnimatedTorus position={[2, -1, -1.5]} />
    </group>
  );
}
