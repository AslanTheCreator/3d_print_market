import type { Metadata } from "next";
import { SITE_INFO } from "@/shared/config";
import { InfoPage } from "../_components/InfoPage";
import { LegalDocument } from "../_components/LegalDocument";
import { userAgreementSections } from "../_content/legalDocuments";

export const metadata: Metadata = {
  title: "Пользовательское соглашение",
  description: `Пользовательское соглашение ${SITE_INFO.name}.`,
};

export default function UserAgreementPage() {
  return (
    <InfoPage
      title="Пользовательское соглашение"
      subtitle={`Правила использования сайта ${SITE_INFO.name} для покупателей и продавцов.`}
    >
      <LegalDocument publishedAt="7 мая 2026 г." sections={userAgreementSections} />
    </InfoPage>
  );
}
