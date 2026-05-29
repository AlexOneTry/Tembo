import { memo, useEffect, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import type { AgentStatus } from '@/types';

interface AvatarProps {
  status: AgentStatus;
  size?: number;
}

export const Avatar = memo(function Avatar({ status, size = 160 }: AvatarProps) {
  const [blinking, setBlinking] = useState(false);
  const controls = useAnimation();

  useEffect(() => {
    let cancelled = false;
    const blinkLoop = async () => {
      while (!cancelled) {
        const wait = 3000 + Math.random() * 4000;
        await new Promise((r) => setTimeout(r, wait));
        if (cancelled) return;
        setBlinking(true);
        await new Promise((r) => setTimeout(r, 140));
        setBlinking(false);
      }
    };
    blinkLoop();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    switch (status) {
      case 'thinking':
        controls.start({
          rotate: [-3, 3, -3],
          transition: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' },
        });
        break;
      case 'executing':
        controls.start({
          y: [0, -6, 0],
          transition: { duration: 0.9, repeat: Infinity, ease: 'easeInOut' },
        });
        break;
      case 'error':
        controls.start({
          rotate: [0, -14, -10],
          transition: { duration: 0.6, ease: 'easeOut' },
        });
        break;
      case 'idle':
      default:
        controls.start({
          rotate: 0,
          y: 0,
          transition: { duration: 0.4 },
        });
    }
  }, [status, controls]);

  const eyeScaleY = blinking ? 0.08 : 1;

  return (
    <motion.div
      animate={controls}
      style={{ width: size, height: size }}
      className="relative grid place-items-center"
      aria-label={`OWL avatar — ${status}`}
      role="img"
    >
      {/* glow */}
      <div
        className="absolute inset-0 rounded-full animate-glow pointer-events-none"
        style={{
          background:
            'radial-gradient(closest-side, color-mix(in oklab, var(--color-accent) 35%, transparent), transparent 70%)',
        }}
      />
      <svg
        viewBox="0 0 200 200"
        width={size}
        height={size}
        className="relative"
        style={{
          filter: 'drop-shadow(0 6px 24px color-mix(in oklab, var(--color-accent) 40%, transparent))',
        }}
      >
        <defs>
          <linearGradient id="owl-body" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a18bff" />
            <stop offset="100%" stopColor="#6845f0" />
          </linearGradient>
          <radialGradient id="owl-eye" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#1a1a26" />
            <stop offset="100%" stopColor="#05050a" />
          </radialGradient>
        </defs>

        {/* ears */}
        <path d="M55 50 L70 22 L82 55 Z" fill="url(#owl-body)" />
        <path d="M145 50 L130 22 L118 55 Z" fill="url(#owl-body)" />

        {/* body */}
        <ellipse cx="100" cy="110" rx="68" ry="72" fill="url(#owl-body)" />

        {/* belly */}
        <ellipse cx="100" cy="130" rx="40" ry="48" fill="#0f0f18" opacity="0.35" />

        {/* eyes background */}
        <circle cx="72" cy="98" r="22" fill="url(#owl-eye)" />
        <circle cx="128" cy="98" r="22" fill="url(#owl-eye)" />

        {/* eyes pupils */}
        <motion.g
          animate={{
            scaleY: eyeScaleY,
            x: status === 'error' ? -3 : 0,
          }}
          transition={{ duration: 0.12 }}
          style={{ transformOrigin: '100px 98px' }}
        >
          <circle cx="72" cy="98" r="7" fill="#fff" />
          <circle cx="128" cy="98" r="7" fill="#fff" />
          <circle cx="74" cy="96" r="2" fill="var(--color-accent)" />
          <circle cx="130" cy="96" r="2" fill="var(--color-accent)" />
        </motion.g>

        {/* beak */}
        <path d="M92 128 L100 140 L108 128 Z" fill="#fbbf24" />

        {/* feet */}
        <path d="M82 178 q4 6 10 6 q-2 -6 -10 -6 Z" fill="#fbbf24" />
        <path d="M118 178 q-4 6 -10 6 q2 -6 10 -6 Z" fill="#fbbf24" />
      </svg>
    </motion.div>
  );
});
