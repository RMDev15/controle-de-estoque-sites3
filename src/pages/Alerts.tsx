import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Alerts() {
  const [products, setProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchProductsWithAlerts();
  }, []);

  const fetchProductsWithAlerts = async () => {
    const { data } = await supabase
      .from("products")
      .select("*, stock_alerts(*)")
      .order("estoque_atual", { ascending: true });
    setProducts(data || []);
  };

  const filteredProducts = products.filter((p) =>
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.codigo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStockStatus = (product: any) => {
    const stock = product.estoque_atual;
    const alert = product.stock_alerts?.[0];
    
    if (!alert) return { color: "sem_cor", label: "Sem alerta" };
    
    if (stock >= alert.nivel_verde_min && stock <= alert.nivel_verde_max) {
      return { color: "verde", label: "Verde" };
    } else if (stock >= alert.nivel_amarelo_min && stock <= alert.nivel_amarelo_max) {
      return { color: "amarelo", label: "Amarelo" };
    } else if (stock <= alert.nivel_vermelho_max) {
      return { color: "vermelho", label: "Vermelho" };
    }
    return { color: "sem_cor", label: "Sem alerta" };
  };

  const getStatusColor = (color: string) => {
    switch (color) {
      case "verde":
        return "bg-status-green text-white";
      case "amarelo":
        return "bg-status-yellow text-black";
      case "vermelho":
        return "bg-status-red text-white";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-primary p-4">
      <Card className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Alertas</h1>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            Voltar
          </Button>
        </div>

        <div className="mb-6">
          <Input
            placeholder="Busque pelo Código ou Produto"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>

        <div className="space-y-6">
          {["verde", "amarelo", "vermelho"].map((colorFilter) => {
            const filtered = filteredProducts.filter(
              (p) => getStockStatus(p).color === colorFilter
            );

            if (filtered.length === 0) return null;

            return (
              <div key={colorFilter}>
                <div
                  className={`${getStatusColor(colorFilter)} px-4 py-2 rounded-t-lg font-bold text-center uppercase`}
                >
                  {colorFilter}
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Estoque</TableHead>
                      <TableHead>Realizar Pedido</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>{product.codigo}</TableCell>
                        <TableCell>{product.nome}</TableCell>
                        <TableCell>{product.estoque_atual}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/orders?product=${product.id}`)}
                          >
                            📋
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            );
          })}
        </div>

        {filteredProducts.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            Nenhum produto encontrado
          </p>
        )}
      </Card>
    </div>
  );
}
