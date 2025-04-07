
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Clock, CheckCircle, Truck, Loader2, MapPin, Check } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';

// Componente do mapa OpenStreetMap
const OrderMap = ({ isTracking = false }) => {
  const [loadingMap, setLoadingMap] = useState(true);
  
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
          src={isTracking 
            ? "https://www.openstreetmap.org/export/embed.html?bbox=-46.69601440429688%2C-23.588296175900284%2C-46.61335945129395%2C-23.54324143931328&layer=mapnik&marker=-23.56576900000001%2C-46.65468700000001" 
            : "https://www.openstreetmap.org/export/embed.html?bbox=-46.69601440429688%2C-23.588296175900284%2C-46.61335945129395%2C-23.54324143931328&layer=mapnik"}
          title="Mapa de localização do entregador"
          onLoad={() => setLoadingMap(false)}
        />
        {loadingMap && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <Loader2 className="h-8 w-8 animate-spin text-menu-primary" />
          </div>
        )}
        {isTracking && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Motoboy animado */}
            <div 
              className="absolute w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white animate-pulse"
              style={{
                left: '40%',
                top: '50%',
                animation: 'moveMotoBoy 20s linear infinite',
              }}
            >
              <Truck className="h-6 w-6" />
            </div>
            <style>
              {`
                @keyframes moveMotoBoy {
                  0% { left: 10%; top: 50%; }
                  25% { left: 30%; top: 30%; }
                  50% { left: 50%; top: 40%; }
                  75% { left: 70%; top: 60%; }
                  100% { left: 90%; top: 50%; }
                }
              `}
            </style>
          </div>
        )}
        {isTracking && (
          <div className="absolute bottom-0 left-0 w-full">
            <div className="animate-pulse flex items-center justify-center bg-blue-500 text-white py-2 px-4">
              <Truck className="h-4 w-4 mr-2" /> Entregador a caminho
            </div>
          </div>
        )}
      </div>
      <div className="p-3 bg-yellow-50 text-center">
        <p className="text-sm">{isTracking 
          ? "Acompanhando em tempo real a localização do entregador." 
          : "Essa é uma versão demonstrativa do mapa. Na versão final, a localização em tempo real do entregador será mostrada."}</p>
      </div>
    </div>
  );
};

const OrderTracking = () => {
  const navigate = useNavigate();
  const params = useParams();
  const [mapOpen, setMapOpen] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [routeCompleted, setRouteCompleted] = useState(false);
  
  // Mockup de pedido - no futuro virá da API
  const order = {
    id: params.orderId || '#ORD123456',
    status: 'preparing', // pode ser: pending, preparing, ready, in_transit, delivered
    createdAt: new Date().toISOString(),
    estimatedTime: 25, // em minutos
    items: [
      { name: 'X-Burguer', quantity: 2, price: 15.90 },
      { name: 'Batata Frita', quantity: 1, price: 10.50 }
    ],
    total: 42.30,
  };

  const getStatusStep = (status: string) => {
    switch (status) {
      case 'pending': return 0;
      case 'preparing': return 1;
      case 'ready': return 2;
      case 'in_transit': return 3;
      case 'delivered': return 4;
      default: return 0;
    }
  };

  const statusStep = getStatusStep(order.status);
  
  const handleTrackOrder = () => {
    setTracking(true);
    setMapOpen(true);
    
    // Simular que a entrega foi completada após 20s
    setTimeout(() => {
      if (tracking) {
        setRouteCompleted(true);
        toast({
          title: "Entregador chegou ao destino",
          description: "Seu pedido foi entregue com sucesso!",
        });
      }
    }, 20000);
  };
  
  const handleConfirmOrder = () => {
    setOrderConfirmed(true);
    toast({
      title: "Pedido confirmado",
      description: "Obrigado por confirmar o recebimento do seu pedido!",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Button 
            variant="outline" 
            className="mb-4"
            onClick={() => navigate('/')}
          >
            Voltar ao menu
          </Button>
          
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Seu Pedido {order.id}</CardTitle>
                <ShoppingBag className="h-5 w-5 text-menu-primary" />
              </div>
              <CardDescription className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {new Date(order.createdAt).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Status do Pedido */}
              <div className="space-y-4">
                <h3 className="font-medium">Status do Pedido</h3>
                
                <div className="relative">
                  {/* Linha de progresso */}
                  <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-200"></div>
                  
                  {/* Etapas */}
                  <div className="relative flex justify-between">
                    {/* Recebido */}
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${statusStep >= 0 ? 'border-menu-primary bg-menu-primary text-white' : 'border-gray-300 bg-white'}`}>
                        {statusStep > 0 ? <CheckCircle className="w-5 h-5" /> : 1}
                      </div>
                      <span className="text-xs mt-1">Recebido</span>
                    </div>
                    
                    {/* Preparando */}
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${statusStep >= 1 ? 'border-menu-primary bg-menu-primary text-white' : 'border-gray-300 bg-white'}`}>
                        {statusStep > 1 ? <CheckCircle className="w-5 h-5" /> : statusStep === 1 ? <Loader2 className="w-5 h-5 animate-spin" /> : 2}
                      </div>
                      <span className="text-xs mt-1">Preparando</span>
                    </div>
                    
                    {/* Pronto */}
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${statusStep >= 2 ? 'border-menu-primary bg-menu-primary text-white' : 'border-gray-300 bg-white'}`}>
                        {statusStep > 2 ? <CheckCircle className="w-5 h-5" /> : 3}
                      </div>
                      <span className="text-xs mt-1">Pronto</span>
                    </div>
                    
                    {/* Entregue */}
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${statusStep >= 3 ? 'border-menu-primary bg-menu-primary text-white' : 'border-gray-300 bg-white'}`}>
                        {statusStep > 3 ? <CheckCircle className="w-5 h-5" /> : <Truck className="w-5 h-5" />}
                      </div>
                      <span className="text-xs mt-1">Entregue</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-yellow-50 rounded-md text-center">
                  {statusStep === 0 && "Aguardando confirmação do restaurante..."}
                  {statusStep === 1 && `Seu pedido está sendo preparado. Tempo estimado: ${order.estimatedTime} minutos.`}
                  {statusStep === 2 && "Seu pedido está pronto e será entregue em breve!"}
                  {statusStep === 3 && "Seu pedido está a caminho! Fique atento."}
                  {statusStep === 4 && "Pedido entregue. Bom apetite!"}
                </div>
              </div>
              
              {/* Mapa de localização */}
              <div className="space-y-3">
                <h3 className="font-medium">Local de entrega</h3>
                <OrderMap isTracking={routeCompleted ? false : tracking} />
                
                {/* Botões de rastreamento e confirmação */}
                {(statusStep === 3 || statusStep === 4) && (
                  <div className="space-y-3 pt-2">
                    <Button 
                      variant="outline" 
                      className="w-full flex items-center justify-center gap-2"
                      onClick={handleTrackOrder}
                      disabled={routeCompleted}
                    >
                      <MapPin className="h-4 w-4" />
                      {routeCompleted ? 'Rota concluída' : 'Rastrear pedido'}
                    </Button>
                    
                    <Button 
                      className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700"
                      onClick={handleConfirmOrder}
                      disabled={orderConfirmed}
                    >
                      <Check className="h-4 w-4" />
                      {orderConfirmed ? "Pedido confirmado" : "Confirmar recebimento"}
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Resumo do Pedido */}
              <div>
                <h3 className="font-bold mb-3">Resumo do Pedido</h3>
                <ul className="space-y-2">
                  {order.items.map((item, index) => (
                    <li key={index} className="flex justify-between text-sm">
                      <span>{item.quantity}x {item.name}</span>
                      <span>R$ {(item.price * item.quantity).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
                
                <div className="border-t mt-4 pt-4">
                  <div className="flex justify-between font-medium">
                    <span>Total</span>
                    <span>R$ {order.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
            
            <CardFooter>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => window.location.href = 'tel:+551199999999'}
              >
                Entrar em contato
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Diálogo do mapa */}
      <Dialog open={mapOpen} onOpenChange={setMapOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rastreamento do pedido</DialogTitle>
          </DialogHeader>
          <OrderMap isTracking={tracking} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrderTracking;
