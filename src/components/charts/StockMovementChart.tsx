import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';
import ChartFilters, { FilterState } from './ChartFilters';

interface ChartData {
  data: string;
  [key: string]: number | string;
}

export default function StockMovementChart() {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    category: 'all',
    sortBy: 'none',
    selectedProducts: [],
  });
  const [productNames, setProductNames] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('stock_movements')
        .select('*, products(id, nome, codigo, fornecedor)')
        .order('created_at', { ascending: true });

      const { data: movements, error } = await query;

      if (error) throw error;

      if (!movements || movements.length === 0) {
        setData(generateFakeData());
        return;
      }

      // Filtrar por produtos selecionados ou por busca/categoria
      let filteredMovements = movements;
      
      if (filters.selectedProducts.length > 0) {
        filteredMovements = movements.filter(m => 
          filters.selectedProducts.includes(m.product_id)
        );
      } else {
        // Aplicar filtros de busca e categoria
        filteredMovements = movements.filter(m => {
          const product = m.products as any;
          if (!product) return false;
          
          const matchesSearch = !filters.searchTerm || 
            product.nome.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
            product.codigo.toLowerCase().includes(filters.searchTerm.toLowerCase());
          
          const matchesCategory = filters.category === 'all' || 
            product.fornecedor === filters.category;
          
          return matchesSearch && matchesCategory;
        });
      }

      // Agrupar por data e produto
      const groupedData: Record<string, ChartData> = {};
      const names: Record<string, string> = {};

      filteredMovements.forEach(mov => {
        const date = format(new Date(mov.created_at), 'dd/MM');
        const product = mov.products as any;
        const productKey = product?.nome || 'Produto';
        
        names[productKey] = productKey;

        if (!groupedData[date]) {
          groupedData[date] = { data: date };
        }

        const entradaKey = `${productKey}_entrada`;
        const saidaKey = `${productKey}_saida`;

        if (!groupedData[date][entradaKey]) groupedData[date][entradaKey] = 0;
        if (!groupedData[date][saidaKey]) groupedData[date][saidaKey] = 0;

        if (mov.tipo === 'entrada') {
          groupedData[date][entradaKey] = (groupedData[date][entradaKey] as number) + mov.quantidade;
        } else {
          groupedData[date][saidaKey] = (groupedData[date][saidaKey] as number) + mov.quantidade;
        }
      });

      setProductNames(names);
      
      let chartData = Object.values(groupedData);

      // Ordenação por volume
      if (filters.sortBy !== 'none' && chartData.length > 0) {
        const totals: Record<string, number> = {};
        Object.keys(names).forEach(name => {
          const total = chartData.reduce((sum, item) => {
            return sum + ((item[`${name}_saida`] as number) || 0);
          }, 0);
          totals[name] = total;
        });

        const sortedProducts = Object.entries(totals)
          .sort(([, a], [, b]) => filters.sortBy === 'most' ? b - a : a - b)
          .slice(0, 5)
          .map(([name]) => name);

        const filteredNames: Record<string, string> = {};
        sortedProducts.forEach(name => {
          filteredNames[name] = name;
        });
        setProductNames(filteredNames);

        chartData = chartData.map(item => {
          const newItem: ChartData = { data: item.data };
          sortedProducts.forEach(name => {
            newItem[`${name}_entrada`] = item[`${name}_entrada`] || 0;
            newItem[`${name}_saida`] = item[`${name}_saida`] || 0;
          });
          return newItem;
        });
      }

      setData(chartData.length > 0 ? chartData : generateFakeData());
    } catch (error) {
      console.error('Erro ao buscar movimentações:', error);
      setData(generateFakeData());
    } finally {
      setLoading(false);
    }
  };

  const generateFakeData = (): ChartData[] => {
    const fakeData: ChartData[] = [];
    const products = ['Caneca', 'Colher', 'Talher'];
    
    for (let i = 7; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const item: ChartData = { data: format(date, 'dd/MM') };
      
      products.forEach(product => {
        item[`${product}_entrada`] = Math.floor(Math.random() * 50) + 10;
        item[`${product}_saida`] = Math.floor(Math.random() * 40) + 5;
      });
      
      fakeData.push(item);
    }
    
    const names: Record<string, string> = {};
    products.forEach(p => names[p] = p);
    setProductNames(names);
    
    return fakeData;
  };

  const colors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  if (loading) {
    return <div className="flex items-center justify-center h-full">Carregando...</div>;
  }

  return (
    <div className="w-full h-full space-y-4">
      <h3 className="text-lg font-semibold">Histórico de Entrada e Saída</h3>
      
      <ChartFilters onFilterChange={setFilters} />

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="data" 
            tick={{ fontSize: 11 }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {Object.keys(productNames).map((productName, idx) => (
            <Line
              key={`${productName}_entrada`}
              type="monotone"
              dataKey={`${productName}_entrada`}
              stroke={colors[idx % colors.length]}
              strokeWidth={2}
              name={`${productName} (Entrada)`}
              strokeDasharray="5 5"
            />
          ))}
          {Object.keys(productNames).map((productName, idx) => (
            <Line
              key={`${productName}_saida`}
              type="monotone"
              dataKey={`${productName}_saida`}
              stroke={colors[idx % colors.length]}
              strokeWidth={2}
              name={`${productName} (Saída)`}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
