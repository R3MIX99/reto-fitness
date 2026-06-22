import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function DELETE() {
  // Verificar sesión del usuario con el cliente normal (cookies)
  const supabase = createClient();
  const { data: { user }, error: sessionError } = await supabase.auth.getUser();

  if (sessionError || !user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const userId = user.id;

  // Cliente admin con service_role — solo en servidor, nunca expuesto al cliente
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  try {
    // 1. Borrar archivos de evidencias del usuario
    const { data: files } = await admin.storage
      .from("evidencias")
      .list(userId);

    if (files && files.length > 0) {
      // Listar subdirectorios (fechas) y borrar recursivamente
      for (const folder of files) {
        const { data: dayFiles } = await admin.storage
          .from("evidencias")
          .list(`${userId}/${folder.name}`);
        if (dayFiles && dayFiles.length > 0) {
          const paths = dayFiles.map((f) => `${userId}/${folder.name}/${f.name}`);
          await admin.storage.from("evidencias").remove(paths);
        }
      }
      await admin.storage.from("evidencias").remove(files.map((f) => `${userId}/${f.name}`));
    }

    // 2. Borrar datos de tablas (en orden para respetar FKs)
    await admin.from("daily_checks").delete().eq("user_id", userId);
    await admin.from("goals").delete().eq("user_id", userId);
    await admin.from("season_standings").delete().eq("user_id", userId);
    await admin.from("season_members").delete().eq("user_id", userId);
    await admin.from("group_members").delete().eq("user_id", userId);
    await admin.from("profiles").delete().eq("id", userId);

    // 3. Eliminar la cuenta de Auth (cascade borrará lo que quede)
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
