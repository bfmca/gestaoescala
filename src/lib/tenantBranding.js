import { supabase, supabasePublic } from './supabase';

const MODULE_CODE = 'esc';

const DEFAULTS = {
  cor_fundo: '#F1F5F9',
  cor_primaria: '#0F172A',
  cor_secundaria: '#009C3B',
  nome_sistema: 'Gestão de Escalas',
};

/** SSO do Painel Master (?access_token=&refresh_token=). */
export async function consumeSsoFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');

  if (!accessToken || !refreshToken) return null;

  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) throw error;

  params.delete('access_token');
  params.delete('refresh_token');
  const qs = params.toString();
  const clean = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`;
  window.history.replaceState({}, document.title, clean);

  return data.session;
}

/** Painel (public.tenants) → appescala.tenants */
export function mapPainelTenantToEsc(painel) {
  if (!painel) return null;

  return {
    nome_sistema: painel.name || DEFAULTS.nome_sistema,
    logo_url: painel.logo_url || '',
    app_icon_url: painel.app_icon_url || '',
    cor_primaria: painel.secondary_color || DEFAULTS.cor_primaria,
    cor_secundaria: painel.primary_color || DEFAULTS.cor_secundaria,
    cor_fundo: DEFAULTS.cor_fundo,
  };
}

export async function fetchPainelTenant(tenantId) {
  if (!tenantId) return null;

  const { data, error } = await supabasePublic
    .from('tenants')
    .select(
      'id, name, slug, logo_url, app_icon_url, primary_color, secondary_color, active'
    )
    .eq('id', tenantId)
    .maybeSingle();

  if (error) {
    console.warn('[branding] public.tenants:', error.message);
    return null;
  }

  if (!data?.active) return null;
  return data;
}

export async function verifyEscModuleEnabled(tenantId) {
  const { data, error } = await supabasePublic
    .from('tenant_modules')
    .select('enabled')
    .eq('tenant_id', tenantId)
    .eq('module_code', MODULE_CODE)
    .maybeSingle();

  if (error) {
    console.warn('[branding] tenant_modules:', error.message);
    return true;
  }

  return !!data?.enabled;
}

export async function fetchAppescalaTenant(tenantId) {
  const { data, error } = await supabase
    .from('tenants')
    .select('nome_sistema, logo_url, cor_primaria, cor_secundaria, cor_fundo')
    .eq('id', tenantId)
    .maybeSingle();

  if (error) {
    console.warn('[branding] appescala.tenants:', error.message);
    return null;
  }

  return data;
}

export async function syncPainelBrandingToAppescala(tenantId, escRow) {
  if (!tenantId || !escRow) return;

  const { error } = await supabase
    .from('tenants')
    .update({
      nome_sistema: escRow.nome_sistema,
      logo_url: escRow.logo_url,
      cor_primaria: escRow.cor_primaria,
      cor_secundaria: escRow.cor_secundaria,
      cor_fundo: escRow.cor_fundo,
    })
    .eq('id', tenantId);

  if (error) {
    console.warn('[branding] sync appescala:', error.message);
  }
}

export async function loadTenantBrandingRow(tenantId, { checkModule = false } = {}) {
  if (!tenantId) return null;

  if (checkModule) {
    const enabled = await verifyEscModuleEnabled(tenantId);
    if (!enabled) {
      throw new Error('Módulo Escalas não habilitado para este cliente.');
    }
  }

  const painel = await fetchPainelTenant(tenantId);
  if (painel) {
    const escRow = mapPainelTenantToEsc(painel);
    await syncPainelBrandingToAppescala(tenantId, escRow);
    return escRow;
  }

  return fetchAppescalaTenant(tenantId);
}

export function applyDomBranding(escRow) {
  if (!escRow) return;

  const root = document.documentElement;
  root.style.setProperty('--tenant-primary', escRow.cor_secundaria);
  root.style.setProperty('--tenant-secondary', escRow.cor_primaria);
  root.style.setProperty('--tenant-bg', escRow.cor_fundo);

  if (escRow.nome_sistema) {
    document.title = escRow.nome_sistema;
  }

  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) {
    themeMeta.setAttribute('content', escRow.cor_primaria);
  }

  const iconHref = escRow.app_icon_url || escRow.logo_url;
  if (iconHref) {
    upsertLink('icon', iconHref);
    upsertLink('apple-touch-icon', iconHref);
  }
}

function upsertLink(rel, href) {
  let link = document.querySelector(`link[rel="${rel}"]`);
  if (!link) {
    link = document.createElement('link');
    link.rel = rel;
    document.head.appendChild(link);
  }
  link.href = href;
}

export { DEFAULTS };
