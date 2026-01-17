'use client';

import { motion } from 'framer-motion';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animate?: boolean;
  className?: string;
}

const sizeMap = {
  sm: 32,
  md: 44,
  lg: 60,
  xl: 90,
};

export default function Logo({ size = 'md', animate = true, className = '' }: LogoProps) {
  const containerSize = sizeMap[size];
  
  return (
    <motion.div 
      className={`relative flex items-center justify-center flex-shrink-0 ${className}`}
      style={{ width: containerSize, height: containerSize }}
      initial={animate ? { scale: 0, rotate: -180 } : {}}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
    >
      <svg
        width={containerSize}
        height={containerSize}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-lg"
      >
        {/* Definitions for gradients and filters */}
        <defs>
          {/* 3D C letter gradient - stone/metallic look */}
          <linearGradient id="cGradient3D" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4a5568" />
            <stop offset="25%" stopColor="#718096" />
            <stop offset="50%" stopColor="#2d3748" />
            <stop offset="75%" stopColor="#4a5568" />
            <stop offset="100%" stopColor="#1a202c" />
          </linearGradient>
          
          {/* Inner shadow for 3D depth */}
          <linearGradient id="cInnerShadow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1a202c" />
            <stop offset="50%" stopColor="#2d3748" />
            <stop offset="100%" stopColor="#4a5568" />
          </linearGradient>
          
          {/* Vine gradient - organic green */}
          <linearGradient id="vineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#276749" />
            <stop offset="50%" stopColor="#48bb78" />
            <stop offset="100%" stopColor="#2f855a" />
          </linearGradient>
          
          {/* Snake gradient - realistic scales */}
          <linearGradient id="snakeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2d3748" />
            <stop offset="30%" stopColor="#4a5568" />
            <stop offset="60%" stopColor="#319795" />
            <stop offset="100%" stopColor="#234e52" />
          </linearGradient>
          
          {/* Snake belly gradient */}
          <linearGradient id="snakeBelly" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#a0aec0" />
          </linearGradient>
          
          {/* Drop shadow filter */}
          <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="2" dy="3" stdDeviation="2" floodOpacity="0.4" />
          </filter>
          
          {/* Inner glow for 3D effect */}
          <filter id="innerGlow">
            <feFlood floodColor="#718096" floodOpacity="0.5"/>
            <feComposite in2="SourceAlpha" operator="in"/>
            <feGaussianBlur stdDeviation="2"/>
            <feComposite in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1"/>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Main 3D "C" Letter - thick stone-like appearance */}
        <g filter="url(#dropShadow)">
          {/* Outer C shape - creates 3D depth */}
          <path
            d="M 72 25 
               A 35 35 0 1 0 72 75 
               L 65 70 
               A 27 27 0 1 1 65 30 
               Z"
            fill="url(#cInnerShadow)"
          />
          
          {/* Main C body */}
          <path
            d="M 70 28 
               A 32 32 0 1 0 70 72 
               L 62 66 
               A 23 23 0 1 1 62 34 
               Z"
            fill="url(#cGradient3D)"
            filter="url(#innerGlow)"
          />
          
          {/* Highlight on C */}
          <path
            d="M 55 22 
               A 28 28 0 0 0 28 50 
               A 28 28 0 0 0 32 64"
            fill="none"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>
        
        {/* Vines wrapping around C */}
        <g>
          {/* Main vine 1 */}
          <motion.path
            d="M 25 40 
               Q 20 35, 25 28 
               Q 35 20, 50 18 
               Q 65 16, 72 22"
            fill="none"
            stroke="url(#vineGradient)"
            strokeWidth="2.5"
            strokeLinecap="round"
            initial={animate ? { pathLength: 0 } : { pathLength: 1 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, delay: 0.3 }}
          />
          
          {/* Vine 1 leaves */}
          <motion.ellipse
            cx="35" cy="22"
            rx="4" ry="2.5"
            fill="#48bb78"
            transform="rotate(-30 35 22)"
            initial={animate ? { scale: 0 } : { scale: 1 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.8 }}
          />
          <motion.ellipse
            cx="55" cy="17"
            rx="3.5" ry="2"
            fill="#38a169"
            transform="rotate(-15 55 17)"
            initial={animate ? { scale: 0 } : { scale: 1 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1 }}
          />
          
          {/* Main vine 2 */}
          <motion.path
            d="M 28 65 
               Q 22 72, 30 78 
               Q 42 85, 55 82 
               Q 68 79, 72 73"
            fill="none"
            stroke="url(#vineGradient)"
            strokeWidth="2"
            strokeLinecap="round"
            initial={animate ? { pathLength: 0 } : { pathLength: 1 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, delay: 0.5 }}
          />
          
          {/* Vine 2 leaves */}
          <motion.ellipse
            cx="40" cy="82"
            rx="4" ry="2.5"
            fill="#48bb78"
            transform="rotate(20 40 82)"
            initial={animate ? { scale: 0 } : { scale: 1 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1.2 }}
          />
          
          {/* Small curling tendril */}
          <motion.path
            d="M 68 25 Q 75 20, 78 25 Q 80 30, 76 32"
            fill="none"
            stroke="#48bb78"
            strokeWidth="1.5"
            strokeLinecap="round"
            initial={animate ? { pathLength: 0 } : { pathLength: 1 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, delay: 1 }}
          />
        </g>
        
        {/* Snake wrapping around C */}
        <g>
          {/* Snake body - wrapping path */}
          <motion.path
            d="M 75 45 
               Q 78 40, 75 35 
               Q 70 28, 58 26 
               Q 45 24, 35 30 
               Q 25 38, 24 50 
               Q 23 62, 32 72 
               Q 42 80, 55 78 
               Q 65 76, 70 68 
               Q 75 60, 72 52"
            fill="none"
            stroke="url(#snakeGradient)"
            strokeWidth="5"
            strokeLinecap="round"
            initial={animate ? { pathLength: 0 } : { pathLength: 1 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2, delay: 0.2 }}
          />
          
          {/* Snake belly stripe */}
          <motion.path
            d="M 75 45 
               Q 78 40, 75 35 
               Q 70 28, 58 26 
               Q 45 24, 35 30 
               Q 25 38, 24 50 
               Q 23 62, 32 72 
               Q 42 80, 55 78 
               Q 65 76, 70 68 
               Q 75 60, 72 52"
            fill="none"
            stroke="url(#snakeBelly)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="4 8"
            initial={animate ? { pathLength: 0 } : { pathLength: 1 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2, delay: 0.4 }}
          />
          
          {/* Snake head */}
          <motion.g
            initial={animate ? { scale: 0 } : { scale: 1 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1.8, type: 'spring' }}
          >
            {/* Head shape */}
            <ellipse
              cx="74" cy="48"
              rx="5" ry="4"
              fill="#319795"
              transform="rotate(-20 74 48)"
            />
            {/* Eye */}
            <circle cx="76" cy="46" r="1.2" fill="#1a202c" />
            <circle cx="76.3" cy="45.7" r="0.4" fill="white" />
            
            {/* Forked tongue */}
            <motion.g
              animate={animate ? { 
                x: [0, 2, 0],
                opacity: [1, 1, 1]
              } : {}}
              transition={{ 
                duration: 0.8, 
                repeat: Infinity, 
                repeatDelay: 2 
              }}
            >
              <line x1="78" y1="48" x2="82" y2="47" stroke="#e53e3e" strokeWidth="0.8" />
              <line x1="82" y1="47" x2="84" y2="45" stroke="#e53e3e" strokeWidth="0.6" />
              <line x1="82" y1="47" x2="84" y2="49" stroke="#e53e3e" strokeWidth="0.6" />
            </motion.g>
          </motion.g>
          
          {/* Snake tail */}
          <motion.path
            d="M 72 52 Q 68 55, 65 52 Q 62 49, 64 45"
            fill="none"
            stroke="url(#snakeGradient)"
            strokeWidth="3"
            strokeLinecap="round"
            initial={animate ? { pathLength: 0 } : { pathLength: 1 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, delay: 1.5 }}
          />
          
          {/* Tail tip */}
          <motion.path
            d="M 64 45 Q 66 42, 64 40"
            fill="none"
            stroke="#234e52"
            strokeWidth="1.5"
            strokeLinecap="round"
            initial={animate ? { pathLength: 0 } : { pathLength: 1 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 2 }}
          />
        </g>
        
        {/* Scale pattern details on snake */}
        <g opacity="0.6">
          <circle cx="58" cy="27" r="1" fill="#234e52" />
          <circle cx="42" cy="28" r="1" fill="#234e52" />
          <circle cx="30" cy="40" r="1" fill="#234e52" />
          <circle cx="26" cy="55" r="1" fill="#234e52" />
          <circle cx="38" cy="75" r="1" fill="#234e52" />
          <circle cx="55" cy="77" r="1" fill="#234e52" />
          <circle cx="68" cy="70" r="1" fill="#234e52" />
        </g>
      </svg>
    </motion.div>
  );
}
