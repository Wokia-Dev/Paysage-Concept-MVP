import React from 'react';
import { FileText } from 'lucide-react';

export const ChantierDocumentsSection: React.FC = () => {
  return (
    <div className="bg-white dark:bg-[#172322] rounded-3xl p-5 border border-sable/80 dark:border-[#2A3F3C] shadow-soft space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-terracotta/15 dark:bg-terracotta/25 text-terracotta dark:text-[#E38D69] flex items-center justify-center">
            <FileText className="w-4 h-4" />
          </div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-sauge dark:text-[#9BB89B]">
            Documents & Plans du chantier
          </h2>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sable text-foret/80 dark:bg-[#263A37] dark:text-[#D5E6DC]">
          2 fichiers
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3.5 rounded-2xl bg-craie dark:bg-[#1E2E2C] border border-sable/70 dark:border-[#304744] flex items-center gap-3 hover:border-sauge dark:hover:border-[#4A6B66] transition-all shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-terracotta text-white flex items-center justify-center shrink-0 shadow-xs">
            <FileText className="w-5 h-5" />
          </div>
          <div className="overflow-hidden min-w-0">
            <p className="text-xs font-bold text-foret dark:text-[#EDF2F0] truncate">Plan d'aménagement.pdf</p>
            <p className="text-[11px] text-foret/60 dark:text-[#B8C7C2]">PDF technique • 2.4 Mo</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-craie dark:bg-[#1E2E2C] border border-sable/70 dark:border-[#304744] flex items-center gap-3 hover:border-sauge dark:hover:border-[#4A6B66] transition-all shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-terracotta text-white flex items-center justify-center shrink-0 shadow-xs">
            <FileText className="w-5 h-5" />
          </div>
          <div className="overflow-hidden min-w-0">
            <p className="text-xs font-bold text-foret dark:text-[#EDF2F0] truncate">Devis signé.pdf</p>
            <p className="text-[11px] text-foret/60 dark:text-[#B8C7C2]">Contrat client • 840 Ko</p>
          </div>
        </div>
      </div>
    </div>
  );
};
