const locales = {};
let currentLang = 'en';
const listeners = new Set();

export function registerLocale(lang, data) {
    locales[lang] = data;
}

export function getLang() {
    return currentLang;
}

export function setLang(lang) {
    if (!locales[lang] && lang !== 'en') return;
    currentLang = lang;
    document.documentElement.lang = lang;
    listeners.forEach(fn => fn(lang));
}

export function onLangChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

export function t(key, params) {
    const val = resolve(key);
    if (typeof val !== 'string') return val ?? key;
    if (!params) return val;
    return val.replace(/\{(\w+)\}/g, (_, k) => (params[k] != null ? params[k] : `{${k}}`));
}

function resolve(key) {
    const parts = key.split('.');
    let node = locales[currentLang];
    for (const p of parts) {
        if (node == null) break;
        node = node[p];
    }
    if (node != null) return node;
    if (currentLang !== 'en' && locales.en) {
        node = locales.en;
        for (const p of parts) {
            if (node == null) break;
            node = node[p];
        }
        if (node != null) return node;
    }
    return null;
}

export function tf(bodyName, field) {
    const key = `celestialFacts.${bodyName}.${field}`;
    return t(key);
}

export function tm(targetName, missionIdx, field) {
    const key = `missionData.${targetName}.${missionIdx}.${field}`;
    return t(key);
}

export function applyLocaleToDOM() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const val = t(key);
        if (val && typeof val === 'string') el.textContent = val;
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        const val = t(key);
        if (val && typeof val === 'string') el.title = val;
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
        const key = el.getAttribute('data-i18n-aria');
        const val = t(key);
        if (val && typeof val === 'string') el.setAttribute('aria-label', val);
    });
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
        const key = el.getAttribute('data-i18n-html');
        const val = t(key);
        if (val && typeof val === 'string') el.innerHTML = val;
    });
}
