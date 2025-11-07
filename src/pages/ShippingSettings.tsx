import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useMultiTenant } from '@/context/MultiTenantContext';
import { useSupabaseWithMultiTenant } from '@/hooks/useSupabaseWithMultiTenant';
import { toast } from '@/hooks/use-toast';
import { useTenantRoleGuard } from '@/hooks/useTenantRoleGuard';

type ShippingMode = 'standard' | 'smart';

type ShippingSettingsForm = {
  enabled: boolean;
  mode: ShippingMode;
  // Standard
  fixed_fee: number;
  // Smart
  store_address: string;
  store_zipcode: string;
  price_per_km: number;
  min_fee: number;
  min_order_value: number;
};

const DEFAULT_FORM: ShippingSettingsForm = {
  enabled: false,
  mode: 'standard',
  fixed_fee: 0,
  store_address: '',
  store_zipcode: '',
  price_per_km: 0,
  min_fee: 0,
  min_order_value: 0,
};

const ShippingSettings: React.FC = () => {
  //__TENANT_ROLE_INSERT_POINT__
  //ROLE_GUARD_HERE
  const allowed = useTenantRoleGuard(['dono']);
  if (!allowed) return null;
  const { currentTeam } = useMultiTenant();
  const { supabase, addTeamFilter } = useSupabaseWithMultiTenant();

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [form, setForm] = useState<ShippingSettingsForm>({ ...DEFAULT_FORM });

  // Estado de texto para inputs de moeda (permite apagar e digitar com vírgula)
  const [moneyText, setMoneyText] = useState<{ fixed_fee: string; price_per_km: string; min_fee: string; min_order_value: string }>({
    fixed_fee: '',
    price_per_km: '',
    min_fee: '',
    min_order_value: '',
  });

  const formatWithComma = (n: number): string => {
    try {
      return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } catch {
      return String(n);
    }
  };

  const sanitizeCurrencyText = (raw: string): string => {
    const s = (raw || '').replace(/[^0-9,]/g, '');
    const hadTrailingComma = s.endsWith(',');
    const parts = s.split(',');

    // Normaliza para apenas uma vírgula
    const intRaw = parts[0] ?? '';
    const fracRaw = (parts.length > 1) ? parts.slice(1).join('') : '';

    let intPart = intRaw;
    let fracPart = fracRaw;

    if (intPart.length > 1) {
      intPart = intPart.replace(/^0+/, '');
      if (intPart === '') intPart = '0';
    }

    // Se usuário só digitou a vírgula (trailing), preservar visualmente
    if (hadTrailingComma) {
      if (!intPart) intPart = '0';
      return `${intPart},`;
    }

    // Limitar a 2 casas quando houver fração
    fracPart = fracPart.slice(0, 2);
    if (fracPart.length > 0 && intPart === '') intPart = '0';
    return fracPart ? `${intPart},${fracPart}` : intPart;
  };

  const handleCurrencyTextChange = (
    field: 'fixed_fee' | 'price_per_km' | 'min_fee' | 'min_order_value'
  ) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const sanitized = sanitizeCurrencyText(raw);
    setMoneyText((prev) => ({ ...prev, [field]: sanitized }));
    const num = parseFloat((sanitized || '').replace(/\./g, '').replace(',', '.'));
    setForm((prev) => ({ ...prev, [field]: isNaN(num) ? 0 : num }));
  };

  const canSave = useMemo(() => {
    if (!form.enabled) return true;
    if (form.mode === 'standard') {
      return form.fixed_fee >= 0;
    }
    // smart
    return (
      (form.store_zipcode || '').replace(/\D/g, '').length === 8 &&
      (form.store_address || '').trim().length > 0 &&
      form.price_per_km >= 0 &&
      form.min_fee >= 0 &&
      form.min_order_value >= 0
    );
  }, [form]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (!currentTeam?.id) {
          setLoading(false);
          return;
        }
        // Buscar a configuração da loja (store_settings não possui coluna team_id)
        const { data, error } = await supabase
          .from('store_settings')
          .select('id, allow_delivery, address, zipcode, delivery_fee_per_km, delivery_radius')
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        const next: ShippingSettingsForm = {
          enabled: Boolean((data as any)?.allow_delivery ?? false),
          // Sem coluna dedicada para o modo; manter padrão até haver suporte
          mode: 'standard',
          // Preencher o frete padrão com o valor armazenado em delivery_fee_per_km
          fixed_fee: Number((data as any)?.delivery_fee_per_km ?? 0),
          store_address: String((data as any)?.address ?? ''),
          store_zipcode: String((data as any)?.zipcode ?? ''),
          price_per_km: Number((data as any)?.delivery_fee_per_km ?? 0),
          min_fee: 0,
          min_order_value: 0,
        };
        setForm(next);
        // Inicializar textos dos campos monetários com valores carregados
        setMoneyText({
          fixed_fee: next.fixed_fee ? formatWithComma(next.fixed_fee) : '',
          price_per_km: next.price_per_km ? formatWithComma(next.price_per_km) : '',
          min_fee: next.min_fee ? formatWithComma(next.min_fee) : '',
          min_order_value: next.min_order_value ? formatWithComma(next.min_order_value) : '',
        });
      } catch (e: any) {
        toast({ title: 'Erro ao carregar configurações', description: e?.message ?? String(e), variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentTeam?.id]);

  const handleCepLookup = async () => {
    const cep = (form.store_zipcode || '').replace(/\D/g, '');
    if (cep.length !== 8) {
      toast({ title: 'CEP inválido', description: 'Informe 8 dígitos para o CEP.' });
      return;
    }
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data?.erro) throw new Error('CEP não encontrado');
      const address = [data.logradouro, data.bairro, data.localidade, data.uf].filter(Boolean).join(', ');
      setForm((prev) => ({ ...prev, store_address: address }));
    } catch (e: any) {
      toast({ title: 'Falha na busca de CEP', description: e?.message ?? String(e), variant: 'destructive' });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTeam?.id) return;
    if (!canSave) {
      toast({ title: 'Preencha os campos obrigatórios', description: 'Verifique os dados do modo selecionado.' });
      return;
    }
    setSaving(true);
    try {
      // Verificar se já existe registro em store_settings para o time
      // Evitar inferência profunda do TypeScript: buscar lista e pegar o primeiro
      const { data: rows, error: getErr } = await supabase
        .from('store_settings')
        .select('id');
      if (getErr) throw getErr;
      const existing = rows && rows.length > 0 ? rows[0] : null;

      // Persistir o valor efetivo conforme o modo selecionado
      // Nota técnica: usando delivery_fee_per_km para armazenar
      // tanto o valor fixo (padrão) quanto o preço por KM (inteligente),
      // até existir colunas dedicadas.
      const effectiveFee = form.mode === 'standard' ? form.fixed_fee : form.price_per_km;
      const payload = {
        allow_delivery: form.enabled,
        address: form.store_address,
        zipcode: form.store_zipcode,
        delivery_fee_per_km: effectiveFee,
      } as any;

      let saveErr;
      if (existing) {
        // Atualizar apenas o registro do próprio team
        const { error } = await supabase
          .from('store_settings')
          .update(payload)
          .eq('id', existing.id);
        saveErr = error || null;
      } else {
        const { error } = await supabase
          .from('store_settings')
          .insert([payload]);
        saveErr = error || null;
      }
      if (saveErr) throw saveErr;
      toast({ title: 'Configurações salvas', description: 'As configurações de frete foram atualizadas.' });
    } catch (e: any) {
      toast({ title: 'Erro ao salvar configurações', description: e?.message ?? String(e), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto max-w-2xl p-4">
      <Card>
        <CardHeader>
          <CardTitle>Configurações</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-6">Carregando...</div>
          ) : (
            <form onSubmit={handleSave} className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Habilitar Frete</Label>
                  <p className="text-sm text-muted-foreground">Ative para cobrar taxa de entrega.</p>
                </div>
                <Switch checked={form.enabled} onCheckedChange={(v) => setForm((prev) => ({ ...prev, enabled: v }))} />
              </div>

              {form.enabled && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Opções de frete</Label>
                    <RadioGroup value={form.mode} onValueChange={(v) => setForm((prev) => ({ ...prev, mode: v as ShippingMode }))} className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem id="mode-standard" value="standard" />
                        <Label htmlFor="mode-standard">Frete Padrão</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem id="mode-smart" value="smart" />
                        <Label htmlFor="mode-smart">Frete Inteligente</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {form.mode === 'standard' ? (
                    <div className="space-y-2">
                      <Label>Valor fixo do frete</Label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={moneyText.fixed_fee}
                        onChange={handleCurrencyTextChange('fixed_fee')}
                        placeholder="Ex: 7,90"
                      />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Endereço do Estabelecimento</Label>
                        <Input
                          type="text"
                          value={form.store_address}
                          onChange={(e) => setForm((prev) => ({ ...prev, store_address: e.target.value }))}
                          placeholder="Rua, número, bairro, cidade, UF"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                        <div className="space-y-2 sm:col-span-2">
                          <Label>CEP</Label>
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={form.store_zipcode}
                            onChange={(e) => setForm((prev) => ({ ...prev, store_zipcode: e.target.value.replace(/\D/g, '') }))}
                            placeholder="00000000"
                          />
                        </div>
                        <Button type="button" variant="secondary" onClick={handleCepLookup}>Buscar CEP</Button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Preço por KM</Label>
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={moneyText.price_per_km}
                            onChange={handleCurrencyTextChange('price_per_km')}
                            placeholder="Ex: 5,00"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Preço mínimo de frete</Label>
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={moneyText.min_fee}
                            onChange={handleCurrencyTextChange('min_fee')}
                            placeholder="Ex: 4,00"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Valor mínimo de pedido</Label>
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={moneyText.min_order_value}
                            onChange={handleCurrencyTextChange('min_order_value')}
                            placeholder="Ex: 20,00"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <Button type="submit" disabled={saving || !canSave}>
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

export default ShippingSettings;