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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Download, FileText, Trash2, ChevronDown, ChevronRight } from "lucide-react";
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
  fornecedor: string | null;
  contato_fornecedor: string | null;
  dias_restantes?: number;
  status_display?: string;
  order_items: Array<{
    id: string;
    quantidade: number;
    products: {
      id: string;
      codigo: string;
      nome: string;
      cor: string;
    };
  }>;
}

type OrderStatus = "emitido" | "em_transito" | "cancelado" | "devolvido" | "recebido";

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [statusChangeOrder, setStatusChangeOrder] = useState<{ order: Order; newStatus: OrderStatus } | null>(null);
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
      .select("*, order_items(*, products(id, codigo, nome, cor))")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Erro ao carregar pedidos",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    const ordersWithAlerts = (data || []).map((order) => {
      const { alertColor, statusDisplay } = calculateStatusAndAlert(order);
      const diasRestantes = calculateDaysRemaining(order);
      return {
        ...order,
        alerta_cor: alertColor,
        status_display: statusDisplay,
        dias_restantes: diasRestantes,
      };
    });

    setOrders(ordersWithAlerts);
  };

  const calculateStatusAndAlert = (order: any): { alertColor: string; statusDisplay: string } => {
    // Status manuais têm prioridade
    if (order.status === "cancelado") {
      return { alertColor: "standby", statusDisplay: "Cancelado" };
    }
    if (order.status === "devolvido") {
      return { alertColor: "standby", statusDisplay: "Devolvido" };
    }
    if (order.status === "recebido") {
      return { alertColor: "sem_cor", statusDisplay: "Recebido" };
    }

    if (!order.prazo_entrega_dias || !order.data_prevista_entrega) {
      return { alertColor: "sem_cor", statusDisplay: order.status };
    }

    const createdDate = new Date(order.created_at);
    const deliveryDate = new Date(order.data_prevista_entrega);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deliveryDate.setHours(0, 0, 0, 0);
    createdDate.setHours(0, 0, 0, 0);

    const daysSinceCreation = Math.floor((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysUntilDelivery = Math.floor((deliveryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Atrasado - 1 dia após a data estipulada
    if (daysUntilDelivery < 0) {
      return { alertColor: "atrasado", statusDisplay: "Atrasado" };
    }

    // Aguardando entrega - a partir do antepenúltimo dia (3 dias antes)
    if (daysUntilDelivery <= 2 && daysUntilDelivery >= 0) {
      return { alertColor: "aguardando", statusDisplay: "Aguardando Entrega" };
    }

    // Enviado ao fornecedor - status manual que inicia contagem
    if (order.status === "enviado_fornecedor") {
      const daysSinceSent = daysSinceCreation; // usar criação como referência
      if (daysSinceSent >= 2) {
        return { alertColor: "em_transito", statusDisplay: "Em Trânsito" };
      }
      return { alertColor: "enviado", statusDisplay: "Enviado ao Fornecedor" };
    }

    // Em trânsito - a partir do 3º dia automaticamente
    if (daysSinceCreation >= 3 || order.status === "em_transito") {
      return { alertColor: "em_transito", statusDisplay: "Em Trânsito" };
    }

    // Emitido - até o 2º dia
    return { alertColor: "emitido", statusDisplay: "Emitido" };
  };

  const calculateDaysRemaining = (order: any): number => {
    if (!order.data_prevista_entrega) return 0;
    
    const deliveryDate = new Date(order.data_prevista_entrega);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deliveryDate.setHours(0, 0, 0, 0);
    
    const diffTime = deliveryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
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
        (order.status_display || order.status).toLowerCase().includes(filters.status.toLowerCase())
      );
    }

    // Ordenar por alerta: vermelho > amarelo/azul > verde > cinza > sem cor
    const alertPriority: Record<string, number> = {
      atrasado: 1,
      aguardando: 2,
      em_transito: 3,
      enviado: 4,
      emitido: 5,
      standby: 6,
      sem_cor: 7,
    };

    filtered.sort(
      (a, b) =>
        (alertPriority[a.alerta_cor] || 7) - (alertPriority[b.alerta_cor] || 7)
    );

    setFilteredOrders(filtered);
  };

  const getStatusColor = (alertColor: string) => {
    switch (alertColor) {
      case "emitido":
        return "bg-status-green text-white";
      case "enviado":
        return "bg-status-blue text-white";
      case "em_transito":
        return "bg-status-yellow text-black";
      case "aguardando":
        return "bg-status-blue text-white";
      case "atrasado":
        return "bg-status-red text-white";
      case "standby":
        return "bg-status-gray text-white";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getRowBgColor = (alertColor: string) => {
    switch (alertColor) {
      case "emitido":
        return "bg-status-green-light";
      case "enviado":
        return "bg-status-blue-light";
      case "em_transito":
        return "bg-status-yellow-light";
      case "aguardando":
        return "bg-status-blue-light";
      case "atrasado":
        return "bg-status-red-light";
      case "standby":
        return "bg-status-gray-light";
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

  const handleStatusChange = async () => {
    if (!statusChangeOrder) return;

    const { order, newStatus } = statusChangeOrder;

    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", order.id);

    if (error) {
      toast({
        title: "Erro ao alterar status",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({ title: `Status alterado para ${getStatusLabel(newStatus)}` });
    setStatusChangeOrder(null);
    fetchOrders();
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      emitido: "Emitido",
      enviado_fornecedor: "Enviado ao Fornecedor",
      em_transito: "Em Trânsito",
      aguardando_entrega: "Aguardando Entrega",
      atrasado: "Atrasado",
      cancelado: "Cancelado",
      devolvido: "Devolvido",
      recebido: "Recebido",
    };
    return labels[status] || status;
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

  const isStandbyOrder = (order: Order): boolean => {
    return order.status === "cancelado" || order.status === "devolvido";
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
            Selecione o pedido para visualizar ou editar. Passe o mouse sobre um pedido para ver os detalhes.
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

        <div className="space-y-2">
          {filteredOrders.map((order) => (
            <Collapsible
              key={order.id}
              open={expandedOrderId === order.id}
              onOpenChange={(open) => setExpandedOrderId(open ? order.id : null)}
            >
              <div className={`rounded-lg border ${getRowBgColor(order.alerta_cor)} transition-all duration-200 hover:shadow-md`}>
                <CollapsibleTrigger asChild>
                  <div className="w-full p-4 cursor-pointer">
                    <div className="grid grid-cols-1 md:grid-cols-8 gap-4 items-center">
                      <div className="flex items-center gap-2">
                        {expandedOrderId === order.id ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <span className="font-medium">{order.codigo}</span>
                      </div>
                      <div className="text-sm">{formatDate(order.data_criacao)}</div>
                      <div className="text-sm truncate">{order.fornecedor || "-"}</div>
                      <div className="text-sm truncate">{order.contato_fornecedor || "-"}</div>
                      <div className="text-sm">
                        {order.prazo_entrega_dias ? `${order.prazo_entrega_dias} dias` : "-"}
                      </div>
                      <div>
                        {order.alerta_cor !== "sem_cor" && order.dias_restantes !== undefined ? (
                          <span
                            className={`${getStatusColor(order.alerta_cor)} px-2 py-1 rounded text-xs font-medium`}
                          >
                            {order.dias_restantes > 0 
                              ? `${order.dias_restantes} dias` 
                              : order.dias_restantes === 0 
                                ? "Hoje" 
                                : `${Math.abs(order.dias_restantes)} dias atrasado`}
                          </span>
                        ) : (
                          "-"
                        )}
                      </div>
                      <div>
                        <span
                          className={`${getStatusColor(order.alerta_cor)} px-2 py-1 rounded text-xs`}
                        >
                          {order.status_display}
                        </span>
                      </div>
                      <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedOrder(order)}
                          title="Visualizar detalhes"
                          className="h-8 w-8 p-0"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadExcel(order)}
                          title="Download"
                          className="h-8 w-8 p-0"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {!isStandbyOrder(order) && (
                          <Select
                            onValueChange={(value) =>
                              setStatusChangeOrder({ order, newStatus: value as OrderStatus })
                            }
                          >
                            <SelectTrigger className="h-8 w-32">
                              <SelectValue placeholder="Alterar..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="enviado_fornecedor">Enviado ao Fornecedor</SelectItem>
                              <SelectItem value="cancelado">Cancelado</SelectItem>
                              <SelectItem value="devolvido">Devolvido</SelectItem>
                              <SelectItem value="recebido">Recebido</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        {isStandbyOrder(order) && (
                          <Select
                            onValueChange={(value) => {
                              if (value === "delete") {
                                setDeleteOrderId(order.id);
                              } else {
                                setStatusChangeOrder({ order, newStatus: value as OrderStatus });
                              }
                            }}
                          >
                            <SelectTrigger className="h-8 w-32">
                              <SelectValue placeholder="Ação..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="emitido">Reemitir</SelectItem>
                              <SelectItem value="recebido">Finalizar</SelectItem>
                              <SelectItem value="delete">Excluir</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        {canEditOrDelete(order) && !isStandbyOrder(order) && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(order)}
                              title="Editar"
                              className="h-8 w-8 p-0"
                            >
                              ✏️
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setDeleteOrderId(order.id)}
                              title="Excluir"
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4 border-t pt-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-3 bg-background/50 rounded-lg">
                      <div>
                        <p className="text-xs text-muted-foreground">Fornecedor</p>
                        <p className="text-sm font-medium">{order.fornecedor || "-"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Contato</p>
                        <p className="text-sm font-medium">{order.contato_fornecedor || "-"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Prazo</p>
                        <p className="text-sm font-medium">{order.prazo_entrega_dias ? `${order.prazo_entrega_dias} dias` : "-"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Previsão</p>
                        <p className="text-sm font-medium">{order.data_prevista_entrega ? formatDate(order.data_prevista_entrega) : "-"}</p>
                      </div>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Código</TableHead>
                          <TableHead className="text-xs">Nome</TableHead>
                          <TableHead className="text-xs">Cor</TableHead>
                          <TableHead className="text-xs">Qtd</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {order.order_items?.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="text-xs py-2">{item.products.codigo}</TableCell>
                            <TableCell className="text-xs py-2">{item.products.nome}</TableCell>
                            <TableCell className="text-xs py-2">{item.products.cor || "-"}</TableCell>
                            <TableCell className="text-xs py-2">{item.quantidade}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}
        </div>

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
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Fornecedor</p>
                    <p className="font-medium">{selectedOrder.fornecedor || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Contato</p>
                    <p className="font-medium">{selectedOrder.contato_fornecedor || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Prazo de Entrega</p>
                    <p className="font-medium">{selectedOrder.prazo_entrega_dias ? `${selectedOrder.prazo_entrega_dias} dias` : "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Previsão de Entrega</p>
                    <p className="font-medium">{selectedOrder.data_prevista_entrega ? formatDate(selectedOrder.data_prevista_entrega) : "-"}</p>
                  </div>
                </div>
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

        {/* Alert Dialog para confirmar mudança de status */}
        <AlertDialog
          open={!!statusChangeOrder}
          onOpenChange={() => setStatusChangeOrder(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar alteração de status</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja alterar o status do pedido {statusChangeOrder?.order.codigo} para "{statusChangeOrder && getStatusLabel(statusChangeOrder.newStatus)}"?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleStatusChange}>
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    </div>
  );
}
