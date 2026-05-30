import { applyDomBranding, loadTenantBrandingRow } from './tenantBranding';

export const defaultTheme = {
  nomeSistema: 'Gestão de Escalas',
  logo: '/logo.jpg',
  cores: {
    fundo: '#F1F5F9',
    sidebar: '#0F172A',
    secundaria: '#009C3B',
    textoClaro: '#CBD5E1',
  },
};

export function themeCacheKey(tenantId) {
  return `gestaoescala-theme-${tenantId}`;
}

export function montarTheme(d) {
  if (!d) return defaultTheme;

  return {
    nomeSistema: d.nome_sistema || defaultTheme.nomeSistema,
    logo: d.logo_url || defaultTheme.logo,
    cores: {
      fundo: d.cor_fundo || defaultTheme.cores.fundo,
      sidebar: d.cor_primaria || defaultTheme.cores.sidebar,
      secundaria: d.cor_secundaria || defaultTheme.cores.secundaria,
      textoClaro: '#CBD5E1',
    },
  };
}

export function lerThemeCache(tenantId) {
  try {
    const raw = localStorage.getItem(themeCacheKey(tenantId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function salvarThemeCache(tenantId, theme) {
  try {
    localStorage.setItem(themeCacheKey(tenantId), JSON.stringify(theme));
  } catch {}
}

export function montarLoginTheme(theme) {
  return {
    nomeSistema: theme.nomeSistema || defaultTheme.nomeSistema,
    logo: theme.logo || defaultTheme.logo,
    corFundo: theme.cores?.fundo || defaultTheme.cores.fundo,
    corPrimaria: theme.cores?.sidebar || defaultTheme.cores.sidebar,
    corSecundaria: theme.cores?.secundaria || defaultTheme.cores.secundaria,
  };
}

export async function carregarTemaTenant(tenantId, options = {}) {
  const row = await loadTenantBrandingRow(tenantId, options);
  if (!row) return null;

  const theme = montarTheme(row);
  applyDomBranding(row);
  salvarThemeCache(tenantId, theme);
  return theme;
}

export function dispatchThemeUpdated(escRow) {
  window.dispatchEvent(
    new CustomEvent('tenant-theme-updated', { detail: escRow })
  );
}
