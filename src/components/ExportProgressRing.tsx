import React from 'react';

interface ExportProgressRingProps {
  progress?: number; // 0 to 100
  size?: number; // pixel diameter
  strokeWidth?: number;
  color?: string;
  isIndeterminate?: boolean;
  className?: string;
}

export function ExportProgressRing({
  progress = 0,
  size = 18,
  strokeWidth = 2.5,
  color = '#d4af37',
  isIndeterminate = false,
  className = '',
}: ExportProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const normalizedProgress = Math.min(100, Math.max(0, progress));
  const strokeDashoffset = circumference - (normalizedProgress / 100) * circumference;

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className={`transform -rotate-90 ${isIndeterminate ? 'animate-spin' : ''}`}
        style={{
          filter: `drop-shadow(0 0 3px ${color}40)`,
        }}
      >
        {/* Background track circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-white/15"
        />

        {/* Foreground animated progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={isIndeterminate ? circumference * 0.35 : strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-300 ease-out"
        />
      </svg>
      {/* Subtle center ambient pulse when active */}
      <span
        className="absolute rounded-full pointer-events-none animate-ping opacity-30"
        style={{
          width: size * 0.4,
          height: size * 0.4,
          backgroundColor: color,
        }}
      />
    </div>
  );
}
