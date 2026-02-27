import { StudioWorkspace } from "../../components/studio-workspace";

export default async function StudioPreviewPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <StudioWorkspace searchParams={searchParams} view="preview" />;
}
