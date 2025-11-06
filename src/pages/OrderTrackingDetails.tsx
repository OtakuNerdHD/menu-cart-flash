import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useNavigate, useParams } from 'react-router-dom';
import { Clock, MapPin, Package, CheckCircle2, Timer, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const KITCHEN_TO_CLIENT_STATUS: Record<string, 'aguardando' | 'preparando' | 'a caminho' | 'entregue'> = {
  'pending': 'aguardando',
  'queued': 'aguardando',
  'preparing': 'aguardando',
  'in_progress': 'preparando',
  'ready': 'a caminho',
  'picked_up': 'entregue',
  'delivered': 'entregue',
};

const stepIcon = {
  done: CheckCircle2,
  active: Timer,
  pending: Clock,
};

const statusColors: Record<string, string> = {
  done: 'bg-green-100 text-green-700 border-green-200',
  active: 'bg-blue-100 text-blue-700 border-blue-200',
  pending: 'bg-gray-100 text-gray-500 border-gray-200',
};

type TrackingStep = 'done' | 'active' | 'pending';

const OrderTrackingDetails = () => {
  const navigate = useNavigate();
  const { orderId } = useParams<{ orderId: string }>();
  const [showTimelineDetails, setShowTimelineDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<{
    id: string;
    rawId: number;
    placedAt: string;
    summary: string;
    address: string;
    thumbnail: string;
    trackingHistory: Array<{ id: string; title: string; description: string; status: TrackingStep; timestamp: string | null }>;
  } | null>(null);

  const computeSteps = (statusInput: string) => {
    const clientStatus = (KITCHEN_TO_CLIENT_STATUS[(statusInput || '').toLowerCase()] || 'aguardando');
    const stepIndex = clientStatus === 'aguardando' ? 0 : clientStatus === 'preparando' ? 1 : clientStatus === 'a caminho' ? 2 : 3;
    const statuses: TrackingStep[] = [0,1,2,3].map((i) => (i < stepIndex ? 'done' : i === stepIndex ? 'active' : 'pending')) as TrackingStep[];
    return [
      { id: 'step-1', title: 'Pedido recebido', description: 'Estamos aguardando o estabelecimento aceitar o pedido.', status: statuses[0], timestamp: null },
      { id: 'step-2', title: 'Preparando', description: 'O estabelecimento começou a preparar seu pedido.', status: statuses[1], timestamp: null },
      { id: 'step-3', title: 'A caminho', description: 'Seu pedido saiu para entrega.', status: statuses[2], timestamp: null },
      { id: 'step-4', title: 'Entregue', description: 'Pedido concluído e entregue ao cliente.', status: statuses[3], timestamp: null },
    ];
  };

  useEffect(() => {
    const idNum = Number(orderId);
    if (!orderId || Number.isNaN(idNum)) { setLoading(false); return; }

    const load = async () => {
      setLoading(true);
      try {
        const { data: orderRow } = await supabase.from('orders').select('*').eq('id', idNum).maybeSingle();
        if (!orderRow) { setOrder(null); return; }

        const { data: itemsData } = await supabase
          .from('order_items')
          .select('order_id, quantity, price, notes, product_id')
          .eq('order_id', idNum);
        const items = Array.isArray(itemsData) ? itemsData : [];
        const prodIds = Array.from(new Set(items.map((i: any) => i.product_id)));
        let products: any[] = [];
        if (prodIds.length > 0) {
          const { data: prods } = await supabase
            .from('products')
            .select('id, name, image_url')
            .in('id', prodIds);
          products = Array.isArray(prods) ? prods : [];
        }
        const pmap: Record<number, { name: string; image_url?: string | null }> = {};
        products.forEach((p: any) => { pmap[p.id] = { name: p.name, image_url: p.image_url ?? null }; });

        const its = items.map((i) => ({
          name: pmap[i.product_id]?.name || 'Produto',
          image: pmap[i.product_id]?.image_url || '',
          quantity: i.quantity,
          price: i.price,
          notes: i.notes || undefined,
        }));
        const summary = its.map((i) => `${i.quantity}x ${i.name}`).join(', ');
        const addrObj = (orderRow.address || null) as any;
        const addr = addrObj
          ? [addrObj.street, addrObj.number].filter(Boolean).join(', ') + (addrObj.neighborhood ? ` - ${addrObj.neighborhood}` : '')
          : '';
        const placedAt = orderRow.created_at ? new Date(orderRow.created_at).toLocaleString('pt-BR', { hour12: false }) : '';
        const thumbnail = its[0]?.image || 'https://images.unsplash.com/photo-1612874742237-6526221588e3';

        setOrder({
          id: `PED-${orderRow.id}`,
          rawId: orderRow.id,
          placedAt,
          summary,
          address: addr,
          thumbnail,
          trackingHistory: computeSteps(orderRow.status || ''),
        });
      } finally {
        setLoading(false);
      }
    };

    load();

    const channel = supabase.channel(`orders-tracking-details-${idNum}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
        const updated = payload.new as any;
        if (updated.id !== idNum) return;
        setOrder((prev) => prev ? { ...prev, placedAt: updated.created_at ? new Date(updated.created_at).toLocaleString('pt-BR', { hour12: false }) : prev.placedAt, trackingHistory: computeSteps(updated.status || '') } : prev);
      })
      .subscribe();

    return () => { try { supabase.removeChannel(channel); } catch {} };
  }, [orderId]);

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="container mx-auto px-4 py-8 pb-24">
        <Button variant="ghost" className="mb-4 gap-2" onClick={() => navigate('/orders-tracking')}>
          <ChevronRight className="h-4 w-4 rotate-180" />
          Voltar
        </Button>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center gap-4">
              <img src={order?.thumbnail || 'https://images.unsplash.com/photo-1612874742237-6526221588e3'} alt={order?.id || ''} className="h-16 w-16 rounded-lg object-cover" />
              <div className="flex-1">
                <CardTitle className="text-xl">Pedido {order?.id || ''}</CardTitle>
                <CardDescription className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4" />
                  {order?.placedAt || ''}
                </CardDescription>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(order?.summary || '').split(',').map((item, idx) => (
                    <Badge key={`${order.id}-summary-${idx}`} variant="outline" className="text-[11px] font-medium px-2 py-0.5">
                      {item.trim()}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-600">Histórico do pedido</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                    onClick={() => setShowTimelineDetails((prev) => !prev)}
                    aria-expanded={showTimelineDetails}
                    aria-controls="timeline-details"
                  >
                    {showTimelineDetails ? 'Ocultar detalhes' : 'Ver detalhes'}
                  </Button>
                </div>

                {showTimelineDetails ? (
                  <div className="mt-4 relative" id="timeline-details">
                    <div className="absolute left-5 top-1 bottom-1 w-px bg-gray-200" aria-hidden="true" />
                    <div className="space-y-6">
                      {(order?.trackingHistory || []).map((step, index) => {
                        const Icon = stepIcon[step.status];
                        const statusColor = statusColors[step.status];
                        const isLast = index === (order?.trackingHistory?.length || 0) - 1;
                        return (
                          <div key={step.id} className="relative flex gap-4">
                            <div className="flex flex-col items-center">
                              <div className={`h-10 w-10 rounded-full border flex items-center justify-center ${statusColor}`}>
                                <Icon className="h-4 w-4" />
                              </div>
                              {!isLast && <span className="flex-1 w-px bg-gray-200 mt-2" aria-hidden="true" />}
                            </div>
                            <div className="flex-1 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-semibold text-gray-900">{step.title}</h4>
                                {step.timestamp && <span className="text-xs font-medium text-gray-500">{step.timestamp}</span>}
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="mt-3">
                    <div className="flex flex-wrap gap-3 md:flex-nowrap md:overflow-x-auto md:pb-2">
                      {(order?.trackingHistory || []).map((step) => {
                        const Icon = stepIcon[step.status];
                        const statusColor = statusColors[step.status];
                        const label = step.title.length > 18 ? `${step.title.slice(0, 16)}…` : step.title;
                        return (
                          <div
                            key={`${step.id}-collapsed`}
                            className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 min-w-[80px]"
                          >
                            <div className={`h-10 w-10 rounded-full border flex items-center justify-center ${statusColor}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <span className="text-[11px] text-gray-500 text-center leading-tight max-w-[90px]">
                              {label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Entrega</h4>
                <p className="text-sm text-gray-800 mt-1 flex items-start gap-2">
                  <Package className="h-4 w-4 text-gray-500 mt-0.5" />
                  Entrega padrão (35-45 min)
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informações da entrega</CardTitle>
              <CardDescription>Detalhes sobre destino e suporte.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-gray-200 p-4 flex gap-3">
                <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-gray-700">Endereço</h4>
                  <p className="text-sm text-gray-600">{order?.address || 'Retirada no balcão'}</p>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-4 flex gap-3">
                <Clock className="h-5 w-5 text-gray-500 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-gray-700">Pedido realizado</h4>
                  <p className="text-sm text-gray-600">{order?.placedAt || ''}</p>
                </div>
              </div>

              <Separator />

              <Button className="w-full">
                Preciso de ajuda
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OrderTrackingDetails;
