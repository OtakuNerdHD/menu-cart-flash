export type ComboHighlight = {
  slug: string;
  title: string;
  description: string;
  priceLabel: string;
  image: string;
  serves: string;
  items: { name: string; quantity: string; note?: string }[];
  perks: string[];
  savings?: string;
};

export const comboHighlights: ComboHighlight[] = [
  {
    slug: "combo-familia-suprema",
    title: "Combo Família Suprema",
    description: "2 hambúrgueres artesanais, batatas rústicas e jarra de suco natural.",
    priceLabel: "R$ 89,90",
    image: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=1200&q=80",
    serves: "Serve 4 pessoas",
    savings: "Economize 18% comparado aos itens avulsos",
    items: [
      { name: "Smash burger duplo", quantity: "2" },
      { name: "Batata rústica temperada", quantity: "1 porção grande" },
      { name: "Jarra de suco natural", quantity: "1L", note: "Sabor a escolher" },
      { name: "Brownie artesanal", quantity: "2" },
    ],
    perks: [
      "Inclui talheres e guardanapos",
      "Disponível para delivery e retirada",
      "Opção de troca da sobremesa por fruta fresca",
    ],
  },
  {
    slug: "combo-festival-oriental",
    title: "Combo Festival Oriental",
    description: "24 peças de sushi premium e 2 temakis especiais.",
    priceLabel: "R$ 74,90",
    image: "https://images.unsplash.com/photo-1543353071-10c8ba85a904?auto=format&fit=crop&w=1200&q=80",
    serves: "Serve 2 a 3 pessoas",
    items: [
      { name: "Sashimi fresquíssimo", quantity: "6 cortes" },
      { name: "Nigiris variados", quantity: "8 unidades" },
      { name: "Uramaki especial", quantity: "8 unidades" },
      { name: "Temaki salmão com cebolinha", quantity: "2 unidades" },
    ],
    perks: [
      "Shoyu premium e hashis inclusos",
      "Possibilidade de incluir hot roll com desconto",
      "Ideal para noite especial ou presente",
    ],
  },
  {
    slug: "combo-veg-gourmet",
    title: "Combo Veg Gourmet",
    description: "Lasanha de berinjela com salada mediterrânea e suco de frutas vermelhas.",
    priceLabel: "R$ 59,90",
    image: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=1200&q=80",
    serves: "Serve 2 pessoas",
    items: [
      { name: "Lasanha de berinjela com ricota", quantity: "1 travessa" },
      { name: "Salada mediterrânea", quantity: "2 porções" },
      { name: "Suco de frutas vermelhas", quantity: "500ml" },
      { name: "Cheesecake vegano", quantity: "1 fatia" },
    ],
    perks: [
      "Sem ingredientes de origem animal",
      "Opção sem glúten disponível",
      "Entrega em embalagem térmica reutilizável",
    ],
  },
  {
    slug: "combo-classicos-do-chef",
    title: "Combo Clássicos do Chef",
    description: "Filé mignon com risoto de parmesão, sobremesa e vinho da casa.",
    priceLabel: "R$ 129,90",
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80",
    serves: "Serve 2 pessoas",
    savings: "Economize 12% na experiência completa",
    items: [
      { name: "Filé mignon ao molho de vinho", quantity: "2 medalhões" },
      { name: "Risoto de parmesão", quantity: "2 porções" },
      { name: "Taça de vinho tinto selecionado", quantity: "2" },
      { name: "Sobremesa do chef", quantity: "2" },
    ],
    perks: [
      "Inclui vela decorativa para ocasiões especiais",
      "Vinho pode ser trocado por suco sem custo",
      "Sugestão de harmonização acompanhando o pedido",
    ],
  },
];
