import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useMultiTenant } from '@/context/MultiTenantContext';
import { useSupabaseWithMultiTenant } from '@/hooks/useSupabaseWithMultiTenant';
import { toast } from '@/hooks/use-toast';
import { useTenantRoleGuard } from '@/hooks/useTenantRoleGuard';

type ShippingSettings = {
  allow_delivery: boolean;
  delivery_fee_per_km: number;
  delivery_radius: number;
};

const Settings: React.FC = () => {
  //__TENANT_ROLE_INSERT_POINT__
  //ROLE_GUARD_HERE
  const allowed = useTenantRoleGuard(['dono']);
  if (!allowed) return null;
  const { isAdminMode, currentTeam } = useMultiTenant();
  const { updateTeam } = useSupabaseWithMultiTenant();

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [form, setForm] = useState<ShippingSettings>({
    allow_delivery: false,
    delivery_fee_per_km: 0,
    delivery_radius: 0,
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (!isAdminMode) {
          setLoading(false);
          return;
        }
        if (!currentTeam?.id) {
          setLoading(false);
          return;
        }
        // Usa updateTeam com payload vazio para obter o registro atual (com RLS admin garantido)
        const team = await updateTeam(currentTeam.id, {});
        const settings = (team?.settings || {}) as any;
        const shipping = (settings?.shipping || settings || {}) as any;
        setForm({
          allow_delivery: !!shipping.allow_delivery,
          delivery_fee_per_km: Number(shipping.delivery_fee_per_km ?? 0),
          delivery_radius: Number(shipping.delivery_radius ?? 0),
        });
      } catch (e: any) {
        toast({ title: 'Erro ao carregar configurações', description: e?.message ?? String(e), variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAdminMode, currentTeam?.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdminMode || !currentTeam?.id) return;
    setSaving(true);
    try {
      // Buscar o settings atual para merge
      const team = await updateTeam(currentTeam.id, {});
      const currentSettings = (team?.settings || {}) as any;
      const newSettings = {
        ...currentSettings,
        shipping: {
          ...(currentSettings?.shipping || {}),
          allow_delivery: !!form.allow_delivery,
          delivery_fee_per_km: Number(form.delivery_fee_per_km || 0),
          delivery_radius: Number(form.delivery_radius || 0),
        },
      };
      await updateTeam(currentTeam.id, { settings: newSettings });
      toast({ title: 'Configurações salvas', description: 'Preferências de entrega atualizadas com sucesso.' });
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err?.message ?? String(err), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (!isAdminMode) {
    return (
      <div className="container mx-auto px-4 py-8 pt-20">
        <Card>
          <CardContent className="py-12">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Acesso Negado</h3>
            <p className="text-gray-500">Esta página é exclusiva para administradores gerais.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pt-20">
      <Card>
        <CardHeader>
          <CardTitle>Configurações da Loja</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-gray-500">Carregando configurações...</div>
          ) : (
            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-2">
                <Label>Permitir entrega</Label>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={form.allow_delivery}
                    onCheckedChange={(v) => setForm((prev) => ({ ...prev, allow_delivery: !!v }))}
                  />
                  <span className="text-sm text-gray-600">Habilita pedidos com entrega</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Taxa por km (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.delivery_fee_per_km}
                    onChange={(e) => setForm((prev) => ({ ...prev, delivery_fee_per_km: Number(e.target.value || 0) }))}
                    placeholder="Ex: 2.50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Raio máximo de entrega (km)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={form.delivery_radius}
                    onChange={(e) => setForm((prev) => ({ ...prev, delivery_radius: Number(e.target.value || 0) }))}
                    placeholder="Ex: 10"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Salvando...' : 'Salvar Configurações'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;