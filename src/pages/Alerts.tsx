import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
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
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [alertRanges, setAlertRanges] = useState({
    verde_min: 501,
    verde_max: 1000,
    amarelo_min: 201,
    amarelo_max: 500,
    vermelho_min: 0,
    vermelho_max: 200,
  });
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

    // Usa as faixas salvas no banco para o produto ou, se não houver,
    // aplica as faixas padrão (verde 501-1000, amarelo 201-500, vermelho até 200)
    const alert = product.stock_alerts?.[0] || {
      nivel_verde_min: 501,
      nivel_verde_max: 1000,
      nivel_amarelo_min: 201,
      nivel_amarelo_max: 500,
      nivel_vermelho_max: 200,
    };

    if (stock >= alert.nivel_verde_min && stock <= alert.nivel_verde_max) {
      return { color: "verde", label: "Verde" };
    } else if (stock >= alert.nivel_amarelo_min && stock <= alert.nivel_amarelo_max) {
      return { color: "amarelo", label: "Amarelo" };
    } else if (stock <= alert.nivel_vermelho_max) {
      return { color: "vermelho", label: "Vermelho" };
    }
    return { color: "sem_cor", label: "Sem alerta" };
  };
  const handleSelectProduct = (product: any) => {
    setSelectedProduct(product);
    const alert = product.stock_alerts?.[0];
    if (alert) {
      setAlertRanges({
        verde_min: alert.nivel_verde_min,
        verde_max: alert.nivel_verde_max,
        amarelo_min: alert.nivel_amarelo_min,
        amarelo_max: alert.nivel_amarelo_max,
        vermelho_min: 0,
        vermelho_max: alert.nivel_vermelho_max,
      });
    }
  };

  const handleSaveAlertRanges = async () => {
    if (!selectedProduct) return;

    const alert = selectedProduct.stock_alerts?.[0];
    
    const alertData = {
      product_id: selectedProduct.id,
      nivel_verde_min: alertRanges.verde_min,
      nivel_verde_max: alertRanges.verde_max,
      nivel_amarelo_min: alertRanges.amarelo_min,
      nivel_amarelo_max: alertRanges.amarelo_max,
      nivel_vermelho_max: alertRanges.vermelho_max,
    };

    if (alert) {
      const { error } = await supabase
        .from("stock_alerts")
        .update(alertData)
        .eq("id", alert.id);

      if (error) {
        toast({
          title: "Erro ao atualizar alerta",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
    } else {
      const { error } = await supabase
        .from("stock_alerts")
        .insert(alertData);

      if (error) {
        toast({
          title: "Erro ao criar alerta",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
    }

    toast({
      title: "Alerta atualizado",
      description: "Faixas de alerta salvas com sucesso!",
    });

    setSelectedProduct(null);
    fetchProductsWithAlerts();
  };

  const productsWithAlerts = filteredProducts.filter((p) => getStockStatus(p).color !== "sem_cor");

  return (
    <div className="min-h-screen bg-primary p-2 md:p-4">
      <Card className="max-w-7xl mx-auto p-3 md:p-6">
        <div className="flex justify-between items-center mb-4 md:mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-blue-600">Alertas</h1>
          <Button variant="outline" onClick={() => navigate("/dashboard")} size="sm">
            Voltar
          </Button>
        </div>

        <div className="bg-cyan-400 p-3 md:p-6 rounded-lg">
          <div className="mb-4 md:mb-6">
            <Input
              placeholder="Busque pelo Código ou Produto"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white"
            />
          </div>

          <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
            <div className="flex-1">
              <p className="text-center mb-2 font-semibold text-sm md:text-base">
                Selecione o item para editar a faixa de alerta
              </p>
              <p className="text-center mb-4 font-semibold text-sm md:text-base">Produtos com alerta</p>

              <div className="space-y-4 md:space-y-6">
                {["vermelho", "amarelo"].map((colorFilter) => {
                  const filtered = productsWithAlerts.filter(
                    (p) => getStockStatus(p).color === colorFilter
                  );

                  if (filtered.length === 0) return null;

                  return (
                    <div key={colorFilter} className="overflow-hidden rounded-lg">
                      <div
                        className={`${
                          colorFilter === "vermelho"
                            ? "bg-red-600 text-white"
                            : "bg-yellow-400 text-black"
                        } px-3 py-2 font-bold text-center uppercase text-sm md:text-base`}
                      >
                        {colorFilter}
                      </div>
                      <div className="overflow-x-auto">
                        <Table className="bg-white">
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs md:text-sm">Código</TableHead>
                              <TableHead className="text-xs md:text-sm">Nome</TableHead>
                              <TableHead className="text-xs md:text-sm w-20">Realizar Pedido</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filtered.map((product) => (
                              <TableRow
                                key={product.id}
                                className={`cursor-pointer hover:bg-gray-100 ${
                                  selectedProduct?.id === product.id ? "bg-gray-200" : ""
                                }`}
                                onClick={() => handleSelectProduct(product)}
                              >
                                <TableCell className="text-xs md:text-sm">{product.codigo}</TableCell>
                                <TableCell className="text-xs md:text-sm">{product.nome}</TableCell>
                                <TableCell className="text-center">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/orders?product=${product.id}`);
                                    }}
                                    className="h-8 w-8 p-0"
                                  >
                                    📋
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  );
                })}

                {productsWithAlerts.length === 0 && (
                  <div className="text-center py-8 text-gray-600">
                    <p>Nenhum produto com alerta encontrado</p>
                  </div>
                )}
              </div>
            </div>

            <div className="w-full lg:w-80 space-y-3 md:space-y-4">
              <div className="bg-green-500 p-3 md:p-4 rounded-lg">
                <div className="text-center font-bold text-white mb-2 text-sm md:text-base">VERDE</div>
                <div className="text-center text-white text-xs md:text-sm mb-3">
                  Quantidade em estoque
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Input
                    type="number"
                    value={alertRanges.verde_min}
                    onChange={(e) =>
                      setAlertRanges({ ...alertRanges, verde_min: Number(e.target.value) })
                    }
                    className="w-16 md:w-20 bg-white text-center text-sm"
                    disabled={!selectedProduct}
                  />
                  <span className="text-white text-xs md:text-sm">Até</span>
                  <Input
                    type="number"
                    value={alertRanges.verde_max}
                    onChange={(e) =>
                      setAlertRanges({ ...alertRanges, verde_max: Number(e.target.value) })
                    }
                    className="w-16 md:w-20 bg-white text-center text-sm"
                    disabled={!selectedProduct}
                  />
                </div>
              </div>

              <div className="bg-yellow-400 p-3 md:p-4 rounded-lg">
                <div className="text-center font-bold text-black mb-2 text-sm md:text-base">AMARELO</div>
                <div className="text-center text-black text-xs md:text-sm mb-3">
                  Quantidade em estoque
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Input
                    type="number"
                    value={alertRanges.amarelo_min}
                    onChange={(e) =>
                      setAlertRanges({ ...alertRanges, amarelo_min: Number(e.target.value) })
                    }
                    className="w-16 md:w-20 bg-white text-center text-sm"
                    disabled={!selectedProduct}
                  />
                  <span className="text-black text-xs md:text-sm">Até</span>
                  <Input
                    type="number"
                    value={alertRanges.amarelo_max}
                    onChange={(e) =>
                      setAlertRanges({ ...alertRanges, amarelo_max: Number(e.target.value) })
                    }
                    className="w-16 md:w-20 bg-white text-center text-sm"
                    disabled={!selectedProduct}
                  />
                </div>
              </div>

              <div className="bg-red-600 p-3 md:p-4 rounded-lg">
                <div className="text-center font-bold text-white mb-2 text-sm md:text-base">VERMELHO</div>
                <div className="text-center text-white text-xs md:text-sm mb-3">
                  Quantidade em estoque
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Input
                    type="number"
                    value={alertRanges.vermelho_min}
                    onChange={(e) =>
                      setAlertRanges({ ...alertRanges, vermelho_min: Number(e.target.value) })
                    }
                    className="w-16 md:w-20 bg-white text-center text-sm"
                    disabled
                  />
                  <span className="text-white text-xs md:text-sm">Até</span>
                  <Input
                    type="number"
                    value={alertRanges.vermelho_max}
                    onChange={(e) =>
                      setAlertRanges({ ...alertRanges, vermelho_max: Number(e.target.value) })
                    }
                    className="w-16 md:w-20 bg-white text-center text-sm"
                    disabled={!selectedProduct}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2 md:pt-4">
                <Button
                  variant="outline"
                  className="flex-1 bg-blue-500 text-white hover:bg-blue-600 text-sm md:text-base"
                  onClick={() => navigate("/dashboard")}
                >
                  Voltar
                </Button>
                <Button
                  className="flex-1 bg-blue-500 text-white hover:bg-blue-600 text-sm md:text-base"
                  onClick={handleSaveAlertRanges}
                  disabled={!selectedProduct}
                >
                  Concluir
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
