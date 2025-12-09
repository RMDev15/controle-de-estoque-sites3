import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ChartData {
  data: string;
  entrada: number;
  saida: number;
}

interface ProductOption {
  id: string;
  nome: string;
  totalMovimentos: number;
}

export default function StockMovementChart() {
  const [data, setData] = useState<ChartData[]>([]);
  const [allProducts, setAllProducts] = useState<ProductOption[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('todos');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [selectedProduct]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Buscar movimentações com produtos
      const { data: movements, error } = await supabase
        .from('stock_movements')
        .select('*, products(id, nome)')
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!movements || movements.length === 0) {
        setData(generateFakeData());
        setAllProducts(generateFakeProducts());
        return;
      }

      // Processar produtos únicos com total de movimentos
      const productStats: Record<string, { nome: string; total: number }> = {};
      movements.forEach((mov: any) => {
        const productId = mov.product_id;
        const productName = mov.products?.nome || 'Desconhecido';
        if (!productStats[productId]) {
          productStats[productId] = { nome: productName, total: 0 };
        }
        productStats[productId].total += mov.quantidade;
      });

      const productsWithMovements = Object.entries(productStats)
        .map(([id, stats]) => ({ id, nome: stats.nome, totalMovimentos: stats.total }))
        .sort((a, b) => b.totalMovimentos - a.totalMovimentos);

      setAllProducts(productsWithMovements);

      // Filtrar por produto selecionado
      let filteredMovements = movements;
      if (selectedProduct !== 'todos') {
        filteredMovements = movements.filter((mov: any) => mov.product_id === selectedProduct);
      }

      // Agrupar por data
      const groupedData = filteredMovements.reduce((acc: any, mov: any) => {
        const date = format(new Date(mov.created_at), 'dd/MM');
        if (!acc[date]) {
          acc[date] = { data: date, entrada: 0, saida: 0 };
        }
        if (mov.tipo === 'entrada') {
          acc[date].entrada += mov.quantidade;
        } else {
          acc[date].saida += mov.quantidade;
        }
        return acc;
      }, {});

      setData(Object.values(groupedData));
    } catch (error) {
      console.error('Erro ao buscar movimentações:', error);
      setData(generateFakeData());
      setAllProducts(generateFakeProducts());
    } finally {
      setLoading(false);
    }
  };

  const generateFakeProducts = (): ProductOption[] => {
    return [
      { id: '1', nome: 'Caneca 500ml', totalMovimentos: 450 },
      { id: '2', nome: 'Camiseta', totalMovimentos: 380 },
      { id: '3', nome: 'Calça Jeans', totalMovimentos: 320 },
      { id: '4', nome: 'Tênis', totalMovimentos: 280 },
      { id: '5', nome: 'Colher', totalMovimentos: 250 },
    ];
  };

  const generateFakeData = (): ChartData[] => {
    const fakeData: ChartData[] = [];
    for (let i = 14; i >= 0; i--) {
      const date = subDays(new Date(), i);
      fakeData.push({
        data: format(date, 'dd/MM'),
        entrada: Math.floor(Math.random() * 100) + 20,
        saida: Math.floor(Math.random() * 80) + 10,
      });
    }
    return fakeData;
  };

  const selectedProductName = useMemo(() => {
    if (selectedProduct === 'todos') return null;
    return allProducts.find(p => p.id === selectedProduct)?.nome || null;
  }, [selectedProduct, allProducts]);

  const totalEntrada = useMemo(() => data.reduce((sum, d) => sum + d.entrada, 0), [data]);
  const totalSaida = useMemo(() => data.reduce((sum, d) => sum + d.saida, 0), [data]);

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div className="w-full h-full">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">Histórico de Entrada e Saída</h3>
        <Select value={selectedProduct} onValueChange={setSelectedProduct}>
          <SelectTrigger className="w-48 h-8 text-xs">
            <SelectValue placeholder="Filtrar produto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Produtos</SelectItem>
            {allProducts.map((product) => (
              <SelectItem key={product.id} value={product.id}>
                {product.nome} ({product.totalMovimentos})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {selectedProductName && (
        <p className="text-xs text-muted-foreground mb-2">
          Exibindo movimentações de: <span className="font-medium">{selectedProductName}</span>
        </p>
      )}
      
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="data" 
            tick={{ fontSize: 11 }}
            angle={-45}
            textAnchor="end"
            height={50}
          />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: '11px' }} />
          <Line 
            type="monotone" 
            dataKey="entrada" 
            stroke="hsl(var(--chart-1))" 
            strokeWidth={2}
            name="Entrada"
            dot={{ r: 3 }}
          />
          <Line 
            type="monotone" 
            dataKey="saida" 
            stroke="hsl(var(--chart-2))" 
            strokeWidth={2}
            name="Saída"
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
      
      <div className="mt-2 flex justify-center gap-6 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(var(--chart-1))' }} />
          <span>Entrada: <strong>{totalEntrada}</strong> unidades</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(var(--chart-2))' }} />
          <span>Saída: <strong>{totalSaida}</strong> unidades</span>
        </div>
      </div>
    </div>
  );
}
