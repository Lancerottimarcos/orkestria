import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ContractPublicView } from "@/components/propostas/ContractPublicView";
import { getPublicProposal, serializePublicProposal } from "@/lib/proposals/publicView";

type Params = { params: Promise<{ token: string }> };

export default async function ContratoPublicPage({ params }: Params) {
  const { token } = await params;

  const proposal = await getPublicProposal(token);
  if (!proposal) notFound();

  // O contrato só existe depois que a proposta foi aceita - acessar o link
  // antes disso manda de volta pra proposta, sem contrato pra ver ainda.
  if (proposal.status !== "ACCEPTED") {
    redirect(`/proposta/${token}`);
  }

  const theme = (await cookies()).get("theme")?.value === "light" ? ("light" as const) : ("dark" as const);

  return <ContractPublicView token={token} initialProposal={serializePublicProposal(proposal)} initialTheme={theme} />;
}
