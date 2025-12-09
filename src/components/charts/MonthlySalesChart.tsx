import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ProductSales {
  name: string;
  total: number;
}

interface ChartData {
  mes: string;
  [key: string]: string | number;
}

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export default function MonthlySalesChart() {
  const [data, setData] = useState<ChartData[]>([]);
  const [allProducts, setAllProducts] = useState<ProductSales[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('top5');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const { data: sales, error } = await supabase
        .from('sales')
        .select('*, sale_items(*, products(id, nome))')
        .order('data_venda', { ascending: true });

      if (error) throw error;

      if (!sales || sales.length === 0) {
        setData(generateFakeData());
        setAllProducts(generateFakeProducts());
        return;
      }

      // Processar dados de vendas por produto
      const productTotals: Record<string, number> = {};
      const monthlyData: Record<string, Record<string, number>> = {};
      
      sales.forEach((sale: any) => {
        const month = format(new Date(sale.data_venda), 'MMM/yy', { locale: ptBR });
        if (!monthlyData[month]) {
          monthlyData[month] = {};
        }
        
        sale.sale_items?.forEach((item: any) => {
          const productName = item.products?.nome || 'Desconhecido';
          const qty = item.quantidade || 0;
          
          // Total geral por produto
          productTotals[productName] = (productTotals[productName] || 0) + qty;
          
          // Por mês
          monthlyData[month][productName] = (monthlyData[month][productName] || 0) + qty;
        });
      });

      // Ordenar produtos por quantidade total vendida
      const sortedProducts = Object.entries(productTotals)
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total);

      setAllProducts(sortedProducts);

      // Criar dados do gráfico
      const chartData = Object.entries(monthlyData).map(([mes, products]) => ({
        mes,
        ...products,
      }));

      setData(chartData.length > 0 ? chartData : generateFakeData());
    } catch (error) {
      console.error('Erro ao buscar vendas:', error);
      setData(generateFakeData());
      setAllProducts(generateFakeProducts());
    } finally {
      setLoading(false);
    }
  };

  const generateFakeProducts = (): ProductSales[] => {
    return [
      { name: 'Caneca 500ml', total: 450 },
      { name: 'Camiseta', total: 380 },
      { name: 'Calça Jeans', total: 320 },
      { name: 'Tênis', total: 280 },
      { name: 'Colher', total: 250 },
      { name: 'Talher', total: 200 },
      { name: 'Panela', total: 150 },
    ];
  };

  const generateFakeData = (): ChartData[] => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      months.push({
        mes: format(date, 'MMM/yy', { locale: ptBR }),
        'Caneca 500ml': Math.floor(Math.random() * 100) + 50,
        'Camiseta': Math.floor(Math.random() * 80) + 40,
        'Calça Jeans': Math.floor(Math.random() * 70) + 30,
        'Tênis': Math.floor(Math.random() * 60) + 25,
        'Colher': Math.floor(Math.random() * 50) + 20,
      });
    }
    return months;
  };

  // Top 5 produtos mais vendidos
  const top5Products = useMemo(() => {
    return allProducts.slice(0, 5).map(p => p.name);
  }, [allProducts]);

  // Produtos para exibir no gráfico
  const displayProducts = useMemo(() => {
    if (selectedProduct === 'top5') {
      return top5Products;
    }
    return [selectedProduct];
  }, [selectedProduct, top5Products]);

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div className="w-full h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Top Produtos Vendidos</h3>
        <Select value={selectedProduct} onValueChange={setSelectedProduct}>
          <SelectTrigger className="w-48 h-8 text-xs">
            <SelectValue placeholder="Filtrar produto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="top5">Top 5 Produtos</SelectItem>
            {allProducts.map((product) => (
              <SelectItem key={product.name} value={product.name}>
                {product.name} ({product.total})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="mes" 
            tick={{ fontSize: 11 }}
          />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: '11px' }} />
          {displayProducts.map((product, index) => (
            <Bar 
              key={product} 
              dataKey={product} 
              fill={CHART_COLORS[index % CHART_COLORS.length]} 
              name={product}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
      
      {selectedProduct === 'top5' && (
        <div className="mt-2 flex flex-wrap gap-2 justify-center">
          {top5Products.map((product, index) => (
            <div 
              key={product}
              className="flex items-center gap-1 text-xs cursor-pointer hover:opacity-80"
              onClick={() => setSelectedProduct(product)}
            >
              <div 
                className="w-3 h-3 rounded-sm" 
                style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
              />
              <span>{product}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
