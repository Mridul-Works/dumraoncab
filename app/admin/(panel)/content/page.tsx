import type { Metadata } from "next";
import { EditNote, PageHeader, Panel } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/adminAuth";
import { faqs, services, site, testimonials } from "@/lib/site";

export const metadata: Metadata = { title: "Site content" };

export default async function ContentPage() {
  await requireAdmin();

  const channels = [
    { label: "Main phone", value: site.phoneDisplay, href: `tel:${site.phone}` },
    ...site.altPhones.map((p, i) => ({ label: `Alt phone ${i + 1}`, value: p.display, href: `tel:${p.raw}` })),
    { label: "WhatsApp", value: `+${site.whatsapp}`, href: `https://wa.me/${site.whatsapp}` },
    { label: "Email", value: site.email, href: `mailto:${site.email}` },
    { label: "Address", value: `${site.address.locality}, ${site.address.district}, ${site.address.region} ${site.address.postalCode}` },
    { label: "Service areas", value: site.serviceAreas.join(", ") },
  ];

  return (
    <>
      <PageHeader title="Site content" intro="Services, reviews, FAQs and contact details currently published." />

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Contact & business details">
          <dl className="divide-y divide-line text-sm">
            {channels.map((c) => (
              <div key={c.label} className="grid grid-cols-[8rem_1fr] gap-3 px-5 py-2.5">
                <dt className="text-khaki">{c.label}</dt>
                <dd className="font-medium text-ink">
                  {c.href ? (
                    <a href={c.href} className="hover:text-amberdeep">
                      {c.value}
                    </a>
                  ) : (
                    c.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </Panel>

        <Panel title={`Services (${services.length})`}>
          <ul className="divide-y divide-line">
            {services.map((s) => (
              <li key={s.slug} className="px-5 py-2.5">
                <a href={`/services/${s.slug}`} target="_blank" rel="noreferrer" className="font-semibold text-ink hover:text-amberdeep">
                  {s.name}
                </a>
                <p className="text-xs text-khaki">{s.short}</p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title={`Testimonials (${testimonials.length})`}>
          <p className="border-b border-line bg-gold/10 px-5 py-2 text-xs text-ink">
            These are sample reviews — replace them with real customer reviews before launch.
          </p>
          <ul className="grid gap-px bg-line md:grid-cols-2">
            {testimonials.map((t) => (
              <li key={t.name} className="bg-white px-5 py-3.5">
                <p className="text-sm text-ink">&ldquo;{t.quote}&rdquo;</p>
                <p className="mt-1.5 text-xs font-semibold text-khaki">
                  {t.name} · {t.trip}
                </p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="mt-6">
        <Panel title={`FAQs (${faqs.length})`}>
          <ul className="divide-y divide-line">
            {faqs.map((f) => (
              <li key={f.q}>
                <details className="faq group px-5 py-3">
                  <summary className="flex items-center justify-between gap-4 text-sm font-semibold text-ink">
                    {f.q}
                    <span className="text-khaki transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-khaki">{f.a}</p>
                </details>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <div className="mt-3">
        <EditNote />
      </div>
    </>
  );
}
