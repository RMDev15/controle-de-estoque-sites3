import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Check, X, Eye, EyeOff } from "lucide-react";
import logo from "@/assets/logo.jpg";

export default function ChangePassword() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();

  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);

  // Password validation rules with visual feedback
  const passwordRules = {
    minLength: newPassword.length >= 8,
    hasUpperCase: /[A-Z]/.test(newPassword),
    hasLowerCase: /[a-z]/.test(newPassword),
    hasNumber: /[0-9]/.test(newPassword),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
  };

  const isPasswordValid = Object.values(passwordRules).every(Boolean);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const handleChangePassword = async () => {
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
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      // Update senha_temporaria flag
      if (user) {
        await supabase
          .from("profiles")
          .update({ senha_temporaria: false })
          .eq("id", user.id);
        
        // Refresh profile to get updated permissions
        await refreshProfile();
      }

      toast({
        title: "Sucesso!",
        description: "Senha alterada com sucesso",
      });
      navigate("/dashboard");
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
            <h2 className="text-3xl font-bold text-foreground">Finalize sua Nova Senha</h2>
            <p className="text-muted-foreground mt-2">Gerenciador de Estoque</p>
          </div>

          {/* Visual password validation feedback */}
          <div className="p-4 bg-muted rounded-lg text-sm">
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

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova Senha</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
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
              <Label htmlFor="confirmPassword">Confirme Nova Senha</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
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

            <Button
              className="w-full bg-primary hover:bg-primary/90"
              onClick={handleChangePassword}
              disabled={loading || !isPasswordValid || !passwordsMatch}
            >
              {loading ? "Alterando..." : "Confirmar"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
