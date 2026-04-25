'use client'

import Link from 'next/link'
import { useLanguage } from '@/context/LanguageContext'

export default function PhoneAgentPromo() {
  const { t } = useLanguage()
  const ts = t.phoneAgent

  return (
    <section className="py-20 px-4 bg-black/40">
      <div className="max-w-6xl mx-auto">
        <div className="relative bg-gradient-to-br from-indigo-500/10 via-transparent to-emerald-500/10 border border-gray-800 rounded-3xl p-8 md:p-12 overflow-hidden">
          {/* Background blobs */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative grid lg:grid-cols-2 gap-10 items-center">
            {/* Left: text */}
            <div>
              <span className="inline-block px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-emerald-400 text-sm font-medium mb-4">
                {ts.badge}
              </span>
              <h2 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-white to-indigo-200 bg-clip-text text-transparent leading-tight">
                {ts.title}
              </h2>
              <p className="text-indigo-400/70 text-sm font-mono mb-6">{ts.poweredBy}</p>

              <ul className="space-y-3 mb-8">
                {ts.benefits.map((benefit: string, i: number) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="text-emerald-400 mt-0.5 shrink-0">✓</span>
                    <span className="text-gray-300">{benefit}</span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/demo"
                  className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-indigo-600 rounded-full text-white font-semibold hover:from-emerald-700 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105 text-center shadow-lg shadow-emerald-500/20"
                >
                  {ts.cta_demo}
                </Link>
                <Link
                  href="/services"
                  className="px-6 py-3 border border-gray-600 rounded-full text-white font-medium hover:bg-white/10 transition-all duration-300 text-center"
                >
                  {ts.cta_services}
                </Link>
              </div>
            </div>

            {/* Right: architecture visual */}
            <div className="bg-[#0f172a] rounded-2xl p-6 border border-gray-800 font-mono text-sm">
              <div className="text-gray-500 text-xs uppercase tracking-widest mb-5">
                Flux en temps réel
              </div>
              {[
                { icon: '📞', label: 'Appel client', color: 'text-blue-400' },
                { icon: '🔁', label: 'VAPI + Claude Sonnet', color: 'text-indigo-400' },
                { icon: '🗄️', label: 'Outils MCP → CRM', color: 'text-purple-400' },
                { icon: '✅', label: 'Commande confirmée', color: 'text-emerald-400' },
              ].map((step, i, arr) => (
                <div key={i}>
                  <div className="flex items-center gap-3 py-2">
                    <span className="text-lg">{step.icon}</span>
                    <span className={step.color}>{step.label}</span>
                  </div>
                  {i < arr.length - 1 && (
                    <div className="text-gray-700 ml-1 leading-none">│</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
