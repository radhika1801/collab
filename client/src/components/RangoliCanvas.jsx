import { useEffect, useRef, useState } from 'react';
import { socket } from '../socket';

// Helper function to darken color
function darkenColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) - amt;
  const G = (num >> 8 & 0x00FF) - amt;
  const B = (num & 0x0000FF) - amt;
  return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255))
    .toString(16).slice(1);
}

export default function RangoliCanvas({
  currentColor,
  brushSize,
  brushType,
  symmetry,
  glowIntensity,
  showGuides,
  showParticles,
  currentPattern
}) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState([]);
  const [particles, setParticles] = useState([]);
  const animationFrameRef = useRef(null);

  const CONFIG = {
    canvasSize: 900,
  };

  // Setup canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    canvas.width = CONFIG.canvasSize;
    canvas.height = CONFIG.canvasSize;
    
    ctxRef.current = ctx;
  }, []);

  // Handle incoming draw events from Socket.io
  useEffect(() => {
    socket.on('draw', (data) => {
      setStrokes(prev => [...prev, data.stroke]);
      if (showParticles && data.stroke.brushType === 'regular') {
        createParticlesBurst(data.stroke.x, data.stroke.y, data.stroke.color);
      }
    });

    socket.on('clear', () => {
      setStrokes([]);
      setParticles([]);
    });

    return () => {
      socket.off('draw');
      socket.off('clear');
    };
  }, [showParticles]);

  // Animation loop for particles
  useEffect(() => {
    function animate() {
      updateParticles();
      redrawCanvas();
      animationFrameRef.current = requestAnimationFrame(animate);
    }
    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [strokes, particles, showGuides, glowIntensity, symmetry]);

  // Create particles burst
  const createParticlesBurst = (x, y, color) => {
    const particleCount = 12;
    const newParticles = [];
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 / particleCount) * i + (Math.random() - 0.5) * 0.5;
      const speed = Math.random() * 1.5 + 0.5;
      
      newParticles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        size: Math.random() * 2 + 1,
        color
      });
    }
    
    setParticles(prev => [...prev, ...newParticles]);
  };

  // Update particles
  const updateParticles = () => {
    setParticles(prev => 
      prev
        .map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          life: p.life - 0.02,
          vx: p.vx * 0.98,
          vy: p.vy * 0.98
        }))
        .filter(p => p.life > 0)
    );
  };

  // Redraw canvas
  const redrawCanvas = () => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, CONFIG.canvasSize, CONFIG.canvasSize);
    
    if (showGuides) {
      drawGuides(ctx);
    }
    
    strokes.forEach(stroke => {
      drawSymmetricPattern(ctx, stroke);
    });
    
    particles.forEach(particle => {
      drawParticle(ctx, particle);
    });
  };

  // Draw guides
  const drawGuides = (ctx) => {
    const centerX = CONFIG.canvasSize / 2;
    const centerY = CONFIG.canvasSize / 2;
    const maxRadius = CONFIG.canvasSize / 2 - 20;
    
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    
    for (let i = 0; i < symmetry; i++) {
      const angle = (Math.PI * 2 / symmetry) * i;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + Math.cos(angle) * maxRadius,
        centerY + Math.sin(angle) * maxRadius
      );
      ctx.stroke();
    }
    
    const circleCount = 6;
    for (let i = 1; i <= circleCount; i++) {
      const radius = (maxRadius / circleCount) * i;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    ctx.setLineDash([]);
  };

  // Draw symmetric pattern
  const drawSymmetricPattern = (ctx, stroke) => {
    const centerX = CONFIG.canvasSize / 2;
    const centerY = CONFIG.canvasSize / 2;
    const relX = stroke.x - centerX;
    const relY = stroke.y - centerY;
    
    const actualSize = stroke.brushType === 'precise' ? stroke.size * 0.5 : stroke.size;
    const useGlow = stroke.brushType === 'regular' && glowIntensity > 0;
    
    for (let i = 0; i < symmetry; i++) {
      const angle = (Math.PI * 2 / symmetry) * i;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const x = centerX + (relX * cos - relY * sin);
      const y = centerY + (relX * sin + relY * cos);
      
      if (useGlow) {
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, actualSize * 2.5);
        gradient.addColorStop(0, stroke.color + 'AA');
        gradient.addColorStop(0.5, stroke.color + Math.floor(glowIntensity * 100).toString(16).padStart(2, '0'));
        gradient.addColorStop(1, stroke.color + '00');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, actualSize * 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      
      drawPattern(ctx, stroke.pattern, x, y, actualSize, stroke.color);
    }
  };

  // Draw pattern
  const drawPattern = (ctx, pattern, x, y, size, color) => {
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    
    switch (pattern) {
      case 'dot':
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'flower':
        drawFlower(ctx, x, y, size, color);
        break;
      case 'star':
        drawStar(ctx, x, y, size, color);
        break;
      case 'heart':
        drawHeart(ctx, x, y, size, color);
        break;
    }
  };

  // Draw flower
  const drawFlower = (ctx, x, y, size, color) => {
    const petals = 6;
    const petalLength = size * 1.2;
    const petalWidth = size * 0.6;
    
    ctx.fillStyle = color;
    
    for (let i = 0; i < petals; i++) {
      const angle = (Math.PI * 2 / petals) * i;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.ellipse(0, -size * 0.7, petalWidth, petalLength, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    
    ctx.beginPath();
    ctx.arc(x, y, size * 0.4, 0, Math.PI * 2);
    ctx.fill();
  };

  // Draw star
  const drawStar = (ctx, x, y, size, color) => {
    const spikes = 5;
    const outerRadius = size * 1.3;
    const innerRadius = size * 0.5;
    
    ctx.fillStyle = color;
    ctx.beginPath();
    
    for (let i = 0; i < spikes * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (Math.PI / spikes) * i - Math.PI / 2;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    
    ctx.closePath();
    ctx.fill();
  };

  // Draw heart
  const drawHeart = (ctx, x, y, size, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    
    const topCurveHeight = size * 0.3;
    ctx.moveTo(x, y + size * 0.3);
    
    ctx.bezierCurveTo(x, y - topCurveHeight, x - size, y - topCurveHeight, x - size, y + size * 0.3);
    ctx.bezierCurveTo(x - size, y + size * 0.8, x - size * 0.5, y + size * 1.2, x, y + size * 1.5);
    ctx.bezierCurveTo(x + size * 0.5, y + size * 1.2, x + size, y + size * 0.8, x + size, y + size * 0.3);
    ctx.bezierCurveTo(x + size, y - topCurveHeight, x, y - topCurveHeight, x, y + size * 0.3);
    
    ctx.closePath();
    ctx.fill();
  };

  // Draw particle
  const drawParticle = (ctx, particle) => {
    const alpha = Math.floor(particle.life * 255).toString(16).padStart(2, '0');
    ctx.fillStyle = particle.color + alpha;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  };

  // Drawing handlers
  const handleMouseDown = (e) => {
    setIsDrawing(true);
    draw(e);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    draw(e);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleTouchStart = (e) => {
    e.preventDefault();
    setIsDrawing(true);
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    draw(mouseEvent);
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    draw(mouseEvent);
  };

  const draw = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * CONFIG.canvasSize;
    const y = ((e.clientY - rect.top) / rect.height) * CONFIG.canvasSize;
    
    const stroke = {
      x,
      y,
      color: currentColor,
      size: brushSize,
      pattern: currentPattern,
      brushType: brushType,
      timestamp: Date.now()
    };
    
    setStrokes(prev => [...prev, stroke]);
    
    if (showParticles && brushType === 'regular') {
      createParticlesBurst(x, y, currentColor);
    }
    
    if (socket && socket.connected) {
      socket.emit('draw', { stroke });
    }
  };

  return (
    <canvas
      ref={canvasRef}
      id="rangoliCanvas"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleMouseUp}
    />
  );
}