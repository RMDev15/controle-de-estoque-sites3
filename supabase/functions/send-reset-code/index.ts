import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.83.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: RequestBody = await req.json();
    console.log("Received reset request for email:", email);

    if (!email) {
      return new Response(
        JSON.stringify({ error: "E-mail é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if email exists in profiles
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, nome, email")
      .eq("email", email.toLowerCase())
      .single();

    if (profileError || !profile) {
      console.log("Email not found:", email);
      // Return success even if email doesn't exist (security best practice)
      return new Response(
        JSON.stringify({ success: true, message: "Se o e-mail estiver cadastrado, você receberá o código." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    console.log("Generated code for user:", profile.nome);

    // Invalidate previous codes for this email
    await supabase
      .from("password_reset_codes")
      .update({ used: true })
      .eq("email", email.toLowerCase())
      .eq("used", false);

    // Store the code
    const { error: insertError } = await supabase
      .from("password_reset_codes")
      .insert({
        email: email.toLowerCase(),
        code,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("Error storing code:", insertError);
      throw new Error("Erro ao gerar código de recuperação");
    }

    // Send email with code
    const emailResponse = await resend.emails.send({
      from: "Só Bujigangas <onboarding@resend.dev>",
      to: [email],
      subject: "Código de Recuperação de Senha",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
            .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .logo { text-align: center; margin-bottom: 20px; }
            .code { font-size: 36px; font-weight: bold; color: #00BFFF; text-align: center; letter-spacing: 8px; padding: 20px; background: #f0f9ff; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
            h1 { color: #333; text-align: center; }
            p { color: #555; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🔐 Recuperação de Senha</h1>
            <p>Olá <strong>${profile.nome}</strong>,</p>
            <p>Você solicitou a recuperação de senha. Use o código abaixo para continuar:</p>
            <div class="code">${code}</div>
            <p style="text-align: center; color: #ff6b6b; font-size: 14px;">⚠️ Este código expira em 10 minutos.</p>
            <p>Se você não solicitou esta recuperação, ignore este e-mail.</p>
            <div class="footer">
              <p>Só Bujigangas - Gerenciador de Estoque</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "Código enviado com sucesso!" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-reset-code:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
