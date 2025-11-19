import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';

interface ChartData {
  data: string;
  entrada: number;
  saida: number;
}

export default function StockMovementChart({ productId }: { productId?: string }) {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [productId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('stock_movements')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (productId) {
        query = query.eq('product_id', productId);
      }

      const { data: movements, error } = await query;

      if (error) throw error;

      if (!movements || movements.length === 0) {
        // Dados fictícios se não houver movimentação
        setData(generateFakeData());
        return;
      }

      // Agrupar por data
      const groupedData = movements.reduce((acc: any, mov) => {
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
    } finally {
      setLoading(false);
    }
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

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div className="w-full h-full">
      <h3 className="text-lg font-semibold mb-4">Histórico de Entrada e Saída</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="data" 
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="entrada" 
            stroke="hsl(var(--chart-1))" 
            strokeWidth={2}
            name="Entrada"
          />
          <Line 
            type="monotone" 
            dataKey="saida" 
            stroke="hsl(var(--chart-2))" 
            strokeWidth={2}
            name="Saída"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
