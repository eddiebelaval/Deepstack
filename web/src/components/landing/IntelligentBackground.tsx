'use client';

import React, { useEffect, useRef, useCallback } from 'react';

export function IntelligentBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>(0);
    const timeRef = useRef(0);
    const scrollYRef = useRef(0);

    // Radar state
    const radarRef = useRef({
        originX: 0,
        originY: 0,
        pings: [] as { radius: number; alpha: number; id: number }[],
        lastPingTime: 0,
        pingInterval: 180, // ~3 seconds at 60fps
    });

    // Terrain state - Perlin-like noise for topographical elevation
    const terrainRef = useRef({
        offset: 0,
        speed: 0.0008,
        // Seeds for unique terrain generation
        octaves: [
            { freq: 0.003, amp: 1.0, seed: Math.random() * 1000 },
            { freq: 0.006, amp: 0.5, seed: Math.random() * 1000 },
            { freq: 0.012, amp: 0.25, seed: Math.random() * 1000 },
        ]
    });

    // Colors
    const AMBER = { r: 255, g: 170, b: 50 };
    const GRID_COLOR = { r: 255, g: 170, b: 50 };

    // Initialize radar origin on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const width = window.innerWidth;
            const height = window.innerHeight;

            radarRef.current.originX = width * (0.2 + Math.random() * 0.6);
            radarRef.current.originY = height * (0.2 + Math.random() * 0.6);
        }
    }, []);

    // Simplex-like noise function (faster than true Perlin)
    const noise2D = useCallback((x: number, y: number, seed: number): number => {
        // Hash function for pseudo-random gradients
        const hash = (xi: number, yi: number) => {
            const n = Math.sin(xi * 12.9898 + yi * 78.233 + seed) * 43758.5453;
            return n - Math.floor(n);
        };

        const xi = Math.floor(x);
        const yi = Math.floor(y);
        const xf = x - xi;
        const yf = y - yi;

        // Smoothstep interpolation
        const u = xf * xf * (3 - 2 * xf);
        const v = yf * yf * (3 - 2 * yf);

        // Bilinear interpolation of corner values
        const n00 = hash(xi, yi) * 2 - 1;
        const n10 = hash(xi + 1, yi) * 2 - 1;
        const n01 = hash(xi, yi + 1) * 2 - 1;
        const n11 = hash(xi + 1, yi + 1) * 2 - 1;

        const nx0 = n00 * (1 - u) + n10 * u;
        const nx1 = n01 * (1 - u) + n11 * u;

        return nx0 * (1 - v) + nx1 * v;
    }, []);

    // Multi-octave elevation function
    const getElevation = useCallback((x: number, y: number, time: number): number => {
        const octaves = terrainRef.current.octaves;
        let elevation = 0;
        let totalAmp = 0;

        for (const oct of octaves) {
            elevation += noise2D(
                x * oct.freq + time * 0.1,
                y * oct.freq + time * 0.05,
                oct.seed
            ) * oct.amp;
            totalAmp += oct.amp;
        }

        return elevation / totalAmp; // Normalize to [-1, 1]
    }, [noise2D]);

    const animate = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width / window.devicePixelRatio;
        const height = canvas.height / window.devicePixelRatio;
        const time = timeRef.current * 0.01;

        // 1. Clear background (Deep charcoal)
        ctx.fillStyle = 'rgb(10, 9, 8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        terrainRef.current.offset += terrainRef.current.speed;

        // 2. Draw Grid Lines (underneath everything)
        const gridSpacing = 50;
        ctx.strokeStyle = `rgba(${GRID_COLOR.r}, ${GRID_COLOR.g}, ${GRID_COLOR.b}, 0.18)`;
        ctx.lineWidth = 0.8;

        // Vertical grid lines
        for (let x = 0; x < width; x += gridSpacing) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

        // Horizontal grid lines
        for (let y = 0; y < height; y += gridSpacing) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // 3. Draw Topographical Contour Lines (using marching squares concept)
        const contourLevels = [-0.6, -0.4, -0.2, 0, 0.2, 0.4, 0.6];
        const sampleStep = 15; // Resolution of sampling grid
        const parallax = scrollYRef.current * 0.1;

        // Pre-compute elevation grid
        const cols = Math.ceil(width / sampleStep) + 2;
        const rows = Math.ceil(height / sampleStep) + 2;
        const elevationGrid: number[][] = [];

        for (let row = 0; row < rows; row++) {
            elevationGrid[row] = [];
            for (let col = 0; col < cols; col++) {
                const x = col * sampleStep;
                const y = row * sampleStep - parallax;
                elevationGrid[row][col] = getElevation(x, y, time);
            }
        }

        // Draw contour lines using linear interpolation
        ctx.lineWidth = 1.2;

        for (let levelIdx = 0; levelIdx < contourLevels.length; levelIdx++) {
            const level = contourLevels[levelIdx];
            // Vary opacity - bolder lines for major contours (level 0)
            const isMajor = level === 0;
            const alpha = isMajor ? 0.45 : 0.25;

            ctx.strokeStyle = `rgba(${AMBER.r}, ${AMBER.g}, ${AMBER.b}, ${alpha})`;
            ctx.lineWidth = isMajor ? 2.5 : 1.5;

            // March through the grid looking for contour crossings
            for (let row = 0; row < rows - 1; row++) {
                for (let col = 0; col < cols - 1; col++) {
                    const x0 = col * sampleStep;
                    const y0 = row * sampleStep;

                    // Get corner elevations
                    const e00 = elevationGrid[row][col];
                    const e10 = elevationGrid[row][col + 1];
                    const e01 = elevationGrid[row + 1][col];
                    const e11 = elevationGrid[row + 1][col + 1];

                    // Find edge crossings
                    const crossings: { x: number; y: number }[] = [];

                    // Top edge (e00 to e10)
                    if ((e00 - level) * (e10 - level) < 0) {
                        const t = (level - e00) / (e10 - e00);
                        crossings.push({ x: x0 + t * sampleStep, y: y0 });
                    }

                    // Bottom edge (e01 to e11)
                    if ((e01 - level) * (e11 - level) < 0) {
                        const t = (level - e01) / (e11 - e01);
                        crossings.push({ x: x0 + t * sampleStep, y: y0 + sampleStep });
                    }

                    // Left edge (e00 to e01)
                    if ((e00 - level) * (e01 - level) < 0) {
                        const t = (level - e00) / (e01 - e00);
                        crossings.push({ x: x0, y: y0 + t * sampleStep });
                    }

                    // Right edge (e10 to e11)
                    if ((e10 - level) * (e11 - level) < 0) {
                        const t = (level - e10) / (e11 - e10);
                        crossings.push({ x: x0 + sampleStep, y: y0 + t * sampleStep });
                    }

                    // Draw line segments between crossings
                    if (crossings.length >= 2) {
                        ctx.beginPath();
                        ctx.moveTo(crossings[0].x, crossings[0].y);
                        ctx.lineTo(crossings[1].x, crossings[1].y);
                        ctx.stroke();

                        // Handle ambiguous case (4 crossings)
                        if (crossings.length === 4) {
                            ctx.beginPath();
                            ctx.moveTo(crossings[2].x, crossings[2].y);
                            ctx.lineTo(crossings[3].x, crossings[3].y);
                            ctx.stroke();
                        }
                    }
                }
            }
        }

        // 4. Update and Draw Radar Pings (terrain-morphing)
        radarRef.current.lastPingTime++;
        if (radarRef.current.lastPingTime >= radarRef.current.pingInterval) {
            radarRef.current.pings.push({
                radius: 0,
                alpha: 1,
                id: Date.now()
            });
            radarRef.current.lastPingTime = 0;
        }

        const maxRadius = Math.max(width, height) * 1.2;
        const spreadSpeed = 2.5; // Pixels per frame

        // Update pings
        radarRef.current.pings = radarRef.current.pings.filter(ping => ping.alpha > 0.01);

        radarRef.current.pings.forEach(ping => {
            ping.radius += spreadSpeed;

            // Fade out based on size/distance
            if (ping.radius > maxRadius * 0.4) {
                ping.alpha *= 0.985;
            }

            const centerX = radarRef.current.originX;
            const centerY = radarRef.current.originY;

            // Draw the ping ring DISTORTED by terrain elevation
            ctx.beginPath();
            const numPoints = 180; // High resolution for smooth contour-following

            for (let i = 0; i <= numPoints; i++) {
                const angle = (i / numPoints) * Math.PI * 2;
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);

                // Base position on perfect circle
                const baseX = centerX + cos * ping.radius;
                const baseY = centerY + sin * ping.radius;

                // Sample elevation at this point
                const elevation = getElevation(baseX, baseY - parallax, time);

                // Distort radius based on elevation
                // Higher terrain pushes the ping outward, lower pulls it in
                const distortionStrength = 30 + ping.radius * 0.08; // Scale with size
                const distortedRadius = ping.radius + elevation * distortionStrength;

                const finalX = centerX + cos * distortedRadius;
                const finalY = centerY + sin * distortedRadius;

                if (i === 0) ctx.moveTo(finalX, finalY);
                else ctx.lineTo(finalX, finalY);
            }
            ctx.closePath();

            // Gradient stroke effect - brighter at edges
            const gradient = ctx.createRadialGradient(
                centerX, centerY, ping.radius * 0.8,
                centerX, centerY, ping.radius * 1.2
            );
            gradient.addColorStop(0, `rgba(${AMBER.r}, ${AMBER.g}, ${AMBER.b}, 0)`);
            gradient.addColorStop(0.5, `rgba(${AMBER.r}, ${AMBER.g}, ${AMBER.b}, ${ping.alpha * 0.6})`);
            gradient.addColorStop(1, `rgba(${AMBER.r}, ${AMBER.g}, ${AMBER.b}, 0)`);

            ctx.strokeStyle = `rgba(${AMBER.r}, ${AMBER.g}, ${AMBER.b}, ${ping.alpha * 0.7})`;
            ctx.lineWidth = 2.5;
            ctx.stroke();

            // Subtle fill
            ctx.fillStyle = `rgba(${AMBER.r}, ${AMBER.g}, ${AMBER.b}, ${ping.alpha * 0.03})`;
            ctx.fill();
        });

        // 5. Draw ping origin point (small glowing dot)
        const pulseAlpha = 0.4 + Math.sin(time * 5) * 0.2;
        ctx.beginPath();
        ctx.arc(radarRef.current.originX, radarRef.current.originY, 4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${AMBER.r}, ${AMBER.g}, ${AMBER.b}, ${pulseAlpha})`;
        ctx.fill();

        // Glow ring
        ctx.beginPath();
        ctx.arc(radarRef.current.originX, radarRef.current.originY, 8, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${AMBER.r}, ${AMBER.g}, ${AMBER.b}, ${pulseAlpha * 0.5})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        timeRef.current++;
        animationRef.current = requestAnimationFrame(animate);
    }, [getElevation, AMBER, GRID_COLOR]);

    const handleResize = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }, []);

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
            style={{ width: '100%', height: '100%' }}
        />
    );
}
