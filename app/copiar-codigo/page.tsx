"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Check, Copy } from "lucide-react";

function CopiarCodigoContent() {
  const params = useSearchParams();
  const router = useRouter();
  const code = params.get("c") ?? "";
  const [copied, setCopied] = useState(false);
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      // Regresar al login en 1.5s para que el usuario pegue el código
      setTimeout(() => router.replace("/login"), 1500);
    }).catch(() => {
      // clipboard bloqueado — el usuario puede copiarlo manualmente
    }).finally(() => setTried(true));
  }, [code, router]);

  function handleCopy() {
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => setCopied(true)).catch(() => {});
  }

  return (
    <main style={{
      minHeight: "100vh", background: "#000000",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "32px 20px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <div style={{
        background: "#101010", borderRadius: 20, border: "1px solid #1f1f1f",
        padding: "40px 32px", maxWidth: 360, width: "100%", textAlign: "center",
      }}>
        {/* Ícono */}
        <div style={{
          width: 56, height: 56, borderRadius: "50%", margin: "0 auto 20px",
          background: copied ? "rgba(34,197,94,0.15)" : "rgba(239,200,139,0.15)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {copied
            ? <Check size={24} strokeWidth={2} style={{ color: "#22c55e" }} />
            : <Copy size={22} strokeWidth={1.5} style={{ color: "#EFC88B" }} />
          }
        </div>

        <p style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700, color: "#EEE5E9" }}>
          {copied ? "¡Código copiado!" : "Tu código de acceso"}
        </p>
        <p style={{ margin: "0 0 28px", fontSize: 13, color: "#5a5a5a" }}>
          {copied
            ? "Pégalo en la aplicación para entrar."
            : "Toca el código o el botón para copiarlo."}
        </p>

        {/* Código visual */}
        <div
          onClick={handleCopy}
          style={{
            display: "flex", gap: 6, justifyContent: "center",
            marginBottom: 24, cursor: "pointer",
          }}
        >
          {code.split("").map((d, i) => (
            <div key={i} style={{
              width: 36, height: 44,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "#1a1a1a",
              border: `1.5px solid ${copied ? "#22c55e" : "#2f2f2f"}`,
              borderRadius: 8,
              fontSize: 22, fontWeight: 800,
              color: copied ? "#22c55e" : "#EFC88B",
              fontFamily: "'Courier New', monospace",
              transition: "border-color 0.3s, color 0.3s",
            }}>{d}</div>
          ))}
        </div>

        <button
          onClick={handleCopy}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: copied ? "#22c55e" : "#EFC88B",
            color: "#1a1000", fontSize: 14, fontWeight: 700,
            border: "none", borderRadius: 100, padding: "12px 32px",
            cursor: "pointer", transition: "background 0.3s",
          }}
        >
          {copied ? <Check size={15} strokeWidth={2} /> : <Copy size={15} strokeWidth={1.5} />}
          {copied ? "Copiado" : "Copiar código"}
        </button>

        {tried && !copied && (
          <p style={{ margin: "16px 0 0", fontSize: 12, color: "#5a5a5a" }}>
            Si no se copió automáticamente, toca el código o el botón.
          </p>
        )}

        <p style={{ margin: "24px 0 0", fontSize: 11, color: "#3a3a3a" }}>
          Este código expira en 1 hora.
        </p>
      </div>
    </main>
  );
}

export default function CopiarCodigoPage() {
  return (
    <Suspense>
      <CopiarCodigoContent />
    </Suspense>
  );
}
