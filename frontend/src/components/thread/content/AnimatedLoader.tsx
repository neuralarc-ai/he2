import React from 'react';
import { AnimatedShinyText } from '@/components/ui/animated-shiny-text';

interface AnimatedLoaderProps {
  className?: string;
}

export const AnimatedLoader: React.FC<AnimatedLoaderProps> = ({ className = '' }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative w-[12px] h-[12px] scale-75">
        <div 
          className="absolute bg-black dark:bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2 animate-[rotateClockwise_3s_infinite_cubic-bezier(0.4,0,0.2,1)]"
          style={{
            animationDelay: '0s',
            top: '0%',
            left: '0%',
            width: '8px',
            height: '8px'
          }}
        />
        <div 
          className="absolute bg-black dark:bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2 animate-[rotateClockwise_3s_infinite_cubic-bezier(0.4,0,0.2,1)]"
          style={{
            animationDelay: '-0.75s',
            top: '0%',
            left: '100%',
            width: '11px',
            height: '11px'
          }}
        />
        <div 
          className="absolute bg-black dark:bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2 animate-[rotateClockwise_3s_infinite_cubic-bezier(0.4,0,0.2,1)]"
          style={{
            animationDelay: '-1.5s',
            top: '100%',
            left: '100%',
            width: '8px',
            height: '8px'
          }}
        />
        <div 
          className="absolute bg-black dark:bg-white rounded-full transform -translate-x-1/2 -translate-y-1/2 animate-[rotateClockwise_3s_infinite_cubic-bezier(0.4,0,0.2,1)]"
          style={{
            animationDelay: '-2.25s',
            top: '100%',
            left: '0%',
            width: '11px',
            height: '11px'
          }}
        />
        
        <style jsx>{`
          @keyframes rotateClockwise {
            0%   { top: 0%; left: 0%; width: 8px; height: 8px; }
            20%  { top: 0%; left: 100%; width: 11px; height: 11px; }
            25%  { top: 0%; left: 100%; width: 11px; height: 11px; }
            45%  { top: 100%; left: 100%; width: 8px; height: 8px; }
            50%  { top: 100%; left: 100%; width: 8px; height: 8px; }
            70%  { top: 100%; left: 0%; width: 11px; height: 11px; }
            75%  { top: 100%; left: 0%; width: 11px; height: 11px; }
            95%  { top: 0%; left: 0%; width: 8px; height: 8px; }
            100% { top: 0%; left: 0%; width: 8px; height: 8px; }
          }
        `}</style>
      </div>
      
      <AnimatedShinyText className="text-base font-semibold -ml-1">
        <span>Helium</span>
      </AnimatedShinyText>
    </div>
  );
};
