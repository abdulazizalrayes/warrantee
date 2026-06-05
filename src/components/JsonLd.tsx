import { getOrganizationJsonLd } from "@/lib/jsonld";

export default function JsonLd() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(getOrganizationJsonLd()) }}
    />
  );
}
