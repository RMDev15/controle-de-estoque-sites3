import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ChartFiltersProps {
  onFilterChange: (filters: FilterState) => void;
}

export interface FilterState {
  searchTerm: string;
  category: string;
  sortBy: 'most' | 'least' | 'none';
  selectedProducts: string[];
}

export default function ChartFilters({ onFilterChange }: ChartFiltersProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'most' | 'least' | 'none'>('none');
  const [categories, setCategories] = useState<string[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  useEffect(() => {
    onFilterChange({
      searchTerm,
      category,
      sortBy,
      selectedProducts,
    });
  }, [searchTerm, category, sortBy, selectedProducts]);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('products')
      .select('fornecedor')
      .not('fornecedor', 'is', null);
    
    if (data) {
      const uniqueCategories = [...new Set(data.map(p => p.fornecedor).filter(Boolean))];
      setCategories(uniqueCategories);
    }
  };

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('id, nome, codigo')
      .order('nome');
    
    if (data) {
      setProducts(data);
    }
  };

  const filteredProducts = products.filter(p => 
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.codigo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleProduct = (productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const clearFilters = () => {
    setSearchTerm('');
    setCategory('all');
    setSortBy('none');
    setSelectedProducts([]);
  };

  return (
    <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm">Filtros</h4>
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="h-4 w-4 mr-1" />
          Limpar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Busca por produto */}
        <div className="space-y-2">
          <Label htmlFor="search">Buscar Produto</Label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Nome ou código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        {/* Categoria/Fornecedor */}
        <div className="space-y-2">
          <Label htmlFor="category">Fornecedor</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger id="category">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Ordenação */}
        <div className="space-y-2">
          <Label htmlFor="sort">Ordenar por</Label>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
            <SelectTrigger id="sort">
              <SelectValue placeholder="Padrão" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Padrão</SelectItem>
              <SelectItem value="most">Mais vendidos</SelectItem>
              <SelectItem value="least">Menos vendidos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Lista de produtos filtrados para seleção múltipla */}
      {searchTerm && filteredProducts.length > 0 && (
        <div className="space-y-2">
          <Label>Comparar produtos (selecione até 5)</Label>
          <div className="max-h-40 overflow-y-auto space-y-1 border rounded-md p-2">
            {filteredProducts.slice(0, 10).map((product) => (
              <div
                key={product.id}
                onClick={() => selectedProducts.length < 5 && toggleProduct(product.id)}
                className={`p-2 rounded cursor-pointer text-sm ${
                  selectedProducts.includes(product.id)
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                } ${selectedProducts.length >= 5 && !selectedProducts.includes(product.id) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {product.codigo} - {product.nome}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Produtos selecionados */}
      {selectedProducts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedProducts.map((productId) => {
            const product = products.find(p => p.id === productId);
            return (
              <div
                key={productId}
                className="flex items-center gap-1 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs"
              >
                {product?.nome}
                <button
                  onClick={() => toggleProduct(productId)}
                  className="hover:bg-primary-foreground/20 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
