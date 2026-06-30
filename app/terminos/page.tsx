import Link from "next/link";
import Image from "next/image";

export const metadata = { title: "Términos de Servicio — Olympo" };

export default function TerminosPage() {
  return (
    <div style={{ background: "#040506", minHeight: "100dvh", color: "#EEE5E9", fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <header style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "20px 24px" }}>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <Image src="/icons/logo.png" alt="Olympo" width={24} height={24} />
          <span style={{ fontSize: 15, fontWeight: 700, color: "#EEE5E9", letterSpacing: "0.05em" }}>OLYMPO</span>
        </Link>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "60px 24px 100px" }}>
        <h1 style={{ fontSize: 36, fontWeight: 800, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Términos de Servicio</h1>
        <p style={{ margin: "0 0 48px", color: "#5a5a5a", fontSize: 14 }}>Última actualización: junio 2026</p>

        {[
          {
            title: "1. Aceptación de los términos",
            body: `Al acceder o usar Olympo, aceptas estar sujeto a estos Términos de Servicio. Si no estás de acuerdo con alguna parte de los términos, no puedes acceder al servicio.`,
          },
          {
            title: "2. Descripción del servicio",
            body: `Olympo es una aplicación de seguimiento de hábitos y competencia entre amigos. Los usuarios pueden crear grupos, registrar su actividad física con evidencia fotográfica, y competir en clasificaciones semanales y por temporada.`,
          },
          {
            title: "3. Cuentas de usuario",
            body: `Eres responsable de mantener la confidencialidad de tu cuenta y contraseña, y de restringir el acceso a tu dispositivo. Aceptas la responsabilidad de todas las actividades que ocurran bajo tu cuenta.

Debes proporcionar información precisa y completa al registrarte. No puedes usar la cuenta de otra persona sin permiso.`,
          },
          {
            title: "4. Uso aceptable",
            body: `Aceptas no usar Olympo para:
• Subir contenido falso, engañoso o fraudulento.
• Acosar, intimidar o amenazar a otros usuarios.
• Compartir contenido inapropiado, violento o ilegal.
• Intentar manipular el sistema de puntos o clasificaciones de manera deshonesta.
• Acceder o intentar acceder a cuentas de otros usuarios.

El incumplimiento puede resultar en la suspensión o eliminación de tu cuenta.`,
          },
          {
            title: "5. Contenido del usuario",
            body: `Al subir fotos de evidencia u otro contenido a Olympo, nos otorgas una licencia limitada, no exclusiva para usar dicho contenido únicamente con el fin de operar el servicio.

Eres el único responsable del contenido que subes. No debes subir contenido que infrinja derechos de terceros o que sea ilegal.`,
          },
          {
            title: "6. Suscripciones y pagos",
            body: `Olympo ofrece planes de suscripción de pago (Pro y Elite) además del plan gratuito. Los detalles de precios, características y condiciones de cada plan se muestran en la aplicación.

Los pagos se procesan de forma segura a través de Stripe. Las suscripciones se renuevan automáticamente hasta que las canceles. Puedes cancelar en cualquier momento desde la configuración de tu cuenta.`,
          },
          {
            title: "7. Disponibilidad del servicio",
            body: `Nos esforzamos por mantener Olympo disponible en todo momento, pero no garantizamos disponibilidad ininterrumpida. Podemos modificar, suspender o descontinuar el servicio en cualquier momento con previo aviso cuando sea posible.`,
          },
          {
            title: "8. Limitación de responsabilidad",
            body: `En la medida permitida por la ley aplicable, Olympo no será responsable por daños indirectos, incidentales, especiales o consecuentes que resulten del uso o la imposibilidad de usar el servicio.`,
          },
          {
            title: "9. Modificaciones a los términos",
            body: `Nos reservamos el derecho de modificar estos términos en cualquier momento. Te notificaremos los cambios significativos con al menos 30 días de anticipación. El uso continuado del servicio después de los cambios constituye tu aceptación.`,
          },
          {
            title: "10. Contacto",
            body: `Si tienes preguntas sobre estos términos, contáctanos en:\n\nhola@olympodynami.com`,
          },
        ].map(({ title, body }) => (
          <section key={title} style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 12px", color: "#EEE5E9" }}>{title}</h2>
            <div style={{ fontSize: 15, color: "#8a8a8a", lineHeight: 1.75, whiteSpace: "pre-line" }}>{body}</div>
          </section>
        ))}
      </main>
    </div>
  );
}
