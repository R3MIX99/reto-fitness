import { redirect } from "next/navigation";

// La raíz redirige al dashboard (la auth se maneja en middleware)
export default function RootPage() {
  redirect("/dashboard");
}
