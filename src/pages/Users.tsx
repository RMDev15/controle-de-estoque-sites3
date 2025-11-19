import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Users() {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newUser, setNewUser] = useState({
    nome: "",
    email: "",
    senha: "",
  });
  const [permissions, setPermissions] = useState({
    cadastro: false,
    terminal: false,
    pedidos: false,
    alertas: true,
    gerenciar_usuario: false,
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      setPermissions(selectedUser.permissoes || {
        cadastro: false,
        terminal: false,
        pedidos: false,
        alertas: true,
        gerenciar_usuario: false,
      });
    }
  }, [selectedUser]);

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*, user_roles(role)")
      .order("nome");
    setUsers(data || []);
  };

  const filteredUsers = users.filter((u) =>
    u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUpdatePermissions = async () => {
    if (!selectedUser) return;

    const { error } = await supabase
      .from("profiles")
      .update({ permissoes: permissions })
      .eq("id", selectedUser.id);

    if (error) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Permissões atualizadas com sucesso!" });
      setSelectedUser(null);
      fetchUsers();
    }
  };

  const toggleAdmin = async (userId: string, isCurrentlyAdmin: boolean) => {
    if (isCurrentlyAdmin) {
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "admin");
    } else {
      await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: "admin" });
    }
    
    toast({ title: "Status de admin atualizado!" });
    fetchUsers();
  };

  const handleCreateUser = async () => {
    if (!newUser.nome || !newUser.email) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    const senhaFinal = newUser.senha || "Temp100@";

    // Get current session to restore after
    const { data: { session: currentSession } } = await supabase.auth.getSession();

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: newUser.email,
      password: senhaFinal,
      options: {
        data: {
          nome: newUser.nome,
        },
      },
    });

    // Restore admin session immediately
    if (currentSession) {
      await supabase.auth.setSession({
        access_token: currentSession.access_token,
        refresh_token: currentSession.refresh_token,
      });
    }

    if (authError) {
      toast({
        title: "Erro",
        description: authError.message,
        variant: "destructive",
      });
      return;
    }

    // Update user profile with permissions
    if (authData?.user) {
      await supabase
        .from("profiles")
        .update({ 
          permissoes: permissions,
          senha_temporaria: !newUser.senha || newUser.senha === "Temp100@"
        })
        .eq("id", authData.user.id);
    }

    toast({ 
      title: "Usuário criado com sucesso!", 
      description: newUser.senha ? `Senha definida: ${senhaFinal}` : "Senha padrão: Temp100@" 
    });
    setIsCreating(false);
    setNewUser({ nome: "", email: "", senha: "" });
    setPermissions({
      cadastro: false,
      terminal: false,
      pedidos: false,
      alertas: true,
      gerenciar_usuario: false,
    });
    fetchUsers();
  };

  return (
    <div className="min-h-screen bg-primary p-4">
      <Card className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Gerenciar Usuário</h1>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            Voltar
          </Button>
        </div>

        {!selectedUser && !isCreating ? (
          <>
            <div className="mb-6 flex gap-4">
              <Input
                placeholder="Digite o Nome para buscar"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md"
              />
              <Button onClick={() => setIsCreating(true)}>
                Novo Usuário
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => {
                  const isAdmin = Array.isArray(user.user_roles) && 
                    user.user_roles.some((ur: any) => ur.role === 'admin');
                  
                  return (
                    <TableRow key={user.id}>
                      <TableCell>{user.nome}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <span className={isAdmin ? "font-bold text-primary" : ""}>
                          {isAdmin ? "Admin" : "Comum"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedUser(user)}
                          >
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant={isAdmin ? "destructive" : "default"}
                            onClick={() => toggleAdmin(user.id, isAdmin)}
                          >
                            {isAdmin ? "Remover Admin" : "Tornar Admin"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </>
        ) : isCreating ? (
          <div className="max-w-2xl">
            <h3 className="text-xl font-bold mb-4">Criar Novo Usuário</h3>

            <div className="space-y-4 mb-6">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  value={newUser.nome}
                  onChange={(e) => setNewUser({ ...newUser, nome: e.target.value })}
                  placeholder="Nome completo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="senha">Senha (opcional - padrão: Temp100@)</Label>
                <Input
                  id="senha"
                  type="password"
                  value={newUser.senha}
                  onChange={(e) => setNewUser({ ...newUser, senha: e.target.value })}
                  placeholder="Temp100@"
                />
              </div>

              <div className="space-y-4 mt-6">
                <Label className="text-base font-semibold">Permissões do Usuário</Label>
                {Object.entries(permissions).map(([key, value]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Checkbox
                      id={`new-${key}`}
                      checked={value}
                      onCheckedChange={(checked) =>
                        setPermissions({ ...permissions, [key]: checked })
                      }
                    />
                    <label
                      htmlFor={`new-${key}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {key === "cadastro" && "Cadastro de Produtos"}
                      {key === "terminal" && "Terminal de Vendas"}
                      {key === "pedidos" && "Pedidos"}
                      {key === "alertas" && "Alertas"}
                      {key === "gerenciar_usuario" && "Gerenciar Usuário"}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCreateUser}>Criar Usuário</Button>
              <Button variant="outline" onClick={() => {
                setIsCreating(false);
                setNewUser({ nome: "", email: "", senha: "" });
                setPermissions({
                  cadastro: false,
                  terminal: false,
                  pedidos: false,
                  alertas: true,
                  gerenciar_usuario: false,
                });
              }}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl">
            <h3 className="text-xl font-bold mb-4">
              Editar Permissões - {selectedUser.nome}
            </h3>

            <div className="space-y-4 mb-6">
              {Object.entries(permissions).map(([key, value]) => (
                <div key={key} className="flex items-center space-x-2">
                  <Checkbox
                    id={key}
                    checked={value}
                    onCheckedChange={(checked) =>
                      setPermissions({ ...permissions, [key]: checked })
                    }
                  />
                  <label
                    htmlFor={key}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {key === "cadastro" && "Cadastro de Produtos"}
                    {key === "terminal" && "Terminal de Vendas"}
                    {key === "pedidos" && "Pedidos"}
                    {key === "alertas" && "Alertas"}
                    {key === "gerenciar_usuario" && "Gerenciar Usuário"}
                  </label>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button onClick={handleUpdatePermissions}>
                Salvar Alterações
              </Button>
              <Button variant="outline" onClick={() => setSelectedUser(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
