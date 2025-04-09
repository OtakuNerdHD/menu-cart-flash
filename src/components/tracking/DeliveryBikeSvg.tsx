
import React from 'react';

interface DeliveryBikeSvgProps {
  direction?: number;
}

const DeliveryBikeSvg: React.FC<DeliveryBikeSvgProps> = ({ direction = 0 }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: `rotate(${direction}deg)` }}>
    {/* Sombra sob o motoboy */}
    <ellipse cx="12" cy="13" rx="10" ry="7" fill="rgba(0,0,0,0.1)" />
    
    {/* Corpo da moto */}
    <circle cx="12" cy="12" r="7" fill="#333333" />
    
    {/* Mochila de entrega */}
    <rect x="9" y="7" width="6" height="6" fill="#E53935" rx="1" />
    
    {/* Detalhes da moto */}
    <circle cx="7" cy="12" r="3" fill="#666666" />
    <circle cx="17" cy="12" r="3" fill="#666666" />
    
    {/* Capacete/cabeça do motoboy */}
    <circle cx="12" cy="9" r="3" fill="#444444" />
    
    {/* Detalhes visuais da mochila */}
    <rect x="10" y="8" width="4" height="1" fill="white" />
    <rect x="10" y="10" width="4" height="1" fill="white" />
  </svg>
);

export default DeliveryBikeSvg;
