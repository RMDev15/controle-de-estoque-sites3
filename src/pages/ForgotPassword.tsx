import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.jpg";

export default function ForgotPassword() {
  const [step, setStep] = useState<"email" | "code" | "newPassword">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSendCode = async () => {
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
      // Verify if email exists
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("email", email)
        .single();

      if (!profile) {
        toast({
          title: "Erro",
          description: "E-mail não encontrado",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Generate 6-digit code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedCode(verificationCode);

      // TODO: Send email with code via edge function
      // For now, we'll just show it in the toast
      toast({
        title: "Código enviado!",
        description: `Seu código de verificação é: ${verificationCode}`,
      });

      setStep("code");
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

  const handleVerifyCode = () => {
    if (code !== generatedCode) {
      toast({
        title: "Erro",
        description: "Código inválido",
        variant: "destructive",
      });
      return;
    }
    setStep("newPassword");
  };

  const handleResetPassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter no mínimo 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      // Update senha_temporaria flag
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({ senha_temporaria: false })
          .eq("email", email);
      }

      toast({
        title: "Sucesso!",
        description: "Senha alterada com sucesso",
      });
      navigate("/auth");
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
            <h2 className="text-3xl font-bold text-foreground">
              {step === "email" && "Altere sua Senha"}
              {step === "code" && "Digite o código recebido"}
              {step === "newPassword" && "Finalize sua Nova Senha"}
            </h2>
            <p className="text-muted-foreground mt-2">Gerenciador de Estoque</p>
          </div>

          {step === "email" && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Digite seu E-mail Cadastrado</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-4">
                <Button
                  className="w-full bg-primary hover:bg-primary/90"
                  onClick={handleSendCode}
                  disabled={loading}
                >
                  {loading ? "Enviando..." : "Enviar"}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate("/auth")}
                >
                  Voltar
                </Button>
              </div>
            </div>
          )}

          {step === "code" && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="code">Digite o Código Recebido no e-mail</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  maxLength={6}
                  required
                />
              </div>
              <div className="space-y-4">
                <Button
                  className="w-full bg-primary hover:bg-primary/90"
                  onClick={handleVerifyCode}
                >
                  Confirmar
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setStep("email")}
                >
                  Voltar
                </Button>
              </div>
            </div>
          )}

          {step === "newPassword" && (
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground text-center">
                Senha com no mínimo 8 Caracteres,<br />
                Letras Maiúsculas, Letras Minúsculas,<br />
                Número e Símbolo
              </p>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova Senha</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirme Nova Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-4">
                <Button
                  className="w-full bg-primary hover:bg-primary/90"
                  onClick={handleResetPassword}
                  disabled={loading}
                >
                  {loading ? "Alterando..." : "Confirmar"}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate("/auth")}
                >
                  Voltar
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
