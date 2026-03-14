import React from 'react';
import { THEME } from '../../utils/theme';

export const Card = ({ children, className = '', highlight = false }) => (
  <div className={`${THEME.card} p-4 rounded-xl shadow-lg border ${highlight ? THEME.border : 'border-gray-800'} ${className} backdrop-blur-sm bg-opacity-90`}>
    {children}
  </div>
);
