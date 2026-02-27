import { StudioWorkspace } from "../../components/studio-workspace";

export default async function StudioComponentsPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <StudioWorkspace searchParams={searchParams} view="components" />;
}
