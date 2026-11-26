import React from 'react';
import { FileText } from 'lucide-react';

export const ChantierDocumentsSection: React.FC = () => {
  return (
    <div className="bg-white rounded-3xl p-5 border border-sable/80 shadow-soft space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-terracotta/15 text-terracotta flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-sauge">
            Documents & Plans du chantier
          </h2>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sable text-foret/80">
          2 fichiers
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3.5 rounded-2xl bg-craie border border-sable/70 flex items-center gap-3 hover:border-sauge transition-all shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-terracotta text-white flex items-center justify-center shrink-0 shadow-xs">
            <FileText className="w-5 h-5" />
          </div>
          <div className="overflow-hidden min-w-0">
            <p className="text-xs font-bold text-foret truncate">Plan d'aménagement.pdf</p>
            <p className="text-[11px] text-foret/60">PDF technique • 2.4 Mo</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-craie border border-sable/70 flex items-center gap-3 hover:border-sauge transition-all shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-terracotta text-white flex items-center justify-center shrink-0 shadow-xs">
            <FileText className="w-5 h-5" />
          </div>
          <div className="overflow-hidden min-w-0">
            <p className="text-xs font-bold text-foret truncate">Devis signé.pdf</p>
            <p className="text-[11px] text-foret/60">Contrat client • 840 Ko</p>
          </div>
        </div>
      </div>
    </div>
  );
};
