import type { Metadata } from "next";
import { SITE_INFO } from "@/shared/config";
import { InfoPage } from "../_components/InfoPage";
import { LegalDocument } from "../_components/LegalDocument";
import { privacyPolicySections } from "../_content/legalDocuments";

export const metadata: Metadata = {
  title: "Конфиденциальность",
  description: `Политика конфиденциальности ${SITE_INFO.name}.`,
};

export default function PrivacyPage() {
  return (
    <InfoPage
      title="Конфиденциальность"
      subtitle={`Политика обработки персональных данных пользователей ${SITE_INFO.name}.`}
    >
      <LegalDocument
        publishedAt="25 июля 2026 года"
        sections={privacyPolicySections}
      />
    </InfoPage>
  );
}
