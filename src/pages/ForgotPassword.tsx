import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Check, X, Eye, EyeOff } from "lucide-react";
import logo from "@/assets/logo.jpg";

type Step = "email" | "code" | "password";

export default function ForgotPassword() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // Password validation rules
  const passwordRules = {
    minLength: newPassword.length >= 8,
    hasUpperCase: /[A-Z]/.test(newPassword),
    hasLowerCase: /[a-z]/.test(newPassword),
    hasNumber: /[0-9]/.test(newPassword),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
  };

  const isPasswordValid = Object.values(passwordRules).every(Boolean);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

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
      const response = await supabase.functions.invoke("send-reset-code", {
        body: { email: email.toLowerCase() },
      });

      if (response.error) throw new Error(response.error.message);

      toast({
        title: "Código enviado!",
        description: "Verifique seu e-mail para o código de 6 dígitos.",
      });

      setStep("code");
      setResendTimer(180); // 3 minutes
    } catch (error: any) {
      console.error("Error sending code:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao enviar código",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      toast({
        title: "Erro",
        description: "Digite o código completo de 6 dígitos",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await supabase.functions.invoke("verify-reset-code", {
        body: { email: email.toLowerCase(), code },
      });

      if (response.error) throw new Error(response.error.message);

      const data = response.data;
      if (!data.valid) {
        toast({
          title: "Código inválido",
          description: data.error || "O código informado não é válido",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Código verificado!",
        description: "Agora defina sua nova senha.",
      });

      setStep("password");
    } catch (error: any) {
      console.error("Error verifying code:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao verificar código",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendTimer > 0) return;
    setCode("");
    await handleSendCode();
  };

  const handleResetPassword = async () => {
    if (!isPasswordValid) {
      toast({
        title: "Erro",
        description: "A senha não atende aos requisitos mínimos",
        variant: "destructive",
      });
      return;
    }

    if (!passwordsMatch) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await supabase.functions.invoke("reset-password", {
        body: { email: email.toLowerCase(), code, newPassword },
      });

      if (response.error) throw new Error(response.error.message);

      const data = response.data;
      if (!data.success) {
        toast({
          title: "Erro",
          description: data.error || "Erro ao redefinir senha",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Senha alterada!",
        description: "Sua senha foi redefinida com sucesso. Faça login com a nova senha.",
      });

      setTimeout(() => {
        navigate("/auth");
      }, 2000);
    } catch (error: any) {
      console.error("Error resetting password:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao redefinir senha",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const renderStep = () => {
    switch (step) {
      case "email":
        return (
          <>
            <h2 className="text-3xl font-bold text-foreground">Altere sua Senha</h2>
            <p className="text-muted-foreground mt-2">Digite seu E-mail Cadastrado</p>
            <div className="space-y-6 mt-8">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendCode()}
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
                  variant="link"
                  className="w-full text-primary"
                  onClick={() => navigate("/auth")}
                  disabled={loading}
                >
                  Voltar
                </Button>
              </div>
            </div>
          </>
        );

      case "code":
        return (
          <>
            <h2 className="text-3xl font-bold text-foreground">Digite o código recebido</h2>
            <p className="text-muted-foreground mt-2">
              Digite o Código Recebido no e-mail
            </p>
            <div className="space-y-6 mt-8">
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={code}
                  onChange={(value) => setCode(value)}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <div className="text-center">
                {resendTimer > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Reenviar código em {formatTimer(resendTimer)}
                  </p>
                ) : (
                  <Button
                    variant="link"
                    className="text-primary p-0 h-auto"
                    onClick={handleResendCode}
                    disabled={loading}
                  >
                    Reenviar código
                  </Button>
                )}
              </div>
              <div className="space-y-4">
                <Button
                  className="w-full bg-primary hover:bg-primary/90"
                  onClick={handleVerifyCode}
                  disabled={loading || code.length !== 6}
                >
                  {loading ? "Verificando..." : "Confirmar"}
                </Button>
                <Button
                  variant="link"
                  className="w-full text-primary"
                  onClick={() => setStep("email")}
                  disabled={loading}
                >
                  Voltar
                </Button>
              </div>
            </div>
          </>
        );

      case "password":
        return (
          <>
            <h2 className="text-3xl font-bold text-foreground">Finalize sua Nova Senha</h2>
            <div className="mt-4 p-4 bg-muted rounded-lg text-sm">
              <p className="font-medium text-foreground mb-2">Senha com no mínimo 8 Caracteres:</p>
              <ul className="space-y-1">
                <li className="flex items-center gap-2">
                  {passwordRules.hasUpperCase ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <X className="h-4 w-4 text-destructive" />
                  )}
                  <span className={passwordRules.hasUpperCase ? "text-green-600" : "text-muted-foreground"}>
                    Letra Maiúscula
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  {passwordRules.hasLowerCase ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <X className="h-4 w-4 text-destructive" />
                  )}
                  <span className={passwordRules.hasLowerCase ? "text-green-600" : "text-muted-foreground"}>
                    Letra Minúscula
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  {passwordRules.hasNumber ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <X className="h-4 w-4 text-destructive" />
                  )}
                  <span className={passwordRules.hasNumber ? "text-green-600" : "text-muted-foreground"}>
                    Número
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  {passwordRules.hasSpecialChar ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <X className="h-4 w-4 text-destructive" />
                  )}
                  <span className={passwordRules.hasSpecialChar ? "text-green-600" : "text-muted-foreground"}>
                    Símbolo (!@#$%...)
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  {passwordRules.minLength ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <X className="h-4 w-4 text-destructive" />
                  )}
                  <span className={passwordRules.minLength ? "text-green-600" : "text-muted-foreground"}>
                    Mínimo 8 caracteres
                  </span>
                </li>
              </ul>
            </div>
            <div className="space-y-6 mt-6">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Digite a nova senha"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirme a nova senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword.length > 0 && (
                  <p className={`text-sm ${passwordsMatch ? "text-green-600" : "text-destructive"}`}>
                    {passwordsMatch ? "✓ Senhas coincidem" : "✗ Senhas não coincidem"}
                  </p>
                )}
              </div>
              <div className="space-y-4">
                <Button
                  className="w-full bg-primary hover:bg-primary/90"
                  onClick={handleResetPassword}
                  disabled={loading || !isPasswordValid || !passwordsMatch}
                >
                  {loading ? "Salvando..." : "Confirmar"}
                </Button>
                <Button
                  variant="link"
                  className="w-full text-primary"
                  onClick={() => setStep("code")}
                  disabled={loading}
                >
                  Voltar
                </Button>
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left panel - visible on large screens */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[hsl(var(--auth-gradient-start))] to-[hsl(var(--auth-gradient-end))] items-center justify-center p-12">
        <div className="text-center text-white">
          <img src={logo} alt="Só Bujigangas" className="w-64 h-auto mx-auto mb-8" />
          <h1 className="text-4xl font-bold mb-4">Gerenciador de Estoque</h1>
          <p className="text-xl">Sistema completo para gestão de produtos e vendas</p>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background min-h-screen">
        <div className="w-full max-w-md space-y-4">
          <div className="text-center">
            <img src={logo} alt="Só Bujigangas" className="w-32 h-auto mx-auto mb-4 lg:hidden" />
            {renderStep()}
          </div>
          <div className="text-center text-xs text-muted-foreground mt-8">
            2025. Patente, Marca e Registro.
          </div>
        </div>
      </div>
    </div>
  );
}
