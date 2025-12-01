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

export default function Users() {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [newUser, setNewUser] = useState({
    nome: "",
    email: "",
    senha: "",
  });
  const [editPassword, setEditPassword] = useState("");
  const [creatingUser, setCreatingUser] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
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

  // Detectar mudanças não salvas
  useEffect(() => {
    if (isCreating || selectedUser) {
      setHasUnsavedChanges(true);
    } else {
      setHasUnsavedChanges(false);
    }
  }, [isCreating, selectedUser, permissions, newUser, editPassword]);

  // Prevenir saída com dados não salvos
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'Você tem alterações não salvas. Deseja realmente sair?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

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

    try {
      setSavingUser(true);
      console.log("Salvando usuário", selectedUser.email, permissions);

      // Prepare update data
      const updateData: any = { permissoes: permissions };

      // Se a senha foi alterada (não é **** e não está vazia)
      if (editPassword && editPassword !== "****") {
        // Por segurança, marcamos apenas como senha temporária para forçar troca no próximo login
        updateData.senha_temporaria = true;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", selectedUser.id);

      if (updateError) {
        throw updateError;
      }

      // Handle admin role based on gerenciar_usuario permission
      if (permissions.gerenciar_usuario && !isCurrentlyAdmin) {
        const { error: insertError } = await supabase
          .from("user_roles")
          .insert({ user_id: selectedUser.id, role: "admin" });

        if (insertError) {
          throw insertError;
        }
      } else if (!permissions.gerenciar_usuario && isCurrentlyAdmin) {
        const { error: deleteError } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", selectedUser.id)
          .eq("role", "admin");

        if (deleteError) {
          throw deleteError;
        }
      }

      toast({
        title: "Sucesso!",
        description: "Permissões e configurações atualizadas com sucesso!",
      });
      handleCancel();
      fetchUsers();
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast({
        title: "Erro ao atualizar",
        description: error.message || "Ocorreu um erro ao atualizar o usuário",
        variant: "destructive",
      });
    } finally {
      setSavingUser(false);
    }
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

    try {
      if (isCurrentlyAdmin) {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", "admin");
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: "admin" });
        
        if (error) throw error;
      }
      
      toast({ 
        title: "Sucesso!", 
        description: isCurrentlyAdmin ? "Status de admin removido" : "Usuário promovido a admin"
      });
      fetchUsers();
    } catch (error: any) {
      console.error("Error toggling admin:", error);
      toast({
        title: "Erro ao alterar status",
        description: error.message || "Ocorreu um erro ao alterar o status de admin",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    // Proteger o master admin
    if (userToDelete.email === "ramonmatos390@gmail.com") {
      toast({
        title: "Ação não permitida",
        description: "O usuário master admin não pode ser excluído",
        variant: "destructive",
      });
      setUserToDelete(null);
      return;
    }

    try {
      // First delete from profiles table (will also delete from user_roles due to cascade)
      const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userToDelete.id);

      if (profileError) {
        throw profileError;
      }

      toast({
        title: "Usuário excluído com sucesso!",
        description: `${userToDelete.nome} foi removido do sistema.`,
      });
      
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir usuário",
        description: error.message || "Ocorreu um erro ao excluir o usuário",
        variant: "destructive",
      });
    }

    setUserToDelete(null);
  };

  const handleCancelWithConfirmation = () => {
    if (hasUnsavedChanges) {
      setShowCancelDialog(true);
    } else {
      handleCancel();
    }
  };

  const handleCancel = () => {
    setIsCreating(false);
    setSelectedUser(null);
    setEditPassword("");
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
    setShowCancelDialog(false);
    setHasUnsavedChanges(false);
  };

  const handleBackWithConfirmation = () => {
    if (hasUnsavedChanges) {
      setShowCancelDialog(true);
    } else {
      navigate("/dashboard");
    }
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

    try {
      setCreatingUser(true);
      console.log("Criando usuário", newUser.email, permissions);

      // Get current session to restore after
      const { data: { session: currentSession } } = await supabase.auth.getSession();

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: senhaFinal,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            nome: newUser.nome,
          },
        },
      });

      // Restore admin session imediatamente, independente de sucesso
      if (currentSession) {
        await supabase.auth.setSession({
          access_token: currentSession.access_token,
          refresh_token: currentSession.refresh_token,
        });
      }

      if (authError) {
        throw authError;
      }

      if (!authData?.user) {
        throw new Error("Usuário criado, mas não retornado pela autenticação.");
      }

      // Update user profile with permissions
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          permissoes: permissions,
          senha_temporaria: !newUser.senha || newUser.senha === "Temp100@",
        })
        .eq("id", authData.user.id);

      if (updateError) {
        throw updateError;
      }

      // If gerenciar_usuario is checked, make them admin
      if (permissions.gerenciar_usuario) {
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({ user_id: authData.user.id, role: "admin" });

        if (roleError) {
          throw roleError;
        }
      }

      toast({
        title: "Sucesso!",
        description: `Usuário criado! ${newUser.senha ? `Senha: ${senhaFinal}` : "Senha padrão: Temp100@"}`,
      });
      handleCancel();
      fetchUsers();
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast({
        title: "Erro ao criar usuário",
        description: error.message || "Ocorreu um erro ao criar o usuário",
        variant: "destructive",
      });
    } finally {
      setCreatingUser(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary p-4">
      <Card className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Gerenciar Usuário</h1>
          <Button variant="outline" onClick={handleBackWithConfirmation}>
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
                            <>
                              <Button
                                size="sm"
                                variant={isAdmin ? "destructive" : "default"}
                                onClick={() => toggleAdmin(user.id, isAdmin, user.email)}
                              >
                                {isAdmin ? "Remover Admin" : "Tornar Admin"}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setUserToDelete(user)}
                              >
                                Excluir
                              </Button>
                            </>
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
              <Button onClick={handleCreateUser} disabled={creatingUser}>
                {creatingUser ? "Criando..." : "Criar Usuário"}
              </Button>
              <Button variant="outline" onClick={handleCancelWithConfirmation} disabled={creatingUser}>
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
              <Button variant="outline" onClick={handleCancelWithConfirmation}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </Card>

      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o usuário <strong>{userToDelete?.nome}</strong>?
              <br />
              Esta ação não pode ser desfeita e todos os dados do usuário serão permanentemente removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterações não salvas</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem alterações não salvas. Deseja realmente sair sem salvar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar Editando</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sair sem Salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
