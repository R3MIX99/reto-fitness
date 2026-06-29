import Link from "next/link";
import Image from "next/image";

export const metadata = { title: "Política de Privacidad — Olympo" };

export default function PrivacidadPage() {
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
        <h1 style={{ fontSize: 36, fontWeight: 800, margin: "0 0 8px", letterSpacing: "-0.02em" }}>Política de Privacidad</h1>
        <p style={{ margin: "0 0 48px", color: "#5a5a5a", fontSize: 14 }}>Última actualización: junio 2026</p>

        {[
          {
            title: "1. Información que recopilamos",
            body: `Recopilamos la información que nos proporcionas directamente al crear una cuenta (nombre, correo electrónico, foto de perfil), así como la información que generas al usar la aplicación: registros de actividad física, fotos de evidencia de tus hábitos, puntos, rachas y datos de rendimiento dentro de tus grupos.

También recopilamos automáticamente cierta información técnica como el tipo de dispositivo, sistema operativo, dirección IP y datos de uso de la aplicación con fines de mejora del servicio.`,
          },
          {
            title: "2. Cómo usamos tu información",
            body: `Usamos tu información para:
• Proporcionar, mantener y mejorar la aplicación.
• Gestionar tu cuenta y autenticación.
• Mostrar tu progreso y el de tus grupos.
• Enviar notificaciones relacionadas con tu actividad en la app.
• Cumplir con obligaciones legales aplicables.

No vendemos tu información personal a terceros.`,
          },
          {
            title: "3. Compartición de información",
            body: `Tu información se comparte únicamente con los miembros de los grupos a los que perteneces, en la medida necesaria para las funciones competitivas de la aplicación (leaderboard, rachas, evidencias).

Trabajamos con proveedores de servicios de confianza (Supabase para base de datos y almacenamiento, Vercel para hosting) que procesan datos únicamente en nuestro nombre y bajo acuerdos de confidencialidad.`,
          },
          {
            title: "4. Almacenamiento y seguridad",
            body: `Tus datos se almacenan en servidores seguros con cifrado en tránsito y en reposo. Tomamos medidas razonables para proteger tu información, aunque ningún sistema es completamente infalible.

Las fotos de evidencia se almacenan en Supabase Storage con acceso restringido a los miembros de tu grupo.`,
          },
          {
            title: "5. Tus derechos",
            body: `Tienes derecho a:
• Acceder a los datos personales que tenemos sobre ti.
• Solicitar la corrección de datos inexactos.
• Solicitar la eliminación de tu cuenta y datos asociados.
• Retirar tu consentimiento en cualquier momento.

Para ejercer estos derechos, contáctanos en: privacidad@olimpodynami.com`,
          },
          {
            title: "6. Menores de edad",
            body: `Olympo no está dirigida a personas menores de 13 años. No recopilamos intencionalmente información de menores de 13 años. Si eres padre o tutor y crees que tu hijo nos ha proporcionado información personal, contáctanos para que podamos eliminarla.`,
          },
          {
            title: "7. Cambios a esta política",
            body: `Podemos actualizar esta política ocasionalmente. Te notificaremos cualquier cambio material publicando la nueva política en esta página y, cuando sea apropiado, enviando un aviso por correo electrónico.`,
          },
          {
            title: "8. Contacto",
            body: `Si tienes preguntas sobre esta política de privacidad, contáctanos en:\n\nprivacidad@olimpodynami.com`,
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
