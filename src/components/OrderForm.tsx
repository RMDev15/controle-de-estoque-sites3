import { useState, useEffect, useRef, useCallback } from "react";
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Search, Plus, Trash2, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  codigo: string;
  nome: string;
  cor: string;
  estoque_atual: number;
  fornecedor: string | null;
}

interface OrderItem {
  product_id: string;
  codigo: string;
  nome: string;
  cor: string;
  quantidade: number;
}

interface Supplier {
  name: string;
  products: Product[];
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
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [deliveryDays, setDeliveryDays] = useState<string>("");
  const [fornecedor, setFornecedor] = useState<string>("");
  const [contatoFornecedor, setContatoFornecedor] = useState<string>("");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchProducts();
    if (order) {
      loadOrderItems();
      setFornecedor(order.fornecedor || "");
      setContatoFornecedor(order.contato_fornecedor || "");
    }
  }, [order]);

  useEffect(() => {
    // Organize products by supplier
    const supplierMap = new Map<string, Product[]>();
    products.forEach((product) => {
      const supplierName = product.fornecedor || "Sem Fornecedor";
      if (!supplierMap.has(supplierName)) {
        supplierMap.set(supplierName, []);
      }
      supplierMap.get(supplierName)!.push(product);
    });

    const supplierList: Supplier[] = [];
    supplierMap.forEach((prods, name) => {
      if (name !== "Sem Fornecedor") {
        supplierList.push({ name, products: prods });
      }
    });
    setSuppliers(supplierList);
  }, [products]);

  useEffect(() => {
    if (searchTerm) {
      let filtered = products;
      
      // If supplier selected, filter by supplier first
      if (selectedSupplier) {
        filtered = filtered.filter((p) => p.fornecedor === selectedSupplier);
      }
      
      filtered = filtered.filter(
        (p) =>
          p.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.cor?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProducts(filtered);
      setHighlightedIndex(filtered.length > 0 ? 0 : -1);
    } else if (selectedSupplier) {
      const filtered = products.filter((p) => p.fornecedor === selectedSupplier);
      setFilteredProducts(filtered);
      setHighlightedIndex(-1);
    } else {
      setFilteredProducts([]);
      setHighlightedIndex(-1);
    }
  }, [searchTerm, products, selectedSupplier]);

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

  const addProduct = useCallback((product: Product) => {
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
    setHighlightedIndex(-1);
    
    toast({ title: `${product.nome} adicionado ao pedido` });
  }, [orderItems, toast]);

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (filteredProducts.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredProducts.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredProducts.length) {
        addProduct(filteredProducts[highlightedIndex]);
      }
    }
  }, [filteredProducts, highlightedIndex, addProduct]);

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
      setShowConfirmDialog(true);
    } else {
      setShowDeliveryDialog(true);
    }
  };

  const handleConfirmUpdate = async () => {
    setShowConfirmDialog(false);
    await updateOrder();
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

      // Atualizar fornecedor e contato
      await supabase
        .from("orders")
        .update({
          fornecedor: fornecedor || null,
          contato_fornecedor: contatoFornecedor || null,
        })
        .eq("id", order.id);

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

  const handleSupplierSelect = (supplierName: string) => {
    setSelectedSupplier(supplierName);
    setFornecedor(supplierName);
    setSupplierOpen(false);
    
    // Find supplier contact from products
    const supplierProduct = products.find((p) => p.fornecedor === supplierName);
    if (supplierProduct) {
      // Auto-fill products from this supplier
      const filtered = products.filter((p) => p.fornecedor === supplierName);
      setFilteredProducts(filtered);
    }
  };

  const handleFormKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.ctrlKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="space-y-6" onKeyDown={handleFormKeyDown}>
      {/* Supplier Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Fornecedor</Label>
          <Popover open={supplierOpen} onOpenChange={setSupplierOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={supplierOpen}
                className="w-full justify-between"
              >
                {selectedSupplier || fornecedor || "Selecionar fornecedor..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput placeholder="Buscar fornecedor..." />
                <CommandList>
                  <CommandEmpty>Nenhum fornecedor encontrado.</CommandEmpty>
                  <CommandGroup>
                    {suppliers.map((supplier) => (
                      <CommandItem
                        key={supplier.name}
                        value={supplier.name}
                        onSelect={() => handleSupplierSelect(supplier.name)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedSupplier === supplier.name
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        {supplier.name} ({supplier.products.length} produtos)
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label>Ou digite novo fornecedor</Label>
          <Input
            placeholder="Nome do fornecedor"
            value={fornecedor}
            onChange={(e) => {
              setFornecedor(e.target.value);
              setSelectedSupplier("");
            }}
          />
        </div>
        <div className="space-y-2">
          <Label>Contato do Fornecedor</Label>
          <Input
            placeholder="Telefone ou e-mail"
            value={contatoFornecedor}
            onChange={(e) => setContatoFornecedor(e.target.value)}
          />
        </div>
      </div>

      {/* Product Search */}
      <div className="space-y-2">
        <Label>Buscar Produto (Enter para adicionar)</Label>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            placeholder="Digite código, nome ou cor do produto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="pl-10"
          />
          {filteredProducts.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
              {filteredProducts.map((product, index) => (
                <button
                  key={product.id}
                  onClick={() => addProduct(product)}
                  className={cn(
                    "w-full text-left px-4 py-2 hover:bg-accent hover:text-accent-foreground",
                    index === highlightedIndex && "bg-accent text-accent-foreground"
                  )}
                >
                  <div className="font-medium">{product.nome}</div>
                  <div className="text-sm text-muted-foreground">
                    Código: {product.codigo} | Cor: {product.cor || "N/A"} |
                    Estoque: {product.estoque_atual}
                    {product.fornecedor && ` | Fornecedor: ${product.fornecedor}`}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Use ↑↓ para navegar e Enter para adicionar. Ctrl+Enter para finalizar pedido.
        </p>
      </div>

      {/* Order Items Table */}
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

      {/* Action Buttons */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit}>
          {order ? "Atualizar" : "Finalizar"} (Ctrl+Enter)
        </Button>
      </div>

      {/* Dialog para prazo de entrega */}
      <Dialog open={showDeliveryDialog} onOpenChange={setShowDeliveryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Pedido</DialogTitle>
            <DialogDescription>
              Confirme as informações do pedido e o prazo de entrega
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm"><strong>Fornecedor:</strong> {fornecedor || "Não informado"}</p>
              <p className="text-sm"><strong>Contato:</strong> {contatoFornecedor || "Não informado"}</p>
              <p className="text-sm"><strong>Itens:</strong> {orderItems.length} produto(s)</p>
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
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    createOrder();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeliveryDialog(false)}
            >
              Voltar
            </Button>
            <Button onClick={createOrder}>Confirmar Pedido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog para confirmar atualização */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar atualização</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja atualizar este pedido?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmUpdate}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
