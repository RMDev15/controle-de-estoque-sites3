import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import logo from "@/assets/logo.jpg";

export default function Dashboard() {
  const { profile, isAdmin, signOut, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  const hasPermission = (permission: string) => {
    return isAdmin || profile?.permissoes?.[permission] === true;
  };

  return (
    <div className="min-h-screen bg-primary p-8">
      <div className="max-w-7xl mx-auto">
        <Card className="p-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left side - Logo or Charts */}
            <div className="lg:w-1/2 flex items-center justify-center bg-primary/10 rounded-lg p-8">
              {isAdmin ? (
                <div className="w-full">
                  <h3 className="text-xl font-bold mb-4">Histórico de Entrada e Saída</h3>
                  <p className="text-muted-foreground">Gráfico será implementado aqui</p>
                </div>
              ) : (
                <img src={logo} alt="Só Bujigangas" className="w-64 h-auto" />
              )}
            </div>

            {/* Right side - Navigation */}
            <div className="lg:w-1/2 space-y-4">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-foreground">
                  Bem Vindo {profile?.nome?.split(" ")[0]}
                </h2>
                {isAdmin && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Gerenciador Admin/Usuário
                  </p>
                )}
              </div>

              <div className="space-y-3">
                {isAdmin && (
                  <Button
                    className="w-full bg-primary hover:bg-primary/90"
                    onClick={() => navigate("/users")}
                  >
                    Gerenciar Usuário
                  </Button>
                )}

                {hasPermission("cadastro") && (
                  <Button
                    className="w-full bg-primary hover:bg-primary/90"
                    onClick={() => navigate("/products")}
                  >
                    Cadastro de Produtos
                  </Button>
                )}

                {hasPermission("terminal") && (
                  <Button
                    className="w-full bg-primary hover:bg-primary/90"
                    onClick={() => navigate("/sales")}
                  >
                    Terminal de Vendas
                  </Button>
                )}

                {hasPermission("pedidos") && (
                  <Button
                    className="w-full bg-primary hover:bg-primary/90"
                    onClick={() => navigate("/orders")}
                  >
                    Pedidos
                  </Button>
                )}

                {hasPermission("alertas") && (
                  <Button
                    className="w-full bg-primary hover:bg-primary/90"
                    onClick={() => navigate("/alerts")}
                  >
                    Alertas
                  </Button>
                )}

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={signOut}
                >
                  Sair
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
