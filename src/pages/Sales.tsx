import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Sales() {
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("*")
      .gt("estoque_atual", 0)
      .order("nome");
    setProducts(data || []);
  };

  const filteredProducts = products.filter((p) =>
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.codigo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (product: any) => {
    const existing = cart.find((item) => item.id === product.id);
    if (existing) {
      if (existing.quantidade < product.estoque_atual) {
        setCart(
          cart.map((item) =>
            item.id === product.id
              ? { ...item, quantidade: item.quantidade + 1 }
              : item
          )
        );
      } else {
        toast({
          title: "Estoque insuficiente",
          variant: "destructive",
        });
      }
    } else {
      setCart([...cart, { ...product, quantidade: 1 }]);
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.id !== productId));
  };

  const updateQuantity = (productId: string, quantidade: number) => {
    const product = products.find((p) => p.id === productId);
    if (product && quantidade <= product.estoque_atual && quantidade > 0) {
      setCart(
        cart.map((item) =>
          item.id === productId ? { ...item, quantidade } : item
        )
      );
    }
  };

  const calculateTotal = () => {
    return cart.reduce(
      (sum, item) => sum + item.valor_venda * item.quantidade,
      0
    );
  };

  const finalizeSale = async () => {
    if (cart.length === 0) {
      toast({
        title: "Carrinho vazio",
        variant: "destructive",
      });
      return;
    }

    const saleCode = `VD${Date.now()}`;
    const total = calculateTotal();

    // Create sale
    const { data: saleData, error: saleError } = await supabase
      .from("sales")
      .insert({
        codigo: saleCode,
        total,
        created_by: user?.id,
      })
      .select()
      .single();

    if (saleError) {
      toast({
        title: "Erro ao criar venda",
        description: saleError.message,
        variant: "destructive",
      });
      return;
    }

    // Create sale items and update stock
    for (const item of cart) {
      // Insert sale item
      await supabase.from("sale_items").insert({
        sale_id: saleData.id,
        product_id: item.id,
        quantidade: item.quantidade,
        valor_unitario: item.valor_venda,
        subtotal: item.valor_venda * item.quantidade,
      });

      // Update product stock
      await supabase
        .from("products")
        .update({
          estoque_atual: item.estoque_atual - item.quantidade,
        })
        .eq("id", item.id);

      // Record stock movement
      await supabase.from("stock_movements").insert({
        product_id: item.id,
        tipo: "saida",
        quantidade: item.quantidade,
        created_by: user?.id,
      });
    }

    toast({
      title: "Venda finalizada!",
      description: `Total: R$ ${total.toFixed(2)}`,
    });

    setCart([]);
    fetchProducts();
  };

  return (
    <div className="min-h-screen bg-primary p-4">
      <Card className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Terminal de Vendas</h1>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            Voltar
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Product Selection */}
          <div>
            <h3 className="font-bold mb-4">Selecionar Produtos</h3>
            <Input
              placeholder="Buscar por Código ou Nome"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mb-4"
            />

            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {filteredProducts.map((product) => (
                <Card key={product.id} className="p-3 flex justify-between items-center">
                  <div>
                    <p className="font-medium">{product.nome}</p>
                    <p className="text-sm text-muted-foreground">
                      Código: {product.codigo} | Estoque: {product.estoque_atual}
                    </p>
                    <p className="text-sm font-bold">
                      R$ {product.valor_venda.toFixed(2)}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => addToCart(product)}>
                    Adicionar
                  </Button>
                </Card>
              ))}
            </div>
          </div>

          {/* Cart */}
          <div>
            <h3 className="font-bold mb-4">Carrinho</h3>
            {cart.length === 0 ? (
              <p className="text-muted-foreground">Nenhum produto adicionado</p>
            ) : (
              <>
                <div className="space-y-2 mb-4">
                  {cart.map((item) => (
                    <Card key={item.id} className="p-3">
                      <div className="flex justify-between items-center mb-2">
                        <p className="font-medium">{item.nome}</p>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => removeFromCart(item.id)}
                        >
                          Remover
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="1"
                          max={item.estoque_atual}
                          value={item.quantidade}
                          onChange={(e) =>
                            updateQuantity(item.id, parseInt(e.target.value) || 0)
                          }
                          className="w-20"
                        />
                        <span className="text-sm">
                          x R$ {item.valor_venda.toFixed(2)} = R${" "}
                          {(item.valor_venda * item.quantidade).toFixed(2)}
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>

                <Card className="p-4 bg-primary text-primary-foreground">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-bold">Total:</span>
                    <span className="text-2xl font-bold">
                      R$ {calculateTotal().toFixed(2)}
                    </span>
                  </div>
                  <Button
                    className="w-full bg-status-green hover:bg-status-green/90"
                    onClick={finalizeSale}
                  >
                    Finalizar Venda
                  </Button>
                </Card>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
