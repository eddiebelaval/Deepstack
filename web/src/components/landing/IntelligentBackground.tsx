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

    // Topography state - simplified to math function, no large arrays
    const topoRef = useRef({
        offset: 0,
        speed: 0.002,
        // Random seeds for terrain generation to ensure every reload is unique
        seeds: {
            x1: 1, y1: 1, t1: 0,
            x2: 1, y2: 1, t2: 0,
            x3: 1, y3: 1,
        }
    });

    // Colors
    const AMBER = { r: 255, g: 170, b: 50 };

    // Initialize radar origin and terrain seeds on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const width = window.innerWidth;
            const height = window.innerHeight;

            radarRef.current.originX = Math.random() * width;
            radarRef.current.originY = Math.random() * height;

            // Randomize terrain coefficients
            topoRef.current.seeds = {
                x1: 0.5 + Math.random(), y1: 0.5 + Math.random(), t1: Math.random() * 100,
                x2: 0.5 + Math.random(), y2: 0.5 + Math.random(), t2: Math.random() * 100,
                x3: 0.5 + Math.random(), y3: 0.5 + Math.random()
            };
        }
    }, []);

    const animate = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        const time = timeRef.current;
        const seeds = topoRef.current.seeds;

        // 1. Clear background (Deep charcoal)
        ctx.fillStyle = 'rgb(10, 9, 8)';
        ctx.fillRect(0, 0, width, height);

        // 2. Draw Topographical Lines
        ctx.lineWidth = 1.5;
        topoRef.current.offset += topoRef.current.speed;

        // Elevation function with random seeds
        const getElevation = (x: number, y: number, t: number) => {
            const scale = 0.002;
            // Use random seeds to vary the terrain shape
            const v1 = Math.sin(x * scale * seeds.x1 + t + seeds.t1) * Math.cos(y * scale * seeds.y1 + t);
            const v2 = Math.sin(x * scale * 2 * seeds.x2 - t + seeds.t2) * Math.cos(y * scale * 2 * seeds.y2 + t * 0.5) * 0.5;
            const v3 = Math.sin(x * scale * 4 * seeds.x3 + t * 2) * Math.sin(y * scale * 4 * seeds.y3) * 0.25;
            return v1 + v2 + v3; // Range approx -1.75 to 1.75
        };

        // We will trace paths.
        ctx.strokeStyle = `rgba(${AMBER.r}, ${AMBER.g}, ${AMBER.b}, 0.15)`; // Faint map lines

        for (let i = 0; i < 15; i++) { // Number of primary contours
            ctx.beginPath();
            const baseY = (height / 15) * i;

            for (let x = 0; x < width; x += 10) {
                const elevation = getElevation(x, baseY, time * 0.005);
                const yOffset = elevation * 150; // Amplitude

                // Apply parallax
                const parallax = scrollYRef.current * 0.1;

                if (x === 0) ctx.moveTo(x, baseY + yOffset - parallax);
                else ctx.lineTo(x, baseY + yOffset - parallax);
            }
            ctx.stroke();
        }

        // 3. Update Radar
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
        const spreadSpeed = 3; // Pixels per frame

        // Update pings
        radarRef.current.pings = radarRef.current.pings.filter(ping => ping.alpha > 0.01);

        radarRef.current.pings.forEach(ping => {
            ping.radius += spreadSpeed;
            // Fade out based on size/distance
            if (ping.radius > maxRadius * 0.5) {
                ping.alpha *= 0.99;
            }

            const centerX = radarRef.current.originX;
            const centerY = radarRef.current.originY;

            // Draw the ping ring DISTORTED by the terrain
            // We sample points around the circle and offset radius by elevation
            ctx.beginPath();
            const numPoints = 120; // Resolution of the ring

            for (let i = 0; i <= numPoints; i++) {
                const angle = (i / numPoints) * Math.PI * 2;
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);

                // Base position on the perfect circle
                const baseX = centerX + cos * ping.radius;
                const baseY = centerY + sin * ping.radius;

                // Sample elevation at this point
                // Note: We use the same time as the map to sync the movement
                const elevation = getElevation(baseX, baseY, time * 0.005);

                // Distort the radius based on elevation
                // The distortion amount scales with the "height" of the terrain
                const distortion = elevation * 40; // 40px variation
                const distortedRadius = ping.radius + distortion;

                const finalX = centerX + cos * distortedRadius;
                const finalY = centerY + sin * distortedRadius;

                if (i === 0) ctx.moveTo(finalX, finalY);
                else ctx.lineTo(finalX, finalY);
            }
            ctx.closePath();

            // Stroke
            ctx.strokeStyle = `rgba(${AMBER.r}, ${AMBER.g}, ${AMBER.b}, ${ping.alpha * 0.8})`;
            ctx.lineWidth = 2;
            ctx.stroke();

            // Fill using same path (slightly inefficient to recalc but safer for closed path)
            // Ideally we'd reuse the path object if creating 2D One
            ctx.fillStyle = `rgba(${AMBER.r}, ${AMBER.g}, ${AMBER.b}, ${ping.alpha * 0.05})`;
            ctx.fill();
        });

        timeRef.current++;
        animationRef.current = requestAnimationFrame(animate);
    }, [AMBER]);

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
