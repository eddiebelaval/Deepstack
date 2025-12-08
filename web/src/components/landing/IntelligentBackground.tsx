'use client';

import React, { useEffect, useRef, useCallback } from 'react';

interface Node {
    x: number;
    y: number;
    baseX: number;
    baseY: number;
    radius: number;
    pulsePhase: number;
    pulseSpeed: number;
    connections: number[];
    brightness: number;
    targetBrightness: number;
}

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    opacity: number;
    life: number;
    maxLife: number;
}

interface ContourLine {
    points: { x: number; y: number }[];
    phase: number;
    speed: number;
    amplitude: number;
}

export function IntelligentBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>(0);
    const nodesRef = useRef<Node[]>([]);
    const particlesRef = useRef<Particle[]>([]);
    const contoursRef = useRef<ContourLine[]>([]);
    const scrollYRef = useRef(0);
    const timeRef = useRef(0);

    // Colors from the design system
    const AMBER = { r: 255, g: 170, b: 50 }; // Primary amber
    const AMBER_DIM = { r: 180, g: 120, b: 40 };

    // Initialize nodes in a grid pattern
    const initNodes = useCallback((width: number, height: number) => {
        const nodes: Node[] = [];
        const gridSize = 120;
        const rows = Math.ceil(height / gridSize) + 2;
        const cols = Math.ceil(width / gridSize) + 2;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                // Add some randomness to the grid positions
                const x = col * gridSize + (Math.random() - 0.5) * 40;
                const y = row * gridSize + (Math.random() - 0.5) * 40;

                nodes.push({
                    x,
                    y,
                    baseX: x,
                    baseY: y,
                    radius: 2 + Math.random() * 3,
                    pulsePhase: Math.random() * Math.PI * 2,
                    pulseSpeed: 0.02 + Math.random() * 0.02,
                    connections: [],
                    brightness: 0.2 + Math.random() * 0.3,
                    targetBrightness: 0.2 + Math.random() * 0.3,
                });
            }
        }

        // Create connections between nearby nodes
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const dx = nodes[i].x - nodes[j].x;
                const dy = nodes[i].y - nodes[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < gridSize * 1.5) {
                    nodes[i].connections.push(j);
                }
            }
        }

        nodesRef.current = nodes;
    }, []);

    // Initialize contour lines
    const initContours = useCallback((width: number, height: number) => {
        const contours: ContourLine[] = [];
        const numContours = 8;

        for (let i = 0; i < numContours; i++) {
            const points: { x: number; y: number }[] = [];
            const numPoints = 50;
            const yBase = (height / numContours) * i + height / (numContours * 2);

            for (let j = 0; j <= numPoints; j++) {
                const x = (width / numPoints) * j;
                const y = yBase;
                points.push({ x, y });
            }

            contours.push({
                points,
                phase: Math.random() * Math.PI * 2,
                speed: 0.008 + Math.random() * 0.008,
                amplitude: 20 + Math.random() * 30,
            });
        }

        contoursRef.current = contours;
    }, []);

    // Spawn particles
    const spawnParticle = useCallback((width: number, height: number) => {
        if (particlesRef.current.length > 60) return;

        particlesRef.current.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5 - 0.3, // Slight upward drift
            size: 1 + Math.random() * 2,
            opacity: 0,
            life: 0,
            maxLife: 200 + Math.random() * 200,
        });
    }, []);

    // Main animation loop
    const animate = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        const time = timeRef.current;
        const scrollOffset = scrollYRef.current * 0.3; // Parallax factor

        // Clear canvas
        ctx.fillStyle = 'rgb(20, 18, 16)'; // Deep charcoal background
        ctx.fillRect(0, 0, width, height);

        // Draw contour lines with wave animation
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (const contour of contoursRef.current) {
            contour.phase += contour.speed;

            ctx.beginPath();

            for (let i = 0; i < contour.points.length; i++) {
                const point = contour.points[i];
                const wave1 = Math.sin(point.x * 0.008 + contour.phase) * contour.amplitude;
                const wave2 = Math.sin(point.x * 0.012 + contour.phase * 0.7) * contour.amplitude * 0.5;
                const wave3 = Math.sin(point.x * 0.003 + contour.phase * 1.3) * contour.amplitude * 0.8;

                const y = point.y + wave1 + wave2 + wave3 + scrollOffset;

                if (i === 0) {
                    ctx.moveTo(point.x, y);
                } else {
                    ctx.lineTo(point.x, y);
                }
            }

            // Pulsing glow on contour lines
            const pulse = 0.15 + Math.sin(time * 0.03 + contour.phase) * 0.1;
            ctx.strokeStyle = `rgba(${AMBER_DIM.r}, ${AMBER_DIM.g}, ${AMBER_DIM.b}, ${pulse})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        // Draw connections between nodes
        ctx.lineWidth = 1;
        for (const node of nodesRef.current) {
            for (const connIdx of node.connections) {
                const other = nodesRef.current[connIdx];
                if (!other) continue;

                const dx = other.x - node.x;
                const dy = other.y - node.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const opacity = Math.max(0, 0.1 - dist / 2000) * (node.brightness + other.brightness) / 2;

                if (opacity > 0.01) {
                    ctx.beginPath();
                    ctx.moveTo(node.x, node.y + scrollOffset);
                    ctx.lineTo(other.x, other.y + scrollOffset);
                    ctx.strokeStyle = `rgba(${AMBER.r}, ${AMBER.g}, ${AMBER.b}, ${opacity})`;
                    ctx.stroke();
                }
            }
        }

        // Update and draw nodes
        for (const node of nodesRef.current) {
            node.pulsePhase += node.pulseSpeed;

            // Gentle floating motion
            node.x = node.baseX + Math.sin(time * 0.01 + node.pulsePhase) * 5;
            node.y = node.baseY + Math.cos(time * 0.008 + node.pulsePhase) * 5;

            // Random activation (creates "thinking" effect)
            if (Math.random() < 0.002) {
                node.targetBrightness = 0.7 + Math.random() * 0.3;
            }
            node.brightness += (node.targetBrightness - node.brightness) * 0.03;
            if (node.brightness > 0.5) {
                node.targetBrightness *= 0.98; // Decay back down
            }

            const pulse = 0.5 + Math.sin(node.pulsePhase) * 0.3;
            const glow = node.brightness * pulse;

            // Draw node glow
            const gradient = ctx.createRadialGradient(
                node.x, node.y + scrollOffset, 0,
                node.x, node.y + scrollOffset, node.radius * 8
            );
            gradient.addColorStop(0, `rgba(${AMBER.r}, ${AMBER.g}, ${AMBER.b}, ${glow * 0.4})`);
            gradient.addColorStop(0.5, `rgba(${AMBER.r}, ${AMBER.g}, ${AMBER.b}, ${glow * 0.1})`);
            gradient.addColorStop(1, 'transparent');

            ctx.beginPath();
            ctx.arc(node.x, node.y + scrollOffset, node.radius * 8, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();

            // Draw node core
            ctx.beginPath();
            ctx.arc(node.x, node.y + scrollOffset, node.radius * pulse, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${AMBER.r}, ${AMBER.g}, ${AMBER.b}, ${glow})`;
            ctx.fill();
        }

        // Update and draw particles
        const newParticles: Particle[] = [];
        for (const particle of particlesRef.current) {
            particle.life++;
            particle.x += particle.vx;
            particle.y += particle.vy + scrollOffset * 0.001;

            // Fade in and out
            if (particle.life < 30) {
                particle.opacity = particle.life / 30;
            } else if (particle.life > particle.maxLife - 30) {
                particle.opacity = (particle.maxLife - particle.life) / 30;
            } else {
                particle.opacity = 1;
            }

            if (particle.life < particle.maxLife && particle.x > 0 && particle.x < width && particle.y > 0 && particle.y < height) {
                newParticles.push(particle);

                // Draw particle
                ctx.beginPath();
                ctx.arc(particle.x, particle.y + scrollOffset, particle.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${AMBER.r}, ${AMBER.g}, ${AMBER.b}, ${particle.opacity * 0.3})`;
                ctx.fill();
            }
        }
        particlesRef.current = newParticles;

        // Spawn new particles occasionally
        if (Math.random() < 0.15) {
            spawnParticle(width, height);
        }

        timeRef.current++;
        animationRef.current = requestAnimationFrame(animate);
    }, [spawnParticle, AMBER, AMBER_DIM]);

    // Handle resize
    const handleResize = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;

        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        }

        initNodes(rect.width, rect.height);
        initContours(rect.width, rect.height);
    }, [initNodes, initContours]);

    // Handle scroll for parallax
    const handleScroll = useCallback(() => {
        scrollYRef.current = window.scrollY;
    }, []);

    useEffect(() => {
        handleResize();
        window.addEventListener('resize', handleResize);
        window.addEventListener('scroll', handleScroll, { passive: true });

        animationRef.current = requestAnimationFrame(animate);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('scroll', handleScroll);
            cancelAnimationFrame(animationRef.current);
        };
    }, [handleResize, handleScroll, animate]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full"
            style={{
                width: '100%',
                height: '100%',
            }}
        />
    );
}
