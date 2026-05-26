export default function ThemePreviewCard({
  nomeSistema = 'Escala Médica',
  logo = 'https://placehold.co/160x60/ffffff/0f172a?text=LOGO',

  corSidebar = '#0F172A',
  corSecundaria = '#D4A62A',
  corFundo = '#F1F5F9',
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <h3 className="text-xl font-semibold text-slate-800 mb-6">
        Pré-visualização
      </h3>

      <div
        className="rounded-2xl overflow-hidden border border-slate-200"
        style={{
          backgroundColor: corFundo,
        }}
      >
        <div className="flex h-[320px]">
          {/* Sidebar */}
          <div
            className="w-[220px] flex flex-col"
            style={{
              backgroundColor: corSidebar,
            }}
          >
            {/* Logo */}
            <div className="bg-white">
              <div className="p-4 flex justify-center">
                <img
                  src={logo}
                  alt="Logo"
                  className="max-w-[140px] max-h-[60px] object-contain"
                />
              </div>

              <div
                style={{
                  height: '3px',
                  backgroundColor: corSecundaria,
                }}
              />
            </div>

            {/* Menu */}
            <div className="p-3 space-y-2">
              <div
                className="
                  h-9
                  rounded-lg
                  opacity-90
                "
                style={{
                  backgroundColor: 'rgba(255,255,255,0.10)',
                  borderLeft: `3px solid ${corSecundaria}`,
                }}
              />

              <div className="h-9 rounded-lg bg-white/5" />
              <div className="h-9 rounded-lg bg-white/5" />
              <div className="h-9 rounded-lg bg-white/5" />
            </div>

            <div className="flex-1" />

            {/* Rodapé */}
            <div
              style={{
                height: '3px',
                backgroundColor: corSecundaria,
              }}
            />

            <div className="p-4">
              <div className="h-4 w-24 rounded bg-white/10" />
            </div>
          </div>

          {/* Conteúdo */}
          <div className="flex-1 p-6">
            <div className="h-8 w-56 rounded bg-slate-300 mb-3" />

            <div className="h-4 w-80 rounded bg-slate-200 mb-8" />

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="h-24 rounded-2xl bg-white border border-slate-200" />
              <div className="h-24 rounded-2xl bg-white border border-slate-200" />
              <div className="h-24 rounded-2xl bg-white border border-slate-200" />
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 p-4">
              <div className="space-y-3">
                <div className="h-4 rounded bg-slate-200" />
                <div className="h-4 rounded bg-slate-100" />
                <div className="h-4 rounded bg-slate-100" />
                <div className="h-4 rounded bg-slate-100" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
