import { useCallback, useState } from "react";

interface Props {
  onFileSelect: (file: File) => void;
  loading: boolean;
  error: string | null;
}

export function UploadZone({ onFileSelect, loading, error }: Props) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-8 py-16 transition-all duration-200 ${
          dragOver
            ? "border-ujat-blue bg-blue-50/50 scale-[1.01]"
            : "border-slate-300 bg-white hover:border-ujat-blue/50 hover:bg-slate-50/50"
        } ${loading ? "pointer-events-none opacity-60" : ""}`}
      >
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleChange}
          className="absolute inset-0 cursor-pointer opacity-0"
          disabled={loading}
        />

        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-ujat-blue/10">
          <svg className="h-8 w-8 text-ujat-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>

        <h3 className="font-display text-lg font-semibold text-slate-800">
          {loading ? "Analizando propuestas..." : "Cargar archivo Excel de propuestas"}
        </h3>
        <p className="mt-2 text-center text-sm text-slate-500">
          Arrastra tu archivo <strong>.xlsx</strong> o haz clic para seleccionar
        </p>
        <p className="mt-4 rounded-lg bg-slate-100 px-4 py-2 text-xs text-slate-600">
          Estructura esperada: hoja &quot;Exportar Hoja de Trabajo&quot; con columnas FOLIO, TEMA, AREA, PONENTES, CARGO, etc.
        </p>

        {loading && (
          <div className="mt-6 flex items-center gap-2 text-sm text-ujat-blue">
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Procesando datos y generando dashboard...
          </div>
        )}
      </label>

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
