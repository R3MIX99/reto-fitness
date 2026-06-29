import { NextResponse } from "next/server";
import { Resend } from "resend";

// ── Email templates ────────────────────────────────────────────────────────

function otpTemplate(token: string, recipientEmail: string): string {
  // Renderiza los 6 dígitos en cajitas separadas para que se vea igual
  // que la UI de la app (más fácil de leer, menos errores al copiar).
  const digits = token.split("").map(
    (d) => `<span style="
      display:inline-block;
      width:44px;height:52px;
      line-height:52px;
      text-align:center;
      font-size:26px;font-weight:800;
      background:#1a1a1a;
      border:1.5px solid #2f2f2f;
      border-radius:10px;
      color:#EFC88B;
      margin:0 3px;
      font-family:'Courier New',Courier,monospace;
    ">${d}</span>`
  ).join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Tu código de Olympo</title>
</head>
<body style="margin:0;padding:0;background:#000000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#000000;">
    <tr>
      <td align="center" style="padding:48px 16px;">
        <table width="100%" style="max-width:460px;" cellpadding="0" cellspacing="0" role="presentation">

          <!-- Logo / Marca -->
          <tr>
            <td align="center" style="padding:0 0 36px;">
              <p style="margin:0;font-size:26px;font-weight:800;letter-spacing:3px;color:#EEE5E9;">OLYMPO</p>
              <p style="margin:6px 0 0;font-size:13px;color:#5a5a5a;">El más constante gana.</p>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#101010;border-radius:20px;overflow:hidden;border:1px solid #1f1f1f;">

              <!-- Card header dorado -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="background:linear-gradient(135deg,#1a1200 0%,#2a1e00 100%);padding:28px 36px 24px;border-bottom:1px solid #2f2500;">
                    <p style="margin:0;font-size:18px;font-weight:700;color:#EFC88B;">Tu código de acceso</p>
                    <p style="margin:6px 0 0;font-size:13px;color:#8a7040;">Ingresa este código en la aplicación para continuar</p>
                  </td>
                </tr>

                <!-- Cajitas del código -->
                <tr>
                  <td align="center" style="padding:36px 36px 28px;">
                    <div style="display:inline-block;">${digits}</div>
                    <p style="margin:28px 0 0;font-size:13px;color:#5a5a5a;">
                      Expira en <strong style="color:#EEE5E9;">1 hora</strong> y solo puede usarse una vez.
                    </p>
                  </td>
                </tr>

                <!-- Divider -->
                <tr><td style="padding:0 36px;"><div style="height:1px;background:#1f1f1f;"></div></td></tr>

                <!-- Nota de seguridad -->
                <tr>
                  <td style="padding:20px 36px 32px;">
                    <p style="margin:0;font-size:12px;color:#4a4a4a;line-height:1.6;">
                      Si no solicitaste este código, puedes ignorar este correo con seguridad.
                      Nadie más tiene acceso a tu cuenta.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:28px 0 0;">
              <p style="margin:0;font-size:11px;color:#3a3a3a;">
                Enviado a ${recipientEmail} · © 2026 Olympo
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Handler ────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  // Validar el hook secret que configuras en Supabase → Auth → Hooks
  const hookSecret = process.env.SEND_EMAIL_HOOK_SECRET;
  if (hookSecret) {
    const auth = request.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${hookSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  let body: {
    user?: { email?: string };
    email_data?: {
      token?: string;
      redirect_to?: string;
      email_action_type?: string;
    };
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const email = body?.user?.email;
  const token = body?.email_data?.token;
  const actionType = body?.email_data?.email_action_type ?? "magiclink";

  if (!email || !token) {
    return NextResponse.json({ error: "Missing email or token" }, { status: 400 });
  }

  // Asunto según tipo de acción
  const subjects: Record<string, string> = {
    magiclink:    `${token} — Tu código de Olympo`,
    signup:       `${token} — Confirma tu cuenta de Olympo`,
    recovery:     `${token} — Recupera tu acceso a Olympo`,
    reauthentication: `${token} — Código de verificación de Olympo`,
  };
  const subject = subjects[actionType] ?? `${token} — Tu código de Olympo`;

  const fromAddress = process.env.RESEND_FROM_EMAIL ?? "Olympo <onboarding@resend.dev>";

  const { error } = await resend.emails.send({
    from: fromAddress,
    to: email,
    subject,
    html: otpTemplate(token, email),
  });

  if (error) {
    console.error("[send-email hook] Resend error:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }

  return NextResponse.json({ message: "ok" });
}
