import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.jpg";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await signIn(email, password);
      if (error) throw error;

      // Check if user has temporary password (only for non-admin users)
      const { data: profile } = await supabase
        .from("profiles")
        .select("senha_temporaria")
        .eq("email", email)
        .single();

      // Check if user is admin
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id);

      const isAdmin = rolesData?.some((ur: any) => ur.role === 'admin') || false;

      // Only redirect non-admin users with temporary passwords
      if (profile?.senha_temporaria && !isAdmin) {
        toast({
          title: "Atenção",
          description: "Você precisa alterar sua senha temporária",
        });
        navigate("/change-password");
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "E-mail ou senha incorreta",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - gradient background */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[hsl(var(--auth-gradient-start))] to-[hsl(var(--auth-gradient-end))] items-center justify-center p-12">
        <div className="text-center text-white">
          <img src={logo} alt="Só Bujigangas" className="w-64 h-auto mx-auto mb-8" />
          <h1 className="text-4xl font-bold mb-4">Gerenciador de Estoque</h1>
          <p className="text-xl">Sistema completo para gestão de produtos e vendas</p>
        </div>
      </div>

      {/* Right side - form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <img src={logo} alt="Só Bujigangas" className="w-32 h-auto mx-auto mb-4 lg:hidden" />
            <h2 className="text-3xl font-bold text-foreground">Login</h2>
            <p className="text-muted-foreground mt-2">Gerenciador de Estoque</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <Button
                  variant="link"
                  className="px-0 font-normal text-sm text-primary"
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                >
                  Esqueci a senha
                </Button>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90"
              disabled={loading}
            >
              {loading ? "Carregando..." : "Entrar"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
