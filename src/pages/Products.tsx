import { useState, useEffect, useRef } from "react";
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
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Label } from "@/components/ui/label";

interface Product {
  id: string;
  codigo: string;
  nome: string;
  cor: string;
  codigo_barras: string | null;
  estoque_atual: number;
  valor_unitario: number;
  valor_venda: number;
  markup: number | null;
  fornecedor: string | null;
  foto_url: string | null;
}

interface StockAlert {
  product_id: string;
  nivel_verde_min: number;
  nivel_verde_max: number;
  nivel_amarelo_min: number;
  nivel_amarelo_max: number;
  nivel_vermelho_max: number;
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stockAlerts, setStockAlerts] = useState<Map<string, StockAlert>>(new Map());
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showAlertConfig, setShowAlertConfig] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    nivel_verde_min: 501,
    nivel_verde_max: 1000,
    nivel_amarelo_min: 201,
    nivel_amarelo_max: 500,
    nivel_vermelho_max: 200,
  });
  const [formData, setFormData] = useState({
    codigo: "",
    nome: "",
    cor: "",
    codigo_barras: "",
    estoque_atual: "",
    valor_unitario: "",
    valor_venda: "",
    markup: "",
    fornecedor: "",
    foto_url: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
    fetchStockAlerts();
  }, []);

  useEffect(() => {
    if (selectedProduct && selectedProduct.foto_url) {
      setImagePreview(selectedProduct.foto_url);
    }
  }, [selectedProduct]);

  const fetchProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    setProducts(data || []);
  };

  const fetchStockAlerts = async () => {
    const { data } = await supabase
      .from("stock_alerts")
      .select("*");
    
    const alertMap = new Map<string, StockAlert>();
    (data || []).forEach((alert: any) => {
      alertMap.set(alert.product_id, alert);
    });
    setStockAlerts(alertMap);
  };

  const getAlertColor = (product: Product): string => {
    const alert = stockAlerts.get(product.id);
    const stock = product.estoque_atual;

    if (alert) {
      if (stock >= alert.nivel_verde_min && stock <= alert.nivel_verde_max) {
        return "verde";
      } else if (stock >= alert.nivel_amarelo_min && stock <= alert.nivel_amarelo_max) {
        return "amarelo";
      } else if (stock <= alert.nivel_vermelho_max) {
        return "vermelho";
      }
    } else {
      // Default ranges
      if (stock >= 501 && stock <= 1000) return "verde";
      if (stock >= 201 && stock <= 500) return "amarelo";
      if (stock <= 200) return "vermelho";
    }
    return "verde";
  };

  const getRowBgColor = (alertColor: string) => {
    switch (alertColor) {
      case "verde":
        return "bg-status-green-light";
      case "amarelo":
        return "bg-status-yellow-light";
      case "vermelho":
        return "bg-status-red-light";
      default:
        return "";
    }
  };

  const getAlertBadge = (alertColor: string) => {
    switch (alertColor) {
      case "verde":
        return <span className="px-2 py-1 rounded text-xs bg-status-green text-white">Normal</span>;
      case "amarelo":
        return <span className="px-2 py-1 rounded text-xs bg-status-yellow text-black">Médio</span>;
      case "vermelho":
        return <span className="px-2 py-1 rounded text-xs bg-status-red text-white">Baixo</span>;
      default:
        return null;
    }
  };

  const filteredProducts = products.filter((p) =>
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.codigo_barras && p.codigo_barras.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirmDialog(true);
  };

  const confirmSubmit = async () => {
    setShowConfirmDialog(false);
    
    // If no codigo, generate one
    let codigoToUse = formData.codigo;
    if (!codigoToUse) {
      codigoToUse = await getNextCodigo();
    }
    
    // Check if codigo already exists (only for new products)
    if (!selectedProduct?.id) {
      const { data: existing } = await supabase
        .from("products")
        .select("id")
        .eq("codigo", codigoToUse)
        .maybeSingle();
      
      if (existing) {
        toast({
          title: "Erro",
          description: `Código ${codigoToUse} já existe. Gerando novo código...`,
          variant: "destructive",
        });
        codigoToUse = await getNextCodigo();
      }
    }
    
    const dataToSave = {
      ...formData,
      codigo: codigoToUse,
      estoque_atual: parseInt(formData.estoque_atual) || 0,
      valor_unitario: parseFloat(formData.valor_unitario) || 0,
      valor_venda: parseFloat(formData.valor_venda) || 0,
      markup: parseFloat(formData.markup) || 0,
    };

    if (selectedProduct?.id) {
      const { error } = await supabase
        .from("products")
        .update(dataToSave)
        .eq("id", selectedProduct.id);
      
      if (error) {
        toast({
          title: "Erro",
          description: error.message,
          variant: "destructive",
        });
      } else {
        // Save stock alert config
        await saveStockAlert(selectedProduct.id);
        toast({ title: "Produto atualizado com sucesso!" });
        resetForm();
        fetchProducts();
        fetchStockAlerts();
      }
    } else {
      const { data: newProduct, error } = await supabase
        .from("products")
        .insert(dataToSave)
        .select()
        .single();
      
      if (error) {
        toast({
          title: "Erro",
          description: error.message,
          variant: "destructive",
        });
      } else {
        // Save stock alert config for new product
        await saveStockAlert(newProduct.id);
        toast({ title: "Produto cadastrado com sucesso!" });
        resetForm();
        fetchProducts();
        fetchStockAlerts();
      }
    }
  };

  const saveStockAlert = async (productId: string) => {
    const alertData = {
      product_id: productId,
      nivel_verde_min: alertConfig.nivel_verde_min,
      nivel_verde_max: alertConfig.nivel_verde_max,
      nivel_amarelo_min: alertConfig.nivel_amarelo_min,
      nivel_amarelo_max: alertConfig.nivel_amarelo_max,
      nivel_vermelho_max: alertConfig.nivel_vermelho_max,
    };

    const { data: existing } = await supabase
      .from("stock_alerts")
      .select("id")
      .eq("product_id", productId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("stock_alerts")
        .update(alertData)
        .eq("product_id", productId);
    } else {
      await supabase
        .from("stock_alerts")
        .insert(alertData);
    }
  };

  const calculateMarkup = (valorVenda: string, valorUnitario: string) => {
    const venda = parseFloat(valorVenda) || 0;
    const unitario = parseFloat(valorUnitario) || 0;
    if (venda > 0 && unitario > 0) {
      return (((venda - unitario) / unitario) * 100).toFixed(2);
    }
    return "";
  };

  const calculateValorVenda = (valorUnitario: string, markup: string) => {
    const unitario = parseFloat(valorUnitario) || 0;
    const markupNum = parseFloat(markup) || 0;
    if (unitario > 0 && markupNum > 0) {
      return (unitario * (1 + markupNum / 100)).toFixed(2);
    }
    return "";
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        setFormData({ ...formData, foto_url: result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditClick = () => {
    fileInputRef.current?.click();
  };

  const getNextCodigo = async () => {
    const { data } = await supabase
      .from("products")
      .select("codigo");
    
    if (data && data.length > 0) {
      const codes = data.map(p => parseInt(p.codigo) || 0);
      const maxCode = Math.max(...codes);
      return String(maxCode + 1).padStart(3, "0");
    }
    return "001";
  };

  const resetForm = () => {
    setFormData({
      codigo: "",
      nome: "",
      cor: "",
      codigo_barras: "",
      estoque_atual: "",
      valor_unitario: "",
      valor_venda: "",
      markup: "",
      fornecedor: "",
      foto_url: "",
    });
    setSelectedProduct(null);
    setImageFile(null);
    setImagePreview("");
    setAlertConfig({
      nivel_verde_min: 501,
      nivel_verde_max: 1000,
      nivel_amarelo_min: 201,
      nivel_amarelo_max: 500,
      nivel_vermelho_max: 200,
    });
  };

  const loadProductAlertConfig = (productId: string) => {
    const alert = stockAlerts.get(productId);
    if (alert) {
      setAlertConfig({
        nivel_verde_min: alert.nivel_verde_min,
        nivel_verde_max: alert.nivel_verde_max,
        nivel_amarelo_min: alert.nivel_amarelo_min,
        nivel_amarelo_max: alert.nivel_amarelo_max,
        nivel_vermelho_max: alert.nivel_vermelho_max,
      });
    }
  };

  return (
    <div className="min-h-screen bg-primary p-4">
      <Card className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Cadastro de Produto</h1>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            Voltar
          </Button>
        </div>

        {!selectedProduct ? (
          <>
            <div className="mb-6">
              <Input
                placeholder="Buscar por Nome, Código ou Código de Barras"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md"
              />
            </div>

            <div className="mb-4">
              <Button onClick={async () => {
                const nextCodigo = await getNextCodigo();
                setSelectedProduct({});
                setFormData({ ...formData, codigo: nextCodigo });
              }}>
                Novo Cadastro
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cor</TableHead>
                  <TableHead>Estoque</TableHead>
                  <TableHead>Alerta</TableHead>
                  <TableHead>Valor UN</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => {
                  const alertColor = getAlertColor(product);
                  return (
                    <HoverCard key={product.id}>
                      <HoverCardTrigger asChild>
                        <TableRow className={`${getRowBgColor(alertColor)} cursor-pointer transition-colors`}>
                          <TableCell>{product.codigo}</TableCell>
                          <TableCell>{product.nome}</TableCell>
                          <TableCell>{product.cor}</TableCell>
                          <TableCell>{product.estoque_atual}</TableCell>
                          <TableCell>{getAlertBadge(alertColor)}</TableCell>
                          <TableCell>R$ {product.valor_unitario?.toFixed(2)}</TableCell>
                          <TableCell>{product.fornecedor}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedProduct(product);
                                setFormData({
                                  ...product,
                                  estoque_atual: product.estoque_atual?.toString() || "",
                                  valor_unitario: product.valor_unitario?.toString() || "",
                                  valor_venda: product.valor_venda?.toString() || "",
                                  markup: product.markup?.toString() || "",
                                  codigo_barras: product.codigo_barras || "",
                                  fornecedor: product.fornecedor || "",
                                  foto_url: product.foto_url || "",
                                  cor: product.cor || "",
                                });
                                loadProductAlertConfig(product.id);
                              }}
                            >
                              Editar
                            </Button>
                          </TableCell>
                        </TableRow>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-80" side="right">
                        <div className="flex gap-4">
                          {product.foto_url && (
                            <img
                              src={product.foto_url}
                              alt={product.nome}
                              className="w-20 h-20 object-cover rounded-md"
                            />
                          )}
                          <div className="space-y-1">
                            <h4 className="font-semibold">{product.nome}</h4>
                            <p className="text-sm text-muted-foreground">Código: {product.codigo}</p>
                            <p className="text-sm text-muted-foreground">Cor: {product.cor || "-"}</p>
                            <p className="text-sm text-muted-foreground">Estoque: {product.estoque_atual}</p>
                            <p className="text-sm text-muted-foreground">
                              Valor: R$ {product.valor_unitario?.toFixed(2)} → R$ {product.valor_venda?.toFixed(2)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Markup: {product.markup ? `${product.markup}%` : "-"}
                            </p>
                          </div>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  );
                })}
              </TableBody>
            </Table>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="max-w-5xl">
            <div className="flex gap-6">
              {/* Left side - Photo upload */}
              <div className="w-48 space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <div className="border-2 border-dashed border-border rounded-lg p-4 flex flex-col items-center justify-center h-48 bg-muted/50 overflow-hidden">
                  {imagePreview || formData.foto_url ? (
                    <img 
                      src={imagePreview || formData.foto_url} 
                      alt="Produto" 
                      className="max-h-full max-w-full object-cover rounded"
                    />
                  ) : (
                    <div className="text-center text-sm text-muted-foreground">
                      Fazer upload do Computador
                    </div>
                  )}
                </div>
                <Button 
                  type="button" 
                  size="sm" 
                  className="w-full" 
                  variant="outline"
                  onClick={handleEditClick}
                >
                  Editar
                </Button>
                <div className="text-sm">
                  <div className="font-medium mb-2">Código de barras:</div>
                  <Input
                    value={formData.codigo_barras}
                    onChange={(e) => setFormData({ ...formData, codigo_barras: e.target.value })}
                    placeholder="Digite o código"
                  />
                </div>
                <div className="text-sm">
                  <div className="font-medium mb-1">Código: {formData.codigo || "..."}</div>
                </div>
              </div>

              {/* Right side - Form fields */}
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Nome:</label>
                    <Input
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Cor:</label>
                    <Input
                      value={formData.cor}
                      onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Quant. em Estoque:</label>
                    <Input
                      type="number"
                      value={formData.estoque_atual}
                      onChange={(e) => setFormData({ ...formData, estoque_atual: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Valor da unidade: R$</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.valor_unitario}
                      onChange={(e) => {
                        const newVal = e.target.value;
                        setFormData({ 
                          ...formData, 
                          valor_unitario: newVal,
                          markup: calculateMarkup(formData.valor_venda, newVal)
                        });
                      }}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Fornecedor:</label>
                    <Input
                      value={formData.fornecedor}
                      onChange={(e) => setFormData({ ...formData, fornecedor: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Valor de venda: R$</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.valor_venda}
                      onChange={(e) => {
                        const newVal = e.target.value;
                        setFormData({ 
                          ...formData, 
                          valor_venda: newVal,
                          markup: calculateMarkup(newVal, formData.valor_unitario)
                        });
                      }}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Markup: %</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.markup}
                      onChange={(e) => {
                        const newMarkup = e.target.value;
                        setFormData({ 
                          ...formData, 
                          markup: newMarkup,
                          valor_venda: calculateValorVenda(formData.valor_unitario, newMarkup)
                        });
                      }}
                    />
                  </div>
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowAlertConfig(true)}
                      className="mt-6"
                    >
                      Configurar Alerta
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button type="submit">
                    Concluir
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          </form>
        )}
      </Card>

      {/* Dialog para configurar alerta */}
      <Dialog open={showAlertConfig} onOpenChange={setShowAlertConfig}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configurar Faixas de Alerta</DialogTitle>
            <DialogDescription>
              Defina os limites de estoque para cada nível de alerta
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-status-green-light rounded-lg">
              <Label className="text-status-green font-medium">VERDE - Estoque Normal</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <Label className="text-xs">Mínimo</Label>
                  <Input
                    type="number"
                    value={alertConfig.nivel_verde_min}
                    onChange={(e) => setAlertConfig({
                      ...alertConfig,
                      nivel_verde_min: parseInt(e.target.value) || 0
                    })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Máximo</Label>
                  <Input
                    type="number"
                    value={alertConfig.nivel_verde_max}
                    onChange={(e) => setAlertConfig({
                      ...alertConfig,
                      nivel_verde_max: parseInt(e.target.value) || 0
                    })}
                  />
                </div>
              </div>
            </div>
            <div className="p-3 bg-status-yellow-light rounded-lg">
              <Label className="text-status-yellow font-medium">AMARELO - Estoque Médio</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <Label className="text-xs">Mínimo</Label>
                  <Input
                    type="number"
                    value={alertConfig.nivel_amarelo_min}
                    onChange={(e) => setAlertConfig({
                      ...alertConfig,
                      nivel_amarelo_min: parseInt(e.target.value) || 0
                    })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Máximo</Label>
                  <Input
                    type="number"
                    value={alertConfig.nivel_amarelo_max}
                    onChange={(e) => setAlertConfig({
                      ...alertConfig,
                      nivel_amarelo_max: parseInt(e.target.value) || 0
                    })}
                  />
                </div>
              </div>
            </div>
            <div className="p-3 bg-status-red-light rounded-lg">
              <Label className="text-status-red font-medium">VERMELHO - Estoque Baixo</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <Label className="text-xs">De 0 até</Label>
                  <Input
                    type="number"
                    value={alertConfig.nivel_vermelho_max}
                    onChange={(e) => setAlertConfig({
                      ...alertConfig,
                      nivel_vermelho_max: parseInt(e.target.value) || 0
                    })}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAlertConfig(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog para confirmar */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar {selectedProduct?.id ? "atualização" : "cadastro"}</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja {selectedProduct?.id ? "atualizar" : "cadastrar"} este produto?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSubmit}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
