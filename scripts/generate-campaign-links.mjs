const baseUrl = (process.env.WARRANTEE_PUBLIC_BASE_URL || "https://warrantee.io").replace(/\/$/, "");

const locales = ["en", "ar"];

const campaigns = [
  {
    key: "seller-pilot",
    label: "Seller pilot",
    path: "seller/register",
    source: "manual_outreach",
    medium: "direct",
    campaign: "seller_pilot_july_2026",
    intent: "Qualified Saudi/GCC sellers who can issue warranties through Warrantee.",
  },
  {
    key: "business-pilot",
    label: "Business pilot",
    path: "pricing",
    source: "manual_outreach",
    medium: "direct",
    campaign: "business_pilot_july_2026",
    intent: "SMB operators currently tracking warranties in spreadsheets or manual workflows.",
  },
  {
    key: "integration-pilot",
    label: "API / CLI / MCP pilot",
    path: "api-docs",
    source: "partner_outreach",
    medium: "direct",
    campaign: "integration_pilot_july_2026",
    intent: "ERP, ecommerce, support, or technical teams evaluating Warrantee integrations.",
  },
];

const safeTrackingValue = /^[a-z0-9_:-]+$/;

function assertSafeTrackingValue(name, value) {
  if (!safeTrackingValue.test(value)) {
    throw new Error(`${name} contains an unsafe tracking value: ${value}`);
  }
}

function campaignUrl(locale, campaign) {
  const url = new URL(`/${locale}/${campaign.path}`, baseUrl);
  url.searchParams.set("utm_source", campaign.source);
  url.searchParams.set("utm_medium", campaign.medium);
  url.searchParams.set("utm_campaign", campaign.campaign);
  return url.toString();
}

function buildLinks() {
  return campaigns.map((campaign) => {
    for (const value of [campaign.source, campaign.medium, campaign.campaign]) {
      assertSafeTrackingValue(campaign.key, value);
    }

    return {
      key: campaign.key,
      label: campaign.label,
      intent: campaign.intent,
      links: Object.fromEntries(locales.map((locale) => [locale, campaignUrl(locale, campaign)])),
    };
  });
}

const formatArg = process.argv.find((arg) => arg.startsWith("--format="));
const format = formatArg ? formatArg.split("=")[1] : "markdown";
const links = buildLinks();

if (format === "json") {
  console.log(JSON.stringify({ baseUrl, links }, null, 2));
} else if (format === "markdown") {
  console.log("# Warrantee Campaign Links\n");
  console.log("Use these links for controlled outreach only. Do not add personal data, names, emails, phone numbers, or company registration numbers to UTM values.\n");

  for (const item of links) {
    console.log(`## ${item.label}`);
    console.log(`Intent: ${item.intent}`);
    console.log(`- English: ${item.links.en}`);
    console.log(`- Arabic: ${item.links.ar}\n`);
  }
} else {
  throw new Error(`Unsupported format: ${format}. Use --format=markdown or --format=json.`);
}
