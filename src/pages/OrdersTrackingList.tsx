import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Clock, MapPin, Timer, ArrowRight } from 'lucide-react';

const mockOrders = [
  {
    id: 'PED-1042',
    placedAt: '28/10/2025 19:45',
    status: 'Em preparo',
    eta: '20-30 min',
    summary: '2x Smash Burger, 1x Batata Rústica, 2x Refrigerante 350ml',
    address: 'Rua das Laranjeiras, 125 - Jardim Paulista',
    thumbnail: 'https://images.unsplash.com/photo-1612874742237-6526221588e3',
  },
  {
    id: 'PED-1039',
    placedAt: '27/10/2025 12:20',
    status: 'Entregue',
    eta: null,
    summary: '1x Bowl Mediterrâneo, 1x Suco Natural 300ml',
    address: 'Av. Central, 980 - Sala 402',
    thumbnail: 'https://images.unsplash.com/photo-1617118296160-7b6a11b437b6',
  },
  {
    id: 'PED-1035',
    placedAt: '26/10/2025 21:10',
    status: 'A caminho',
    eta: 'Chegando em 8 min',
    summary: 'Combo Família: 3x Burgers especiais + acompanhamentos',
    address: 'Rua do Sol, 432 - Condomínio Solar das Águas',
    thumbnail: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe',
  },
];

const statusVariants: Record<string, { label: string; color: string }> = {
  'aguardando': { label: 'Aguardando confirmação', color: 'bg-yellow-100 text-yellow-800' },
  'em preparo': { label: 'Em preparo', color: 'bg-blue-100 text-blue-800' },
  'a caminho': { label: 'A caminho', color: 'bg-indigo-100 text-indigo-800' },
  'entregue': { label: 'Entregue', color: 'bg-green-100 text-green-800' },
};

const OrdersTrackingList = () => {
  const navigate = useNavigate();

  const getStatusVariant = (status: string) => {
    const normalized = status.trim().toLowerCase();
    return statusVariants[normalized] || { label: status, color: 'bg-gray-100 text-gray-800' };
  };

  const getSummaryTags = (summary: string) => summary.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 3);

  const formatAddress = (address: string) => {
    if (!address) return 'Retirada no balcão';
    const [street] = address.split('-');
    return street ? street.trim() : address;
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Meus pedidos</h1>
            <p className="text-gray-500">Visualize o status de cada pedido realizado recentemente.</p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {mockOrders.map((order) => {
            const statusInfo = getStatusVariant(order.status);
            const summaryTags = getSummaryTags(order.summary);
            const shortAddress = formatAddress(order.address);
            return (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex flex-col items-center gap-1 w-16 flex-shrink-0">
                    <img
                      src={order.thumbnail}
                      alt={order.id}
                      className="h-full w-full rounded-md object-cover"
                    />
                    <Badge className={`w-full text-center px-2 py-0.5 text-[10px] ${statusInfo.color}`}>
                      {statusInfo.label}
                    </Badge>
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold text-gray-900">{order.id}</span>
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          {order.placedAt}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => navigate(`/orders-tracking/${order.id}`)}
                        aria-label={`Ver pedido ${order.id}`}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {summaryTags.map((tag, index) => (
                        <Badge key={`${order.id}-tag-${index}`} variant="outline" className="text-[11px] font-medium px-2 py-0.5">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {shortAddress}
                      </span>
                      {order.eta && (
                        <span className="flex items-center gap-1 text-indigo-600">
                          <Timer className="h-3 w-3" />
                          {order.eta}
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {mockOrders.length === 0 && (
            <Card className="col-span-full text-center py-12">
              <CardContent className="space-y-3">
                <h2 className="text-lg font-semibold">Nenhum pedido recente</h2>
                <p className="text-sm text-gray-500">
                  Assim que você concluir um pedido, ele aparecerá aqui para acompanhamento.
                </p>
                <Button onClick={() => navigate('/')}>Fazer um pedido</Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrdersTrackingList;
