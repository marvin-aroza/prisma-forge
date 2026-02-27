import { StudioWorkspace } from "../components/studio-workspace";

export default async function StudioAllPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <StudioWorkspace searchParams={searchParams} view="all" />;
}
