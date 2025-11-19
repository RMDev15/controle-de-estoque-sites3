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
  const [editPassword, setEditPassword] = useState("");
  const [permissions, setPermissions] = useState({
    cadastro_view: false,
    cadastro_edit: false,
    terminal_view: true,
    terminal_edit: false,
    pedidos_view: true,
    pedidos_edit: false,
    alertas_view: true,
    alertas_edit: false,
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
        cadastro_view: false,
        cadastro_edit: false,
        terminal_view: true,
        terminal_edit: false,
        pedidos_view: true,
        pedidos_edit: false,
        alertas_view: true,
        alertas_edit: false,
        gerenciar_usuario: false,
      });
      // Se não tem senha temporária, mostrar ****
      setEditPassword(selectedUser.senha_temporaria ? "" : "****");
    }
  }, [selectedUser]);

  const fetchUsers = async () => {
    // Fetch profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .order("nome");
    
    if (!profiles) {
      setUsers([]);
      return;
    }

    // Fetch user roles for each profile
    const usersWithRoles = await Promise.all(
      profiles.map(async (profile) => {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", profile.id);
        
        return {
          ...profile,
          user_roles: roles || []
        };
      })
    );
    
    setUsers(usersWithRoles);
  };

  const filteredUsers = users.filter((u) =>
    u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUpdatePermissions = async () => {
    if (!selectedUser) return;

    // Proteger o master admin
    if (selectedUser.email === "ramonmatos390@gmail.com") {
      toast({
        title: "Ação não permitida",
        description: "O usuário master admin não pode ser modificado",
        variant: "destructive",
      });
      return;
    }

    const isCurrentlyAdmin = Array.isArray(selectedUser.user_roles) && 
      selectedUser.user_roles.some((ur: any) => ur.role === 'admin');

    // Prepare update data
    const updateData: any = { permissoes: permissions };
    
    // Se a senha foi alterada (não é **** e não está vazia)
    if (editPassword && editPassword !== "****") {
      updateData.senha_temporaria = false;
    }

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", selectedUser.id);

    if (error) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    // Handle admin role based on gerenciar_usuario permission
    if (permissions.gerenciar_usuario && !isCurrentlyAdmin) {
      await supabase
        .from("user_roles")
        .insert({ user_id: selectedUser.id, role: "admin" });
    } else if (!permissions.gerenciar_usuario && isCurrentlyAdmin) {
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", selectedUser.id)
        .eq("role", "admin");
    }

    toast({ title: "Permissões atualizadas com sucesso!" });
    setSelectedUser(null);
    setEditPassword("");
    fetchUsers();
  };

  const toggleAdmin = async (userId: string, isCurrentlyAdmin: boolean, userEmail: string) => {
    // Proteger o master admin
    if (userEmail === "ramonmatos390@gmail.com") {
      toast({
        title: "Ação não permitida",
        description: "O usuário master admin não pode ser modificado",
        variant: "destructive",
      });
      return;
    }

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

      // If gerenciar_usuario is checked, make them admin
      if (permissions.gerenciar_usuario) {
        await supabase
          .from("user_roles")
          .insert({ user_id: authData.user.id, role: "admin" });
      }
    }

    toast({ 
      title: "Usuário criado com sucesso!", 
      description: newUser.senha ? `Senha definida: ${senhaFinal}` : "Senha padrão: Temp100@" 
    });
    setIsCreating(false);
    setNewUser({ nome: "", email: "", senha: "" });
    setPermissions({
      cadastro_view: false,
      cadastro_edit: false,
      terminal_view: true,
      terminal_edit: false,
      pedidos_view: true,
      pedidos_edit: false,
      alertas_view: true,
      alertas_edit: false,
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
                  const isMasterAdmin = user.email === "ramonmatos390@gmail.com";
                  
                  return (
                    <TableRow key={user.id}>
                      <TableCell>{user.nome}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <span className={isAdmin ? "font-bold text-primary" : ""}>
                          {isAdmin ? (isMasterAdmin ? "Master Admin" : "Admin") : "Comum"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedUser(user)}
                            disabled={isMasterAdmin}
                          >
                            Editar
                          </Button>
                          {!isMasterAdmin && (
                            <Button
                              size="sm"
                              variant={isAdmin ? "destructive" : "default"}
                              onClick={() => toggleAdmin(user.id, isAdmin, user.email)}
                            >
                              {isAdmin ? "Remover Admin" : "Tornar Admin"}
                            </Button>
                          )}
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
                
                <div className="space-y-3">
                  <div className="font-medium text-sm">Cadastro de Produtos</div>
                  <div className="flex gap-4 ml-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="new-cadastro_view"
                        checked={permissions.cadastro_view}
                        onCheckedChange={(checked) =>
                          setPermissions({ ...permissions, cadastro_view: !!checked })
                        }
                      />
                      <label htmlFor="new-cadastro_view" className="text-sm cursor-pointer">Visualizar</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="new-cadastro_edit"
                        checked={permissions.cadastro_edit}
                        onCheckedChange={(checked) =>
                          setPermissions({ ...permissions, cadastro_edit: !!checked })
                        }
                      />
                      <label htmlFor="new-cadastro_edit" className="text-sm cursor-pointer">Editar</label>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="font-medium text-sm">Terminal de Vendas</div>
                  <div className="flex gap-4 ml-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="new-terminal_view"
                        checked={permissions.terminal_view}
                        onCheckedChange={(checked) =>
                          setPermissions({ ...permissions, terminal_view: !!checked })
                        }
                      />
                      <label htmlFor="new-terminal_view" className="text-sm cursor-pointer">Visualizar</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="new-terminal_edit"
                        checked={permissions.terminal_edit}
                        onCheckedChange={(checked) =>
                          setPermissions({ ...permissions, terminal_edit: !!checked })
                        }
                      />
                      <label htmlFor="new-terminal_edit" className="text-sm cursor-pointer">Editar</label>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="font-medium text-sm">Pedidos</div>
                  <div className="flex gap-4 ml-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="new-pedidos_view"
                        checked={permissions.pedidos_view}
                        onCheckedChange={(checked) =>
                          setPermissions({ ...permissions, pedidos_view: !!checked })
                        }
                      />
                      <label htmlFor="new-pedidos_view" className="text-sm cursor-pointer">Visualizar</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="new-pedidos_edit"
                        checked={permissions.pedidos_edit}
                        onCheckedChange={(checked) =>
                          setPermissions({ ...permissions, pedidos_edit: !!checked })
                        }
                      />
                      <label htmlFor="new-pedidos_edit" className="text-sm cursor-pointer">Editar</label>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="font-medium text-sm">Alertas</div>
                  <div className="flex gap-4 ml-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="new-alertas_view"
                        checked={permissions.alertas_view}
                        onCheckedChange={(checked) =>
                          setPermissions({ ...permissions, alertas_view: !!checked })
                        }
                      />
                      <label htmlFor="new-alertas_view" className="text-sm cursor-pointer">Visualizar</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="new-alertas_edit"
                        checked={permissions.alertas_edit}
                        onCheckedChange={(checked) =>
                          setPermissions({ ...permissions, alertas_edit: !!checked })
                        }
                      />
                      <label htmlFor="new-alertas_edit" className="text-sm cursor-pointer">Editar</label>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="new-gerenciar_usuario"
                      checked={permissions.gerenciar_usuario}
                      onCheckedChange={(checked) =>
                        setPermissions({ ...permissions, gerenciar_usuario: !!checked })
                      }
                    />
                    <label htmlFor="new-gerenciar_usuario" className="text-sm font-medium cursor-pointer">
                      Gerenciar Usuário
                    </label>
                  </div>
                  <div className="ml-6 text-sm text-muted-foreground">
                    {permissions.gerenciar_usuario ? "Tipo: Admin" : "Tipo: Usuário"}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCreateUser}>Criar Usuário</Button>
              <Button variant="outline" onClick={() => {
                setIsCreating(false);
                setNewUser({ nome: "", email: "", senha: "" });
                setPermissions({
                  cadastro_view: false,
                  cadastro_edit: false,
                  terminal_view: true,
                  terminal_edit: false,
                  pedidos_view: true,
                  pedidos_edit: false,
                  alertas_view: true,
                  alertas_edit: false,
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
              Editar Usuário - {selectedUser.nome}
            </h3>

            <div className="space-y-4 mb-6">
              <div className="space-y-2">
                <Label htmlFor="edit-nome">Nome</Label>
                <Input
                  id="edit-nome"
                  value={selectedUser.nome}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-email">E-mail</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={selectedUser.email}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-senha">
                  Senha {selectedUser.senha_temporaria ? "(opcional)" : "(atual: ****)"}
                </Label>
                <Input
                  id="edit-senha"
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder={selectedUser.senha_temporaria ? "Digite nova senha" : "Digite para alterar"}
                />
              </div>

              <div className="space-y-4 mt-6">
                <Label className="text-base font-semibold">Permissões do Usuário</Label>
                
                <div className="space-y-3">
                  <div className="font-medium text-sm">Cadastro de Produtos</div>
                  <div className="flex gap-4 ml-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="cadastro_view"
                        checked={permissions.cadastro_view}
                        onCheckedChange={(checked) =>
                          setPermissions({ ...permissions, cadastro_view: !!checked })
                        }
                      />
                      <label htmlFor="cadastro_view" className="text-sm cursor-pointer">Visualizar</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="cadastro_edit"
                        checked={permissions.cadastro_edit}
                        onCheckedChange={(checked) =>
                          setPermissions({ ...permissions, cadastro_edit: !!checked })
                        }
                      />
                      <label htmlFor="cadastro_edit" className="text-sm cursor-pointer">Editar</label>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="font-medium text-sm">Terminal de Vendas</div>
                  <div className="flex gap-4 ml-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="terminal_view"
                        checked={permissions.terminal_view}
                        onCheckedChange={(checked) =>
                          setPermissions({ ...permissions, terminal_view: !!checked })
                        }
                      />
                      <label htmlFor="terminal_view" className="text-sm cursor-pointer">Visualizar</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="terminal_edit"
                        checked={permissions.terminal_edit}
                        onCheckedChange={(checked) =>
                          setPermissions({ ...permissions, terminal_edit: !!checked })
                        }
                      />
                      <label htmlFor="terminal_edit" className="text-sm cursor-pointer">Editar</label>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="font-medium text-sm">Pedidos</div>
                  <div className="flex gap-4 ml-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="pedidos_view"
                        checked={permissions.pedidos_view}
                        onCheckedChange={(checked) =>
                          setPermissions({ ...permissions, pedidos_view: !!checked })
                        }
                      />
                      <label htmlFor="pedidos_view" className="text-sm cursor-pointer">Visualizar</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="pedidos_edit"
                        checked={permissions.pedidos_edit}
                        onCheckedChange={(checked) =>
                          setPermissions({ ...permissions, pedidos_edit: !!checked })
                        }
                      />
                      <label htmlFor="pedidos_edit" className="text-sm cursor-pointer">Editar</label>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="font-medium text-sm">Alertas</div>
                  <div className="flex gap-4 ml-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="alertas_view"
                        checked={permissions.alertas_view}
                        onCheckedChange={(checked) =>
                          setPermissions({ ...permissions, alertas_view: !!checked })
                        }
                      />
                      <label htmlFor="alertas_view" className="text-sm cursor-pointer">Visualizar</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="alertas_edit"
                        checked={permissions.alertas_edit}
                        onCheckedChange={(checked) =>
                          setPermissions({ ...permissions, alertas_edit: !!checked })
                        }
                      />
                      <label htmlFor="alertas_edit" className="text-sm cursor-pointer">Editar</label>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="gerenciar_usuario"
                      checked={permissions.gerenciar_usuario}
                      onCheckedChange={(checked) =>
                        setPermissions({ ...permissions, gerenciar_usuario: !!checked })
                      }
                    />
                    <label htmlFor="gerenciar_usuario" className="text-sm font-medium cursor-pointer">
                      Gerenciar Usuário
                    </label>
                  </div>
                  <div className="ml-6 text-sm text-muted-foreground">
                    {permissions.gerenciar_usuario ? "Tipo: Admin" : "Tipo: Usuário"}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleUpdatePermissions}>
                Salvar Alterações
              </Button>
              <Button variant="outline" onClick={() => {
                setSelectedUser(null);
                setEditPassword("");
              }}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
