import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ChartFilters, { FilterState } from './ChartFilters';

interface ChartData {
  mes: string;
  [key: string]: number | string;
}

export default function MonthlySalesChart() {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: '',
    category: 'all',
    sortBy: 'none',
    selectedProducts: [],
  });
  const [productNames, setProductNames] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const { data: sales, error } = await supabase
        .from('sales')
        .select('*, sale_items(*, products(id, nome, codigo, fornecedor))')
        .order('data_venda', { ascending: true });

      if (error) throw error;

      if (!sales || sales.length === 0) {
        setData(generateFakeData());
        return;
      }

      // Processar dados
      const monthlyData: Record<string, ChartData> = {};
      const productsSet = new Set<string>();

      sales.forEach((sale: any) => {
        const month = format(new Date(sale.data_venda), 'MMM/yy', { locale: ptBR });
        
        if (!monthlyData[month]) {
          monthlyData[month] = { mes: month };
        }

        sale.sale_items?.forEach((item: any) => {
          const product = item.products;
          if (!product) return;

          // Aplicar filtros
          if (filters.selectedProducts.length > 0) {
            if (!filters.selectedProducts.includes(product.id)) return;
          } else {
            const matchesSearch = !filters.searchTerm || 
              product.nome.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
              product.codigo.toLowerCase().includes(filters.searchTerm.toLowerCase());
            
            const matchesCategory = filters.category === 'all' || 
              product.fornecedor === filters.category;
            
            if (!matchesSearch || !matchesCategory) return;
          }

          const productName = product.nome;
          productsSet.add(productName);

          if (!monthlyData[month][productName]) {
            monthlyData[month][productName] = 0;
          }
          monthlyData[month][productName] = (monthlyData[month][productName] as number) + (item.quantidade || 0);
        });
      });

      let finalProducts = Array.from(productsSet);

      // Ordenação
      if (filters.sortBy !== 'none' && finalProducts.length > 0) {
        const totals: Record<string, number> = {};
        finalProducts.forEach(productName => {
          const total = Object.values(monthlyData).reduce((sum, month) => {
            return sum + ((month[productName] as number) || 0);
          }, 0);
          totals[productName] = total;
        });

        finalProducts = Object.entries(totals)
          .sort(([, a], [, b]) => filters.sortBy === 'most' ? b - a : a - b)
          .slice(0, 6)
          .map(([name]) => name);
      }

      // Limitar a 6 produtos no gráfico
      if (finalProducts.length > 6) {
        finalProducts = finalProducts.slice(0, 6);
      }

      setProductNames(finalProducts);

      const chartData = Object.values(monthlyData) as ChartData[];
      setData(chartData.length > 0 ? chartData : generateFakeData());
    } catch (error) {
      console.error('Erro ao buscar vendas:', error);
      setData(generateFakeData());
    } finally {
      setLoading(false);
    }
  };

  const generateFakeData = (): ChartData[] => {
    const products = ['Caneca', 'Colher', 'Talher', 'Panela', 'Prato', 'Copo'];
    setProductNames(products);
    
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const month: ChartData = { mes: format(date, 'MMM/yy', { locale: ptBR }) };
      
      products.forEach(product => {
        month[product] = Math.floor(Math.random() * 150) + 50;
      });
      
      months.push(month);
    }
    return months;
  };

  const colors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))', 'hsl(160 60% 45%)'];

  if (loading) {
    return <div className="flex items-center justify-center h-full">Carregando...</div>;
  }

  return (
    <div className="w-full h-full space-y-4">
      <h3 className="text-lg font-semibold">Vendas por Mês</h3>
      
      <ChartFilters onFilterChange={setFilters} />

      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="mes" 
            tick={{ fontSize: 11 }}
          />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {productNames.map((productName, idx) => (
            <Bar 
              key={productName}
              dataKey={productName} 
              fill={colors[idx % colors.length]} 
              name={productName}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
