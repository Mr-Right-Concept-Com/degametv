import { useEffect, useState } from 'react';

interface Props { label: string }

/**
 * Translucent moving watermark overlay - deters screen recording.
 * Shows viewer identifier (email/IP) at random positions every 8s.
 */
export function Watermark({ label }: Props) {
  const [pos, setPos] = useState({ x: 10, y: 10 });

  useEffect(() => {
    const id = setInterval(() => {
      setPos({
        x: Math.floor(Math.random() * 70) + 5,
        y: Math.floor(Math.random() * 80) + 5,
      });
    }, 8000);
    return () => clearInterval(id);
  }, []);

  if (!label) return null;
  return (
    <div
      className="absolute pointer-events-none text-white/30 text-xs sm:text-sm font-mono select-none transition-all duration-1000 z-10"
      style={{ left: `${pos.x}%`, top: `${pos.y}%`, textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}
    >
      {label}
    </div>
  );
}
