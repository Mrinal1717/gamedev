import React from 'react';

interface DiceProps {
  value: number | null;
  isRolling: boolean;
  onClick: () => void;
  disabled: boolean;
  activeColor?: string;
}

export default function Dice({
  value,
  isRolling,
  onClick,
  disabled,
  activeColor = 'purple',
}: DiceProps) {
  
  // Map value to the correct 3D rotation transform to bring the face forward
  const getRotationTransform = (val: number | null) => {
    if (isRolling || val === null) {
      // Return a slight tilted angle when idle/not rolled
      return 'rotateX(-20deg) rotateY(-20deg)';
    }

    switch (val) {
      case 1:
        return 'rotateX(0deg) rotateY(0deg)';
      case 2:
        return 'rotateX(0deg) rotateY(-90deg)';
      case 3:
        return 'rotateX(-90deg) rotateY(0deg)';
      case 4:
        return 'rotateX(90deg) rotateY(0deg)';
      case 5:
        return 'rotateX(0deg) rotateY(90deg)';
      case 6:
        return 'rotateX(0deg) rotateY(180deg)';
      default:
        return 'rotateX(-20deg) rotateY(-20deg)';
    }
  };

  // Determine shadow colors based on active player's color
  const getGlowColor = () => {
    switch (activeColor) {
      case 'red': return 'var(--neon-red-glow)';
      case 'green': return 'var(--neon-green-glow)';
      case 'yellow': return 'var(--neon-yellow-glow)';
      case 'blue': return 'var(--neon-blue-glow)';
      default: return 'var(--neon-purple-glow)';
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div 
        onClick={!disabled && !isRolling ? onClick : undefined}
        className={`dice-container ${disabled || isRolling ? 'cursor-not-allowed opacity-80' : 'hover:scale-105 active:scale-95'}`}
      >
        <div
          className={`dice-cube ${isRolling ? 'rolling' : ''}`}
          style={{
            transform: getRotationTransform(value),
          }}
        >
          {/* Face 1 */}
          <div className={`dice-face face-1 ${!disabled ? 'dice-face-active' : ''}`} style={{ boxShadow: !disabled ? `inset 0 0 10px rgba(0,0,0,0.8), 0 0 15px ${getGlowColor()}` : undefined }}>
            <div className="dice-dot" />
          </div>

          {/* Face 2 */}
          <div className={`dice-face face-2 ${!disabled ? 'dice-face-active' : ''}`} style={{ boxShadow: !disabled ? `inset 0 0 10px rgba(0,0,0,0.8), 0 0 15px ${getGlowColor()}` : undefined }}>
            <div className="dice-dot" />
            <div className="dice-dot" />
          </div>

          {/* Face 3 */}
          <div className={`dice-face face-3 ${!disabled ? 'dice-face-active' : ''}`} style={{ boxShadow: !disabled ? `inset 0 0 10px rgba(0,0,0,0.8), 0 0 15px ${getGlowColor()}` : undefined }}>
            <div className="dice-dot" />
            <div className="dice-dot" />
            <div className="dice-dot" />
          </div>

          {/* Face 4 */}
          <div className={`dice-face face-4 ${!disabled ? 'dice-face-active' : ''}`} style={{ boxShadow: !disabled ? `inset 0 0 10px rgba(0,0,0,0.8), 0 0 15px ${getGlowColor()}` : undefined }}>
            <div className="dice-dot" />
            <div className="dice-dot" />
            <div className="dice-dot" />
            <div className="dice-dot" />
          </div>

          {/* Face 5 */}
          <div className={`dice-face face-5 ${!disabled ? 'dice-face-active' : ''}`} style={{ boxShadow: !disabled ? `inset 0 0 10px rgba(0,0,0,0.8), 0 0 15px ${getGlowColor()}` : undefined }}>
            <div className="dice-dot" />
            <div className="dice-dot" />
            <div className="dice-dot" />
            <div className="dice-dot" />
            <div className="dice-dot" />
          </div>

          {/* Face 6 */}
          <div className={`dice-face face-6 ${!disabled ? 'dice-face-active' : ''}`} style={{ boxShadow: !disabled ? `inset 0 0 10px rgba(0,0,0,0.8), 0 0 15px ${getGlowColor()}` : undefined }}>
            <div className="dice-dot" />
            <div className="dice-dot" />
            <div className="dice-dot" />
            <div className="dice-dot" />
            <div className="dice-dot" />
            <div className="dice-dot" />
          </div>
        </div>
      </div>
      
      {/* Visual Indicator of who's rolling */}
      <span className="text-[11px] font-mono tracking-wider font-semibold text-secondary">
        {isRolling ? 'ROLLING...' : disabled ? 'WAITING' : 'YOUR TURN'}
      </span>
    </div>
  );
}
