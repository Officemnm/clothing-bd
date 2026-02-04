'use client';

import { motion } from 'framer-motion';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animate?: boolean;
  className?: string;
}

const sizeMap = {
  sm: 32,
  md: 40,
  lg: 52,
  xl: 64,
};

export default function Logo({ size = 'md', animate = true, className = '' }: LogoProps) {
  const containerSize = sizeMap[size];
  const fontSize = containerSize * 0.5;
  
  return (
    <motion.div 
      className={`relative flex items-center justify-center flex-shrink-0 ${className}`}
      style={{ width: containerSize, height: containerSize }}
      initial={animate ? { scale: 0, rotate: -180 } : { scale: 1, rotate: 0 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ 
        type: "spring", 
        stiffness: 200, 
        damping: 20,
        delay: 0.1
      }}
    >
      {/* Outer ring with gradient */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)',
          boxShadow: '0 4px 20px rgba(30, 41, 59, 0.3)',
        }}
        initial={animate ? { scale: 0 } : { scale: 1 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      />
      
      {/* Inner circle */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: containerSize - 6,
          height: containerSize - 6,
          background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)',
        }}
        initial={animate ? { scale: 0 } : { scale: 1 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      />
      
      {/* Letter C */}
      <motion.span
        className="relative z-10 font-bold text-white select-none"
        style={{ 
          fontSize: fontSize,
          fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif",
          textShadow: '0 2px 10px rgba(0,0,0,0.3)',
          letterSpacing: '-0.02em'
        }}
        initial={animate ? { opacity: 0, scale: 0.5 } : { opacity: 1, scale: 1 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ 
          duration: 0.4, 
          delay: 0.5,
          type: "spring",
          stiffness: 200
        }}
      >
        C
      </motion.span>
      
      {/* Shine effect */}
      <motion.div
        className="absolute inset-0 rounded-full overflow-hidden"
        initial={animate ? { opacity: 0 } : { opacity: 1 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <div 
          className="absolute top-0 left-1/4 w-1/2 h-1/3 bg-gradient-to-b from-white/20 to-transparent rounded-full blur-sm"
          style={{ transform: 'translateY(-20%)' }}
        />
      </motion.div>
    </motion.div>
  );
}
