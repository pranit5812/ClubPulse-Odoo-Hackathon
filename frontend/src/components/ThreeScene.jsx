import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export const ThreeScene = () => {
  const mountRef = useRef(null);
  const [hasWebGL, setHasWebGL] = useState(true);

  useEffect(() => {
    // Check WebGL support
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setHasWebGL(false);
        return;
      }
    } catch {
      setHasWebGL(false);
      return;
    }

    const currentMount = mountRef.current;
    if (!currentMount) return;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const width = currentMount.clientWidth || 500;
    const height = currentMount.clientHeight || 450;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 22;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    currentMount.appendChild(renderer.domElement);

    // Group for network
    const networkGroup = new THREE.Group();
    scene.add(networkGroup);

    // Node spheres
    const nodeCount = 28;
    const nodeCoords = [];
    const nodeGeometry = new THREE.SphereGeometry(0.35, 16, 16);
    const nodeMaterial = new THREE.MeshBasicMaterial({ color: 0x4f46e5 }); // Indigo accent
    const highlightMaterial = new THREE.MeshBasicMaterial({ color: 0x0d9488 }); // Teal positive accent

    for (let i = 0; i < nodeCount; i++) {
      const radius = 6.5 + (Math.random() - 0.5) * 3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      nodeCoords.push(new THREE.Vector3(x, y, z));

      const sphere = new THREE.Mesh(nodeGeometry, i % 5 === 0 ? highlightMaterial : nodeMaterial);
      sphere.position.set(x, y, z);
      networkGroup.add(sphere);
    }

    // Interconnecting Network Lines
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xc7d2fe, // Soft lavender line
      transparent: true,
      opacity: 0.35
    });

    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        const dist = nodeCoords[i].distanceTo(nodeCoords[j]);
        if (dist < 4.8) {
          const points = [nodeCoords[i], nodeCoords[j]];
          const geometry = new THREE.BufferGeometry().setFromPoints(points);
          const line = new THREE.Line(geometry, lineMaterial);
          networkGroup.add(line);
        }
      }
    }

    // Outer subtle ring
    const ringGeometry = new THREE.RingGeometry(8.5, 8.55, 64);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x6366f1,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.2
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 3;
    networkGroup.add(ring);

    // Mouse Interaction
    let mouseX = 0;
    let mouseY = 0;
    const handleMouseMove = (e) => {
      const rect = currentMount.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / width - 0.5) * 2;
      mouseY = -((e.clientY - rect.top) / height - 0.5) * 2;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Resize Handler
    const handleResize = () => {
      if (!currentMount) return;
      const newWidth = currentMount.clientWidth;
      const newHeight = currentMount.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (!prefersReducedMotion) {
        networkGroup.rotation.y += 0.003;
        networkGroup.rotation.x += 0.001;

        // Soft mouse parallax
        networkGroup.rotation.y += (mouseX * 0.4 - networkGroup.rotation.y) * 0.03;
        networkGroup.rotation.x += (-mouseY * 0.4 - networkGroup.rotation.x) * 0.03;
      }

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);

      // Dispose Three.js objects
      nodeGeometry.dispose();
      nodeMaterial.dispose();
      highlightMaterial.dispose();
      lineMaterial.dispose();
      ringGeometry.dispose();
      ringMaterial.dispose();
      renderer.dispose();

      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }
    };
  }, []);

  if (!hasWebGL) {
    return (
      <div className="w-full h-full min-h-[380px] rounded-2xl bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/30 border border-indigo-100 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-200">
            <span className="font-bold text-2xl">CP</span>
          </div>
          <h3 className="font-semibold text-slate-800">Organizational Neural Core</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xs">
            Connecting students, events, financial reserves, and operational readiness.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      className="w-full h-full min-h-[380px] max-h-[500px] flex items-center justify-center relative cursor-grab active:cursor-grabbing"
      aria-label="Interactive 3D representation of interconnected club intelligence operations"
    />
  );
};
