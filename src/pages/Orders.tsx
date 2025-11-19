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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Download, FileText, Trash2 } from "lucide-react";
import OrderForm from "@/components/OrderForm";

interface Order {
  id: string;
  codigo: string;
  data_criacao: string;
  status: string;
  alerta_cor: string;
  prazo_entrega_dias: number | null;
  data_prevista_entrega: string | null;
  created_at: string;
  order_items: Array<{
    id: string;
    quantidade: number;
    products: {
      codigo: string;
      nome: string;
      cor: string;
    };
  }>;
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    pedido: "",
    data: "",
    status: "",
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [orders, filters]);

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*, products(codigo, nome, cor))")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Erro ao carregar pedidos",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    const ordersWithAlerts = (data || []).map((order) => ({
      ...order,
      alerta_cor: calculateAlertColor(order),
    }));

    setOrders(ordersWithAlerts);
  };

  const calculateAlertColor = (order: Order): string => {
    if (
      order.status === "cancelado" ||
      order.status === "devolvido" ||
      order.status === "entregue"
    ) {
      return "sem_cor";
    }

    if (!order.prazo_entrega_dias) {
      return "sem_cor";
    }

    const createdDate = new Date(order.created_at);
    const today = new Date();
    const daysDiff = Math.floor(
      (today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Emitido (verde) - até 1º dia
    if (daysDiff <= 1) {
      return "emitido";
    }

    const penultimateDay = order.prazo_entrega_dias - 1;

    // Atrasado (vermelho) - penúltimo dia em diante
    if (daysDiff >= penultimateDay) {
      return "atrasado";
    }

    // Em trânsito (amarelo) - 2º dia até antepenúltimo dia
    if (daysDiff >= 2 && daysDiff < penultimateDay) {
      return "em_transito";
    }

    return "sem_cor";
  };

  const applyFilters = () => {
    let filtered = [...orders];

    if (filters.pedido) {
      filtered = filtered.filter((order) =>
        order.codigo.toLowerCase().includes(filters.pedido.toLowerCase())
      );
    }

    if (filters.data) {
      filtered = filtered.filter((order) =>
        formatDate(order.data_criacao).includes(filters.data)
      );
    }

    if (filters.status) {
      filtered = filtered.filter((order) =>
        order.status.toLowerCase().includes(filters.status.toLowerCase())
      );
    }

    // Ordenar por alerta: vermelho > amarelo > verde > sem cor
    const alertPriority: Record<string, number> = {
      atrasado: 1,
      em_transito: 2,
      emitido: 3,
      sem_cor: 4,
    };

    filtered.sort(
      (a, b) =>
        alertPriority[a.alerta_cor] - alertPriority[b.alerta_cor]
    );

    setFilteredOrders(filtered);
  };

  const getStatusColor = (alertColor: string) => {
    switch (alertColor) {
      case "emitido":
        return "bg-status-green text-white";
      case "em_transito":
        return "bg-status-yellow text-black";
      case "atrasado":
        return "bg-status-red text-white";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusLabel = (alertColor: string) => {
    switch (alertColor) {
      case "emitido":
        return "Emitido";
      case "em_transito":
        return "Em Trânsito";
      case "atrasado":
        return "Atrasado";
      default:
        return "";
    }
  };

  const canEditOrDelete = (order: Order): boolean => {
    const createdDate = new Date(order.created_at);
    const today = new Date();
    const hoursDiff = (today.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
    return hoursDiff <= 24;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR");
  };

  const handleDelete = async () => {
    if (!deleteOrderId) return;

    const { error } = await supabase
      .from("orders")
      .delete()
      .eq("id", deleteOrderId);

    if (error) {
      toast({
        title: "Erro ao excluir pedido",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Pedido excluído com sucesso" });
    setDeleteOrderId(null);
    fetchOrders();
  };

  const handleEdit = (order: Order) => {
    if (!canEditOrDelete(order)) {
      toast({
        title: "Não é possível editar",
        description: "Somente pedidos com menos de 1 dia podem ser editados",
        variant: "destructive",
      });
      return;
    }
    setEditingOrder(order);
    setShowOrderForm(true);
  };

  const downloadExcel = (order: Order) => {
    const csvContent = [
      ["Pedido", "Código", "Nome", "Cor", "Quantidade"],
      ...order.order_items.map((item) => [
        order.codigo,
        item.products.codigo,
        item.products.nome,
        item.products.cor || "",
        item.quantidade,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `pedido_${order.codigo}.csv`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-primary p-4">
      <Card className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-foreground">Pedidos</h1>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setEditingOrder(null);
                setShowOrderForm(true);
              }}
            >
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

        <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            placeholder="Filtrar por pedido"
            value={filters.pedido}
            onChange={(e) =>
              setFilters({ ...filters, pedido: e.target.value })
            }
          />
          <Input
            placeholder="Filtrar por data"
            value={filters.data}
            onChange={(e) =>
              setFilters({ ...filters, data: e.target.value })
            }
          />
          <Input
            placeholder="Filtrar por status"
            value={filters.status}
            onChange={(e) =>
              setFilters({ ...filters, status: e.target.value })
            }
          />
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
            {filteredOrders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>{order.codigo}</TableCell>
                <TableCell>{formatDate(order.data_criacao)}</TableCell>
                <TableCell>
                  <span className="px-2 py-1 rounded text-sm">
                    {order.status}
                  </span>
                </TableCell>
                <TableCell>
                  {order.alerta_cor !== "sem_cor" && (
                    <span
                      className={`${getStatusColor(
                        order.alerta_cor
                      )} px-2 py-1 rounded text-sm`}
                    >
                      {getStatusLabel(order.alerta_cor)}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedOrder(order)}
                      title="Visualizar detalhes"
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadExcel(order)}
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {canEditOrDelete(order) && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(order)}
                          title="Editar"
                        >
                          ✏️
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeleteOrderId(order.id)}
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Dialog para detalhes do pedido */}
        <Dialog
          open={!!selectedOrder}
          onOpenChange={() => setSelectedOrder(null)}
        >
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>
                Detalhes do Pedido {selectedOrder?.codigo}
              </DialogTitle>
            </DialogHeader>
            {selectedOrder && (
              <div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Nome do Produto</TableHead>
                      <TableHead>Cor</TableHead>
                      <TableHead>Quantidade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOrder.order_items?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.products.codigo}</TableCell>
                        <TableCell>{item.products.nome}</TableCell>
                        <TableCell>{item.products.cor || "-"}</TableCell>
                        <TableCell>{item.quantidade}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog para criar/editar pedido */}
        <Dialog open={showOrderForm} onOpenChange={setShowOrderForm}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingOrder ? "Editar Pedido" : "Novo Pedido"}
              </DialogTitle>
            </DialogHeader>
            <OrderForm
              order={editingOrder}
              onSuccess={() => {
                setShowOrderForm(false);
                setEditingOrder(null);
                fetchOrders();
              }}
              onCancel={() => {
                setShowOrderForm(false);
                setEditingOrder(null);
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Alert Dialog para confirmar exclusão */}
        <AlertDialog
          open={!!deleteOrderId}
          onOpenChange={() => setDeleteOrderId(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este pedido? Esta ação não pode
                ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    </div>
  );
}
