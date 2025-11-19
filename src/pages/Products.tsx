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

export default function Products() {
  const [products, setProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [formData, setFormData] = useState({
    codigo: "",
    nome: "",
    cor: "",
    estoque_atual: 0,
    valor_unitario: 0,
    valor_venda: 0,
    fornecedor: "",
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    setProducts(data || []);
  };

  const filteredProducts = products.filter((p) =>
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.codigo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const markup = formData.valor_venda > 0 && formData.valor_unitario > 0
      ? ((formData.valor_venda - formData.valor_unitario) / formData.valor_unitario) * 100
      : 0;

    if (selectedProduct) {
      const { error } = await supabase
        .from("products")
        .update({ ...formData, markup })
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
        .insert({ ...formData, markup });
      
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

  const resetForm = () => {
    setFormData({
      codigo: "",
      nome: "",
      cor: "",
      estoque_atual: 0,
      valor_unitario: 0,
      valor_venda: 0,
      fornecedor: "",
    });
    setSelectedProduct(null);
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
                placeholder="Buscar por Nome ou Código"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md"
              />
            </div>

            <div className="mb-4">
              <Button onClick={() => setSelectedProduct({})}>
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
                          setFormData(product);
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
          <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Código</label>
                <Input
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Nome</label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cor</label>
                <Input
                  value={formData.cor}
                  onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Estoque</label>
                <Input
                  type="number"
                  value={formData.estoque_atual}
                  onChange={(e) => setFormData({ ...formData, estoque_atual: parseInt(e.target.value) })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Valor Unitário</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.valor_unitario}
                  onChange={(e) => setFormData({ ...formData, valor_unitario: parseFloat(e.target.value) })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Valor Venda</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.valor_venda}
                  onChange={(e) => setFormData({ ...formData, valor_venda: parseFloat(e.target.value) })}
                  required
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Fornecedor</label>
                <Input
                  value={formData.fornecedor}
                  onChange={(e) => setFormData({ ...formData, fornecedor: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit">
                {selectedProduct?.id ? "Atualizar" : "Cadastrar"}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
