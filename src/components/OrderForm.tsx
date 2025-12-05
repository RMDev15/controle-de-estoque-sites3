import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Plus, Trash2 } from "lucide-react";

interface Product {
  id: string;
  codigo: string;
  nome: string;
  cor: string;
  estoque_atual: number;
}

interface OrderItem {
  product_id: string;
  codigo: string;
  nome: string;
  cor: string;
  quantidade: number;
}

interface OrderFormProps {
  order?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function OrderForm({ order, onSuccess, onCancel }: OrderFormProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [showDeliveryDialog, setShowDeliveryDialog] = useState(false);
  const [deliveryDays, setDeliveryDays] = useState<string>("");
  const [fornecedor, setFornecedor] = useState<string>("");
  const [contatoFornecedor, setContatoFornecedor] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    fetchProducts();
    if (order) {
      loadOrderItems();
    }
  }, [order]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = products.filter(
        (p) =>
          p.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.cor?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts([]);
    }
  }, [searchTerm, products]);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("nome");

    if (error) {
      toast({
        title: "Erro ao carregar produtos",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setProducts(data || []);
  };

  const loadOrderItems = async () => {
    if (!order?.order_items) return;

    const items: OrderItem[] = order.order_items.map((item: any) => ({
      product_id: item.products.id,
      codigo: item.products.codigo,
      nome: item.products.nome,
      cor: item.products.cor || "",
      quantidade: item.quantidade,
    }));

    setOrderItems(items);
  };

  const addProduct = (product: Product) => {
    const existingItem = orderItems.find(
      (item) => item.product_id === product.id
    );

    if (existingItem) {
      setOrderItems(
        orderItems.map((item) =>
          item.product_id === product.id
            ? { ...item, quantidade: item.quantidade + 1 }
            : item
        )
      );
    } else {
      setOrderItems([
        ...orderItems,
        {
          product_id: product.id,
          codigo: product.codigo,
          nome: product.nome,
          cor: product.cor || "",
          quantidade: 1,
        },
      ]);
    }

    setSearchTerm("");
    setFilteredProducts([]);
  };

  const updateQuantity = (product_id: string, quantidade: number) => {
    if (quantidade <= 0) {
      removeProduct(product_id);
      return;
    }

    setOrderItems(
      orderItems.map((item) =>
        item.product_id === product_id ? { ...item, quantidade } : item
      )
    );
  };

  const removeProduct = (product_id: string) => {
    setOrderItems(orderItems.filter((item) => item.product_id !== product_id));
  };

  const handleSubmit = async () => {
    if (orderItems.length === 0) {
      toast({
        title: "Erro",
        description: "Adicione pelo menos um produto ao pedido",
        variant: "destructive",
      });
      return;
    }

    if (order) {
      // Atualizar pedido existente
      await updateOrder();
    } else {
      // Mostrar diálogo para prazo de entrega
      setShowDeliveryDialog(true);
    }
  };

  const updateOrder = async () => {
    try {
      // Deletar itens antigos
      await supabase.from("order_items").delete().eq("order_id", order.id);

      // Inserir novos itens
      const items = orderItems.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        quantidade: item.quantidade,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(items);

      if (itemsError) throw itemsError;

      toast({ title: "Pedido atualizado com sucesso" });
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar pedido",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const createOrder = async () => {
    if (!deliveryDays || parseInt(deliveryDays) <= 0) {
      toast({
        title: "Erro",
        description: "Informe o prazo de entrega em dias",
        variant: "destructive",
      });
      return;
    }

    try {
      // Buscar o último código de pedido
      const { data: lastOrder } = await supabase
        .from("orders")
        .select("codigo")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let nextNumber = 1;
      if (lastOrder) {
        const currentNumber = parseInt(lastOrder.codigo.replace(/\D/g, ""));
        nextNumber = currentNumber + 1;
      }

      const newCode = nextNumber.toString().padStart(2, "0");

      // Calcular data prevista de entrega
      const deliveryDate = new Date();
      deliveryDate.setDate(deliveryDate.getDate() + parseInt(deliveryDays));

      // Criar pedido
      const { data: newOrder, error: orderError } = await supabase
        .from("orders")
        .insert({
          codigo: newCode,
          status: "emitido",
          prazo_entrega_dias: parseInt(deliveryDays),
          data_prevista_entrega: deliveryDate.toISOString(),
          data_criacao: new Date().toISOString(),
          fornecedor: fornecedor || null,
          contato_fornecedor: contatoFornecedor || null,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Inserir itens do pedido
      const items = orderItems.map((item) => ({
        order_id: newOrder.id,
        product_id: item.product_id,
        quantidade: item.quantidade,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(items);

      if (itemsError) throw itemsError;

      toast({ title: `Pedido ${newCode} criado com sucesso` });
      setShowDeliveryDialog(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Erro ao criar pedido",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Buscar Produto</Label>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Digite código, nome ou cor do produto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          {filteredProducts.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addProduct(product)}
                  className="w-full text-left px-4 py-2 hover:bg-accent hover:text-accent-foreground"
                >
                  <div className="font-medium">{product.nome}</div>
                  <div className="text-sm text-muted-foreground">
                    Código: {product.codigo} | Cor: {product.cor || "N/A"} |
                    Estoque: {product.estoque_atual}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div>
        <Label>Itens do Pedido</Label>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Cor</TableHead>
              <TableHead>Quantidade</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orderItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Nenhum produto adicionado
                </TableCell>
              </TableRow>
            ) : (
              orderItems.map((item) => (
                <TableRow key={item.product_id}>
                  <TableCell>{item.codigo}</TableCell>
                  <TableCell>{item.nome}</TableCell>
                  <TableCell>{item.cor || "-"}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantidade}
                      onChange={(e) =>
                        updateQuantity(
                          item.product_id,
                          parseInt(e.target.value) || 0
                        )
                      }
                      className="w-20"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => removeProduct(item.product_id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit}>
          {order ? "Atualizar" : "Finalizar"}
        </Button>
      </div>

      {/* Dialog para prazo de entrega */}
      <Dialog open={showDeliveryDialog} onOpenChange={setShowDeliveryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Informações do Pedido</DialogTitle>
            <DialogDescription>
              Preencha as informações do fornecedor e prazo de entrega
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Fornecedor</Label>
              <Input
                placeholder="Nome do fornecedor"
                value={fornecedor}
                onChange={(e) => setFornecedor(e.target.value)}
              />
            </div>
            <div>
              <Label>Contato do Fornecedor</Label>
              <Input
                placeholder="Telefone ou e-mail"
                value={contatoFornecedor}
                onChange={(e) => setContatoFornecedor(e.target.value)}
              />
            </div>
            <div>
              <Label>Prazo de entrega (dias) *</Label>
              <Input
                type="number"
                min="1"
                placeholder="Ex: 10"
                value={deliveryDays}
                onChange={(e) => setDeliveryDays(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeliveryDialog(false)}
            >
              Cancelar
            </Button>
            <Button onClick={createOrder}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
