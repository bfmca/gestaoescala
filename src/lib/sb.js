import { config } from '../config';

const SUPABASE_URL = config.supabase.url;
const SUPABASE_KEY = config.supabase.key;
const SCHEMA = config.supabase.schema;

class QB {
  constructor(table, token = null, schema = SCHEMA) {
    this.table = table;
    this.token = token;
    this.schema = schema;
    this.params = new URLSearchParams();
    this.method = 'GET';
    this.body = null;
    this.isSingle = false;
  }

  select(fields = '*') {
    this.params.set('select', fields);
    return this;
  }

  eq(col, val) {
    this.params.append(col, `eq.${val}`);
    return this;
  }

  neq(col, val) {
    this.params.append(col, `neq.${val}`);
    return this;
  }

  in(col, vals = []) {
    const lista = vals.map((v) => `"${v}"`).join(',');
    this.params.append(col, `in.(${lista})`);
    return this;
  }

  is(col, val) {
    this.params.append(col, `is.${val}`);
    return this;
  }

  order(col, options = {}) {
    const direction = options.ascending === false ? 'desc' : 'asc';
    this.params.append('order', `${col}.${direction}`);
    return this;
  }

  limit(n) {
    this.params.set('limit', String(n));
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  insert(body) {
    this.method = 'POST';
    this.body = body;
    return this;
  }

  update(body) {
    this.method = 'PATCH';
    this.body = body;
    return this;
  }

  delete() {
    this.method = 'DELETE';
    return this;
  }

  async execute() {
    const query = this.params.toString();
    const url = `${SUPABASE_URL}/rest/v1/${this.table}${
      query ? `?${query}` : ''
    }`;

    const headers = {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${this.token || SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Accept: this.isSingle
        ? 'application/vnd.pgrst.object+json'
        : 'application/json',
      'Accept-Profile': this.schema,
      'Content-Profile': this.schema,
      Prefer: 'return=representation',
    };

    const response = await fetch(url, {
      method: this.method,
      headers,
      body: this.body ? JSON.stringify(this.body) : null,
    });

    const text = await response.text();

    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!response.ok) {
      throw data;
    }

    return data;
  }

  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }
}

class SB {
  constructor() {
    this.url = SUPABASE_URL;
    this.key = SUPABASE_KEY;
    this.schema = SCHEMA;
  }

  from(table, token = null) {
    return new QB(table, token, this.schema);
  }

  fromPublic(table, token = null) {
    return new QB(table, token, 'public');
  }

  async rpc(functionName, body = {}, token = null) {
    const response = await fetch(`${this.url}/rest/v1/rpc/${functionName}`, {
      method: 'POST',
      headers: {
        apikey: this.key,
        Authorization: `Bearer ${token || this.key}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-Profile': this.schema,
        'Content-Profile': this.schema,
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();

    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!response.ok) {
      throw data;
    }

    return data;
  }

  async login(email, password) {
    const response = await fetch(
      `${this.url}/auth/v1/token?grant_type=password`,
      {
        method: 'POST',
        headers: {
          apikey: this.key,
          Authorization: `Bearer ${this.key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw data;
    }

    return data;
  }

  async logout(token) {
    if (!token) return;

    await fetch(`${this.url}/auth/v1/logout`, {
      method: 'POST',
      headers: {
        apikey: this.key,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async signUp(email, password, metadata = {}) {
    const response = await fetch(`${this.url}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        apikey: this.key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        data: metadata,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw data;
    }

    return data;
  }

  async updatePassword(newPassword, token) {
    const response = await fetch(`${this.url}/auth/v1/user`, {
      method: 'PUT',
      headers: {
        apikey: this.key,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        password: newPassword,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw data;
    }

    return data;
  }
}

export const _sb = new SB();
