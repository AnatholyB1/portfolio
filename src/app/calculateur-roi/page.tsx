'use client';
// Outil terrain : calculatrice de ROI pour l'offre d'agent IA téléphonique.
// 100% front, calcul instantané côté client. Aucun backend, aucune dépendance.
// Moteur "ROI v2" : un SOCLE mesuré (temps d'équipe récupéré) qui porte seul
// l'argument de rentabilité, + un UPSIDE optionnel (CA récupéré) en bonus additif.

import { useState } from 'react';
import Navbar from '@/components/layout/Navbar';

/* ─── Valeurs par défaut (dossier Feuillette) ───────── */
const DEFAULTS = {
  // Socle
  appelsJour: 15,
  dureeMin: 5,
  coutHoraire: 26,
  // Upside CA
  appelsManques: 3,
  ticketMoyen: 25,
  margeBrute: 64,
  // Paramètres avancés
  joursMois: 30,
  prixMensuel: 499,
  setup: 250,
  facteurInterruption: 1.0,
};

/* ─── Helpers de formatage (fr-FR) ──────────────────── */
const fmtEur = (n: number) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(n)) + ' €';
const fmtMult = (n: number) =>
  '×' + new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n);
const fmtHours = (n: number) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(n);

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

/* ─── Champ : label + input numérique + slider ──────── */
function ControlRow({
  label, value, onChange, min, max, step = 1, suffix, tooltip,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  tooltip?: string;
}) {
  return (
    <div className="roi-field">
      <div className="roi-field-top">
        <label className="roi-label">
          {label}
          {tooltip && <span className="roi-tip" title={tooltip}>?</span>}
        </label>
        <span className="roi-num-wrap">
          <input
            type="number"
            className="roi-num"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(e) => {
              const raw = e.target.valueAsNumber;
              onChange(Number.isNaN(raw) ? 0 : clamp(raw, min, max));
            }}
          />
          {suffix && <span className="roi-suffix">{suffix}</span>}
        </span>
      </div>
      <input
        type="range"
        className="roi-range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}

export default function CalculateurRoiPage() {
  const [v, setV] = useState(DEFAULTS);
  const [upside, setUpside] = useState(false);

  const set = (key: keyof typeof DEFAULTS) => (val: number) =>
    setV((prev) => ({ ...prev, [key]: val }));

  /* ─── Moteur de calcul ──────────────────────────────
     Bloc 1 — Socle (toujours). Bloc 2 — Upside (si toggle ON).
     La rentabilité HEADLINE est portée par le seul socle. */
  const tempsAppelMensuelH = (v.appelsJour * v.dureeMin / 60) * v.joursMois;
  const capaciteRecuperee = tempsAppelMensuelH * v.coutHoraire * v.facteurInterruption;

  const caRecupere = upside ? v.appelsManques * v.ticketMoyen * v.joursMois : 0;
  const margeRecuperee = caRecupere * (v.margeBrute / 100);

  const gainNetSocle = capaciteRecuperee - v.prixMensuel;
  const ratioSocle = v.prixMensuel > 0 ? capaciteRecuperee / v.prixMensuel : 0;
  const amortissementMois = gainNetSocle > 0 ? v.setup / gainNetSocle : null;

  const beneficeTotal = capaciteRecuperee + margeRecuperee;
  const ratioTotal = v.prixMensuel > 0 ? beneficeTotal / v.prixMensuel : 0;

  /* ─── Libellé amortissement (toujours basé sur le socle) ─ */
  let amortLabel: React.ReactNode;
  let amortNeg = false;
  if (gainNetSocle <= 0) {
    amortLabel = "À ce volume, l'agent n'est pas encore rentabilisé.";
    amortNeg = true;
  } else if (amortissementMois! < 1) {
    amortLabel = <>Rentabilisé en <strong>moins d&apos;un mois</strong>.</>;
  } else {
    amortLabel = <>Rentabilisé en <strong>~{Math.round(amortissementMois!)} mois</strong>.</>;
  }

  return (
    <>
      <Navbar />
      <main className="roi-page">
        <div className="wrap">
          {/* ── En-tête ── */}
          <div className="roi-head">
            <a href="/services" className="crumb-back">← Retour aux services</a>
            <h1 className="roi-title">
              Calculateur de <em className="it">ROI</em>
            </h1>
            <p className="roi-sub">
              Agent IA téléphonique. Ajustez les valeurs en direct : le résultat se recalcule
              instantanément. Pré-rempli sur un cas réel (boulangerie Feuillette, Tours).
            </p>
          </div>

          <div className="roi-layout">
            {/* ═══ COLONNE INPUTS ═══ */}
            <div>
              <div className="roi-panel">
                <div className="roi-panel-title">Le socle — temps d&apos;équipe</div>

                <ControlRow
                  label="Nombre d'appels par jour"
                  value={v.appelsJour}
                  onChange={set('appelsJour')}
                  min={0}
                  max={60}
                  step={1}
                  suffix="/ jour"
                />
                <ControlRow
                  label="Durée moyenne d'un appel"
                  value={v.dureeMin}
                  onChange={set('dureeMin')}
                  min={1}
                  max={20}
                  step={0.5}
                  suffix="min"
                />
                <ControlRow
                  label="Coût horaire chargé de l'équipe"
                  value={v.coutHoraire}
                  onChange={set('coutHoraire')}
                  min={10}
                  max={60}
                  step={1}
                  suffix="€ / h"
                />
              </div>

              {/* ── Toggle upside ── */}
              <div className="roi-panel">
                <button
                  type="button"
                  role="switch"
                  aria-checked={upside}
                  className={`roi-toggle ${upside ? 'on' : ''}`}
                  onClick={() => setUpside((o) => !o)}
                >
                  <span className="roi-toggle-track">
                    <span className="roi-toggle-knob" />
                  </span>
                  <span>Cette boutique vend beaucoup par téléphone</span>
                </button>

                {upside && (
                  <div className="roi-upside">
                    <ControlRow
                      label="Appels manqués ou mal pris / jour"
                      value={v.appelsManques}
                      onChange={set('appelsManques')}
                      min={0}
                      max={20}
                      step={1}
                      suffix="/ jour"
                    />
                    <ControlRow
                      label="Ticket moyen"
                      value={v.ticketMoyen}
                      onChange={set('ticketMoyen')}
                      min={5}
                      max={200}
                      step={1}
                      suffix="€"
                    />
                    <ControlRow
                      label="Marge brute"
                      value={v.margeBrute}
                      onChange={set('margeBrute')}
                      min={0}
                      max={100}
                      step={1}
                      suffix="%"
                    />
                  </div>
                )}
              </div>

              {/* ── Paramètres avancés ── */}
              <details className="roi-adv">
                <summary>Paramètres</summary>
                <div className="roi-adv-body">
                  <ControlRow
                    label="Jours d'ouverture / mois"
                    value={v.joursMois}
                    onChange={set('joursMois')}
                    min={1}
                    max={31}
                    step={1}
                    suffix="j"
                  />
                  <ControlRow
                    label="Prix mensuel de la solution"
                    value={v.prixMensuel}
                    onChange={set('prixMensuel')}
                    min={0}
                    max={2000}
                    step={1}
                    suffix="€ / mois"
                  />
                  <ControlRow
                    label="Setup one-shot"
                    value={v.setup}
                    onChange={set('setup')}
                    min={0}
                    max={2000}
                    step={10}
                    suffix="€"
                  />
                  <ControlRow
                    label="Facteur d'interruption"
                    value={v.facteurInterruption}
                    onChange={set('facteurInterruption')}
                    min={1.0}
                    max={1.6}
                    step={0.05}
                    tooltip="Temps d'appel pur = 1.0. Le temps réellement mobilisé est supérieur (bascule, perte de fil, reprise). Mesuré chez Feuillette Tours : ~1.6."
                  />
                </div>
              </details>
            </div>

            {/* ═══ COLONNE RÉSULTATS ═══ */}
            <div className="roi-results">
              {/* Carte 1 — Capacité récupérée */}
              <div className="roi-card">
                <div className="roi-card-label">Capacité opérationnelle récupérée</div>
                <div className="roi-big">
                  {fmtEur(capaciteRecuperee)}
                  <span className="roi-big-unit"> / mois</span>
                </div>
                <p className="roi-card-note">
                  ~{fmtHours(tempsAppelMensuelH)} h/mois d&apos;équipe libérées du téléphone.
                </p>
              </div>

              {/* Carte 2 — Principale (SOCLE seul) */}
              <div className="roi-card roi-card-main">
                <p className="roi-claim">
                  Votre agent coûte <strong>{fmtEur(v.prixMensuel)}/mois</strong> et vous en
                  rapporte <strong>{fmtEur(capaciteRecuperee)}/mois</strong>.
                </p>
                <div className="roi-mult">{fmtMult(ratioSocle)}</div>
                <div className="roi-mult-sub">le coût de la solution</div>
                <div className={`roi-amort ${amortNeg ? 'neg' : ''}`}>{amortLabel}</div>
              </div>

              {/* Carte 3 — Bonus upside (uniquement si toggle ON) */}
              {upside && (
                <div className="roi-card roi-card-bonus">
                  <span className="roi-badge">+ en bonus</span>
                  <p className="roi-bonus-main">
                    + <strong>{fmtEur(caRecupere)}/mois</strong> de CA récupéré sur les appels
                    manqués (soit <strong>{fmtEur(margeRecuperee)}</strong> de marge supplémentaire).
                  </p>
                  <div className="roi-bonus-total">
                    Bénéfice total : {fmtMult(ratioTotal)} le coût de la solution.
                  </div>
                </div>
              )}

              {/* Mention sous les résultats */}
              <p className="roi-mention">
                {upside
                  ? "Le temps récupéré rentabilise déjà l'agent à lui seul. Le CA récupéré vient par-dessus."
                  : "Estimation basée sur le seul temps d'équipe récupéré — donnée mesurée. Le CA récupéré sur les appels manqués est un bonus en plus : activez l'option si la boutique prend des commandes par téléphone."}
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
