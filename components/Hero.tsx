
import React from 'react';
import { View } from '../types';

interface HeroProps {
  onSelectView: (view: View) => void;
  isLoggedIn: boolean;
}

const Hero: React.FC<HeroProps> = ({ onSelectView, isLoggedIn }) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 py-8 max-w-6xl mx-auto`}>
      {/* Category: Carspotting */}
      <div 
        onClick={() => onSelectView(View.CARSPOTTING)}
        className="group relative h-[140px] md:h-[200px] bg-panel-gray border border-gray-800 hover:border-brick-red flex items-center justify-center cursor-pointer transition-all duration-300 overflow-hidden rounded-sm"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-brick-red/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <div className="relative z-10 text-center px-4">
          <h2 className="text-2xl md:text-2xl font-brand text-gray-400 group-hover:text-brick-red transition-colors duration-300 tracking-widest">
            CARSPOTTING
          </h2>
          <div className="h-0.5 w-0 bg-brick-red mt-1 mx-auto group-hover:w-1/2 transition-all duration-500"></div>
        </div>
      </div>

      {/* Category: Eventi */}
      <div 
        onClick={() => onSelectView(View.EVENTI)}
        className="group relative h-[140px] md:h-[200px] bg-panel-gray border border-gray-800 hover:border-brick-red flex items-center justify-center cursor-pointer transition-all duration-300 overflow-hidden rounded-sm"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-brick-red/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        <div className="relative z-10 text-center px-4">
          <h2 className="text-2xl md:text-2xl font-brand text-gray-400 group-hover:text-brick-red transition-colors duration-300 tracking-widest">
            EVENTI
          </h2>
          <div className="h-0.5 w-0 bg-brick-red mt-1 mx-auto group-hover:w-1/2 transition-all duration-500"></div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
