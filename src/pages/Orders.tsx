import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*, products(nome))")
      .order("created_at", { ascending: false });
    setOrders(data || []);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "recebido":
        return "bg-status-green text-white";
      case "em_transito":
        return "bg-status-yellow text-black";
      case "emitido":
        return "bg-status-red text-white";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR");
  };

  return (
    <div className="min-h-screen bg-primary p-4">
      <Card className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Pedidos</h1>
          <div className="flex gap-2">
            <Button onClick={() => navigate("/orders/new")}>
              Realizar Novo Pedido
            </Button>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Voltar
            </Button>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            Selecione o pedido para visualizar ou editar
          </p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pedido</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Alerta</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>{order.codigo}</TableCell>
                <TableCell>{formatDate(order.data_criacao)}</TableCell>
                <TableCell>
                  <span className={`${getStatusColor(order.status)} px-2 py-1 rounded text-sm`}>
                    {order.status}
                  </span>
                </TableCell>
                <TableCell>
                  {order.alerta_cor !== "sem_cor" && (
                    <span className={`${getStatusColor(order.alerta_cor)} px-2 py-1 rounded text-sm`}>
                      {order.alerta_cor}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedOrder(order)}
                    >
                      📋
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={async () => {
                        const { error } = await supabase
                          .from("orders")
                          .delete()
                          .eq("id", order.id);
                        if (!error) {
                          toast({ title: "Pedido excluído" });
                          fetchOrders();
                        }
                      }}
                    >
                      🗑️
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {selectedOrder && (
          <Card className="mt-6 p-4">
            <h3 className="font-bold mb-4">Detalhes do Pedido {selectedOrder.codigo}</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome do Produto</TableHead>
                  <TableHead>Quantidade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedOrder.order_items?.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.products.codigo}</TableCell>
                    <TableCell>{item.products.nome}</TableCell>
                    <TableCell>{item.quantidade}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setSelectedOrder(null)}
            >
              Fechar
            </Button>
          </Card>
        )}
      </Card>
    </div>
  );
}
