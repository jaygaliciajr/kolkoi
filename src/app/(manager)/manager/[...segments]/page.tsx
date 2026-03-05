import { redirect } from "next/navigation";

type Params = Promise<{ segments: string[] }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function buildQueryString(searchParams: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") {
      params.append(key, value);
      continue;
    }
    if (Array.isArray(value)) {
      for (const entry of value) {
        params.append(key, entry);
      }
    }
  }

  const query = params.toString();
  return query.length > 0 ? `?${query}` : "";
}

export default async function ManagerAliasPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const resolvedParams = await params;
  const resolvedSearch = await searchParams;
  const path = resolvedParams.segments.join("/");
  const query = buildQueryString(resolvedSearch);

  redirect(`/admin/${path}${query}`);
}
