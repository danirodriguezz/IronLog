type OverallReportProps = {
  report: string;
  adherenceAnalysis: string;
  volumeAnalysis: string;
};

export const OverallReport = ({
  report,
  adherenceAnalysis,
  volumeAnalysis,
}: OverallReportProps): React.ReactElement => (
  <div className="space-y-6">
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-mineral-300 mb-3">
        Informe del entrenador
      </p>
      <div className="rounded-2xl hairline bg-ink-900/50 p-5 md:p-6">
        <p className="text-sm leading-relaxed text-ink-100 whitespace-pre-line">{report}</p>
      </div>
    </div>

    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-2xl hairline bg-ink-900/50 p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-400 mb-2">
          Constancia
        </p>
        <p className="text-sm leading-relaxed text-ink-200">{adherenceAnalysis}</p>
      </div>
      <div className="rounded-2xl hairline bg-ink-900/50 p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-400 mb-2">
          Volumen
        </p>
        <p className="text-sm leading-relaxed text-ink-200">{volumeAnalysis}</p>
      </div>
    </div>
  </div>
);
