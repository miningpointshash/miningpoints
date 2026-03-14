import React from 'react';
import { THEME } from '../../utils/theme';

export const Button = ({ children, onClick, variant = 'primary', size = 'md', className = '', disabled = false }) => {
  const baseStyle = "rounded-lg font-bold uppercase tracking-wider transition-all active:scale-95 shadow-[0_0_10px_rgba(168,85,247,0.3)] flex items-center justify-center";
  
  const sizes = {
      xs: "px-2 py-1 text-[10px]",
      sm: "px-3 py-2 text-xs",
      md: "px-4 py-3 text-sm",
      lg: "px-6 py-4 text-base",
      icon: "p-2 w-10 h-10"
  };

  const variants = {
    primary: `${THEME.primary} text-white border border-purple-500`,
    secondary: "bg-gray-800 text-white border border-gray-600 hover:bg-gray-700",
    outline: "bg-transparent border border-[#ff00ff] text-[#ff00ff] hover:bg-[#ff00ff] hover:text-black",
    success: "bg-green-600 text-white hover:bg-green-500",
    ghost: "bg-transparent text-gray-400 hover:text-white hover:bg-gray-800 border-none shadow-none",
    danger: "bg-red-600 text-white hover:bg-red-500"
  };

  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyle} ${sizes[size] || sizes.md} ${variants[variant] || variants.primary} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );
};
