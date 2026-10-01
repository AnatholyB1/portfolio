// Vérifie l'authentification mail de sevalys.com (FOUND-07 / D-20).
// Usage : node scripts/verify-email-dns.mjs [--send-test <adresse>]
// Code de sortie 1 si un contrôle échoue. N'affiche jamais RESEND_API_KEY.
import { Resolver } from "node:dns/promises";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOMAIN = "sevalys.com";

function loadApiKey() {
  if (process.env.RESEND_API_KEY) return process.env.RESEND_API_KEY;
  const file = resolve(__dirname, "../.env.local");
  if (!existsSync(file)) return null;
  for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    if (line.slice(0, eq).trim() !== "RESEND_API_KEY") continue;
    return line.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
  }
  return null;
}

const resolver = new Resolver();
resolver.setServers(["8.8.8.8", "1.1.1.1"]);

async function txt(name) {
  try {
    const rows = await resolver.resolveTxt(name);
    return rows.map((chunks) => chunks.join(""));
  } catch {
    return [];
  }
}

let failed = false;
function report(ok, label, detail) {
  if (!ok) failed = true;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} -> ${detail}`);
}

async function main() {
  // 1. DKIM Resend
  const dkim = await txt(`resend._domainkey.${DOMAIN}`);
  report(
    dkim.some((r) => r.includes("p=")),
    "resend._domainkey DKIM",
    dkim.length ? `${dkim.length} enregistrement(s), p= présent: ${dkim.some((r) => r.includes("p="))}` : "absent"
  );

  // 2. SPF racine : exactement un
  const root = await txt(DOMAIN);
  const spf = root.filter((r) => r.toLowerCase().startsWith("v=spf1"));
  report(spf.length === 1, "SPF racine (exactement 1)", `${spf.length} trouvé(s)${spf[0] ? ": " + spf[0] : ""}`);

  // 3. DMARC : exactement un, p=, rua Brevo conservé
  const dmarcAll = await txt(`_dmarc.${DOMAIN}`);
  const dmarc = dmarcAll.filter((r) => r.toUpperCase().startsWith("V=DMARC1"));
  const dOk =
    dmarc.length === 1 && dmarc[0].includes("p=") && dmarc[0].includes("rua@dmarc.brevo.com");
  report(dOk, "DMARC (1 enregistrement, p=, rua Brevo)", `${dmarc.length} trouvé(s)${dmarc[0] ? ": " + dmarc[0] : ""}`);

  // 4. Return-path Resend
  const send = await txt(`send.${DOMAIN}`);
  report(
    send.some((r) => r.toLowerCase().includes("v=spf1")),
    "send.sevalys.com SPF (return-path)",
    send.length ? send.join(" | ") : "absent"
  );

  // 5. Resend API
  const key = loadApiKey();
  if (!key) {
    report(false, "Resend domaine verified", "RESEND_API_KEY introuvable (env ou .env.local)");
    report(false, "Resend tracking désactivé", "non vérifié");
  } else {
    const headers = { Authorization: `Bearer ${key}` };
    try {
      const res = await fetch("https://api.resend.com/domains", { headers });
      const body = await res.json();
      const dom = (body.data || []).find((d) => d.name === DOMAIN);
      if (!res.ok || !dom) {
        report(false, "Resend domaine verified", `HTTP ${res.status}, domaine ${dom ? "trouvé" : "introuvable"}`);
        report(false, "Resend tracking désactivé", "non vérifié");
      } else {
        report(dom.status === "verified", "Resend domaine verified", `status=${dom.status}`);
        const dres = await fetch(`https://api.resend.com/domains/${dom.id}`, { headers });
        const d = await dres.json();
        const trackingOff = d.open_tracking === false && d.click_tracking === false;
        report(
          trackingOff,
          "Resend tracking désactivé",
          `open_tracking=${d.open_tracking} click_tracking=${d.click_tracking}`
        );
      }
    } catch (e) {
      report(false, "Resend API", `erreur réseau: ${e.message}`);
    }
  }

  // Envoi de test optionnel
  const i = process.argv.indexOf("--send-test");
  if (i >= 0) {
    const to = process.argv[i + 1];
    if (!to || !key) {
      console.log("FAIL  send-test -> adresse ou clé manquante");
      failed = true;
    } else {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Sevalys <connexion@sevalys.com>",
          to: [to],
          reply_to: "contact@sevalys.com",
          subject: "Test de délivrabilité Sèvalys",
          html: "<p>Bonjour,</p><p>Ceci est un message de test pour vérifier la délivrabilité de Sèvalys.</p>",
          text: "Bonjour,\n\nCeci est un message de test pour vérifier la délivrabilité de Sèvalys.",
        }),
      });
      const b = await res.json().catch(() => ({}));
      if (res.ok) console.log(`PASS  send-test -> id=${b.id}`);
      else {
        console.log(`FAIL  send-test -> HTTP ${res.status} ${b.message || ""}`);
        failed = true;
      }
    }
  }

  process.exit(failed ? 1 : 0);
}

main();
