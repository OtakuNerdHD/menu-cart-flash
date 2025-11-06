import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Clock, MapPin, Timer, ArrowRight } from 'lucide-react';
import { useSupabaseWithMultiTenant } from '@/hooks/useSupabaseWithMultiTenant';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

const KITCHEN_TO_CLIENT_STATUS: Record<string, 'aguardando' | 'em preparo' | 'a caminho' | 'entregue'> = {
  'pending': 'aguardando',
  'queued': 'aguardando',
  'preparing': 'aguardando',
  'in_progress': 'em preparo',
  'ready': 'a caminho',
  'picked_up': 'entregue',
  'delivered': 'entregue',
};

const statusVariants: Record<string, { label: string; color: string }> = {
  'aguardando': { label: 'Aguardando confirmação', color: 'bg-yellow-100 text-yellow-800' },
  'em preparo': { label: 'Em preparo', color: 'bg-blue-100 text-blue-800' },
  'a caminho': { label: 'A caminho', color: 'bg-indigo-100 text-indigo-800' },
  'entregue': { label: 'Entregue', color: 'bg-green-100 text-green-800' },
};

const OrdersTrackingList = () => {
  const navigate = useNavigate();
  const { getOrders } = useSupabaseWithMultiTenant();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Array<{
    rawId: number;
    id: string;
    placedAt: string;
    status: string;
    eta: string | null;
    summary: string;
    address: string;
    thumbnail: string;
  }>>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        let list: any[] = await getOrders({});
        if (!Array.isArray(list)) list = [];

        if (user?.id) {
          list = list.filter((o) => (o.created_by === user.id));
        } else {
          try {
            const key = 'my_order_ids';
            const saved = JSON.parse(localStorage.getItem(key) || '[]');
            const ids = Array.isArray(saved) ? saved : [];
            let clientToken = '';
            try { clientToken = localStorage.getItem('delliapp_client_token') || ''; } catch {}
            list = list.filter((o) => ids.includes(o.id) || (!!clientToken && o.client_token === clientToken));
          } catch {
            list = [];
          }
        }

        const orderIds = list.map((o) => o.id);
        let items: any[] = [];
        if (orderIds.length > 0) {
          const { data: itemsData } = await supabase
            .from('order_items')
            .select('order_id, quantity, price, notes, product_id')
            .in('order_id', orderIds);
          items = Array.isArray(itemsData) ? itemsData : [];
        }
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

        const ui = list.map((o) => {
          const its = items.filter((i) => i.order_id === o.id).map((i) => ({
            name: pmap[i.product_id]?.name || 'Produto',
            image: pmap[i.product_id]?.image_url || '',
            quantity: i.quantity,
            price: i.price,
            notes: i.notes || undefined,
          }));
          const summary = its.map((i) => `${i.quantity}x ${i.name}`).join(', ');
          const addrObj = (o.address || null) as any;
          const addr = addrObj
            ? [addrObj.street, addrObj.number].filter(Boolean).join(', ') + (addrObj.neighborhood ? ` - ${addrObj.neighborhood}` : '')
            : '';
          const statusKey = (KITCHEN_TO_CLIENT_STATUS[(o.status || '').toLowerCase()] || 'aguardando');
          const placedAt = o.created_at ? new Date(o.created_at).toLocaleString('pt-BR', { hour12: false }) : '';
          const thumbnail = its[0]?.image || 'https://images.unsplash.com/photo-1612874742237-6526221588e3';
          return {
            rawId: o.id,
            id: `PED-${o.id}`,
            placedAt,
            status: statusKey,
            eta: null,
            summary,
            address: addr,
            thumbnail,
          };
        });

        setOrders(ui);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();

    const channel = supabase.channel('orders-tracking-list')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
        const updated = payload.new as any;
        setOrders((prev) => prev.map((o) => {
          if (o.rawId === updated.id) {
            const statusKey = (KITCHEN_TO_CLIENT_STATUS[(updated.status || '').toLowerCase()] || 'aguardando');
            return { ...o, status: statusKey, placedAt: updated.created_at ? new Date(updated.created_at).toLocaleString('pt-BR', { hour12: false }) : o.placedAt };
          }
          return o;
        }));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, async (payload) => {
        const row = payload.new as any;
        // Verificar se pertence ao usuário atual ou visitante via client_token
        let allow = false;
        if (user?.id && row.created_by === user.id) allow = true;
        if (!allow) {
          try {
            const key = 'my_order_ids';
            const saved = JSON.parse(localStorage.getItem(key) || '[]');
            const ids = Array.isArray(saved) ? saved : [];
            let clientToken = '';
            try { clientToken = localStorage.getItem('delliapp_client_token') || ''; } catch {}
            if (ids.includes(row.id) || (!!clientToken && row.client_token === clientToken)) allow = true;
          } catch {}
        }
        if (!allow) return;
        // Buscar itens e produtos para compor resumo
        const { data: itemsData } = await supabase
          .from('order_items')
          .select('order_id, quantity, price, notes, product_id')
          .eq('order_id', row.id);
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
        const addrObj = (row.address || null) as any;
        const addr = addrObj ? [addrObj.street, addrObj.number].filter(Boolean).join(', ') + (addrObj.neighborhood ? ` - ${addrObj.neighborhood}` : '') : '';
        const statusKey = (KITCHEN_TO_CLIENT_STATUS[(row.status || '').toLowerCase()] || 'aguardando');
        const placedAt = row.created_at ? new Date(row.created_at).toLocaleString('pt-BR', { hour12: false }) : '';
        const thumbnail = its[0]?.image || 'https://images.unsplash.com/photo-1612874742237-6526221588e3';
        const uiRow = {
          rawId: row.id,
          id: `PED-${row.id}`,
          placedAt,
          status: statusKey,
          eta: null as string | null,
          summary,
          address: addr,
          thumbnail,
        };
        setOrders((prev) => {
          const exists = prev.some((o) => o.rawId === row.id);
          if (exists) return prev;
          return [uiRow, ...prev];
        });
      })
      .subscribe();

    return () => {
      try { supabase.removeChannel(channel); } catch {}
    };
  }, [user?.id]);

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
          {orders.map((order) => {
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
                        onClick={() => navigate(`/orders-tracking/${order.rawId}`)}
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

          {orders.length === 0 && (
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
