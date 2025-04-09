
import React, { useState, useEffect } from 'react';
import { Loader2, MapPin, Truck } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import DeliveryBikeSvg from './DeliveryBikeSvg';

// Endereços padrão para testes
const DEFAULT_STORE_ADDRESS = {
  lat: -14.7952,
  lng: -39.2763, // Coordenadas para R. Nova, 325 - Califórnia, Itabuna - BA
  address: "R. Nova, 325 - Califórnia, Itabuna - BA, 45603-652"
};

const DEFAULT_CUSTOMER_ADDRESS = {
  lat: -14.8042,
  lng: -39.2697, // Coordenadas para Shopping Jequitibá, Itabuna - BA
  address: "Shopping Jequitibá, Av. Aziz Maron, s/n - Góes Calmon, Itabuna - BA, 45605-412"
};

// Gerar pontos aleatórios para simular ruas
const generateRandomPoints = (center: {lat: number, lng: number}, radius: number, count: number) => {
  const points = [];
  for (let i = 0; i < count; i++) {
    // Gerar pontos aleatórios ao redor do centro
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * radius;
    const lat = center.lat + distance * Math.cos(angle);
    const lng = center.lng + distance * Math.sin(angle);
    points.push({ lat, lng });
  }
  return points;
};

// Converter coordenadas geográficas para SVG
const latToY = (lat: number, bounds: {minLat: number, maxLat: number, height: number}) => 
  bounds.height - ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * bounds.height;

const lngToX = (lng: number, bounds: {minLng: number, maxLng: number, width: number}) => 
  ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * bounds.width;

interface OrderMapProps {
  isTracking?: boolean;
  onRouteComplete?: () => void;
  testMode?: boolean;
}

const OrderMap: React.FC<OrderMapProps> = ({ isTracking = false, onRouteComplete = () => {}, testMode = false }) => {
  const [loadingMap, setLoadingMap] = useState(true);
  const [route, setRoute] = useState([
    { ...DEFAULT_STORE_ADDRESS },  // Posição inicial (loja)
    { ...DEFAULT_CUSTOMER_ADDRESS } // Destino (cliente)
  ]);
  const [streets, setStreets] = useState<{lat: number, lng: number}[][]>([]);
  const [direction, setDirection] = useState(0); // Direção do ícone do motoboy
  
  // Gerar ruas simuladas quando o componente é montado
  useEffect(() => {
    const center = { 
      lat: (DEFAULT_STORE_ADDRESS.lat + DEFAULT_CUSTOMER_ADDRESS.lat) / 2,
      lng: (DEFAULT_STORE_ADDRESS.lng + DEFAULT_CUSTOMER_ADDRESS.lng) / 2
    };
    const points = generateRandomPoints(center, 0.01, 30);
    
    // Criar segmentos simulando ruas
    const streetSegments = [];
    for (let i = 0; i < points.length - 1; i++) {
      streetSegments.push([points[i], points[i+1]]);
    }
    
    // Adicionar algumas ruas verticais e horizontais
    for (let i = 0; i < 5; i++) {
      const latStart = center.lat - 0.005 + i * 0.002;
      streetSegments.push([
        { lat: latStart, lng: center.lng - 0.01 },
        { lat: latStart, lng: center.lng + 0.01 }
      ]);
      
      const lngStart = center.lng - 0.01 + i * 0.005;
      streetSegments.push([
        { lat: center.lat - 0.01, lng: lngStart },
        { lat: center.lat + 0.01, lng: lngStart }
      ]);
    }
    
    // Adicionar uma rua direta conectando a loja e o cliente
    streetSegments.push([
      { lat: DEFAULT_STORE_ADDRESS.lat, lng: DEFAULT_STORE_ADDRESS.lng },
      { lat: DEFAULT_CUSTOMER_ADDRESS.lat, lng: DEFAULT_CUSTOMER_ADDRESS.lng }
    ]);
    
    setStreets(streetSegments);
    
  }, []);
  
  // Encontrar ruas próximas à posição atual
  const findNearbyStreet = (position: {lat: number, lng: number}) => {
    if (streets.length === 0) return position;
    
    let closestPoint = position;
    let minDistance = Infinity;
    
    streets.forEach(street => {
      const [start, end] = street;
      
      // Calcular o ponto mais próximo na rua
      const dx = end.lng - start.lng;
      const dy = end.lat - start.lat;
      const t = ((position.lng - start.lng) * dx + (position.lat - start.lat) * dy) / (dx * dx + dy * dy);
      
      if (t >= 0 && t <= 1) {
        const projectionX = start.lng + t * dx;
        const projectionY = start.lat + t * dy;
        const distance = Math.sqrt(
          Math.pow(position.lng - projectionX, 2) + 
          Math.pow(position.lat - projectionY, 2)
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          closestPoint = { lat: projectionY, lng: projectionX };
        }
      }
    });
    
    return closestPoint;
  };

  // Calcular direção com base nos pontos atual e próximo
  const calculateDirection = (current: {lat: number, lng: number}, next: {lat: number, lng: number}) => {
    const dx = next.lng - current.lng;
    const dy = next.lat - current.lat;
    // Converter radianos para graus e ajustar para direção norte = 0
    return Math.atan2(dy, dx) * (180 / Math.PI) + 90;
  };
  
  // Simular movimento do motoboy nas ruas
  useEffect(() => {
    if (!isTracking) return;
    
    let animationFrame: number;
    let step = 0;
    const totalSteps = 200; // Mais passos para animação mais lenta
    
    // Verificar se temos ruas simuladas
    if (streets.length === 0) return;
    
    const animate = () => {
      if (step < totalSteps) {
        // Calcular posição interpolada bruta
        const rawPosition = {
          lat: route[0].lat + (route[1].lat - route[0].lat) * (step / totalSteps),
          lng: route[0].lng + (route[1].lng - route[0].lng) * (step / totalSteps)
        };
        
        // Ajustar para a rua mais próxima para movimento mais realista
        const streetPosition = findNearbyStreet(rawPosition);
        
        // Adicionar pequena variação aleatória para parecer mais natural
        const newPosition = {
          lat: streetPosition.lat + (Math.random() - 0.5) * 0.00004,
          lng: streetPosition.lng + (Math.random() - 0.5) * 0.00004,
          address: route[0].address // Manter o endereço original
        };
        
        // Calcular direção (orientação) do motoboy
        const nextStep = step + 5 < totalSteps ? step + 5 : totalSteps - 1;
        const nextPosition = {
          lat: route[0].lat + (route[1].lat - route[0].lat) * (nextStep / totalSteps),
          lng: route[0].lng + (route[1].lng - route[0].lng) * (nextStep / totalSteps)
        };
        
        const newDirection = calculateDirection(newPosition, nextPosition);
        setDirection(newDirection);
        
        setRoute(prev => [newPosition, prev[1]]);
        step++;
        animationFrame = requestAnimationFrame(animate);
      } else {
        // Quando completar a rota
        if (testMode) {
          onRouteComplete();
        }
      }
    };
    
    animationFrame = requestAnimationFrame(animate);
    
    // Simular mudanças de rota ocasionais
    const routeChangeInterval = setInterval(() => {
      if (!isTracking) return;
      
      // Escolher um ponto aleatório nas ruas simuladas
      if (streets.length > 0) {
        const randomStreetIndex = Math.floor(Math.random() * streets.length);
        const randomStreet = streets[randomStreetIndex];
        const t = Math.random();
        
        // Interpolar um ponto aleatório na rua
        const newDestination = {
          lat: randomStreet[0].lat + (randomStreet[1].lat - randomStreet[0].lat) * t,
          lng: randomStreet[0].lng + (randomStreet[1].lng - randomStreet[0].lng) * t,
          address: "Recalculando rota..." // Adicionar um endereço temporário
        };
        
        // Garantir que o destino final eventualmente seja a localização do cliente
        const progress = step / totalSteps;
        if (progress > 0.8) {
          // Quando está próximo do fim, voltar para a rota original
          setRoute(prev => [prev[0], DEFAULT_CUSTOMER_ADDRESS]);
        } else {
          // Caso contrário, variar a rota para pontos intermediários
          setRoute(prev => [prev[0], newDestination]);
        }
        
        toast({
          title: "Rota atualizada",
          description: "O entregador alterou a rota de entrega.",
        });
      }
    }, 15000); // A cada 15s
    
    return () => {
      cancelAnimationFrame(animationFrame);
      clearInterval(routeChangeInterval);
    };
  }, [isTracking, streets, testMode, onRouteComplete]);
  
  // Variáveis para o SVG
  const svgBounds = {
    width: 400,
    height: 300,
    minLat: -14.81,
    maxLat: -14.79,
    minLng: -39.29,
    maxLng: -39.26
  };
  
  // Converter rota para SVG path para mostrar a linha
  const getPathD = () => {
    // Converter coordenadas geográficas para coordenadas SVG
    const x1 = lngToX(route[0].lng, svgBounds);
    const y1 = latToY(route[0].lat, svgBounds);
    const x2 = lngToX(route[1].lng, svgBounds);
    const y2 = latToY(route[1].lat, svgBounds);
    
    // Criar uma curva Bezier para simular rotas do Google Maps
    const controlPointX = x1 + (x2 - x1) / 2 + (Math.random() - 0.5) * 20;
    const controlPointY = y1 + (y2 - y1) / 2 + (Math.random() - 0.5) * 20;
    
    return `M${x1},${y1} Q${controlPointX},${controlPointY} ${x2},${y2}`;
  };
  
  // Renderizar ruas no SVG
  const renderStreets = () => {
    return streets.map((street, index) => {
      const x1 = lngToX(street[0].lng, svgBounds);
      const y1 = latToY(street[0].lat, svgBounds);
      const x2 = lngToX(street[1].lng, svgBounds);
      const y2 = latToY(street[1].lat, svgBounds);
      
      return (
        <line 
          key={`street-${index}`}
          x1={x1} 
          y1={y1} 
          x2={x2} 
          y2={y2} 
          stroke="#ddd" 
          strokeWidth="4"
          opacity="0.6"
        />
      );
    });
  };
  
  return (
    <div className="w-full h-[300px] bg-gray-100 rounded-lg overflow-hidden">
      <div className="w-full h-full relative">
        <iframe 
          width="100%" 
          height="100%" 
          frameBorder="0" 
          scrolling="no" 
          marginHeight={0} 
          marginWidth={0} 
          src={`https://www.openstreetmap.org/export/embed.html?bbox=-39.29,-14.81,-39.26,-14.79&layer=mapnik`}
          title="Mapa de localização do entregador"
          onLoad={() => setLoadingMap(false)}
          className={isTracking ? "opacity-60" : ""}
        />
        {loadingMap && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <Loader2 className="h-8 w-8 animate-spin text-menu-primary" />
          </div>
        )}
        
        {isTracking && (
          <svg 
            className="absolute inset-0 w-full h-full pointer-events-none" 
            viewBox="0 0 400 300" 
            preserveAspectRatio="none"
          >
            {/* Ruas simuladas */}
            {renderStreets()}
            
            {/* Linha da rota - pontilhada */}
            <path 
              d={getPathD()} 
              stroke="#4285F4" 
              strokeWidth="2" 
              fill="none" 
              strokeDasharray="5,5" 
            />
            
            {/* Pin de destino - casa estilizada com animação de pulso */}
            <g transform={`translate(${lngToX(route[1].lng, svgBounds) - 10}, ${latToY(route[1].lat, svgBounds) - 22})`}>
              {/* Pulso de radar */}
              <circle 
                cx="10" 
                cy="10" 
                r="15" 
                fill="rgba(229, 57, 53, 0.2)" 
                className="animate-ping"
              />
              
              {/* Casinha estilizada */}
              <path 
                d="M10,0 L20,10 L17,10 L17,20 L3,20 L3,10 L0,10 Z" 
                fill="#E53935" 
              />
              <rect x="7" y="14" width="6" height="6" fill="white" />
            </g>
            
            {/* Bairro de destino */}
            <text 
              x={lngToX(route[1].lng, svgBounds) + 10} 
              y={latToY(route[1].lat, svgBounds) - 10} 
              fill="#333" 
              fontSize="8" 
              fontWeight="bold"
            >
              Góes Calmon
            </text>
          </svg>
        )}
        
        {isTracking && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Motoboy animado */}
            <div 
              className="absolute"
              style={{
                left: `${(lngToX(route[0].lng, svgBounds) / svgBounds.width) * 100}%`,
                top: `${(latToY(route[0].lat, svgBounds) / svgBounds.height) * 100}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: 1000
              }}
            >
              <DeliveryBikeSvg direction={direction} />
            </div>
          </div>
        )}
        
        {isTracking && (
          <div className="absolute bottom-0 left-0 w-full">
            <div className="flex items-center justify-center bg-blue-500 text-white py-2 px-4 text-xs">
              <Truck className="h-3 w-3 mr-1" /> Entregador a caminho
            </div>
          </div>
        )}
      </div>
      <div className="p-2 bg-yellow-50 text-center">
        <p className="text-xs">{isTracking 
          ? "Acompanhando em tempo real a localização do entregador." 
          : "Essa é uma versão demonstrativa do mapa. Na versão final, a localização em tempo real do entregador será mostrada."}</p>
      </div>
    </div>
  );
};

export default OrderMap;
