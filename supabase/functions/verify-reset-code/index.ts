import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.83.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  email: string;
  code: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, code }: RequestBody = await req.json();
    console.log("Verifying code for email:", email);

    if (!email || !code) {
      return new Response(
        JSON.stringify({ valid: false, error: "E-mail e código são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the code
    const { data: resetCode, error } = await supabase
      .from("password_reset_codes")
      .select("*")
      .eq("email", email.toLowerCase())
      .eq("code", code)
      .eq("used", false)
      .single();

    if (error || !resetCode) {
      console.log("Code not found or invalid");
      return new Response(
        JSON.stringify({ valid: false, error: "Código inválido ou expirado" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check expiration
    const expiresAt = new Date(resetCode.expires_at);
    if (expiresAt < new Date()) {
      console.log("Code expired");
      return new Response(
        JSON.stringify({ valid: false, error: "Código expirado. Solicite um novo código." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Code is valid");
    return new Response(
      JSON.stringify({ valid: true, message: "Código verificado com sucesso!" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in verify-reset-code:", error);
    return new Response(
      JSON.stringify({ valid: false, error: error.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
