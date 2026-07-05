import React from 'react';

interface LitLogoProps {
  alt: string;
  className?: string;
  colorSrc: string;
  normalSrc: string;
}

const LitLogo: React.FC<LitLogoProps> = ({ alt, className, colorSrc }) => (
  <img src={colorSrc} alt={alt} className={className} draggable={false} />
);

export default LitLogo;
