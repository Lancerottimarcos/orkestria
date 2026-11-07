import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { ProposalPublicView } from "@/components/propostas/ProposalPublicView";
import { getPublicProposal, serializePublicProposal } from "@/lib/proposals/publicView";

type Params = { params: Promise<{ token: string }> };

export default async function PropostaPublicPage({ params }: Params) {
  const { token } = await params;

  const proposal = await getPublicProposal(token);
  if (!proposal) notFound();

  const theme = (await cookies()).get("theme")?.value === "light" ? ("light" as const) : ("dark" as const);

  return <ProposalPublicView token={token} initialProposal={serializePublicProposal(proposal)} initialTheme={theme} />;
}
