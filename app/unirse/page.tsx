import { redirect } from "next/navigation";

export default function UnirseRedirect({
  searchParams,
}: {
  searchParams: { code?: string };
}) {
  const code = searchParams.code ?? "";
  redirect(`/grupo/unirse?code=${code}`);
}
