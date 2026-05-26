// ── Cliente HTTP customizado para operações de Auth ──────────
// Usado para criação de usuários (signUp) sem afetar a sessão
// do administrador logado — limitação do SDK oficial.

import { config } from '../config';

const SUPABASE_URL = config.supabase.url;
const SUPABASE_KEY = config.supabase.key;
const SCHEMA       = config.supabase.schema;

class QB {
  constructor(table, token = null, schema = SCHEMA) {
    this.table   = table;
    this.token   = token;
    this.schema  = schema;
    this.params  = new URLSearchParams();
    this.method  = 'GET';
    this.body    = null;
    this.isSingle = false;
  }

  select(fields = '*') { this.params.set('select', fields); return this; }
  eq(col, val)         { this.params.append(col, `eq.${val}`); return this; }
  neq(col, val)        { this.params.append(col, `neq.${val}`); return this; }
  in(col, vals = [])   { this.params.append(col, `in.(${vals.map(v => `"${v}"`).join(',')})`); return this; }
  is(col, val)         { this.params.append(col, `is.${val}`); return this; }
  order(col, opts = {}) {
    this.params.append('order', `${col}.${opts.ascending === false ? 'desc' : 'asc'}`);
    return this;
  }
  limit(n)   { this.params.set('limit', String(n)); return this; }
  single()   { this.isSingle = true; return this; }
  insert(b)  { this.method = 'POST';   this.body = b; return this; }
  update(b)  { this.method = 'PATCH';  this.body = b; return this; }
  delete()   { this.method = 'DELETE'; return this; }

  async execute() {
    const qs  = this.params.toString();
    const url = `${SUPABASE_URL}/rest/v1/${this.table}${qs ? `?${qs}` : ''}`;

    const headers = {
      apikey:           SUPABASE_KEY,
      Authorization:    `Bearer ${this.token || SUPABASE_KEY}`,
      'Content-Type':   'application/json',
      Accept:           this.isSingle ? 'application/vnd.pgrst.object+json' : 'application/json',
      'Accept-Profile': this.schema,
      'Content-Profile':this.schema,
      Prefer:           'return=representation',
    };

    const res  = await fetch(url, { method: this.method, headers, body: this.body ? JSON.stringify(this.body) : null });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!res.ok) throw data;
    return data;
  }

  then(resolve, reject) { return this.execute().then(resolve, reject); }
}

class SB {
  constructor() {
    this.url    = SUPABASE_URL;
    this.key    = SUPABASE_KEY;
    this.schema = SCHEMA;
  }

  from(table, token = null)       { return new QB(table, token, this.schema);  }
  fromPublic(table, token = null) { return new QB(table, token, 'public');     }

  // Criação de usuário via Auth REST — não afeta a sessão atual do admin
  async signUp(email, password, metadata = {}) {
    const res = await fetch(`${this.url}/auth/v1/signup`, {
      method: 'POST',
      headers: { apikey: this.key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, data: metadata }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error_description || data.msg || data.message || `Erro ${res.status}`);
    return data;
  }

  // Reset de senha por e-mail
  async sendReset(email) {
    const res = await fetch(`${this.url}/auth/v1/recover`, {
      method: 'POST',
      headers: { apikey: this.key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.msg || d.message || 'Erro ao enviar e-mail de reset.');
    }
    return true;
  }
}

export const _sb = new SB();
