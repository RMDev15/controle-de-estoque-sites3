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

export default function Products() {
  const [products, setProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
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

  const filteredProducts = products.filter((p) =>
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.codigo_barras && p.codigo_barras.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const dataToSave = {
      ...formData,
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
        toast({ title: "Produto atualizado com sucesso!" });
        resetForm();
        fetchProducts();
      }
    } else {
      const { error } = await supabase
        .from("products")
        .insert(dataToSave);
      
      if (error) {
        toast({
          title: "Erro",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Produto cadastrado com sucesso!" });
        resetForm();
        fetchProducts();
      }
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
      .select("codigo")
      .order("codigo", { ascending: false })
      .limit(1);
    
    if (data && data.length > 0) {
      const lastCode = parseInt(data[0].codigo) || 0;
      return String(lastCode + 1).padStart(3, "0");
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
                  <TableHead>Valor UN</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>{product.codigo}</TableCell>
                    <TableCell>{product.nome}</TableCell>
                    <TableCell>{product.cor}</TableCell>
                    <TableCell>{product.estoque_atual}</TableCell>
                    <TableCell>R$ {product.valor_unitario}</TableCell>
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
                          });
                        }}
                      >
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
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
                  <div className="col-span-2">
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
    </div>
  );
}
