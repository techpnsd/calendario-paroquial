/*
 * Simulação mínima do Google Apps Script (SpreadsheetApp, Utilities, etc.)
 * para testar o Codigo.gs fora do Google e para a página de demonstração.
 * Os métodos de formatação viram "no-op" encadeáveis; os de dados funcionam de verdade.
 */
(function (root) {
  'use strict';

  function chain() {
    const fn = function () { return p; };
    const p = new Proxy(fn, {
      get(_, k) {
        if (k === 'then' || k === Symbol.toPrimitive || k === Symbol.iterator) return undefined;
        if (k === 'toString' || k === 'valueOf') return () => '';
        return p;
      },
      apply() { return p; }
    });
    return p;
  }

  function withChain(obj) {
    return new Proxy(obj, {
      get(t, k, r) {
        if (k in t) return t[k];
        if (typeof k === 'symbol' || k === 'then') return undefined;
        return function () { return r; };
      }
    });
  }

  const pad = (n) => (n < 10 ? '0' : '') + n;
  function fmt(date, _tz, f) {
    const d = date;
    return f.replace(/yyyy|MM|dd|HH|mm|ss/g, (t) => ({
      yyyy: d.getFullYear(), MM: pad(d.getMonth() + 1), dd: pad(d.getDate()),
      HH: pad(d.getHours()), mm: pad(d.getMinutes()), ss: pad(d.getSeconds())
    }[t]));
  }

  function display(v) {
    if (v === null || v === undefined) return '';
    if (v instanceof Date) {
      if (v.getHours() || v.getMinutes()) return fmt(v, '', 'dd/MM/yyyy HH:mm');
      return fmt(v, '', 'dd/MM/yyyy');
    }
    let s = String(v);
    if (s.charAt(0) === "'") s = s.slice(1);
    return s;
  }

  function stored(v) {
    // imita a planilha: data ISO vira data; resto fica como está
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
      const [a, m, d] = v.split('-').map(Number);
      return new Date(a, m - 1, d);
    }
    if (typeof v === 'string' && v.charAt(0) === "'") return v.slice(1);
    return v;
  }

  class Sheet {
    constructor(ss, name) { this.ss = ss; this.name = name; this.data = []; }
    getName() { return this.name; }
    setName(n) { this.name = n; return this; }
    getLastRow() {
      for (let r = this.data.length - 1; r >= 0; r--) {
        if ((this.data[r] || []).some((v) => v !== '' && v != null)) return r + 1;
      }
      return 0;
    }
    getLastColumn() {
      let max = 0;
      this.data.forEach((row) => {
        for (let c = (row || []).length - 1; c >= 0; c--) {
          if (row[c] !== '' && row[c] != null) { max = Math.max(max, c + 1); break; }
        }
      });
      return max;
    }
    getMaxRows() { return Math.max(1000, this.data.length); }
    getMaxColumns() { return 26; }
    getRange(r, c, nr, nc) { return withChain(new Range(this, r, c, nr || 1, nc || 1)); }
    appendRow(vals) { this.data[this.getLastRow()] = vals.map(stored); return this; }
    insertRowsAfter() { return this; }
    getSheetId() { return 1; }
  }

  class Range {
    constructor(sh, r, c, nr, nc) { Object.assign(this, { sh, r, c, nr, nc }); }
    _get(conv) {
      const out = [];
      for (let i = 0; i < this.nr; i++) {
        const row = this.sh.data[this.r - 1 + i] || [];
        const line = [];
        for (let j = 0; j < this.nc; j++) {
          const v = row[this.c - 1 + j];
          line.push(conv(v === undefined || v === null ? '' : v));
        }
        out.push(line);
      }
      return out;
    }
    getValues() { return this._get((v) => v); }
    getDisplayValues() { return this._get(display); }
    getValue() { return this.getValues()[0][0]; }
    setValues(vals) {
      vals.forEach((row, i) => {
        const rr = this.r - 1 + i;
        this.sh.data[rr] = this.sh.data[rr] || [];
        row.forEach((v, j) => { this.sh.data[rr][this.c - 1 + j] = stored(v); });
      });
      return this;
    }
    setValue(v) { return this.setValues([[v]]); }
  }

  class Spreadsheet {
    constructor() { this.sheets = []; }
    getSheetByName(n) { return this.sheets.find((s) => s.name === n) ? withChain(this.sheets.find((s) => s.name === n)) : null; }
    getSheets() { return this.sheets.map(withChain); }
    insertSheet(n, pos) {
      const s = new Sheet(this, n);
      if (typeof pos === 'number') this.sheets.splice(pos, 0, s); else this.sheets.push(s);
      return withChain(s);
    }
    getSpreadsheetTimeZone() { return 'America/Sao_Paulo'; }
    getId() { return 'fake'; }
  }

  const ss = new Spreadsheet();
  ss.sheets.push(new Sheet(ss, 'Página1'));

  const props = {};
  const mails = [];

  const G = {
    __ss: ss,
    __mails: mails,
    SpreadsheetApp: withChain({
      getActiveSpreadsheet: () => withChain(ss),
      getUi: () => { throw new Error('sem interface'); },
      newDataValidation: chain,
      newConditionalFormatRule: chain
    }),
    Utilities: {
      formatDate: fmt,
      getUuid: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      }),
      sleep: () => {}
    },
    LockService: { getScriptLock: () => ({ waitLock() {}, tryLock() { return true; }, releaseLock() {} }) },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => (k in props ? props[k] : null),
        setProperty: (k, v) => { props[k] = String(v); }
      })
    },
    MailApp: {
      getRemainingDailyQuota: () => 100,
      sendEmail: (o) => { mails.push(o); }
    },
    Session: { getScriptTimeZone: () => 'America/Sao_Paulo' },
    ScriptApp: { getService: () => ({ getUrl: () => (G.__url || '') }) },
    Logger: { log: () => {} },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: (texto) => { const o = { getContent: () => texto, setMimeType: () => o }; return o; }
    },
    HtmlService: chain()
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = G;
  else Object.assign(root, G);
})(typeof window !== 'undefined' ? window : globalThis);
