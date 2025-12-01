import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.jpg";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSendResetEmail = async () => {
    if (!email) {
      toast({
        title: "Erro",
        description: "Digite seu e-mail",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Usa diretamente o fluxo nativo de recuperação de senha
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/change-password`,
      });

      if (error) throw error;

      toast({
        title: "E-mail enviado!",
        description:
          "Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha.",
      });

      setTimeout(() => {
        navigate("/auth");
      }, 2000);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[hsl(var(--auth-gradient-start))] to-[hsl(var(--auth-gradient-end))] items-center justify-center p-12">
        <div className="text-center text-white">
          <img src={logo} alt="Só Bujigangas" className="w-64 h-auto mx-auto mb-8" />
          <h1 className="text-4xl font-bold mb-4">Gerenciador de Estoque</h1>
          <p className="text-xl">Sistema completo para gestão de produtos e vendas</p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <img src={logo} alt="Só Bujigangas" className="w-32 h-auto mx-auto mb-4 lg:hidden" />
            <h2 className="text-3xl font-bold text-foreground">Recuperar Senha</h2>
            <p className="text-muted-foreground mt-2">Digite seu e-mail cadastrado</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendResetEmail()}
                required
              />
            </div>
            <div className="space-y-4">
              <Button
                className="w-full bg-primary hover:bg-primary/90"
                onClick={handleSendResetEmail}
                disabled={loading}
              >
                {loading ? "Enviando..." : "Enviar Link de Recuperação"}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate("/auth")}
                disabled={loading}
              >
                Voltar para Login
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
