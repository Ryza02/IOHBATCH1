"use client";

import { useEffect, useRef } from "react";

export default function ThreeBackground() {
  const mountRef = useRef(null);

  useEffect(() => {
    let cleanup = () => {};

    (async () => {
      const THREE = await import("three");

      if (!mountRef.current) return;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setClearColor(0x000000, 0);
      mountRef.current.appendChild(renderer.domElement);

      // TorusKnot
      const geometry = new THREE.TorusKnotGeometry(1, 0.3, 128, 16);
      const material = new THREE.MeshBasicMaterial({ color: 0x3b82f6, wireframe: true, transparent: true, opacity: 0.3 });
      const torusKnot = new THREE.Mesh(geometry, material);
      scene.add(torusKnot);

      // Particles
      const particlesCount = 2000;
      const posArray = new Float32Array(particlesCount * 3);
      for (let i = 0; i < particlesCount * 3; i++) posArray[i] = (Math.random() - 0.5) * 20;
      const particlesGeometry = new THREE.BufferGeometry();
      particlesGeometry.setAttribute("position", new THREE.BufferAttribute(posArray, 3));
      const particlesMaterial = new THREE.PointsMaterial({ size: 0.005, color: 0x8b5cf6, transparent: true, opacity: 0.8 });
      const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
      scene.add(particlesMesh);

      camera.position.z = 5;
      let mouseX = 0, mouseY = 0;
      const handleMouseMove = (event) => {
        mouseX = (event.clientX / window.innerWidth) * 2 - 1;
        mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
      };
      window.addEventListener("mousemove", handleMouseMove);

      let rafId;
      const animate = () => {
        rafId = requestAnimationFrame(animate);
        torusKnot.rotation.x += 0.01;
        torusKnot.rotation.y += 0.01;
        particlesMesh.rotation.x += 0.001;
        particlesMesh.rotation.y += 0.002;
        camera.position.x += (mouseX * 0.5 - camera.position.x) * 0.05;
        camera.position.y += (mouseY * 0.5 - camera.position.y) * 0.05;
        renderer.render(scene, camera);
      };
      animate();

      const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener("resize", handleResize);

      cleanup = () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("resize", handleResize);
        cancelAnimationFrame(rafId);
        renderer.dispose();
        geometry.dispose();
        particlesGeometry.dispose();
        material.dispose();
        particlesMaterial.dispose();
        if (mountRef.current && renderer.domElement) {
          mountRef.current.removeChild(renderer.domElement);
        }
      };
    })();

    return () => cleanup();
  }, []);

  return <div ref={mountRef} className="absolute inset-0 w-full h-full z-0" />;
}