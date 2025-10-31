import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { ComboFormData } from '@/components/combo/ComboForm';
import { comboHighlights } from '@/data/combos';

export type ComboEntity = ComboFormData & { id: string };

type ComboMockContextValue = {
  combos: ComboEntity[];
  createCombo: (data: ComboFormData) => ComboEntity;
  updateCombo: (id: string, data: ComboFormData) => ComboEntity | null;
  deleteCombo: (id: string) => void;
  getComboById: (id: string) => ComboEntity | undefined;
};

const ComboMockContext = createContext<ComboMockContextValue | null>(null);

const toFormData = (combo: typeof comboHighlights[number]): ComboEntity => ({
  id: combo.slug,
  title: combo.title,
  description: combo.description,
  priceLabel: combo.priceLabel,
  serves: combo.serves,
  category: 'Destaques',
  comboType: 'custom',
  productIds: [],
  images: [combo.image],
  items: combo.items.map((item) => `${item.quantity} · ${item.name}${item.note ? ` (${item.note})` : ''}`),
  perks: combo.perks,
  savings: combo.savings,
});

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `combo-${Math.random().toString(36).slice(2, 10)}`;
};

export const ComboMockProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [combos, setCombos] = useState<ComboEntity[]>(() => comboHighlights.map(toFormData));

  const createCombo = useCallback((data: ComboFormData) => {
    const newCombo: ComboEntity = { ...data, id: generateId() };
    setCombos((prev) => [newCombo, ...prev]);
    return newCombo;
  }, []);

  const updateCombo = useCallback((id: string, data: ComboFormData) => {
    let updated: ComboEntity | null = null;
    setCombos((prev) =>
      prev.map((combo) => {
        if (combo.id === id) {
          updated = { ...data, id };
          return updated;
        }
        return combo;
      })
    );
    return updated;
  }, []);

  const deleteCombo = useCallback((id: string) => {
    setCombos((prev) => prev.filter((combo) => combo.id !== id));
  }, []);

  const getComboById = useCallback(
    (id: string) => combos.find((combo) => combo.id === id),
    [combos]
  );

  const value = useMemo(
    () => ({ combos, createCombo, updateCombo, deleteCombo, getComboById }),
    [combos, createCombo, updateCombo, deleteCombo, getComboById]
  );

  return <ComboMockContext.Provider value={value}>{children}</ComboMockContext.Provider>;
};

export const useComboMock = () => {
  const context = useContext(ComboMockContext);
  if (!context) {
    throw new Error('useComboMock deve ser utilizado dentro de ComboMockProvider');
  }
  return context;
};
