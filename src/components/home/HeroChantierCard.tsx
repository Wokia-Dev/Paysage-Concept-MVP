import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ChevronRight, MapPin, Navigation, Sparkles } from 'lucide-react';
import type { Chantier } from '../../types/database';
import { getMapsUrl, getStatusBadge } from '../../lib/formatters';

interface HeroChantierCardProps {
  activeHeroChantier: Chantier | null;
  availableChantiers: Chantier[];
  selectedChantier: Chantier | null;
  onSelectChantier: (chantier: Chantier) => void;
}

export const HeroChantierCard: React.FC<HeroChantierCardProps> = ({
  activeHeroChantier,
  availableChantiers,
  selectedChantier,
  onSelectChantier,
}) => {
  return (
    <section className="relative z-10">
      <div className="bg-white rounded-3xl p-5 border border-sable/80 shadow-soft space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-sauge flex items-center gap-1.5 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-terracotta" />
            Prochaine intervention
          </span>

          {activeHeroChantier && (
            <span
              className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                getStatusBadge(activeHeroChantier.statut).className
              }`}
            >
              {getStatusBadge(activeHeroChantier.statut).label}
            </span>
          )}
        </div>

        {activeHeroChantier ? (
          <div className="space-y-3">
            <div>
              <h2 className="text-lg font-bold text-foret tracking-tight">
                Chantier : {activeHeroChantier.nom_client}
              </h2>
            </div>

            <a
              href={getMapsUrl(activeHeroChantier.adresse)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2 text-xs text-foret/80 hover:text-foret transition-colors group p-2.5 rounded-xl bg-craie border border-sable/60 min-h-[48px]"
            >
              <MapPin className="w-4 h-4 text-foret shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
              <span className="underline underline-offset-2 flex-1 font-medium">
                {activeHeroChantier.adresse}
              </span>
              <Navigation className="w-3.5 h-3.5 ml-1 text-foret/40 group-hover:text-foret shrink-0 mt-0.5" />
            </a>

            {availableChantiers.length > 1 && (
              <div className="pt-1">
                <select
                  value={selectedChantier?.id || ''}
                  onChange={(e) => {
                    const found = availableChantiers.find((c) => c.id === e.target.value);
                    if (found) onSelectChantier(found);
                  }}
                  className="w-full text-xs font-bold text-foret bg-craie rounded-xl p-2.5 border border-sable focus:outline-none focus:ring-2 focus:ring-foret/20 cursor-pointer min-h-[48px]"
                >
                  {availableChantiers.map((c) => (
                    <option key={c.id} value={c.id}>
                      Basculer vers : {c.nom_client}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center justify-between pt-1 text-xs border-t border-sable/40">
              <Link
                to={`/chantier/${activeHeroChantier.id}`}
                className="text-foret hover:text-foret/80 font-bold flex items-center gap-1 min-h-[48px]"
              >
                <span>Consulter la fiche détaillée</span>
                <ChevronRight className="w-4 h-4" />
              </Link>

              <div className="flex items-center gap-1.5" aria-hidden="true">
                <span className="w-4 h-1.5 bg-foret rounded-full" />
                <span className="w-1.5 h-1.5 bg-sable rounded-full" />
                <span className="w-1.5 h-1.5 bg-sable rounded-full" />
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-800 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              Aucun chantier assigné pour cette journée.
            </p>
            <p className="text-[11px] text-amber-700">
              Vous pouvez néanmoins saisir vos heures déclaratives ci-dessous.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};
