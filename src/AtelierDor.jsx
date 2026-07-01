import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  LayoutGrid, ShoppingCart, ArrowDownLeft, Package, Users, BarChart3,
  Settings, Plus, X, Pencil, Trash2, Search, Coins, Scale, Gem, Wallet,
  TrendingUp, TrendingDown, AlertTriangle, Banknote, Receipt, Menu, Hammer, Landmark,
  RefreshCw, Globe, Wifi, ShieldCheck, LogOut, Delete, Download, Upload, Calculator, History, MessageCircle, Send, Check,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";
import { LIC_SECRET, MASTER_PW, SUPABASE_URL, SUPABASE_KEY } from "./config.js";
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
/* ----------------------------- utilitaires ------------------------------ */
const nf = new Intl.NumberFormat("fr-FR");
const nbsp = (s) => String(s).replace(/\s/g, "\u00a0");
const fcfa = (n) => `${nbsp(nf.format(Math.round(n || 0)))}\u00a0F`;
const fcfaLong = (n) => `${nbsp(nf.format(Math.round(n || 0)))}\u00a0FCFA`;
const g = (n) => `${nbsp(nf.format(Math.round((n || 0) * 100) / 100))}\u00a0g`;
const SEARCH_PH = { sales: "Rechercher une vente…", journal: "Rechercher dans le journal…", stock: "Rechercher un article…", clients: "Rechercher un client…" };
const dec = (n, d = 2) => (n || 0).toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: d });
const uid = () => Math.random().toString(36).slice(2, 9);
const iso = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };
const TODAY = iso(new Date());
const dateFr = (s) => { const [y, m, d] = s.split("-"); return `${d}/${m}/${y.slice(2)}`; };

/* ----------------------------- Excel (xlsx) ----------------------------- */
const xlsxExport = (filename, sheets) => {
  try {
    const wb = XLSX.utils.book_new();
    Object.entries(sheets).forEach(([name, rows]) => {
      const ws = XLSX.utils.json_to_sheet(rows && rows.length ? rows : [{}]);
      XLSX.utils.book_append_sheet(wb, ws, String(name).slice(0, 31));
    });
    XLSX.writeFile(wb, filename);
  } catch (e) { try { window.alert("Export Excel impossible sur cet appareil."); } catch (_) { /* */ } }
};
const xlsxRead = (file, cb) => {
  if (!file) return;
  const r = new FileReader();
  r.onload = (e) => {
    try {
      const wb = XLSX.read(e.target.result, { type: "array" });
      const first = wb.SheetNames[0];
      cb(XLSX.utils.sheet_to_json(wb.Sheets[first], { defval: "" }), wb);
    } catch (err) { try { window.alert("Fichier Excel illisible."); } catch (_) { /* */ } }
  };
  r.readAsArrayBuffer(file);
};
const numOf = (v) => { const n = parseFloat(String(v).replace(/\s/g, "").replace(",", ".")); return isNaN(n) ? 0 : n; };
const pick = (row, keys) => { for (const k of keys) { for (const rk of Object.keys(row)) { if (rk.toLowerCase().trim() === k.toLowerCase()) return row[rk]; } } return ""; };
const compressImage = (file, maxDim, quality) => new Promise((res) => {
  try {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let w = img.width, h = img.height;
      const M = maxDim || 1100;
      if (w > h && w > M) { h = Math.round(h * M / w); w = M; }
      else if (h >= w && h > M) { w = Math.round(w * M / h); h = M; }
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      try { res(c.toDataURL("image/jpeg", quality || 0.6)); } catch (e) { res(null); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); res(null); };
    img.src = url;
  } catch (e) { res(null); }
});
const fileToDataURL = (file) => new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => res(null); r.readAsDataURL(file); });
const compressImageBlob = (file, maxDim, quality) => new Promise((res) => {
  try {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let w = img.width, h = img.height;
      const M = maxDim || 1600;
      if (w > h && w > M) { h = Math.round(h * M / w); w = M; }
      else if (h >= w && h > M) { w = Math.round(w * M / h); h = M; }
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      try { c.toBlob((b) => res(b), "image/jpeg", quality || 0.82); } catch (e) { res(null); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); res(null); };
    img.src = url;
  } catch (e) { res(null); }
});
const signedUrlCache = {};
const getSignedUrl = async (path) => {
  if (signedUrlCache[path]) return signedUrlCache[path];
  try {
    const { data, error } = await supabase.storage.from("chat").createSignedUrl(path, 86400);
    if (error || !data) return null;
    signedUrlCache[path] = data.signedUrl;
    return data.signedUrl;
  } catch (e) { return null; }
};


const KARATS = [24, 22, 21, 18, 14];
const OZ = 31.1034768;            // 1 once troy en grammes
const PAY_METHODS = ["Espèces", "Wave", "Orange Money", "Banque"];
const KIND_LABEL = { or: "Or", bijoux: "Bijoux", divers: "Divers" };
const RAW_GOLD_TYPES = ["Lingot", "Pièce", "Débris", "Or brut", "Or"];
const goldCat = (it) => it.cat || (RAW_GOLD_TYPES.includes(it.type) ? "or" : "bijou");
const MONTHS_FR = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const monthLabel = (mk) => { const [y, mo] = mk.split("-"); return `${MONTHS_FR[parseInt(mo) - 1] || mo} ${y}`; };
const inPeriod = (dateStr, period) => {
  if (!period || period === "all") return true;
  if (period === "today") return dateStr === TODAY;
  if (period === "month") return dateStr.slice(0, 7) === TODAY.slice(0, 7);
  if (period === "year") return dateStr.slice(0, 4) === TODAY.slice(0, 4);
  return true;
};
const PERIOD_LABEL = { today: "Aujourd'hui", month: "Ce mois", year: "Cette année", all: "Tout" };
const enteredDate = (it) => it.added || (it.origin && it.origin.date) || null;
const daysInStock = (it) => { const d = enteredDate(it); return d ? Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 86400000)) : null; };
const purity = (k) => k / 24;     // pureté (24K = or pur)
const SEED_SPOT = 4100;           // USD / once (valeur de départ, remplacée en direct)
const SEED_RATE = 572;            // 1 USD en XOF (valeur de départ)

/* ----------------------------- licence ---------------------------------- */
// Les secrets sont dans src/config.js (édité une seule fois, jamais écrasé par les mises à jour).
const DAY = 86400000;
// Formules : limites (admins / utilisateurs), durée et tarif. Tarifs à personnaliser.
const FORMULAS = {
  E: { name: "Essai", days: 7, admins: 1, users: 2, priceLabel: "Gratuit · 7 jours", trial: true,
       features: ["Toutes les fonctions débloquées", "7 jours pour tester", "1 admin · 2 utilisateurs"] },
  S: { name: "Standard", days: 30, admins: 1, users: 2, priceLabel: "5 000 F / mois", monthly: 5000, yearly: 50000,
       features: ["1 admin · 2 utilisateurs", "Cours en direct, caisse, reçus", "Messagerie d'équipe (fichiers légers)", "Sauvegarde automatique"] },
  P: { name: "Pro", days: 30, admins: 2, users: 5, priceLabel: "10 000 F / mois", monthly: 10000, yearly: 100000,
       features: ["2 admins · 5 utilisateurs", "Rapports détaillés + Export Excel", "Messagerie : médias jusqu'à 15 Mo · 2 Go", "Postes & permissions personnalisés", "Tout le Standard inclus"] },
  R: { name: "Premium", days: 365, admins: 99, users: 99, priceLabel: "15 000 F / mois", monthly: 15000, yearly: 150000,
       features: ["Admins & utilisateurs illimités", "Messagerie : médias jusqu'à 50 Mo · 10 Go", "Postes & permissions personnalisés", "Toutes les fonctions"] },
};

// Fonctions réservées : l'Essai (E) débloque tout, Standard (S) non, Pro (P) et Premium (R) oui.
const FEATURE_PLANS = {
  reports: ["E", "P", "R"],
  excel: ["E", "P", "R"],
  roles: ["E", "P", "R"],
};
const planAllows = (plan, feature) => {
  const allowed = FEATURE_PLANS[feature];
  return !allowed || allowed.includes(plan);
};

// Limites des médias du chat par formule : taille par fichier (Mo), durée vocal (s), volume total de stockage (Mo)
const MEDIA_LIMITS = {
  E: { img: 1.5, audioSec: 30, file: 2, storage: false, quotaMB: 0 },
  S: { img: 2, audioSec: 60, file: 3, storage: false, quotaMB: 0 },
  P: { img: 5, audioSec: 120, file: 15, storage: true, quotaMB: 2000 },
  R: { img: 15, audioSec: 300, file: 50, storage: true, quotaMB: 10000 },
};
const mediaLimit = (plan) => MEDIA_LIMITS[plan] || MEDIA_LIMITS.S;

// Postes & permissions : sections que le patron peut autoriser par employé
const ACCESS_SECTIONS = [
  { id: "dash", label: "Tableau de bord" },
  { id: "sales", label: "Ventes" },
  { id: "buy", label: "Achats d'or" },
  { id: "stock", label: "Stock" },
  { id: "clients", label: "Clients" },
  { id: "credits", label: "Crédits & dettes" },
  { id: "caisse", label: "Clôture de caisse" },
  { id: "banque", label: "Banque & comptes" },
  { id: "depenses", label: "Dépenses" },
  { id: "reports", label: "Rapports" },
  { id: "journal", label: "Historique" },
  { id: "cours", label: "Cours de l'or" },
  { id: "calc", label: "Calculatrice" },
  { id: "settings", label: "Paramètres" },
  { id: "abo", label: "Abonnement" },
  { id: "equipe", label: "Équipe" },
];
const ALL_SECTION_IDS = ACCESS_SECTIONS.map((s) => s.id);
// sections où le niveau « Modifier » a un sens (création / édition / suppression)
const EDITABLE_SECTIONS = ["sales", "buy", "stock", "clients", "credits", "caisse", "banque", "depenses", "settings", "equipe"];
const permLevel = (perms, id) => {
  if (!perms) return "none";
  if (Array.isArray(perms)) return perms.includes(id) ? (id === "benefices" ? "view" : "edit") : "none";
  return perms[id] || "none";
};
const permsEmpty = (perms) => !perms || (Array.isArray(perms) ? perms.length === 0 : Object.keys(perms).length === 0);
const mkPoste = (editIds, viewIds, benef) => {
  const o = {};
  (editIds || []).forEach((id) => { o[id] = "edit"; });
  (viewIds || []).forEach((id) => { o[id] = "view"; });
  if (benef) o.benefices = "view";
  return o;
};
const DEFAULT_VENDOR_PERMS = mkPoste(["sales", "buy", "stock", "clients", "credits", "caisse", "depenses"], ["dash", "cours", "calc"], false);
const POSTE_PRESETS = {
  "2ᵉ administrateur": mkPoste(ALL_SECTION_IDS, [], true),
  "Gérant": mkPoste(ALL_SECTION_IDS.filter((id) => !["settings", "abo", "equipe"].includes(id)), [], true),
  "Comptable": mkPoste([], ["dash", "reports", "journal", "caisse", "banque", "depenses", "credits", "cours", "calc"], true),
  "Vendeur": mkPoste(["sales", "buy", "stock", "clients", "credits", "caisse", "depenses"], ["dash", "cours", "calc"], false),
};
const POSTE_ORDER = ["2ᵉ administrateur", "Gérant", "Comptable", "Vendeur", "Personnalisé"];

// tri d'une collection synchronisée (plus récent en premier), identique sur tous les appareils
const SORT_KEY = { sales: "date", payments: "date", purchases: "date", purchasePayments: "date", closures: "date", expenses: "date", journal: "date", gold: "added", divers: "added" };
const cmpRecent = (k) => (a, b) => {
  const d = String((b && b[k]) || "").localeCompare(String((a && a[k]) || ""));
  if (d !== 0) return d;
  const t = String((b && b.time) || "").localeCompare(String((a && a.time) || ""));
  if (t !== 0) return t;
  return String((a && a.id) || "").localeCompare(String((b && b.id) || ""));
};
const sortColl = (coll, arr) => {
  const k = SORT_KEY[coll];
  if (!k) return arr;
  return [...arr].sort(cmpRecent(k));
};

// statut de paiement d'une vente/achat
const payStatusOf = (total, paid, returned) => {
  if (returned) return { label: "Retournée", cls: "pst-ret" };
  if ((paid || 0) >= (total || 0)) return { label: "Payé", cls: "pst-paid" };
  if ((paid || 0) > 0) return { label: "Partiel", cls: "pst-part" };
  return { label: "Non payé", cls: "pst-none" };
};
function StatusPill({ total, paid, returned }) {
  const s = payStatusOf(total, paid, returned);
  return <span className={`pill ${s.cls}`} style={{ marginLeft: 6 }}>{s.label}</span>;
}
const PAID_FORMULAS = ["S", "P", "R"];
let LIVE_PRICES = null; // prix chargés depuis Supabase (sinon repli sur FORMULAS)
function priceLabelOf(plan) {
  const p = LIVE_PRICES && LIVE_PRICES[plan];
  if (p) {
    if (!p.amount || p.amount <= 0) return FORMULAS[plan] ? FORMULAS[plan].priceLabel : "Gratuit";
    return `${nf.format(p.amount)} F / ${p.period || "mois"}`;
  }
  return FORMULAS[plan] ? FORMULAS[plan].priceLabel : "";
}
function licHash(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h >>> 0; }
// Mots de passe : sel par utilisateur + hachage à plusieurs tours (empreinte illisible, non réversible).
const genSalt = () => Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
function hashPwd(pwd, salt) {
  let s = "atelierdor:" + salt + ":" + String(pwd);
  let h1 = 0x9e3779b9 >>> 0, h2 = 0x85ebca77 >>> 0;
  for (let r = 0; r < 1500; r++) {
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 2654435761) >>> 0;
      h2 = Math.imul(h2 ^ c, 1597334677) >>> 0;
    }
    h1 = (h1 ^ (h2 >>> 15)) >>> 0;
    h2 = (h2 ^ (h1 >>> 13)) >>> 0;
    s = h1.toString(16) + h2.toString(16) + salt;
  }
  return h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
}
// Vérifie un mot de passe (gère aussi les anciens comptes encore en clair, le temps qu'ils soient ré-enregistrés).
function checkPwd(u, pwd) {
  if (u && u.pwHash && u.salt) return hashPwd(pwd, u.salt) === u.pwHash;
  if (u && u.password != null) return u.password === pwd;
  return false;
}
const mkUser = (name, role, pwd, email) => { const salt = genSalt(); return { id: uid(), name, role, email, salt, pwHash: hashPwd(pwd, salt) }; };
function genActivation(planKey, days) {
  const f = FORMULAS[planKey] || FORMULAS.S;
  const d = days == null ? f.days : days;
  const exp = d === 0 ? 0 : Math.floor(Date.now() / DAY) + d;
  const expS = exp.toString(36).toUpperCase();
  const c = (licHash(planKey + "|" + expS + "|" + LIC_SECRET) % 1679616).toString(36).toUpperCase().padStart(4, "0");
  return `AOR-${planKey}-${expS}-${c}`;
}
function verifyActivation(code) {
  if (!code) return { valid: false, reason: "vide" };
  const parts = code.replace(/\s+/g, "").toUpperCase().split("-");
  if (parts.length !== 4 || parts[0] !== "AOR") return { valid: false, reason: "format" };
  const plan = parts[1], expS = parts[2], sig = parts[3];
  if (!FORMULAS[plan]) return { valid: false, reason: "format" };
  const expected = (licHash(plan + "|" + expS + "|" + LIC_SECRET) % 1679616).toString(36).toUpperCase().padStart(4, "0");
  if (sig !== expected) return { valid: false, reason: "signature" };
  const e = parseInt(expS, 36);
  if (isNaN(e)) return { valid: false, reason: "format" };
  if (e === 0) return { valid: true, plan, lifetime: true, expiry: null };
  const expiryMs = e * DAY;
  if (Date.now() > expiryMs + DAY) return { valid: false, reason: "expiré", plan, expiry: new Date(expiryMs) };
  return { valid: true, plan, lifetime: false, expiry: new Date(expiryMs) };
}
const dateFull = (d) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

/* --------- stockage : Claude (window.storage) OU navigateur (localStorage) --------- */
const STORE = {
  async get(k) {
    try {
      if (typeof window !== "undefined" && window.storage) { const r = await window.storage.get(k); return r && r.value != null ? r.value : null; }
      if (typeof localStorage !== "undefined") return localStorage.getItem(k);
    } catch (e) { /* */ }
    return null;
  },
  async set(k, v) {
    try {
      if (typeof window !== "undefined" && window.storage) { await window.storage.set(k, v); return true; }
      if (typeof localStorage !== "undefined") { localStorage.setItem(k, v); return true; }
    } catch (e) { /* */ }
    return false;
  },
  async del(k) {
    try {
      if (typeof window !== "undefined" && window.storage) { await window.storage.delete(k); return; }
      if (typeof localStorage !== "undefined") localStorage.removeItem(k);
    } catch (e) { /* */ }
  },
  get available() { return (typeof window !== "undefined" && !!window.storage) || (typeof localStorage !== "undefined"); },
};

/* ------------------------------- données -------------------------------- */
const seedGold = [
  { id: uid(), type: "Bague", desc: "Bague chevalière homme", karat: 21, weight: 8.4, qty: 3 },
  { id: uid(), type: "Chaîne", desc: "Chaîne maille gourmette", karat: 18, weight: 12.1, qty: 5 },
  { id: uid(), type: "Bracelet", desc: "Bracelet jonc ciselé", karat: 21, weight: 15.6, qty: 2 },
  { id: uid(), type: "Boucles", desc: "Boucles d'oreilles créoles", karat: 18, weight: 4.2, qty: 8 },
  { id: uid(), type: "Lingot", desc: "Lingotin 10 g certifié", karat: 24, weight: 10, qty: 4 },
  { id: uid(), type: "Pendentif", desc: "Pendentif goutte serti", karat: 22, weight: 6.8, qty: 3 },
  { id: uid(), type: "Débris", desc: "Or de rachat à refondre", karat: 18, weight: 22.5, qty: 1 },
  { id: uid(), type: "Alliance", desc: "Alliance unie 3 mm", karat: 18, weight: 3.1, qty: 6 },
];

const seedDivers = [
  { id: uid(), name: "Écrin bague velours", cat: "Emballage", qty: 42, cost: 800, price: 2000, unit: "pièce", min: 15 },
  { id: uid(), name: "Pochette cadeau bijou", cat: "Emballage", qty: 8, cost: 250, price: 700, unit: "pièce", min: 20 },
  { id: uid(), name: "Fermoir mousqueton or 18K", cat: "Fourniture", qty: 30, cost: 4500, price: 8000, unit: "pièce", min: 10 },
  { id: uid(), name: "Chaîne vide (fil) 18K", cat: "Fourniture", qty: 14, cost: 12000, price: 18000, unit: "mètre", min: 5 },
  { id: uid(), name: "Acide de touche (test)", cat: "Atelier", qty: 6, cost: 3000, price: 5500, unit: "flacon", min: 3 },
  { id: uid(), name: "Borax fondant", cat: "Atelier", qty: 4, cost: 1500, price: 3000, unit: "sachet", min: 4 },
  { id: uid(), name: "Pierre de touche", cat: "Atelier", qty: 3, cost: 6000, price: 11000, unit: "pièce", min: 2 },
  { id: uid(), name: "Cartouche gaz chalumeau", cat: "Atelier", qty: 2, cost: 2500, price: 4500, unit: "pièce", min: 5 },
  { id: uid(), name: "Loupe de bijoutier 10x", cat: "Outil", qty: 5, cost: 3500, price: 7000, unit: "pièce", min: 2 },
  { id: uid(), name: "Chiffon de polissage", cat: "Outil", qty: 25, cost: 400, price: 1200, unit: "pièce", min: 10 },
];

const seedClients = [
  { id: uid(), name: "Aminata Diop", phone: "77 512 04 18", note: "Cliente fidèle — mariages" },
  { id: uid(), name: "Mamadou Fall", phone: "76 233 87 09", note: "Revendeur Touba" },
  { id: uid(), name: "Fatou Ndiaye", phone: "78 901 44 25", note: "" },
  { id: uid(), name: "Ousmane Sow", phone: "77 660 12 73", note: "Rachat or régulier" },
  { id: uid(), name: "Awa Bâ", phone: "70 145 39 56", note: "" },
  { id: uid(), name: "Cheikh Guèye", phone: "76 788 20 41", note: "Grossiste fournitures" },
];

const seedSales = [
  { id: uid(), date: daysAgo(0), kind: "bijoux", client: "Aminata Diop", label: "Bracelet jonc ciselé 21K · 15,6 g", total: 1010000, cost: 930000, pay: "Wave" },
  { id: uid(), date: daysAgo(0), kind: "divers", client: "Cheikh Guèye", label: "Fournitures (fermoirs, fil)", total: 96000, cost: 58500, pay: "Espèces" },
  { id: uid(), date: daysAgo(1), kind: "bijoux", client: "Fatou Ndiaye", label: "Boucles créoles 18K · 4,2 g ×2", total: 505000, cost: 460000, pay: "Espèces" },
  { id: uid(), date: daysAgo(2), kind: "or", client: "Mamadou Fall", label: "Lingotin 10 g 24K", total: 800000, cost: 750000, pay: "Banque" },
  { id: uid(), date: daysAgo(3), kind: "divers", client: "Awa Bâ", label: "Écrins + pochettes", total: 14000, cost: 5400, pay: "Espèces" },
  { id: uid(), date: daysAgo(4), kind: "bijoux", client: "Ousmane Sow", label: "Chaîne gourmette 18K · 12,1 g", total: 720000, cost: 660000, pay: "Orange Money" },
  { id: uid(), date: daysAgo(5), kind: "bijoux", client: "Aminata Diop", label: "Alliance unie 18K · 3,1 g ×2", total: 372000, cost: 330000, pay: "Espèces" },
  { id: uid(), date: daysAgo(7), kind: "bijoux", client: "Fatou Ndiaye", label: "Pendentif goutte 22K · 6,8 g", total: 500000, cost: 452000, pay: "Wave" },
  { id: uid(), date: daysAgo(8), kind: "divers", client: "Cheikh Guèye", label: "Loupe + acide de touche", total: 19500, cost: 9500, pay: "Espèces" },
  { id: uid(), date: daysAgo(9), kind: "bijoux", client: "Mamadou Fall", label: "Bague chevalière 21K · 8,4 g", total: 575000, cost: 528000, pay: "Banque" },
  { id: uid(), date: daysAgo(1), kind: "bijoux", client: "Aminata Diop", label: "Collier maille royale 21K · 18,2 g", total: 920000, cost: 845000, pay: "Espèces", paid: 400000 },
];

// registre des paiements : chaque vente a au moins un encaissement (le paiement initial)
const seedPayments = seedSales.map((s) => ({
  id: uid(), saleId: s.id, date: s.date, time: "", amount: s.paid != null ? s.paid : s.total, pay: s.pay,
}));

const seedPurchases = [
  { id: uid(), date: daysAgo(0), client: "Ousmane Sow", karat: 18, weight: 14.3, ppg: 54000, total: 772200, pay: "Espèces", note: "Bijoux cassés" },
  { id: uid(), date: daysAgo(2), client: "Awa Bâ", karat: 21, weight: 9.1, ppg: 63000, total: 573300, pay: "Espèces", paid: 300000, note: "Ancienne bague" },
  { id: uid(), date: daysAgo(4), client: "Mamadou Fall", karat: 18, weight: 31.0, ppg: 54000, total: 1674000, pay: "Banque", note: "Lot débris" },
  { id: uid(), date: daysAgo(6), client: "Fatou Ndiaye", karat: 22, weight: 5.5, ppg: 66000, total: 363000, pay: "Espèces", note: "Chaîne héritage" },
];
// registre des paiements d'achats : chaque rachat a au moins un paiement initial (au client)
const seedPurchasePayments = seedPurchases.map((p) => ({
  id: uid(), purchaseId: p.id, date: p.date, time: "", amount: p.paid != null ? p.paid : p.total, pay: p.pay || "Espèces",
}));

const seedClosures = [
  { id: uid(), date: daysAgo(1), time: "19:42", fond: 100000, esp: 505000, wave: 0, om: 0, vir: 0, caTotal: 505000, rachats: 0, depenses: 0, theorique: 605000, compte: 603000, ecart: -2000 },
];

const seedExpenses = [
  { id: uid(), date: daysAgo(0), label: "Transport approvisionnement", cat: "Transport", amount: 8000, pay: "Espèces" },
  { id: uid(), date: daysAgo(2), label: "Facture électricité", cat: "Électricité", amount: 45000, pay: "Orange Money" },
  { id: uid(), date: daysAgo(5), label: "Loyer boutique (mois)", cat: "Loyer", amount: 250000, pay: "Banque" },
  { id: uid(), date: daysAgo(6), label: "Salaire apprenti", cat: "Salaire", amount: 120000, pay: "Espèces" },
];

const TREASURY_ACCOUNTS = [
  { id: "banque", label: "Banque", icon: "🏦" },
  { id: "wave", label: "Wave", icon: "🌊" },
  { id: "om", label: "Orange Money", icon: "📱" },
];
const seedTreasury = [];

const seedUsers = [
  mkUser("Patron", "patron", "patron123", "patron@atelier.sn"),
  mkUser("Awa (vendeuse)", "vendeur", "awa123", "awa@atelier.sn"),
];

const INITIAL_CASH = 3200000;

/* ------------------------------ composants ------------------------------ */
const Badge = ({ k }) => <span className="karat">{k ? k + "K" : "brut"}</span>;

const Kpi = ({ icon: Icon, label, value, sub, tone = "gold" }) => (
  <div className="card kpi">
    <div className={`kpi-ico tone-${tone}`}><Icon size={18} /></div>
    <div className="kpi-label">{label}</div>
    <div className="kpi-value num">{value}</div>
    {sub && <div className="kpi-sub">{sub}</div>}
  </div>
);

const Field = ({ label, children }) => (
  <label className="field"><span className="field-label">{label}</span>{children}</label>
);

const Slider = ({ label, value, set, max }) => (
  <div className="ctrl">
    <div className="ctrl-top"><span>{label}</span><strong>{value}%</strong></div>
    <input type="range" min="0" max={max} step="0.5" value={value} onChange={(e) => set(Number(e.target.value))} />
  </div>
);

const Modal = ({ title, sub, onClose, children, footer }) => (
  <div className="overlay" onClick={onClose}>
    <div className="modal" onClick={(e) => e.stopPropagation()}>
      <div className="modal-head">
        <div><h3>{title}</h3>{sub && <p className="modal-sub">{sub}</p>}</div>
        <button className="icon-btn" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
      </div>
      <div className="modal-body">{children}</div>
      {footer && <div className="modal-foot">{footer}</div>}
    </div>
  </div>
);

/* ------------------------------- modales -------------------------------- */
const ConfirmModal = ({ title, message, okLabel, danger, onCancel, onOk }) => (
  <Modal title={title || "Confirmation"} onClose={onCancel}
    footer={<>
      <button className="btn btn-line" onClick={onCancel}>Annuler</button>
      <button className={`btn ${danger ? "btn-clay" : "btn-gold"}`} onClick={onOk}>{okLabel || "Confirmer"}</button>
    </>}>
    <p className="muted" style={{ margin: 0, lineHeight: 1.5 }}>{message}</p>
  </Modal>
);
const NoticeModal = ({ title, message, onClose }) => (
  <Modal title={title || "Information"} onClose={onClose}
    footer={<button className="btn btn-gold" onClick={onClose}>OK</button>}>
    <p className="muted" style={{ margin: 0, lineHeight: 1.5 }}>{message}</p>
  </Modal>
);
function SaleModal({ prices, gold, divers, clients, onClose, onSave, onNewArticle, init }) {
  const i = init || {};
  const [kind, setKind] = useState(i.kind || "or");
  const [client, setClient] = useState("");
  const [pay, setPay] = useState("Espèces");
  const [stockId, setStockId] = useState("");
  const [karat, setKarat] = useState(i.karat != null ? i.karat : 21);
  const [weight, setWeight] = useState(i.weight != null ? String(i.weight) : "");
  const [ppg, setPpg] = useState(i.ppg != null ? Math.round(i.ppg) : Math.round(prices[21].vente));
  const [facon, setFacon] = useState(i.facon ? String(i.facon) : "");
  const [dId, setDId] = useState("");
  const [dQty, setDQty] = useState(1);
  const [paidNow, setPaidNow] = useState("");
  const [customName, setCustomName] = useState(""); // désignation libre (or/bijou hors stock)
  const isGold = kind === "or" || kind === "bijoux";

  const onPickStock = (id) => {
    setStockId(id);
    const it = gold.find((x) => x.id === id);
    if (it) { setKarat(it.karat); setWeight(String(it.weight)); setPpg(Math.round(prices[it.karat].vente)); }
  };
  const onKarat = (k) => { setKarat(k); if (k && prices[k]) setPpg(Math.round(prices[k].vente)); };

  const faconV = kind === "bijoux" ? (parseFloat(facon) || 0) : 0;
  const orTotal = (parseFloat(weight) || 0) * (parseFloat(ppg) || 0) + faconV;
  const dItem = divers.find((x) => x.id === dId);
  const dTotal = dItem ? dItem.price * (parseInt(dQty) || 0) : 0;
  const total = isGold ? orTotal : dTotal;
  const valid = isGold ? weight && ppg : (dItem && dQty > 0);
  const paid = paidNow === "" ? total : Math.min(parseFloat(paidNow) || 0, total);
  const reste = total - paid;

  const save = () => {
    if (!valid) return;
    if (isGold) {
      const it = gold.find((x) => x.id === stockId);
      const cost = (karat && prices[karat]) ? (parseFloat(weight) || 0) * prices[karat].achat : 0;
      const defType = kind === "bijoux" ? "Bijou" : "Or";
      const name = it ? it.type : (customName.trim() || defType);
      onSave({
        kind, client, pay, total: orTotal, cost, stockId, paid,
        label: `${name}${karat ? ` ${karat}K` : ""} · ${g(parseFloat(weight))}`,
        karat, weight: parseFloat(weight), ppg: parseFloat(ppg), facon: faconV,
        itemType: name,
      });
    } else {
      const cost = dItem.cost * (parseInt(dQty) || 0);
      onSave({
        kind: "divers", client, pay, total: dTotal, cost, diversId: dId, dQty: parseInt(dQty), paid,
        label: `${dItem.name} ×${dQty}`, dName: dItem.name, dPrice: dItem.price, dUnit: dItem.unit,
      });
    }
  };

  return (
    <Modal title="Nouvelle vente" sub="Prix au cours du jour — sortie de stock" onClose={onClose}
      footer={<>
        <div className="foot-total">Total <strong className="num">{fcfa(total)}</strong></div>
        <div className="foot-actions">
          <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button className="btn btn-gold" disabled={!valid} onClick={save}>Encaisser la vente</button>
        </div>
      </>}>
      <div className="seg seg-3">
        <button className={`seg-btn ${kind === "or" ? "active" : ""}`} onClick={() => setKind("or")}><Coins size={15} /> Or</button>
        <button className={`seg-btn ${kind === "bijoux" ? "active" : ""}`} onClick={() => setKind("bijoux")}><Gem size={15} /> Bijoux</button>
        <button className={`seg-btn ${kind === "divers" ? "active" : ""}`} onClick={() => setKind("divers")}><Hammer size={15} /> Divers / fournitures</button>
      </div>

      {isGold ? (
        <div className="grid2">
          <Field label="Article du stock">
            <select className="input" value={stockId} onChange={(e) => onPickStock(e.target.value)}>
              <option value="">— Vente libre —</option>
              {gold.map((it) => <option key={it.id} value={it.id}>{it.type} {it.karat}K · {g(it.weight)} ({it.qty} dispo)</option>)}
            </select>
          </Field>
          {!stockId && <Field label="Désignation (optionnel)"><input className="input" value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder={kind === "bijoux" ? "ex : Bague mariage" : "ex : Lingot, Chaîne…"} /></Field>}
          <Field label="Carat">
            <select className="input" value={karat} onChange={(e) => onKarat(parseInt(e.target.value))}>
              {KARATS.map((k) => <option key={k} value={k}>{k}K</option>)}
              <option value="0">Sans carat</option>
            </select>
          </Field>
          <Field label="Poids (g)"><input className="input num" type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="0,0" /></Field>
          <Field label="Prix / g (cours du jour)"><input className="input num" type="number" value={ppg} onChange={(e) => setPpg(e.target.value)} /></Field>
          {kind === "bijoux" && <Field label="Façon / main d'œuvre"><input className="input num" type="number" value={facon} onChange={(e) => setFacon(e.target.value)} placeholder="0" /></Field>}
          <Field label="Paiement">
            <select className="input" value={pay} onChange={(e) => setPay(e.target.value)}>{PAY_METHODS.map((p) => <option key={p}>{p}</option>)}</select>
          </Field>
        </div>
      ) : (
        <div className="grid2">
          <Field label="Article divers">
            <select className="input" value={dId} onChange={(e) => { const v = e.target.value; if (v === "__new__") { onNewArticle && onNewArticle(); } else { setDId(v); } }}>
              <option value="">— Choisir —</option>
              {divers.map((it) => <option key={it.id} value={it.id}>{it.name} · {fcfa(it.price)} ({it.qty} {it.unit})</option>)}
              <option value="__new__">➕ Nouvel article (à enregistrer)</option>
            </select>
          </Field>
          <Field label="Quantité"><input className="input num" type="number" min="1" value={dQty} onChange={(e) => setDQty(e.target.value)} /></Field>
          <Field label="Paiement">
            <select className="input" value={pay} onChange={(e) => setPay(e.target.value)}>{PAY_METHODS.map((p) => <option key={p}>{p}</option>)}</select>
          </Field>
        </div>
      )}

      <Field label="Client (optionnel)">
        <input className="input" list="cl-list" value={client} onChange={(e) => setClient(e.target.value)} placeholder="Nom du client" />
        <datalist id="cl-list">{clients.map((c) => <option key={c.id} value={c.name} />)}</datalist>
      </Field>

      <Field label="Montant encaissé maintenant">
        <input className="input num" type="number" value={paidNow} onChange={(e) => setPaidNow(e.target.value)} placeholder={`${nf.format(Math.round(total))} (payé en totalité)`} />
      </Field>
      {reste > 0 && <div className="credit-note">Vente à crédit · reste dû : <strong className="num">{fcfa(reste)}</strong>{client ? "" : " — pense à indiquer le client"}</div>}
    </Modal>
  );
}

function GoldCalc({ prices, spot, rate, perGram24, mVente, mAchat, onUse, canSell = true, canBuy = true }) {
  // 1 - Valeur d'un article
  const [k1, setK1] = useState(21);
  const [w1, setW1] = useState("");
  const [ppg1, setPpg1] = useState("");
  const [facon1, setFacon1] = useState("");
  const wv = parseFloat(w1) || 0;
  const refPpg = parseFloat(ppg1) || 0;
  const sellG = k1 ? prices[k1].vente : refPpg * (1 + (mVente || 0) / 100);
  const buyG = k1 ? prices[k1].achat : refPpg * (1 - (mAchat || 0) / 100);
  const fac = parseFloat(facon1) || 0;
  const sellTotal = wv * sellG + fac;
  const buyTotal = wv * buyG;

  // 2 - Équivalent or pur
  const [k2, setK2] = useState(18);
  const [w2, setW2] = useState("");
  const wv2 = parseFloat(w2) || 0;
  const pureW = wv2 * purity(k2);
  const pureVal = pureW * perGram24;

  // 3 - Convertisseur grammes <-> FCFA (or pur 24K)
  const [grams, setGrams] = useState("");
  const gv = parseFloat(grams) || 0;
  const gVal = gv * perGram24;
  const [amount, setAmount] = useState("");
  const av = parseFloat(amount) || 0;
  const aGrams = perGram24 ? av / perGram24 : 0;

  // 4 - Calculatrice simple (machine à états, sans eval)
  const [disp, setDisp] = useState("0");
  const [acc, setAcc] = useState(null);
  const [op, setOp] = useState(null);
  const [fresh, setFresh] = useState(true);
  const fmt = (n) => { const r = Math.round((n + Number.EPSILON) * 100) / 100; return String(r); };
  const digit = (d) => {
    setDisp((s) => {
      if (d === ".") return (fresh || s === "0") ? "0." : (s.includes(".") ? s : s + ".");
      return (fresh || s === "0") ? d : s + d;
    });
    setFresh(false);
  };
  const applyOp = (a, b, o) => o === "+" ? a + b : o === "−" ? a - b : o === "×" ? a * b : o === "÷" ? (b ? a / b : 0) : b;
  const chooseOp = (o) => {
    const v = parseFloat(disp) || 0;
    if (op !== null && !fresh) { const r = applyOp(acc, v, op); setAcc(r); setDisp(fmt(r)); } else setAcc(v);
    setOp(o); setFresh(true);
  };
  const equals = () => { if (op !== null) { const v = parseFloat(disp) || 0; const r = applyOp(acc == null ? 0 : acc, v, op); setDisp(fmt(r)); setAcc(null); setOp(null); setFresh(true); } };
  const clearAll = () => { setDisp("0"); setAcc(null); setOp(null); setFresh(true); };
  const back = () => setDisp((s) => (s.length <= 1 ? "0" : s.slice(0, -1)));
  const pct = () => { setDisp((s) => fmt((parseFloat(s) || 0) / 100)); setFresh(true); };

  // 5 - Convertisseur de devises (euro = parité fixe, dollar = taux live)
  const EUR_XOF = 655.957;
  const cvRates = { XOF: 1, USD: Math.round(rate) || 0, EUR: EUR_XOF };
  const CUR = [{ k: "XOF", n: "FCFA", s: "F" }, { k: "USD", n: "Dollar $", s: "$" }, { k: "EUR", n: "Euro €", s: "€" }];
  const [cvAmount, setCvAmount] = useState("");
  const [cvFrom, setCvFrom] = useState("USD");
  const [cvTo, setCvTo] = useState("XOF");
  const cvVal = cvRates[cvTo] ? (parseFloat(cvAmount) || 0) * (cvRates[cvFrom] / cvRates[cvTo]) : 0;
  const cvSym = { XOF: "F", USD: "$", EUR: "€" };
  const cvOut = cvTo === "XOF" ? nf.format(Math.round(cvVal)) : (Math.round(cvVal * 100) / 100).toLocaleString("fr-FR");
  const cvSwap = () => { setCvFrom(cvTo); setCvTo(cvFrom); };

  return (
    <>
    <div className="calc-grid">
      <div className="card">
        <div className="card-head"><h3>Valeur d'un article</h3></div>
        <div className="grid2">
          <Field label="Carat">
            <select className="input" value={k1} onChange={(e) => setK1(parseInt(e.target.value))}>
              {KARATS.map((k) => <option key={k} value={k}>{k}K</option>)}
              <option value="0">Sans carat</option>
            </select>
          </Field>
          <Field label="Poids (g)"><input className="input num" type="number" step="0.1" value={w1} onChange={(e) => setW1(e.target.value)} placeholder="0,0" /></Field>
          {!k1 && <Field label="Prix de référence / g"><input className="input num" type="number" value={ppg1} onChange={(e) => setPpg1(e.target.value)} placeholder="0" /><span className="field-hint">Valeur de base du gramme (ni achat ni vente) — l'app en déduit les deux</span></Field>}
          <Field label="Façon (optionnel)"><input className="input num" type="number" value={facon1} onChange={(e) => setFacon1(e.target.value)} placeholder="0" /><span className="field-hint">Main-d'œuvre ajoutée au prix de vente (bijoux)</span></Field>
        </div>
        <div className="calc-res">
          <div><span className="lab">Tu rachètes</span><span className="val" style={{ color: "var(--clay)" }}>{fcfa(buyTotal)}</span></div>
          <div><span className="lab">Tu vends</span><span className="val" style={{ color: "var(--green)" }}>{fcfa(sellTotal)}</span></div>
        </div>
        {k1 ? <p className="src-note">À {fcfa(buyG)}/g (rachat) · {fcfa(sellG)}/g (vente){fac ? ` · + façon ${fcfa(fac)}` : ""}</p> : <p className="src-note">Prix de référence {fcfa(refPpg)}/g · rachat −{mAchat}% = {fcfa(buyG)}/g · vente +{mVente}% = {fcfa(sellG)}/g{fac ? ` · + façon ${fcfa(fac)}` : ""}</p>}
        {!k1 && <p className="calc-hint">ℹ️ Le <b>prix de référence</b> est ta base du gramme (la valeur de l'or au moment du calcul). L'app en déduit automatiquement le <b style={{ color: "var(--clay)" }}>rachat</b> (− marge) et la <b style={{ color: "var(--green)" }}>vente</b> (+ marge). Pour un calcul exact selon la pureté, choisis plutôt le <b>carat réel</b> au lieu de « Sans carat ».</p>}
        {onUse && (canBuy || canSell) && (
          <div className="data-actions" style={{ marginTop: 12 }}>
            {canBuy && <button className="btn btn-line" disabled={!(wv > 0 && buyG > 0)} onClick={() => onUse("purchase", { karat: k1, weight: wv, ppg: buyG })}><ArrowDownLeft size={15} /> Enregistrer le rachat</button>}
            {canSell && <button className="btn btn-gold" disabled={!(wv > 0 && sellG > 0)} onClick={() => onUse("sale", { kind: "or", karat: k1, weight: wv, ppg: sellG, facon: fac })}><Plus size={15} /> Enregistrer la vente</button>}
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-head"><h3>Équivalent or pur (24K)</h3></div>
        <div className="grid2">
          <Field label="Carat">
            <select className="input" value={k2} onChange={(e) => setK2(parseInt(e.target.value))}>{KARATS.map((k) => <option key={k} value={k}>{k}K</option>)}</select>
          </Field>
          <Field label="Poids (g)"><input className="input num" type="number" step="0.1" value={w2} onChange={(e) => setW2(e.target.value)} placeholder="0,0" /></Field>
        </div>
        <div className="calc-res">
          <div><span className="lab">Or pur ({Math.round(purity(k2) * 100)}%)</span><span className="val">{g(pureW)}</span></div>
          <div><span className="lab">Valeur or pur</span><span className="val" style={{ color: "var(--gold)" }}>{fcfa(pureVal)}</span></div>
        </div>
        <p className="src-note">{g(wv2)} de {k2}K contient {g(pureW)} d'or pur (cours 24K : {fcfa(perGram24)}/g).</p>
      </div>

      <div className="card">
        <div className="card-head"><h3>Convertisseur (or pur 24K)</h3></div>
        <div className="grid2">
          <Field label="Grammes → FCFA"><input className="input num" type="number" step="0.1" value={grams} onChange={(e) => setGrams(e.target.value)} placeholder="0,0" /></Field>
          <Field label="= Valeur"><div className="input input-ro num">{fcfa(gVal)}</div></Field>
          <Field label="FCFA → grammes"><input className="input num" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" /></Field>
          <Field label="= Poids"><div className="input input-ro num">{g(aGrams)}</div></Field>
        </div>
        <p className="src-note">Cours mondial : {dec(spot)} $/once · taux : {nf.format(Math.round(rate))} F/$ · or pur : {fcfa(perGram24)}/g.</p>
      </div>

      <div className="card">
        <div className="card-head"><h3>Calculatrice</h3></div>
        <div className="calc-disp">{op ? <span className="calc-op-ind">{acc != null ? nf.format(acc) : ""} {op}</span> : null}{disp}</div>
        <div className="calc-pad">
          <button className="calc-key fn" onClick={clearAll}>C</button>
          <button className="calc-key fn" onClick={back}>⌫</button>
          <button className="calc-key fn" onClick={pct}>%</button>
          <button className="calc-key op" onClick={() => chooseOp("÷")}>÷</button>
          <button className="calc-key" onClick={() => digit("7")}>7</button>
          <button className="calc-key" onClick={() => digit("8")}>8</button>
          <button className="calc-key" onClick={() => digit("9")}>9</button>
          <button className="calc-key op" onClick={() => chooseOp("×")}>×</button>
          <button className="calc-key" onClick={() => digit("4")}>4</button>
          <button className="calc-key" onClick={() => digit("5")}>5</button>
          <button className="calc-key" onClick={() => digit("6")}>6</button>
          <button className="calc-key op" onClick={() => chooseOp("−")}>−</button>
          <button className="calc-key" onClick={() => digit("1")}>1</button>
          <button className="calc-key" onClick={() => digit("2")}>2</button>
          <button className="calc-key" onClick={() => digit("3")}>3</button>
          <button className="calc-key op" onClick={() => chooseOp("+")}>+</button>
          <button className="calc-key wide" onClick={() => digit("0")}>0</button>
          <button className="calc-key" onClick={() => digit(".")}>,</button>
          <button className="calc-key eq" onClick={equals}>=</button>
        </div>
      </div>
    </div>

    <div className="card calc-conv">
      <div className="card-head"><h3>Convertisseur de devises</h3></div>
      <div className="grid2">
        <Field label="Montant"><input className="input num" type="number" value={cvAmount} onChange={(e) => setCvAmount(e.target.value)} placeholder="0" /></Field>
        <Field label="Résultat"><div className="input input-ro num">{cvOut} {cvSym[cvTo]}</div></Field>
        <Field label="De"><select className="input" value={cvFrom} onChange={(e) => setCvFrom(e.target.value)}>{CUR.map((c) => <option key={c.k} value={c.k}>{c.n}</option>)}</select></Field>
        <Field label="Vers"><select className="input" value={cvTo} onChange={(e) => setCvTo(e.target.value)}>{CUR.map((c) => <option key={c.k} value={c.k}>{c.n}</option>)}</select></Field>
      </div>
      <button className="btn btn-line" onClick={cvSwap} style={{ marginTop: 4 }}>⇅ Inverser les devises</button>
      <p className="src-note">1 $ = {nf.format(Math.round(rate))} F (taux en direct) · 1 € = 655,957 F (parité fixe FCFA).</p>
    </div>
    </>
  );
}

function PurchaseModal({ prices, clients, onClose, onSave, init }) {
  const i = init || {};
  const [client, setClient] = useState("");
  const [karat, setKarat] = useState(i.karat != null ? i.karat : 18);
  const [weight, setWeight] = useState(i.weight != null ? String(i.weight) : "");
  const [ppg, setPpg] = useState(i.ppg != null ? Math.round(i.ppg) : Math.round(prices[18].achat));
  const [note, setNote] = useState("");
  const [pay, setPay] = useState("Espèces");
  const [paidNow, setPaidNow] = useState("");
  const onKarat = (k) => { setKarat(k); if (k && prices[k]) setPpg(Math.round(prices[k].achat)); };
  const total = (parseFloat(weight) || 0) * (parseFloat(ppg) || 0);
  const paid = paidNow === "" ? total : Math.min(parseFloat(paidNow) || 0, total);
  const reste = total - paid;
  const valid = weight && ppg;
  return (
    <Modal title="Nouvel achat d'or" sub="Rachat client au cours du jour — entre en stock" onClose={onClose}
      footer={<>
        <div className="foot-total">À payer <strong className="num">{fcfa(total)}</strong></div>
        <div className="foot-actions">
          <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button className="btn btn-clay" disabled={!valid} onClick={() => onSave({ client, karat, weight: parseFloat(weight), ppg: parseFloat(ppg), total, paid, pay, note })}>Enregistrer & ajouter au stock</button>
        </div>
      </>}>
      <div className="grid2">
        <Field label="Carat">
          <select className="input" value={karat} onChange={(e) => onKarat(parseInt(e.target.value))}>{KARATS.map((k) => <option key={k} value={k}>{k}K</option>)}<option value="0">Sans carat (or brut)</option></select>
        </Field>
        <Field label="Poids (g)"><input className="input num" type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="0,0" /></Field>
        <Field label="Prix / g (rachat du jour)"><input className="input num" type="number" value={ppg} onChange={(e) => setPpg(e.target.value)} /></Field>
        <Field label="Client">
          <input className="input" list="cl-list2" value={client} onChange={(e) => setClient(e.target.value)} placeholder="Nom du vendeur" />
          <datalist id="cl-list2">{clients.map((c) => <option key={c.id} value={c.name} />)}</datalist>
        </Field>
      </div>
      <div className="grid2">
        <Field label="Montant payé maintenant">
          <input className="input num" type="number" value={paidNow} onChange={(e) => setPaidNow(e.target.value)} placeholder={`${nf.format(Math.round(total))} (payé en totalité)`} />
        </Field>
        <Field label="Moyen de paiement">
          <select className="input" value={pay} onChange={(e) => setPay(e.target.value)}>{PAY_METHODS.map((p) => <option key={p}>{p}</option>)}</select>
        </Field>
      </div>
      {reste > 0 && <div className="credit-note">Rachat partiellement payé · reste à payer au client : <strong className="num">{fcfa(reste)}</strong>{client ? "" : " — pense à indiquer le client"}</div>}
      <Field label="Note"><input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="ex : bijoux cassés, héritage…" /></Field>
    </Modal>
  );
}

function GoldModal({ item, defaultCat, onClose, onSave }) {
  const dc = defaultCat || "bijou";
  const [f, setF] = useState(item ? { cat: goldCat(item), ...item } : { type: dc === "or" ? "Lingot" : "Bague", desc: "", karat: 21, weight: "", qty: 1, cat: dc });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const valid = f.weight && f.qty;
  return (
    <Modal title={item ? "Modifier l'article" : "Ajouter au stock or"} onClose={onClose}
      footer={<div className="foot-actions"><button className="btn btn-ghost" onClick={onClose}>Annuler</button><button className="btn btn-gold" disabled={!valid} onClick={() => onSave({ ...f, weight: parseFloat(f.weight), qty: parseInt(f.qty) })}>Enregistrer</button></div>}>
      <div className="grid2">
        <Field label="Catégorie">
          <select className="input" value={f.cat} onChange={(e) => set("cat", e.target.value)}><option value="bijou">Bijou</option><option value="or">Or brut (lingot, débris…)</option></select>
        </Field>
        <Field label="Type">
          <select className="input" value={f.type} onChange={(e) => set("type", e.target.value)}>{["Bague", "Chaîne", "Bracelet", "Boucles", "Collier", "Pendentif", "Alliance", "Lingot", "Pièce", "Débris"].map((t) => <option key={t}>{t}</option>)}</select>
        </Field>
        <Field label="Carat">
          <select className="input" value={f.karat} onChange={(e) => set("karat", parseInt(e.target.value))}>{KARATS.map((k) => <option key={k} value={k}>{k}K</option>)}</select>
        </Field>
        <Field label="Poids unitaire (g)"><input className="input num" type="number" step="0.1" value={f.weight} onChange={(e) => set("weight", e.target.value)} /></Field>
        <Field label="Quantité"><input className="input num" type="number" min="1" value={f.qty} onChange={(e) => set("qty", e.target.value)} /></Field>
      </div>
      <Field label="Description (optionnel)"><input className="input" value={f.desc} onChange={(e) => set("desc", e.target.value)} placeholder="ex : Bague chevalière homme" /></Field>
      <Field label="Photo de l'article"><LogoField logo={f.photo} onChange={(v) => set("photo", v)} fallback="📷" label="photo" /></Field>
    </Modal>
  );
}

function XlsxImportBtn({ label, onFile }) {
  const ref = useRef(null);
  return (
    <>
      <button className="btn btn-line" onClick={() => ref.current && ref.current.click()}><Upload size={15} /> {label}</button>
      <input ref={ref} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={(e) => { onFile(e.target.files && e.target.files[0]); e.target.value = ""; }} />
    </>
  );
}

function DiversModal({ item, onClose, onSave }) {
  const [f, setF] = useState(item || { name: "", cat: "Fourniture", qty: 1, cost: "", price: "", unit: "pièce", min: 5 });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const valid = f.name && f.price;
  return (
    <Modal title={item ? "Modifier l'article" : "Ajouter un article divers"} onClose={onClose}
      footer={<div className="foot-actions"><button className="btn btn-ghost" onClick={onClose}>Annuler</button><button className="btn btn-gold" disabled={!valid} onClick={() => onSave({ ...f, qty: parseInt(f.qty), cost: parseFloat(f.cost) || 0, price: parseFloat(f.price), min: parseInt(f.min) || 0 })}>Enregistrer</button></div>}>
      <Field label="Désignation"><input className="input" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="ex : Écrin bague velours" /></Field>
      <div className="grid2">
        <Field label="Catégorie">
          <select className="input" value={f.cat} onChange={(e) => set("cat", e.target.value)}>{["Emballage", "Fourniture", "Atelier", "Outil"].map((c) => <option key={c}>{c}</option>)}</select>
        </Field>
        <Field label="Unité">
          <select className="input" value={f.unit} onChange={(e) => set("unit", e.target.value)}>{["pièce", "mètre", "flacon", "sachet", "lot"].map((u) => <option key={u}>{u}</option>)}</select>
        </Field>
        <Field label="Quantité"><input className="input num" type="number" min="0" value={f.qty} onChange={(e) => set("qty", e.target.value)} /></Field>
        <Field label="Seuil d'alerte"><input className="input num" type="number" min="0" value={f.min} onChange={(e) => set("min", e.target.value)} /></Field>
        <Field label="Coût d'achat"><input className="input num" type="number" value={f.cost} onChange={(e) => set("cost", e.target.value)} placeholder="0" /></Field>
        <Field label="Prix de vente"><input className="input num" type="number" value={f.price} onChange={(e) => set("price", e.target.value)} placeholder="0" /></Field>
      </div>
      <Field label="Photo (optionnel)"><LogoField logo={f.photo} onChange={(v) => set("photo", v)} fallback="📷" label="photo" /></Field>
    </Modal>
  );
}

function ClientModal({ item, onClose, onSave }) {
  const [f, setF] = useState(item || { name: "", phone: "", note: "" });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  return (
    <Modal title={item ? "Modifier le client" : "Nouveau client"} onClose={onClose}
      footer={<div className="foot-actions"><button className="btn btn-ghost" onClick={onClose}>Annuler</button><button className="btn btn-gold" disabled={!f.name} onClick={() => onSave(f)}>Enregistrer</button></div>}>
      <Field label="Nom complet"><input className="input" value={f.name} onChange={(e) => set("name", e.target.value)} /></Field>
      <Field label="Téléphone"><input className="input" value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="77 000 00 00" /></Field>
      <Field label="Note"><input className="input" value={f.note} onChange={(e) => set("note", e.target.value)} /></Field>
      <label className="chk-row"><input type="checkbox" checked={!!f.pro} onChange={(e) => set("pro", e.target.checked)} /><span>Fournisseur professionnel (grossiste en or)</span></label>
    </Modal>
  );
}

function TreasuryModal({ op, account, accounts, balances, onClose, onSave }) {
  const accLabel = (id) => (accounts.find((a) => a.id === id) || {}).label || (id === "caisse" ? "Caisse" : id);
  const allIds = [...accounts.map((a) => a.id), "caisse"];
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [from, setFrom] = useState(account || accounts[0].id);
  const [to, setTo] = useState(allIds.find((id) => id !== (account || accounts[0].id)));
  const titles = { depot: "Dépôt", retrait: "Retrait", transfert: "Transfert", init: "Définir le solde initial" };
  const a = Math.round(Number(amount) || 0);
  const valid = a > 0 && (op !== "transfert" || from !== to);
  const submit = () => {
    if (!valid) return;
    if (op === "transfert") onSave({ type: "transfert", account: from, to, amount: a, note });
    else onSave({ type: op, account, amount: a, note });
  };
  return (
    <Modal title={titles[op] + (op !== "transfert" ? " — " + accLabel(account) : "")} onClose={onClose}
      footer={<div className="foot-actions"><button className="btn btn-ghost" onClick={onClose}>Annuler</button><button className="btn btn-gold" disabled={!valid} onClick={submit}>Valider</button></div>}>
      {op === "transfert" && (
        <div className="grid2">
          <Field label="Depuis"><select className="input" value={from} onChange={(e) => setFrom(e.target.value)}>{allIds.map((id) => <option key={id} value={id}>{accLabel(id)}</option>)}</select></Field>
          <Field label="Vers"><select className="input" value={to} onChange={(e) => setTo(e.target.value)}>{allIds.map((id) => <option key={id} value={id}>{accLabel(id)}</option>)}</select></Field>
        </div>
      )}
      {op === "transfert" && balances && <p className="muted small" style={{ margin: "0 0 10px" }}>Solde {accLabel(from)} : <strong>{fcfa(balances[from] || 0)}</strong></p>}
      <Field label="Montant (F)"><input className="input num" type="number" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" autoFocus /></Field>
      <Field label="Note (facultatif)"><input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder={op === "depot" ? "ex : dépôt d'espèces" : op === "retrait" ? "ex : retrait au guichet" : ""} /></Field>
      {op === "transfert" && from === to && <p className="neg small" style={{ margin: 0 }}>Choisis deux comptes différents.</p>}
      {op === "init" && <p className="muted small" style={{ margin: 0 }}>Le solde initial remplace le point de départ du compte (les opérations s'ajoutent ensuite).</p>}
    </Modal>
  );
}

function ExpenseModal({ item, onClose, onSave }) {
  const STD = ["Loyer", "Salaire", "Électricité", "Eau", "Fournitures", "Transport", "Taxe / impôt", "Remboursement", "Autre"];
  const [f, setF] = useState(() => {
    if (!item) return { label: "", cat: "Loyer", amount: "", pay: "Espèces", note: "", catOther: "" };
    const isStd = STD.includes(item.cat);
    return { ...item, note: item.note || "", cat: isStd ? item.cat : "Autre", catOther: isStd ? "" : item.cat };
  });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const valid = f.label && f.amount && (f.cat !== "Autre" || f.catOther.trim());
  const submit = () => {
    const { catOther, ...rest } = f;
    onSave({ ...rest, cat: f.cat === "Autre" && catOther.trim() ? catOther.trim() : f.cat, amount: parseFloat(f.amount) || 0 });
  };
  return (
    <Modal title={item ? "Modifier la dépense" : "Nouvelle dépense"} onClose={onClose}
      footer={<div className="foot-actions"><button className="btn btn-ghost" onClick={onClose}>Annuler</button><button className="btn btn-clay" disabled={!valid} onClick={submit}>Enregistrer</button></div>}>
      <Field label="Libellé"><input className="input" value={f.label} onChange={(e) => set("label", e.target.value)} placeholder="ex : Facture électricité" /></Field>
      <div className="grid2">
        <Field label="Catégorie">
          <select className="input" value={f.cat} onChange={(e) => set("cat", e.target.value)}>
            {STD.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Montant"><input className="input num" type="number" value={f.amount} onChange={(e) => set("amount", e.target.value)} placeholder="0" /></Field>
      </div>
      {f.cat === "Autre" && (
        <Field label="Préciser de quoi il s'agit"><input className="input" value={f.catOther} onChange={(e) => set("catOther", e.target.value)} placeholder="ex : réparation enseigne, don, frais bancaires…" /></Field>
      )}
      <div className="grid2">
        <Field label="Paiement">
          <select className="input" value={f.pay} onChange={(e) => set("pay", e.target.value)}>{PAY_METHODS.map((p) => <option key={p}>{p}</option>)}</select>
        </Field>
      </div>
      <Field label="Détail / motif (optionnel)"><input className="input" value={f.note} onChange={(e) => set("note", e.target.value)} placeholder="ex : avance sur salaire de juin, fournisseur X…" /></Field>
    </Modal>
  );
}

function SalaryModal({ names, onClose, onSave }) {
  const list = (names || []).filter(Boolean);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [pay, setPay] = useState("Espèces");
  const [month, setMonth] = useState("");
  const valid = name.trim() && amount;
  return (
    <Modal title="Verser un salaire" sub="Enregistré comme dépense (catégorie Salaire)" onClose={onClose}
      footer={<div className="foot-actions"><button className="btn btn-ghost" onClick={onClose}>Annuler</button><button className="btn btn-clay" disabled={!valid} onClick={() => onSave({ name: name.trim(), amount: parseFloat(amount) || 0, pay, month: month.trim() })}>Enregistrer le versement</button></div>}>
      <Field label="Employé">
        <input className="input" list="salary-emps" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom de l'employé" />
        {list.length > 0 && <datalist id="salary-emps">{list.map((n) => <option key={n} value={n} />)}</datalist>}
      </Field>
      {list.length > 0 && (
        <div className="chip-row">
          {list.map((n) => <button key={n} type="button" className={`chip ${name === n ? "on" : ""}`} onClick={() => setName(n)}>{n}</button>)}
        </div>
      )}
      <div className="grid2">
        <Field label="Montant"><input className="input num" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" /></Field>
        <Field label="Paiement"><select className="input" value={pay} onChange={(e) => setPay(e.target.value)}>{PAY_METHODS.map((p) => <option key={p}>{p}</option>)}</select></Field>
      </div>
      <Field label="Mois concerné (optionnel)"><input className="input" value={month} onChange={(e) => setMonth(e.target.value)} placeholder="ex : Juin 2026" /></Field>
    </Modal>
  );
}

function PinScreen({ pin, email, onUnlock, onLogout, shopName, logo }) {
  const [val, setVal] = useState("");
  const [err, setErr] = useState(false);
  const [recover, setRecover] = useState(false);
  const [pw, setPw] = useState("");
  const [recErr, setRecErr] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (val.length === pin.len) {
      if (hashPwd(val, pin.salt) === pin.hash) onUnlock();
      else { setErr(true); const t = setTimeout(() => { setVal(""); setErr(false); }, 550); return () => clearTimeout(t); }
    }
  }, [val]);
  const press = (d) => setVal((v) => (v.length >= pin.len ? v : v + d));
  const back = () => setVal((v) => v.slice(0, -1));
  const tryRecover = async () => {
    if (!pw || busy) return;
    setBusy(true); setRecErr("");
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
      if (error) { setRecErr("Mot de passe incorrect."); setBusy(false); return; }
      onUnlock();
    } catch (e) { setRecErr("Connexion impossible. Vérifie ta connexion."); setBusy(false); }
  };
  return (
    <div className="lock">
      <div className="lock-brand"><BrandMark logo={logo} lg /><div className="lock-title">{shopName || "Atelier d'Or"}</div><div className="lock-sub">Code de sécurité</div></div>
      {!recover ? (
        <div className="pin-box">
          <div className={`pin-dots ${err ? "shake" : ""}`}>
            {Array.from({ length: pin.len }).map((_, i) => <span key={i} className={`pin-dot ${i < val.length ? "on" : ""}`} />)}
          </div>
          {err && <p className="lock-err" style={{ textAlign: "center" }}>Code incorrect</p>}
          <div className="pin-pad">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => <button key={n} className="pin-key" onClick={() => press(String(n))}>{n}</button>)}
            <span />
            <button className="pin-key" onClick={() => press("0")}>0</button>
            <button className="pin-key pin-back" onClick={back} aria-label="Effacer"><Delete size={20} /></button>
          </div>
          <button className="btn btn-ghost btn-xs" onClick={() => setRecover(true)}>Code oublié ?</button>
        </div>
      ) : (
        <div className="pin-box">
          <p className="muted small" style={{ textAlign: "center", maxWidth: 280 }}>Entre le mot de passe de ton compte pour déverrouiller.</p>
          <input className="input" type="password" value={pw} onChange={(e) => { setPw(e.target.value); setRecErr(""); }} placeholder="Mot de passe du compte" onKeyDown={(e) => e.key === "Enter" && tryRecover()} />
          {recErr && <p className="lock-err">{recErr}</p>}
          <button className="btn btn-gold act-btn" disabled={busy} onClick={tryRecover}>{busy ? "Vérification…" : "Déverrouiller"}</button>
          <button className="btn btn-ghost btn-xs" onClick={() => { setRecover(false); setPw(""); setRecErr(""); }}>← Retour au code</button>
        </div>
      )}
      <button className="btn btn-ghost btn-xs" style={{ marginTop: 14 }} onClick={onLogout}>Se déconnecter</button>
    </div>
  );
}

function PinSetModal({ hasPin, onClose, onSave, onRemove }) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [err, setErr] = useState("");
  const valid = a.length >= 4 && a.length <= 6 && a === b;
  const submit = () => {
    if (a.length < 4) { setErr("Le code doit faire au moins 4 chiffres."); return; }
    if (a !== b) { setErr("Les deux codes ne correspondent pas."); return; }
    const salt = genSalt();
    onSave({ salt, hash: hashPwd(a, salt), len: a.length });
  };
  return (
    <Modal title={hasPin ? "Changer le code PIN" : "Définir un code PIN"} sub="Demandé à chaque ouverture de l'app sur cet appareil" onClose={onClose}
      footer={<div className="foot-actions">
        {hasPin && <button className="btn btn-clay" onClick={onRemove}>Retirer le code</button>}
        <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
        <button className="btn btn-gold" disabled={!valid} onClick={submit}>Enregistrer</button>
      </div>}>
      <Field label="Nouveau code (4 à 6 chiffres)"><input className="input num" type="password" inputMode="numeric" maxLength={6} value={a} onChange={(e) => { setA(e.target.value.replace(/\D/g, "")); setErr(""); }} placeholder="••••" /></Field>
      <Field label="Confirme le code"><input className="input num" type="password" inputMode="numeric" maxLength={6} value={b} onChange={(e) => { setB(e.target.value.replace(/\D/g, "")); setErr(""); }} placeholder="••••" /></Field>
      {err && <p className="lock-err">{err}</p>}
      <p className="muted small" style={{ marginTop: 4 }}>En cas d'oubli, tu pourras déverrouiller avec le mot de passe de ton compte.</p>
    </Modal>
  );
}

function ChatMedia({ media, kind, onImage }) {
  const embedded = typeof media === "string" ? media : (media && media.data) || null;
  const [url, setUrl] = useState(embedded);
  useEffect(() => {
    let alive = true;
    if (!embedded && media && media.path) getSignedUrl(media.path).then((u) => { if (alive) setUrl(u); });
    return () => { alive = false; };
  }, [media]);
  if (!url) return <span className="chat-loading">⏳ chargement…</span>;
  if (kind === "image") return <img className="chat-img" src={url} alt="" onClick={() => onImage(url)} />;
  if (kind === "audio") return <audio className="chat-audio" controls src={url} />;
  if (kind === "file") return <a className="chat-file" href={url} target="_blank" rel="noreferrer" download={(media && media.name) || "fichier"}>📎 {(media && media.name) || "Document"}</a>;
  return null;
}

function ChatWidget({ messages, reads, people, myId, isPatron, open, onToggle, onSend, onDelete, unread, unreadMap, onSeen, onNotice, limits, shopId, onUpsell }) {
  const lim = limits || { img: 1.5, audioSec: 30, file: 2, storage: false };
  const useStorage = !!(lim.storage && shopId);
  const peeps = people || [];
  const [activeChat, setActiveChat] = useState("all");
  const sendTo = (payload) => onSend({ ...payload, to: activeChat });
  const [text, setText] = useState("");
  const [lightbox, setLightbox] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recSec, setRecSec] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notifPerm, setNotifPerm] = useState(typeof Notification !== "undefined" ? Notification.permission : "unsupported");
  const listRef = useRef(null);
  const imgRef = useRef(null);
  const fileRef = useRef(null);
  const recRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  // pastille déplaçable (comme Messenger)
  const [fabPos, setFabPos] = useState(() => { try { const v = JSON.parse(localStorage.getItem("atelierdor:fabpos")); return v && typeof v.x === "number" && typeof v.y === "number" ? v : null; } catch (e) { return null; } });
  const fabRef = useRef(null);
  const dragRef = useRef({ down: false, moved: false, sx: 0, sy: 0, ox: 0, oy: 0 });
  const onFabDown = (e) => {
    const el = fabRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    dragRef.current = { down: true, moved: false, sx: e.clientX, sy: e.clientY, ox: r.left, oy: r.top };
    try { el.setPointerCapture(e.pointerId); } catch (_) { /* */ }
  };
  const onFabMove = (e) => {
    const d = dragRef.current; if (!d.down) return;
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) d.moved = true;
    if (!d.moved) return;
    const el = fabRef.current; const w = el.offsetWidth, h = el.offsetHeight;
    let nx = Math.max(6, Math.min(window.innerWidth - w - 6, d.ox + dx));
    let ny = Math.max(6, Math.min(window.innerHeight - h - 6, d.oy + dy));
    setFabPos({ x: nx, y: ny });
  };
  const onFabUp = () => {
    const d = dragRef.current; if (!d.down) return; d.down = false;
    if (!d.moved) { onToggle(); return; }
    const el = fabRef.current; const w = el ? el.offsetWidth : 56;
    setFabPos((p) => { if (!p) return p; const snapX = (p.x + w / 2 < window.innerWidth / 2) ? 8 : window.innerWidth - w - 8; const np = { x: snapX, y: p.y }; try { localStorage.setItem("atelierdor:fabpos", JSON.stringify(np)); } catch (_) { /* */ } return np; });
  };
  useEffect(() => {
    if (!fabPos) return;
    const onR = () => setFabPos((p) => { if (!p) return p; const el = fabRef.current; const w = el ? el.offsetWidth : 56, h = el ? el.offsetHeight : 56; return { x: Math.max(6, Math.min(window.innerWidth - w - 6, p.x)), y: Math.max(6, Math.min(window.innerHeight - h - 6, p.y)) }; });
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, [fabPos]);
  const visible = messages.filter((m) => {
    if (activeChat === "all") return !m.to || m.to === "all";
    return (m.userId === myId && m.to === activeChat) || (m.userId === activeChat && m.to === myId);
  });
  const sorted = [...visible].sort((a, b) => (a.ts || 0) - (b.ts || 0));
  const activePerson = peeps.find((p) => p.id === activeChat);
  useEffect(() => { if (open && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; }, [open, messages.length]);
  useEffect(() => {
    if (!open || !onSeen) return;
    const maxTs = sorted.reduce((mx, m) => Math.max(mx, m.ts || 0), 0);
    if (maxTs) onSeen(activeChat, maxTs);
  }, [open, activeChat, sorted.length]);
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);
  const quotaMB = lim.quotaMB || 0;
  const storageUsageBytes = async () => {
    try {
      const { data, error } = await supabase.storage.from("chat").list(shopId, { limit: 1000 });
      if (error || !data) return 0;
      return data.reduce((a, f) => a + ((f.metadata && f.metadata.size) || 0), 0);
    } catch (e) { return 0; }
  };
  const fmtVol = (mb) => (mb >= 1000 ? `${(mb / 1000).toLocaleString("fr-FR")} Go` : `${mb} Mo`);
  const uploadToStorage = async (blob, ext, name) => {
    try {
      if (quotaMB > 0) {
        const used = await storageUsageBytes();
        if (used + (blob.size || 0) > quotaMB * 1024 * 1024) {
          onNotice && onNotice(`Volume de stockage atteint (${fmtVol(quotaMB)}). Supprime d'anciens médias du chat ou passe à une formule supérieure pour plus d'espace.`, "Stockage plein");
          return null;
        }
      }
      const path = `${shopId}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("chat").upload(path, blob, { contentType: blob.type || undefined, upsert: false });
      if (error) return null;
      return { path, name };
    } catch (e) { return null; }
  };
  const submitText = () => { const t = text.trim(); if (!t) return; sendTo({ text: t }); setText(""); };
  const pickImage = async (e) => {
    const f = e.target.files && e.target.files[0]; e.target.value = "";
    if (!f) return;
    setBusy(true);
    try {
      if (useStorage) {
        const blob = await compressImageBlob(f, 2000, 0.85);
        if (!blob) { onNotice && onNotice("Image illisible.", "Photo"); return; }
        const m = await uploadToStorage(blob, "jpg");
        if (m) sendTo({ image: m }); else onNotice && onNotice("Envoi impossible. Vérifie ta connexion.", "Photo");
      } else {
        const data = await compressImage(f, 1100, 0.6);
        if (data) sendTo({ image: data }); else onNotice && onNotice("Image illisible.", "Photo");
      }
    } finally { setBusy(false); }
  };
  const pickFile = async (e) => {
    const f = e.target.files && e.target.files[0]; e.target.value = "";
    if (!f) return;
    if (f.size > lim.file * 1024 * 1024) { onUpsell && onUpsell({ type: "file", limit: lim.file }); return; }
    setBusy(true);
    try {
      if (useStorage) {
        const ext = ((f.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "")) || "bin";
        const m = await uploadToStorage(f, ext, f.name);
        if (m) sendTo({ file: m }); else onNotice && onNotice("Envoi impossible. Vérifie ta connexion.", "Document");
      } else {
        const data = await fileToDataURL(f);
        if (data) sendTo({ file: { name: f.name, type: f.type, data } }); else onNotice && onNotice("Document illisible.", "Document");
      }
    } finally { setBusy(false); }
  };
  const startRec = async () => {
    if (recording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (ev) => { if (ev.data && ev.data.size) chunksRef.current.push(ev.data); };
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
        if (!blob.size) return;
        setBusy(true);
        try {
          if (useStorage) { const m = await uploadToStorage(blob, "webm"); if (m) sendTo({ audio: m }); else onNotice && onNotice("Envoi du vocal impossible. Vérifie ta connexion.", "Vocal"); }
          else { const data = await fileToDataURL(blob); if (data) sendTo({ audio: data }); }
        } finally { setBusy(false); }
      };
      mr.start(); recRef.current = mr; setRecording(true); setRecSec(0);
      timerRef.current = setInterval(() => setRecSec((s) => s + 1), 1000);
    } catch (e) { onNotice && onNotice("Micro indisponible ou refusé. Autorise le micro dans ton navigateur pour envoyer un vocal.", "Message vocal"); }
  };
  const stopRec = () => { if (recRef.current && recording) { try { recRef.current.stop(); } catch (e) { /* */ } setRecording(false); } if (timerRef.current) clearInterval(timerRef.current); };
  const cancelRec = () => { if (recRef.current) { recRef.current.onstop = () => { if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop()); }; try { recRef.current.stop(); } catch (e) { /* */ } } setRecording(false); if (timerRef.current) clearInterval(timerRef.current); };
  useEffect(() => {
    if (recording && recSec >= lim.audioSec) { stopRec(); if (!lim.storage) onUpsell && onUpsell({ type: "audio", limit: lim.audioSec }); }
  }, [recSec, recording]);
  const askNotif = () => { if (typeof Notification === "undefined") return; Notification.requestPermission().then((p) => setNotifPerm(p)); };
  const fmtSec = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const [nowTick, setNowTick] = useState(Date.now());
  useEffect(() => { if (!open) return; const iv = setInterval(() => setNowTick(Date.now()), 30000); return () => clearInterval(iv); }, [open]);
  const relTime = (ms) => { const m = Math.floor(ms / 60000); if (m < 1) return "à l'instant"; if (m < 60) return `il y a ${m} min`; const h = Math.floor(m / 60); if (h < 24) return `il y a ${h} h`; const d = Math.floor(h / 24); return `il y a ${d} j`; };
  const presenceOf = (pid) => {
    const r = (reads || []).find((x) => x.userId === pid);
    const t = r ? (r.active || 0) : 0;
    if (!t) return null;
    const diff = nowTick - t;
    if (diff < 70000) return { online: true, label: "en ligne" };
    return { online: false, label: "actif " + relTime(diff) };
  };
  return (
    <>
      <button ref={fabRef} className="chat-fab" onPointerDown={onFabDown} onPointerMove={onFabMove} onPointerUp={onFabUp} style={fabPos ? { left: fabPos.x + "px", top: fabPos.y + "px", right: "auto", bottom: "auto" } : undefined} aria-label="Messagerie">
        {open ? <X size={22} /> : <MessageCircle size={24} />}
        {!open && unread > 0 && <span className="chat-badge">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="chat-panel">
          <div className="chat-head">
            <MessageCircle size={16} /> <strong>Messagerie</strong>
            <span className="muted small chat-pres">
              {activeChat === "all"
                ? "équipe"
                : (() => { const pr = presenceOf(activeChat); return (<>{pr && pr.online && <span className="pres-dot" />}{activePerson ? activePerson.name : "privé"}{pr ? " · " + pr.label : ""}</>); })()}
            </span>
            {notifPerm === "default" && <button className="chat-notif" onClick={askNotif} title="Activer les notifications">🔔 Activer</button>}
            <button className="chat-x" onClick={onToggle} title="Fermer" aria-label="Fermer la messagerie"><X size={18} /></button>
          </div>
          {peeps.length > 0 && (
            <div className="chat-tabs">
              <button className={`chat-tab ${activeChat === "all" ? "on" : ""}`} onClick={() => setActiveChat("all")}>
                Équipe{(unreadMap && unreadMap.all > 0) ? <span className="tab-dot">{unreadMap.all > 9 ? "9+" : unreadMap.all}</span> : null}
              </button>
              {peeps.map((p) => (
                <button key={p.id} className={`chat-tab ${activeChat === p.id ? "on" : ""}`} onClick={() => setActiveChat(p.id)} title={p.role === "patron" ? "Patron" : "Vendeur"}>
                  {presenceOf(p.id) && presenceOf(p.id).online && <span className="pres-dot" />}{p.name}{p.role === "patron" ? " 👑" : ""}{(unreadMap && unreadMap[p.id] > 0) ? <span className="tab-dot">{unreadMap[p.id] > 9 ? "9+" : unreadMap[p.id]}</span> : null}
                </button>
              ))}
            </div>
          )}
          <div className="chat-list" ref={listRef}>
            {sorted.length === 0
              ? <p className="muted small chat-empty">{activeChat === "all" ? "Aucun message d'équipe pour l'instant." : `Conversation privée avec ${activePerson ? activePerson.name : ""}.`}<br />Écris, ou envoie une photo, un vocal ou un document.</p>
              : sorted.map((m) => {
                const mine = m.userId === myId;
                if (m.removed) {
                  return (
                    <div key={m.id} className={`chat-msg ${mine ? "mine" : ""}`}>
                      {!mine && <span className="chat-name">{m.by}</span>}
                      <div className="chat-bubble removed"><span className="chat-removed">🚫 Message supprimé</span></div>
                      <span className="chat-foot"><span className="chat-time">{m.time}</span></span>
                    </div>
                  );
                }
                const readers = mine ? (reads || []).filter((r) => r.userId !== myId && (r.ts || 0) >= (m.ts || 0)) : [];
                const readNames = readers.map((r) => r.name).filter(Boolean);
                return (
                  <div key={m.id} className={`chat-msg ${mine ? "mine" : ""}`}>
                    {!mine && <span className="chat-name">{m.by}{m.role === "patron" ? " · patron" : ""}</span>}
                    <div className="chat-bubble">
                      {m.image && <ChatMedia media={m.image} kind="image" onImage={setLightbox} />}
                      {m.audio && <ChatMedia media={m.audio} kind="audio" />}
                      {m.file && <ChatMedia media={m.file} kind="file" />}
                      {m.text && <span className="chat-txt">{m.text}</span>}
                    </div>
                    <span className="chat-foot">
                      <span className="chat-time">{m.time}</span>
                      {mine && (readers.length > 0
                        ? <span className="chat-read seen">✓✓ Lu{readNames.length <= 2 ? " · " + readNames.join(", ") : " · " + readNames.length}</span>
                        : <span className="chat-read">✓ Envoyé</span>)}
                      {(mine || isPatron) && onDelete && <button className="chat-del" onClick={() => onDelete(m)} title="Supprimer ce message" aria-label="Supprimer">Supprimer</button>}
                    </span>
                  </div>
                );
              })}
          </div>
          {recording ? (
            <div className="chat-rec">
              <span className="rec-dot" /><span className="rec-time">{fmtSec(recSec)}</span>
              <span className="muted small" style={{ flex: 1 }}>Enregistrement…</span>
              <button className="btn btn-ghost btn-xs" onClick={cancelRec}>Annuler</button>
              <button className="chat-send" onClick={stopRec} aria-label="Envoyer le vocal"><Send size={18} /></button>
            </div>
          ) : (
            <div className="chat-input">
              <button className="chat-icon" onClick={() => imgRef.current && imgRef.current.click()} title="Photo" aria-label="Photo" disabled={busy}>📷</button>
              <button className="chat-icon" onClick={() => fileRef.current && fileRef.current.click()} title="Document" aria-label="Document" disabled={busy}>📎</button>
              <button className="chat-icon" onClick={startRec} title="Message vocal" aria-label="Vocal" disabled={busy}>🎤</button>
              <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder={busy ? "Envoi en cours…" : (activeChat === "all" ? "Message à l'équipe…" : `Message à ${activePerson ? activePerson.name : ""}…`)} onKeyDown={(e) => e.key === "Enter" && submitText()} disabled={busy} />
              <button className="chat-send" onClick={submitText} disabled={!text.trim() || busy} aria-label="Envoyer"><Send size={18} /></button>
              <input ref={imgRef} type="file" accept="image/*" style={{ display: "none" }} onChange={pickImage} />
              <input ref={fileRef} type="file" style={{ display: "none" }} onChange={pickFile} />
            </div>
          )}
        </div>
      )}
      {lightbox && <div className="chat-lightbox" onClick={() => setLightbox(null)}><img src={lightbox} alt="" /></div>}
    </>
  );
}

function UserModal({ item, onClose, onSave }) {
  const [f, setF] = useState(item ? { ...item, password: "" } : { name: "", role: "vendeur", password: "", email: "" });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const pwOk = item ? (!f.password || f.password.length >= 4) : (f.password || "").length >= 4;
  const valid = f.name && f.email && pwOk;
  return (
    <Modal title={item ? "Modifier l'employé" : "Nouvel employé"} sub="Identifiant et mot de passe pour se connecter" onClose={onClose}
      footer={<div className="foot-actions"><button className="btn btn-ghost" onClick={onClose}>Annuler</button><button className="btn btn-gold" disabled={!valid} onClick={() => onSave(f)}>Enregistrer</button></div>}>
      <Field label="Nom"><input className="input" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="ex : Moussa" /></Field>
      <Field label="Identifiant / e-mail"><input className="input" value={f.email || ""} onChange={(e) => set("email", e.target.value)} placeholder="ex : moussa@boutique.sn" /></Field>
      <div className="grid2">
        <Field label="Rôle">
          <select className="input" value={f.role} onChange={(e) => set("role", e.target.value)}>
            <option value="vendeur">Vendeur</option>
            <option value="patron">Patron (accès total)</option>
          </select>
        </Field>
        <Field label="Mot de passe (min. 4)">
          <input className="input" type="password" value={f.password || ""} onChange={(e) => set("password", e.target.value)} placeholder={item ? "vide = inchangé" : "••••••"} />
        </Field>
      </div>
    </Modal>
  );
}

function BrandMark({ logo, lg, fallback = "Au" }) {
  if (logo) return <div className={`brand-mark ${lg ? "lg" : ""} has-logo`}><img src={logo} alt="" /></div>;
  return <div className={`brand-mark ${lg ? "lg" : ""}`}>{fallback}</div>;
}
function readLogo(file, cb) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const max = 256;
      let w = img.width, h = img.height;
      if (w > max || h > max) { const r = Math.min(max / w, max / h); w = Math.round(w * r); h = Math.round(h * r); }
      try {
        const c = document.createElement("canvas"); c.width = w; c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        cb(c.toDataURL("image/png"));
      } catch (e) { cb(String(reader.result)); }
    };
    img.onerror = () => cb(String(reader.result));
    img.src = String(reader.result);
  };
  reader.readAsDataURL(file);
}
function LogoField({ logo, onChange, fallback = "Au", label = "logo" }) {
  const ref = useRef(null);
  return (
    <div className="logo-field">
      <div className="logo-preview">{logo ? <img src={logo} alt={label} /> : <span>{fallback}</span>}</div>
      <div className="logo-actions">
        <button type="button" className="btn btn-line btn-xs" onClick={() => ref.current && ref.current.click()}>{logo ? `Changer la ${label}` : `Choisir une ${label}`}</button>
        {logo && <button type="button" className="btn btn-line btn-xs danger" onClick={() => onChange("")}>Retirer</button>}
        <input ref={ref} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { readLogo(e.target.files && e.target.files[0], onChange); e.target.value = ""; }} />
      </div>
    </div>
  );
}

function LockScreen({ users, onUnlock, openAdmin, logo }) {
  const [ident, setIdent] = useState("");
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState(false);
  const submit = () => {
    const id = ident.trim().toLowerCase();
    if (!id || !pwd) { setErr(true); return; }
    const u = users.find((x) => ((x.email || "").toLowerCase() === id || (x.name || "").toLowerCase() === id) && checkPwd(x, pwd));
    if (u) onUnlock(u); else setErr(true);
  };
  return (
    <div className="lock">
      <div className="lock-brand"><BrandMark logo={logo} lg /><div className="lock-title">Atelier d'Or</div><div className="lock-sub">Connexion</div></div>
      <div className="act-box">
        <p className="lock-q">Identifie-toi pour continuer</p>
        <input className="act-input" value={ident} onChange={(e) => { setIdent(e.target.value); setErr(false); }} placeholder="Identifiant ou e-mail" onKeyDown={(e) => e.key === "Enter" && submit()} />
        <input className="act-input" type="password" value={pwd} onChange={(e) => { setPwd(e.target.value); setErr(false); }} placeholder="Mot de passe" onKeyDown={(e) => e.key === "Enter" && submit()} />
        {err && <p className="lock-err">Identifiant ou mot de passe incorrect.</p>}
        <button className="btn btn-gold act-btn" onClick={submit}>Se connecter</button>
        <p className="lock-hint">Démo — patron@atelier.sn / patron123</p>
      </div>
      {openAdmin && <button className="editor-link" onClick={openAdmin}>Espace éditeur</button>}
    </div>
  );
}

function OnlineLogin({ onExit, logo, sub = "Espace en ligne", heading = "Connexion à ton compte" }) {
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    const mail = email.trim().toLowerCase();
    if (!mail || !pwd) { setErr("Entre ton e-mail et ton mot de passe."); return; }
    setBusy(true); setErr("");
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: mail, password: pwd });
      if (error) setErr("E-mail ou mot de passe incorrect.");
    } catch (e) { setErr("Connexion impossible. Vérifie ta connexion internet."); }
    finally { setBusy(false); }
  };
  return (
    <div className="lock">
      <div className="lock-brand"><BrandMark logo={logo} lg /><div className="lock-title">Atelier d'Or</div><div className="lock-sub">{sub}</div></div>
      <div className="act-box">
        <p className="lock-q">{heading}</p>
        <input className="act-input" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErr(""); }} placeholder="Adresse e-mail" onKeyDown={(e) => e.key === "Enter" && submit()} />
        <input className="act-input" type="password" value={pwd} onChange={(e) => { setPwd(e.target.value); setErr(""); }} placeholder="Mot de passe" onKeyDown={(e) => e.key === "Enter" && submit()} />
        {err && <p className="lock-err">{err}</p>}
        <button className="btn btn-gold act-btn" onClick={submit} disabled={busy}>{busy ? "Connexion…" : "Se connecter"}</button>
      </div>
      {onExit && <button className="editor-link" onClick={onExit}>Retour à l'application</button>}
    </div>
  );
}

function ClientGate({ authUser, onSignOut, onExit, resellerPhone, logo, onAuthorized }) {
  const [profile, setProfile] = useState(null);
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setErr("");
    const CACHE_KEY = "atelierdor:shopcache:" + authUser.id;
    const GRACE_DAYS = 7;
    try {
      const { data: prof, error: e1 } = await supabase.from("profiles").select("*").eq("id", authUser.id).maybeSingle();
      if (e1) throw e1;
      setProfile(prof || null);
      if (prof && prof.shop_id) {
        const { data: sh, error: e2 } = await supabase.from("shops").select("*").eq("id", prof.shop_id).maybeSingle();
        if (e2) throw e2;
        setShop(sh || null);
        if (sh) { try { await STORE.set(CACHE_KEY, JSON.stringify({ profile: prof, shop: sh, ts: Date.now() })); } catch (e) { /* */ } }
      } else { setShop(null); }
    } catch (e) {
      // panne réseau : on réutilise la dernière vérification réussie (tolérance hors-ligne)
      let used = false;
      try {
        const raw = await STORE.get(CACHE_KEY);
        if (raw) {
          const c = JSON.parse(raw);
          if (c && c.ts && c.shop && (Date.now() - c.ts) < GRACE_DAYS * DAY) {
            setProfile(c.profile || null); setShop(c.shop); used = true;
          }
        }
      } catch (e2) { /* */ }
      if (!used) setErr("Impossible de vérifier ta boutique. Vérifie ta connexion.");
    }
    finally { setLoading(false); }
  }, [authUser.id]);
  useEffect(() => { load(); }, [load]);

  // entrée automatique dans l'app quand la boutique est active (mode entrée principale)
  useEffect(() => {
    if (!onAuthorized) return;
    if (loading || err || !profile || profile.is_reseller || !shop) return;
    const e2 = shop.expiry ? String(shop.expiry).slice(0, 10) : "";
    if (shop.status === "suspended" || (e2 && e2 < TODAY)) return;
    onAuthorized(profile, shop);
  }, [onAuthorized, loading, err, profile, shop]);

  const waReseller = () => {
    const p = String(resellerPhone || "").replace(/[^\d]/g, "");
    const msg = "Bonjour, je souhaite réactiver / renouveler mon abonnement Atelier d'Or.";
    return p ? `https://wa.me/${p}?text=${encodeURIComponent(msg)}` : null;
  };

  if (loading) {
    return (<div className="lock"><div className="lock-brand"><BrandMark logo={logo} lg /><div className="lock-sub">Vérification…</div></div></div>);
  }
  if (profile && profile.is_reseller) {
    return (
      <div className="lock">
        <div className="lock-brand"><BrandMark logo={logo} lg /><div className="lock-title">Compte revendeur</div><div className="lock-sub">Mauvais espace</div></div>
        <div className="act-box">
          <p className="lock-q">Ce compte est un compte revendeur.</p>
          <a className="btn btn-gold act-btn" href="#espace">Aller à l'espace revendeur</a>
          <button className="btn btn-line" style={{ marginTop: 8 }} onClick={onSignOut}>Déconnexion</button>
        </div>
      </div>
    );
  }
  if (err || !profile || !shop) {
    return (
      <div className="lock">
        <div className="lock-brand"><BrandMark logo={logo} lg /><div className="lock-title">Atelier d'Or</div><div className="lock-sub">Accès</div></div>
        <div className="act-box">
          <p className="lock-q">{err || "Aucune boutique n'est rattachée à ce compte."}</p>
          {err ? <button className="btn btn-gold act-btn" onClick={load}>Réessayer</button> : null}
          <button className="btn btn-line" style={{ marginTop: 8 }} onClick={onSignOut}>Déconnexion</button>
        </div>
      </div>
    );
  }

  const exp = shop.expiry ? String(shop.expiry).slice(0, 10) : "";
  const expired = exp && exp < TODAY;
  const blocked = shop.status === "suspended" || expired;

  if (blocked) {
    const wa = waReseller();
    return (
      <div className="lock">
        <div className="lock-brand"><BrandMark logo={logo} lg /><div className="lock-title">{shop.name}</div><div className="lock-sub">Accès suspendu</div></div>
        <div className="act-box">
          <p className="lock-q">{shop.status === "suspended" ? "Ton abonnement est suspendu." : "Ton abonnement a expiré."}</p>
          <p className="muted small" style={{ marginBottom: 10 }}>Contacte ton revendeur pour réactiver l'accès.</p>
          {wa && <a className="btn btn-gold act-btn" href={wa} target="_blank" rel="noreferrer">Contacter le revendeur</a>}
          <button className="btn btn-line" style={{ marginTop: 8 }} onClick={onSignOut}>Déconnexion</button>
        </div>
      </div>
    );
  }

  if (onAuthorized) {
    return (<div className="lock"><div className="lock-brand"><BrandMark logo={logo} lg /><div className="lock-sub">Ouverture…</div></div></div>);
  }

  return (
    <div className="lock">
      <div className="lock-brand"><BrandMark logo={logo} lg /><div className="lock-title">{shop.name}</div><div className="lock-sub">Accès autorisé</div></div>
      <div className="act-box">
        <p className="lock-q">Boutique active ✓</p>
        <p className="muted small" style={{ marginBottom: 4 }}>{authUser.email} · {profile.role === "admin" ? "Chef de boutique" : "Vendeur"}</p>
        {shop.expiry && <p className="muted small" style={{ marginBottom: 10 }}>Abonnement {FORMULAS[shop.plan] ? FORMULAS[shop.plan].name : shop.plan} · jusqu'au {dateFr(exp)}</p>}
        <button className="btn btn-gold act-btn" onClick={onSignOut}>Déconnexion</button>
      </div>
      {onExit && <button className="editor-link" onClick={onExit}>Retour</button>}
    </div>
  );
}

function ShopFormModal({ mode, shop, onClose, onSubmit }) {
  const computeExpiry = (p) => { const d = new Date(); d.setDate(d.getDate() + (FORMULAS[p] ? FORMULAS[p].days : 30)); return iso(d); };
  const [name, setName] = useState(shop ? shop.name : "");
  const [phone, setPhone] = useState(shop ? (shop.phone || "") : "");
  const [plan, setPlan] = useState(shop && shop.plan ? shop.plan : "S");
  const [expiry, setExpiry] = useState(() => computeExpiry(shop && shop.plan ? shop.plan : "S"));
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(null); // { email, password } après création du compte
  const pickPlan = (p) => { setPlan(p); setExpiry(computeExpiry(p)); };
  const genPwd = () => {
    const a = "ABCDEFGHJKMNPQRSTUVWXYZ", n = "23456789";
    let s = "";
    for (let i = 0; i < 3; i++) s += a[Math.floor(Math.random() * a.length)];
    for (let i = 0; i < 4; i++) s += n[Math.floor(Math.random() * n.length)];
    setPwd(s); setErr("");
  };
  const submit = async () => {
    if (mode === "create" && !name.trim()) { setErr("Indique le nom de la boutique."); return; }
    if (!expiry) { setErr("Choisis une date de fin."); return; }
    if (mode === "create" && (email.trim() || pwd)) {
      if (!email.trim() || !pwd) { setErr("Pour créer le compte, remplis l'e-mail ET le mot de passe (ou laisse les deux vides)."); return; }
      if (pwd.length < 6) { setErr("Mot de passe : au moins 6 caractères."); return; }
    }
    setBusy(true); setErr("");
    try {
      const res = await onSubmit({ name: name.trim(), phone: phone.trim(), plan, expiry, email: email.trim().toLowerCase(), password: pwd });
      if (mode === "create" && res && res.account) { setDone(res.account); setBusy(false); return; }
      onClose();
    } catch (e) { setErr(e && e.message ? e.message : "Opération impossible. Vérifie ta connexion internet."); setBusy(false); }
  };

  if (done) {
    const waPhone = String(phone || "").replace(/[^\d]/g, "");
    const waMsg = `Bonjour, voici vos accès à l'application Atelier d'Or :\n\nLien : https://atelierdorpro.com\nE-mail : ${done.email}\nMot de passe : ${done.password}\n\nOuvrez le lien, entrez l'e-mail et le mot de passe pour vous connecter.`;
    const waUrl = waPhone ? `https://wa.me/${waPhone}?text=${encodeURIComponent(waMsg)}` : null;
    return (
      <Modal title="Compte client créé" sub={name} onClose={onClose}
        footer={<button className="btn btn-gold" onClick={onClose}>Terminé</button>}>
        <p className="muted small" style={{ margin: "0 0 12px" }}>Transmets ces identifiants à ton client. Note-les : le mot de passe ne sera plus affiché ensuite.</p>
        <div className="creds-box">
          <div className="creds-row"><span>E-mail</span><b>{done.email}</b></div>
          <div className="creds-row"><span>Mot de passe</span><b>{done.password}</b></div>
        </div>
        <div className="data-actions" style={{ marginTop: 12 }}>
          <button className="btn btn-line" onClick={() => { try { navigator.clipboard.writeText(`E-mail : ${done.email}\nMot de passe : ${done.password}`); } catch (e) { /* */ } }}>Copier</button>
          {waUrl && <a className="btn btn-gold" href={waUrl} target="_blank" rel="noreferrer">Envoyer sur WhatsApp</a>}
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title={mode === "create" ? "Nouvelle boutique" : "Renouveler l'abonnement"}
      sub={mode === "renew" && shop ? shop.name : ""}
      onClose={onClose}
      footer={<><button className="btn btn-line" onClick={onClose}>Annuler</button><button className="btn btn-gold" onClick={submit} disabled={busy}>{busy ? "…" : (mode === "create" ? "Créer" : "Renouveler")}</button></>}>
      {mode === "create" && (
        <>
          <Field label="Nom de la boutique"><input className="act-input" value={name} onChange={(e) => { setName(e.target.value); setErr(""); }} placeholder="Ex. Bijouterie Fall" /></Field>
          <Field label="Téléphone / WhatsApp"><input className="act-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ex. 221770000000" /></Field>
        </>
      )}
      <Field label="Formule (calcule la date)">
        <div className="plan-row">
          {["E", "S", "P", "R"].map((p) => (
            <button key={p} type="button" className={`btn ${plan === p ? "btn-gold" : "btn-line"} plan-pick`} onClick={() => pickPlan(p)}>{FORMULAS[p].name} · {FORMULAS[p].days}j</button>
          ))}
        </div>
      </Field>
      <Field label="Date de fin (modifiable à la main)"><input className="act-input" type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} /></Field>
      {mode === "create" && (
        <>
          <div className="creds-sep">Compte de connexion du client (optionnel)</div>
          <Field label="E-mail du client"><input className="act-input" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErr(""); }} placeholder="boutique@exemple.com" /></Field>
          <Field label="Mot de passe">
            <div className="pwd-row">
              <input className="act-input" value={pwd} onChange={(e) => { setPwd(e.target.value); setErr(""); }} placeholder="6 caractères minimum" />
              <button type="button" className="btn btn-line" onClick={genPwd}>Générer</button>
            </div>
          </Field>
          <p className="muted small" style={{ margin: "2px 0 0" }}>Laisse vide pour créer la boutique sans compte (tu pourras le faire plus tard).</p>
        </>
      )}
      {err && <p className="lock-err">{err}</p>}
    </Modal>
  );
}

function AccountModal({ shop, onClose, onSubmit }) {
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(null);
  const [existing, setExisting] = useState(null); // null = chargement
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from("profiles").select("id, role, name, email").eq("shop_id", shop.id);
        setExisting(data || []);
      } catch (e) { setExisting([]); }
    })();
  }, [shop.id]);
  const genPwd = () => {
    const a = "ABCDEFGHJKMNPQRSTUVWXYZ", n = "23456789";
    let s = "";
    for (let i = 0; i < 3; i++) s += a[Math.floor(Math.random() * a.length)];
    for (let i = 0; i < 4; i++) s += n[Math.floor(Math.random() * n.length)];
    setPwd(s); setErr("");
  };
  const submit = async () => {
    if (!email.trim() || !pwd) { setErr("Remplis l'e-mail et le mot de passe."); return; }
    if (pwd.length < 6) { setErr("Mot de passe : au moins 6 caractères."); return; }
    setBusy(true); setErr("");
    try { const res = await onSubmit({ email: email.trim().toLowerCase(), password: pwd }); setDone(res.account); setBusy(false); }
    catch (e) { setErr(e && e.message ? e.message : "Opération impossible. Vérifie ta connexion."); setBusy(false); }
  };
  if (done) {
    const waPhone = String(shop.phone || "").replace(/[^\d]/g, "");
    const waMsg = `Bonjour, voici vos accès à l'application Atelier d'Or :\n\nLien : https://atelierdorpro.com\nE-mail : ${done.email}\nMot de passe : ${done.password}\n\nOuvrez le lien, entrez l'e-mail et le mot de passe pour vous connecter.`;
    const waUrl = waPhone ? `https://wa.me/${waPhone}?text=${encodeURIComponent(waMsg)}` : null;
    return (
      <Modal title="Compte client créé" sub={shop.name} onClose={onClose} footer={<button className="btn btn-gold" onClick={onClose}>Terminé</button>}>
        <p className="muted small" style={{ margin: "0 0 12px" }}>Transmets ces identifiants à ton client. Note-les : le mot de passe ne sera plus affiché ensuite.</p>
        <div className="creds-box">
          <div className="creds-row"><span>E-mail</span><b>{done.email}</b></div>
          <div className="creds-row"><span>Mot de passe</span><b>{done.password}</b></div>
        </div>
        <div className="data-actions" style={{ marginTop: 12 }}>
          <button className="btn btn-line" onClick={() => { try { navigator.clipboard.writeText(`E-mail : ${done.email}\nMot de passe : ${done.password}`); } catch (e) { /* */ } }}>Copier</button>
          {waUrl && <a className="btn btn-gold" href={waUrl} target="_blank" rel="noreferrer">Envoyer sur WhatsApp</a>}
        </div>
      </Modal>
    );
  }
  return (
    <Modal title="Compte client" sub={shop.name} onClose={onClose}
      footer={<><button className="btn btn-line" onClick={onClose}>Annuler</button><button className="btn btn-gold" onClick={submit} disabled={busy}>{busy ? "…" : "Créer le compte"}</button></>}>
      {existing === null ? (
        <p className="muted small" style={{ margin: "0 0 12px" }}>Chargement des comptes…</p>
      ) : existing.length > 0 ? (
        <>
          <div className="creds-sep" style={{ marginTop: 0, paddingTop: 0, borderTop: "none" }}>Comptes existants</div>
          <div className="creds-box" style={{ marginBottom: 14 }}>
            {existing.map((p) => (
              <div className="creds-row" key={p.id}>
                <span>{p.role === "admin" ? "Chef de boutique" : "Vendeur"}</span>
                <b>{p.email || "(e-mail non enregistré)"}</b>
              </div>
            ))}
          </div>
          <div className="creds-sep">Ajouter un autre compte</div>
        </>
      ) : (
        <p className="muted small" style={{ margin: "0 0 12px" }}>Aucun compte pour cette boutique. Crée l'accès en ligne du client.</p>
      )}
      <Field label="E-mail du client"><input className="act-input" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErr(""); }} placeholder="boutique@exemple.com" /></Field>
      <Field label="Mot de passe">
        <div className="pwd-row">
          <input className="act-input" value={pwd} onChange={(e) => { setPwd(e.target.value); setErr(""); }} placeholder="6 caractères minimum" />
          <button type="button" className="btn btn-line" onClick={genPwd}>Générer</button>
        </div>
      </Field>
      {err && <p className="lock-err">{err}</p>}
    </Modal>
  );
}

function VendorModal({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(null);
  const genPwd = () => {
    const a = "ABCDEFGHJKMNPQRSTUVWXYZ", n = "23456789";
    let s = "";
    for (let i = 0; i < 3; i++) s += a[Math.floor(Math.random() * a.length)];
    for (let i = 0; i < 4; i++) s += n[Math.floor(Math.random() * n.length)];
    setPwd(s); setErr("");
  };
  const vendErr = (code, max) => {
    if (code === "limite_atteinte") return `Limite de vendeurs atteinte (${max}). Passe à une formule supérieure pour en ajouter.`;
    if (code === "mot_de_passe_court") return "Mot de passe : au moins 6 caractères.";
    if (code === "non_autorise") return "Action réservée au patron.";
    if (code === "non_authentifie") return "Reconnecte-toi puis réessaie.";
    if (code === "creation_compte") return "Compte non créé : cet e-mail est peut-être déjà utilisé.";
    if (code === "champs_manquants") return "Remplis l'e-mail et le mot de passe.";
    return "Le compte n'a pas pu être créé.";
  };
  const submit = async () => {
    if (!email.trim() || !pwd) { setErr("Remplis l'e-mail et le mot de passe."); return; }
    if (pwd.length < 6) { setErr("Mot de passe : au moins 6 caractères."); return; }
    setBusy(true); setErr("");
    try {
      const { data, error } = await supabase.functions.invoke("create-vendor-account", {
        body: { email: email.trim().toLowerCase(), password: pwd, name: name.trim() },
      });
      if (error) { setErr("Création impossible (connexion ?)."); setBusy(false); return; }
      if (data && data.error) { setErr(vendErr(data.error, data.max)); setBusy(false); return; }
      setDone({ email: email.trim().toLowerCase(), password: pwd }); setBusy(false);
    } catch (e) { setErr("Création impossible. Vérifie ta connexion."); setBusy(false); }
  };
  if (done) {
    return (
      <Modal title="Compte vendeur créé" sub={name || done.email} onClose={onCreated} footer={<button className="btn btn-gold" onClick={onCreated}>Terminé</button>}>
        <p className="muted small" style={{ margin: "0 0 12px" }}>Transmets ces identifiants à ton vendeur. Note-les : le mot de passe ne sera plus affiché ensuite.</p>
        <div className="creds-box">
          <div className="creds-row"><span>E-mail</span><b>{done.email}</b></div>
          <div className="creds-row"><span>Mot de passe</span><b>{done.password}</b></div>
        </div>
        <div className="data-actions" style={{ marginTop: 12 }}>
          <button className="btn btn-line" onClick={() => { try { navigator.clipboard.writeText(`E-mail : ${done.email}\nMot de passe : ${done.password}`); } catch (e) { /* */ } }}>Copier</button>
        </div>
      </Modal>
    );
  }
  return (
    <Modal title="Nouvel employé (vendeur)" onClose={onClose}
      footer={<><button className="btn btn-line" onClick={onClose}>Annuler</button><button className="btn btn-gold" onClick={submit} disabled={busy}>{busy ? "…" : "Créer le compte"}</button></>}>
      <Field label="Nom du vendeur"><input className="act-input" value={name} onChange={(e) => { setName(e.target.value); setErr(""); }} placeholder="Ex. Awa Ndiaye" /></Field>
      <Field label="E-mail"><input className="act-input" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErr(""); }} placeholder="vendeur@exemple.com" /></Field>
      <Field label="Mot de passe">
        <div className="pwd-row">
          <input className="act-input" value={pwd} onChange={(e) => { setPwd(e.target.value); setErr(""); }} placeholder="6 caractères minimum" />
          <button type="button" className="btn btn-line" onClick={genPwd}>Générer</button>
        </div>
      </Field>
      {err && <p className="lock-err">{err}</p>}
    </Modal>
  );
}

function AccessModal({ member, onClose, onSaved }) {
  const isPreset = member.poste && POSTE_ORDER.includes(member.poste) && member.poste !== "Personnalisé";
  const [poste, setPoste] = useState(isPreset ? member.poste : "Personnalisé");
  const [customPoste, setCustomPoste] = useState(isPreset ? "" : (member.poste || ""));
  const toObj = (p) => {
    if (p && !Array.isArray(p) && typeof p === "object") return { ...p };
    const o = {};
    if (Array.isArray(p)) p.forEach((id) => { o[id] = id === "benefices" ? "view" : "edit"; });
    return o;
  };
  const [perms, setPerms] = useState(member.perms && !permsEmpty(member.perms) ? toObj(member.perms) : { ...(POSTE_PRESETS[member.poste] || DEFAULT_VENDOR_PERMS) });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const applyPoste = (p) => { setPoste(p); if (POSTE_PRESETS[p]) setPerms({ ...POSTE_PRESETS[p] }); };
  const lvl = (id) => perms[id] || "none";
  const setLvl = (id, v) => { setPoste("Personnalisé"); setPerms((ps) => { const n = { ...ps }; if (v === "none") delete n[id]; else n[id] = v; return n; }); };
  const finalPoste = poste === "Personnalisé" ? (customPoste.trim() || "Personnalisé") : poste;
  const save = async () => {
    setBusy(true); setErr("");
    try {
      const { error } = await supabase.rpc("set_member_access", { p_id: member.id, p_poste: finalPoste, p_perms: perms });
      if (error) throw error;
      onSaved();
    } catch (e) { setErr("Enregistrement impossible. Vérifie ta connexion."); setBusy(false); }
  };
  const Seg = ({ id, opts }) => (
    <div className="lvl-seg">
      {opts.map((o) => (
        <button key={o.v} type="button" className={`lvl-btn ${lvl(id) === o.v ? `on ${o.v}` : ""}`} onClick={() => setLvl(id, o.v)}>{o.t}</button>
      ))}
    </div>
  );
  const three = [{ v: "none", t: "Aucun" }, { v: "view", t: "Voir" }, { v: "edit", t: "Modifier" }];
  const two = [{ v: "none", t: "Aucun" }, { v: "view", t: "Voir" }];
  return (
    <Modal title="Accès de l'employé" sub={member.name || member.email || ""} onClose={onClose}
      footer={<><button className="btn btn-line" onClick={onClose}>Annuler</button><button className="btn btn-gold" onClick={save} disabled={busy}>{busy ? "…" : "Enregistrer"}</button></>}>
      <Field label="Poste">
        <select className="input" value={poste} onChange={(e) => applyPoste(e.target.value)}>
          {POSTE_ORDER.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </Field>
      {poste === "Personnalisé" && (
        <Field label="Nom du poste">
          <input className="input" value={customPoste} onChange={(e) => setCustomPoste(e.target.value)} placeholder="ex : Gérant adjoint, Apprenti…" />
        </Field>
      )}
      <p className="muted small" style={{ margin: "2px 0 8px" }}>Pour chaque section : <strong>Aucun</strong> (caché), <strong>Voir</strong> (consultation seule) ou <strong>Modifier</strong> (peut changer).</p>
      <div className="perm-rows">
        {ACCESS_SECTIONS.map((s) => (
          <div key={s.id} className="perm-row">
            <span className="perm-lab">{s.label}</span>
            <Seg id={s.id} opts={EDITABLE_SECTIONS.includes(s.id) ? three : two} />
          </div>
        ))}
        <div className="perm-row perm-benef-row">
          <span className="perm-lab">Bénéfices et marges</span>
          <Seg id="benefices" opts={two} />
        </div>
      </div>
      {err && <p className="lock-err">{err}</p>}
    </Modal>
  );
}

function OnlineTeam({ shopId, plan, meId, onBack }) {
  const [team, setTeam] = useState(null); // null = chargement
  const [err, setErr] = useState("");
  const [modal, setModal] = useState(false);
  const [access, setAccess] = useState(null);
  const [confirmRm, setConfirmRm] = useState(null);
  const f = FORMULAS[plan] || FORMULAS.S;
  const load = useCallback(async () => {
    setErr("");
    try {
      const { data, error } = await supabase.from("profiles").select("id, role, name, email, poste, perms").eq("shop_id", shopId);
      if (error) throw error;
      setTeam(data || []);
    } catch (e) { setErr("Impossible de charger l'équipe. Vérifie ta connexion."); setTeam([]); }
  }, [shopId]);
  useEffect(() => { load(); }, [load]);

  const doRemoveVendor = async (id) => {
    try {
      const { error } = await supabase.from("profiles").delete().eq("id", id);
      if (error) throw error;
      await load();
    } catch (e) { setErr("Suppression impossible."); }
  };

  const list = team || [];
  const admins = list.filter((u) => u.role === "admin");
  const vendeurs = list.filter((u) => u.role === "vendeur");
  const full = vendeurs.length >= (f.users || 2);

  return (
    <>
      <button className="btn btn-line btn-xs" style={{ marginBottom: 14 }} onClick={onBack}>← Retour aux paramètres</button>
      <div className="card lic-card">
        <div className="card-head"><h3>Formule active</h3><span className="pill pill-gold">{f.name}</span></div>
        <p className="muted small" style={{ margin: 0 }}>
          {f.admins >= 99 ? "admins illimités" : `${admins.length}/${f.admins} admin${f.admins > 1 ? "s" : ""}`}
          {" · "}{f.users >= 99 ? "vendeurs illimités" : `${vendeurs.length}/${f.users} vendeurs`}
        </p>
      </div>
      <div className="card">
        <div className="card-head">
          <h3>Équipe en ligne <span className="count">{list.length}</span></h3>
          <button className="btn btn-gold" onClick={() => setModal(true)} disabled={full}><Plus size={16} /> Nouvel employé</button>
        </div>
        {team === null ? (
          <p className="muted small" style={{ margin: 0 }}>Chargement…</p>
        ) : list.length === 0 ? (
          <p className="muted small" style={{ margin: 0 }}>Aucun compte pour cette boutique.</p>
        ) : (
          <table className="table">
            <thead><tr><th>Nom</th><th className="hide-sm">E-mail</th><th>Poste</th><th></th></tr></thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.id}>
                  <td><strong>{u.name || "—"}</strong>{u.id === meId && <span className="mini-tag">moi</span>}</td>
                  <td className="muted hide-sm">{u.email || "—"}</td>
                  <td><span className={`pill ${u.role === "admin" ? "pill-gold" : "pill-ink"}`}>{u.role === "admin" ? "Patron" : (u.poste || "Vendeur")}</span></td>
                  <td className="r nowrap">
                    {u.role !== "admin" && u.id !== meId && planAllows(plan, "roles") && <button className="btn btn-xs btn-line" onClick={() => setAccess(u)}>Accès</button>}
                    {u.role === "vendeur" && u.id !== meId && (
                      <button className="icon-btn" onClick={() => setConfirmRm(u)}><Trash2 size={15} /></button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {full && <p className="muted small" style={{ marginTop: 10 }}>Limite de vendeurs atteinte pour la formule {f.name}. Passe à une formule supérieure pour en ajouter.</p>}
        {err && <p className="lock-err">{err}</p>}
      </div>
      <div className="card">
        <div className="card-head"><h3>Comment ça marche</h3></div>
        <p className="muted small" style={{ margin: 0 }}>
          Chaque employé se connecte en ligne avec son <strong>e-mail et son mot de passe</strong>. Crée le compte ci-dessus, puis clique sur <strong>« Accès »</strong> pour choisir son <strong>poste</strong> (2ᵉ admin, Gérant, Comptable, Vendeur…) et cocher exactement <strong>les sections qu'il peut voir</strong> et s'il a le droit de voir les <strong>bénéfices et marges</strong>. Le <strong>patron</strong> garde toujours l'accès complet.
        </p>
        {!planAllows(plan, "roles") && <p className="muted small" style={{ margin: "8px 0 0", color: "var(--gold)" }}>✨ Les <strong>postes &amp; permissions personnalisés</strong> sont inclus à partir de la formule <strong>Pro</strong>.</p>}
      </div>
      {modal && <VendorModal onClose={() => setModal(false)} onCreated={() => { setModal(false); load(); }} />}
      {access && <AccessModal member={access} onClose={() => setAccess(null)} onSaved={() => { setAccess(null); load(); }} />}
      {confirmRm && <ConfirmModal title="Retirer ce vendeur ?" message={`« ${confirmRm.name || confirmRm.email || "Ce vendeur"} » ne pourra plus se connecter.`} okLabel="Retirer" danger onCancel={() => setConfirmRm(null)} onOk={() => { const v = confirmRm; setConfirmRm(null); doRemoveVendor(v.id); }} />}
    </>
  );
}

function PricingModal({ onClose, onSaved }) {
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.from("pricing").select("*");
        if (error) throw error;
        const order = { E: 0, S: 1, P: 2, R: 3 };
        const sorted = (data || []).slice().sort((a, b) => (order[a.plan] ?? 9) - (order[b.plan] ?? 9));
        setRows(sorted);
      } catch (e) { setErr("Impossible de charger les prix. Vérifie ta connexion."); }
      finally { setLoading(false); }
    })();
  }, []);
  const setField = (plan, key, val) => setRows((rs) => rs.map((r) => (r.plan === plan ? { ...r, [key]: val } : r)));
  const save = async () => {
    if (!rows) return;
    setBusy(true); setErr("");
    try {
      for (const r of rows) {
        const { error } = await supabase.from("pricing").update({ amount: parseInt(r.amount, 10) || 0, period: r.period }).eq("plan", r.plan);
        if (error) throw error;
      }
      if (onSaved) await onSaved();
      onClose();
    } catch (e) { setErr("Enregistrement impossible. Vérifie ta connexion."); setBusy(false); }
  };
  return (
    <Modal
      title="Prix des formules"
      sub="Modifié = visible aussitôt par tes clients"
      onClose={onClose}
      footer={<><button className="btn btn-line" onClick={onClose}>Annuler</button><button className="btn btn-gold" onClick={save} disabled={busy || loading}>{busy ? "…" : "Enregistrer"}</button></>}>
      {loading ? (
        <p className="muted">Chargement…</p>
      ) : !rows ? (
        <p className="lock-err">{err}</p>
      ) : (
        <>
          {rows.map((r) => (
            <div className="price-row" key={r.plan}>
              <div className="price-name">{FORMULAS[r.plan] ? FORMULAS[r.plan].name : r.plan}</div>
              <input className="act-input price-amount" type="number" min="0" value={r.amount} onChange={(e) => setField(r.plan, "amount", e.target.value)} />
              <select className="act-input price-period" value={r.period} onChange={(e) => setField(r.plan, "period", e.target.value)}>
                <option value="mois">F / mois</option>
                <option value="an">F / an</option>
                <option value="gratuit">gratuit</option>
              </select>
            </div>
          ))}
          {err && <p className="lock-err">{err}</p>}
        </>
      )}
    </Modal>
  );
}

function PaymentsModal({ shop, onClose }) {
  const [list, setList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Espèces");
  const [paidOn, setPaidOn] = useState(TODAY);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      const { data, error } = await supabase.from("payments").select("*").eq("shop_id", shop.id).order("paid_on", { ascending: false });
      if (error) throw error;
      setList(data || []);
    } catch (e) { setErr("Impossible de charger les paiements. Vérifie ta connexion."); }
    finally { setLoading(false); }
  }, [shop.id]);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    const amt = parseInt(amount, 10) || 0;
    if (amt <= 0) { setErr("Indique un montant."); return; }
    setBusy(true); setErr("");
    try {
      const { error } = await supabase.from("payments").insert({ shop_id: shop.id, amount: amt, method, paid_on: paidOn, note: note.trim() || null });
      if (error) throw error;
      setAmount(""); setNote("");
      await load();
    } catch (e) { setErr("Enregistrement impossible. Vérifie ta connexion."); }
    finally { setBusy(false); }
  };

  const total = (list || []).reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <Modal
      title="Paiements"
      sub={shop.name}
      onClose={onClose}
      footer={<button className="btn btn-line" onClick={onClose}>Fermer</button>}>
      <div className="pay-form">
        <Field label="Montant"><input className="act-input" type="number" min="0" value={amount} onChange={(e) => { setAmount(e.target.value); setErr(""); }} placeholder="Ex. 5000" /></Field>
        <Field label="Moyen"><select className="act-input" value={method} onChange={(e) => setMethod(e.target.value)}>{PAY_METHODS.map((p) => <option key={p}>{p}</option>)}</select></Field>
        <Field label="Date"><input className="act-input" type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} /></Field>
        <Field label="Note (facultatif)"><input className="act-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex. renouvellement 1 mois" /></Field>
        {err && <p className="lock-err">{err}</p>}
        <button className="btn btn-gold" onClick={add} disabled={busy}>{busy ? "…" : "Enregistrer le paiement"}</button>
      </div>
      <div className="pay-hist">
        <div className="pay-hist-top"><strong>Historique</strong>{list && list.length > 0 && <span className="muted small">Total : {fcfa(total)}</span>}</div>
        {loading ? (
          <p className="muted">Chargement…</p>
        ) : !list ? (
          <p className="lock-err">{err}</p>
        ) : list.length === 0 ? (
          <p className="muted small">Aucun paiement enregistré.</p>
        ) : (
          <div className="pay-list">
            {list.map((p) => (
              <div className="pay-item" key={p.id}>
                <span className="pay-amt">{fcfa(p.amount)}</span>
                <span className="pill pill-plan">{p.method}</span>
                <span className="muted small">{dateFr(String(p.paid_on).slice(0, 10))}</span>
                {p.note && <span className="muted small">{p.note}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

function DeleteShopModal({ shop, onCancel, onConfirm }) {
  const [txt, setTxt] = useState("");
  const ok = txt.trim() === (shop.name || "").trim();
  return (
    <Modal title="Supprimer définitivement cette boutique ?" onClose={onCancel}
      footer={<><button className="btn btn-ghost" onClick={onCancel}>Annuler</button><button className="btn btn-clay" disabled={!ok} onClick={onConfirm}>Supprimer définitivement</button></>}>
      <p className="muted small" style={{ marginTop: 0, lineHeight: 1.5 }}>
        Tu vas supprimer <strong>« {shop.name} »</strong> et <strong>toutes ses données</strong> (ventes, stock, clients, caisse, messages, abonnement, paiements). <strong>Cette action est irréversible.</strong>
      </p>
      <p className="muted small" style={{ margin: "10px 0 6px" }}>Pour confirmer, tape le nom exact de la boutique :</p>
      <input className="input" value={txt} onChange={(e) => setTxt(e.target.value)} placeholder={shop.name} autoFocus />
    </Modal>
  );
}
function ResellerSpace({ authUser, onSignOut, onExit, onPricesSaved, logo }) {
  const [shops, setShops] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [allowed, setAllowed] = useState(null); // null = en cours, true, false
  const [modal, setModal] = useState(null); // null | { mode:"create" } | { mode:"renew", shop }
  const [confirmShop, setConfirmShop] = useState(null);
  const [deleteShop, setDeleteShop] = useState(null); // boutique en cours de suppression
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      const { data: prof } = await supabase.from("profiles").select("is_reseller").eq("id", authUser.id).maybeSingle();
      if (!prof || !prof.is_reseller) { setAllowed(false); setLoading(false); return; }
      setAllowed(true);
      const { data, error } = await supabase.from("shops").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setShops(data || []);
      try {
        const { data: pdata } = await supabase.from("payments").select("amount, paid_on");
        setPayments(pdata || []);
      } catch (e2) { setPayments([]); }
    } catch (e) { setErr("Impossible de charger les boutiques. Vérifie ta connexion."); }
    finally { setLoading(false); }
  }, [authUser.id]);
  useEffect(() => { load(); }, [load]);

  const accountErr = (code) => {
    if (code === "champs_manquants") return "Compte non créé : e-mail ou mot de passe manquant.";
    if (code === "mot_de_passe_court") return "Mot de passe : au moins 6 caractères.";
    if (code === "non_autorise") return "Action réservée au revendeur.";
    if (code === "non_authentifie") return "Reconnecte-toi puis réessaie.";
    if (code === "creation_compte") return "Compte non créé : cet e-mail est peut-être déjà utilisé.";
    if (code === "lien_boutique") return "Compte créé mais non relié à la boutique. Réessaie.";
    return "Le compte n'a pas pu être créé.";
  };
  const createShop = async ({ name, phone, plan, expiry, email, password }) => {
    const { data, error } = await supabase.from("shops").insert({ name, phone, plan, expiry, status: "active" }).select().single();
    if (error) throw error;
    let account = null;
    if (email && password) {
      const { data: fnData, error: fnErr } = await supabase.functions.invoke("create-client-account", {
        body: { email, password, shop_id: data.id, name, role: "admin" },
      });
      const msg = fnErr ? "Boutique créée, mais le compte n'a pas pu être créé (connexion ?)."
        : (fnData && fnData.error) ? accountErr(fnData.error) : null;
      if (msg) { await load(); const e = new Error(msg); throw e; }
      account = { email, password };
    }
    await load();
    return { shop: data, account };
  };
  const renewShop = async (shop, { plan, expiry }) => {
    const { error } = await supabase.from("shops").update({ plan, expiry, status: "active" }).eq("id", shop.id);
    if (error) throw error;
    setModal(null); await load();
  };
  const createAccountForShop = async (shop, { email, password }) => {
    const { data: fnData, error: fnErr } = await supabase.functions.invoke("create-client-account", {
      body: { email, password, shop_id: shop.id, name: shop.name, role: "admin" },
    });
    const msg = fnErr ? "Compte non créé (connexion ?)."
      : (fnData && fnData.error) ? accountErr(fnData.error) : null;
    if (msg) throw new Error(msg);
    return { account: { email, password } };
  };
  const doToggleStatus = async (shop, next) => {
    const { error } = await supabase.from("shops").update({ status: next }).eq("id", shop.id);
    if (error) { setNotice("Action impossible. Vérifie ta connexion."); return; }
    await load();
  };
  const toggleStatus = (shop) => {
    const next = shop.status === "suspended" ? "active" : "suspended";
    setConfirmShop({ shop, next });
  };
  const doDeleteShop = async (shop) => {
    const { error } = await supabase.rpc("delete_shop", { p_shop: shop.id });
    if (error) { setNotice("Suppression impossible : " + (error.message || "vérifie ta connexion.")); return; }
    setDeleteShop(null);
    await load();
  };

  const statusOf = (s) => {
    if (s.status === "suspended") return { label: "Suspendue", tone: "red" };
    const exp = s.expiry ? String(s.expiry).slice(0, 10) : "";
    if (exp && exp < TODAY) return { label: "Expirée", tone: "red" };
    if (exp) {
      const days = Math.ceil((new Date(exp).getTime() - new Date(TODAY).getTime()) / 86400000);
      if (days <= 7) return { label: days <= 0 ? "Expire aujourd'hui" : `Expire dans ${days}j`, tone: "amber" };
    }
    return { label: "Active", tone: "green" };
  };
  const waLink = (phone, name) => {
    const p = String(phone || "").replace(/[^\d]/g, "");
    const msg = `Bonjour, au sujet de votre abonnement Atelier d'Or${name ? ` (boutique : ${name})` : ""}.`;
    return p ? `https://wa.me/${p}?text=${encodeURIComponent(msg)}` : null;
  };

  const totalEncaisse = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const monthKey = TODAY.slice(0, 7);
  const encaisseMois = payments.reduce((sum, p) => sum + (String(p.paid_on).slice(0, 7) === monthKey ? (p.amount || 0) : 0), 0);
  const activeCount = shops.filter((s) => s.status !== "suspended" && (!s.expiry || String(s.expiry).slice(0, 10) >= TODAY)).length;
  const daysLeft = (s) => { const exp = s.expiry ? String(s.expiry).slice(0, 10) : ""; return exp ? Math.ceil((new Date(exp).getTime() - new Date(TODAY).getTime()) / 86400000) : null; };
  const soonCount = shops.filter((s) => { if (s.status === "suspended") return false; const d = daysLeft(s); return d != null && d >= 0 && d <= 7; }).length;
  const problemCount = shops.filter((s) => s.status === "suspended" || (s.expiry && String(s.expiry).slice(0, 10) < TODAY)).length;
  const shopRank = (s) => {
    if (s.status === "suspended") return 0;
    const exp = s.expiry ? String(s.expiry).slice(0, 10) : "";
    if (exp && exp < TODAY) return 0;
    const d = daysLeft(s);
    if (d != null && d <= 7) return 1;
    return 2;
  };
  const sortedShops = [...shops].sort((a, b) => {
    const r = shopRank(a) - shopRank(b);
    if (r !== 0) return r;
    const ea = a.expiry ? String(a.expiry).slice(0, 10) : "9999-99-99";
    const eb = b.expiry ? String(b.expiry).slice(0, 10) : "9999-99-99";
    return ea.localeCompare(eb);
  });
  const waReminder = (s) => {
    const p = String(s.phone || "").replace(/[^\d]/g, "");
    if (!p) return null;
    const planName = FORMULAS[s.plan] ? FORMULAS[s.plan].name : s.plan;
    const price = priceLabelOf(s.plan);
    const exp = s.expiry ? dateFr(String(s.expiry).slice(0, 10)) : "";
    const st = statusOf(s);
    let msg;
    if (st.tone === "red") msg = `Bonjour, votre abonnement Atelier d'Or (${planName}) ${s.status === "suspended" ? "est suspendu" : `a expiré le ${exp}`}. Pour le réactiver : ${price}. Merci.`;
    else if (st.tone === "amber") msg = `Bonjour, votre abonnement Atelier d'Or (${planName}) expire le ${exp}. Pensez à le renouveler (${price}). Merci.`;
    else msg = `Bonjour, au sujet de votre abonnement Atelier d'Or (boutique : ${s.name}).`;
    return `https://wa.me/${p}?text=${encodeURIComponent(msg)}`;
  };

  if (allowed === false) {
    return (
      <div className="lock">
        <div className="lock-brand"><BrandMark logo={logo} lg /><div className="lock-title">Accès réservé</div><div className="lock-sub">Espace revendeur</div></div>
        <div className="act-box">
          <p className="lock-q">Ce compte n'est pas un compte revendeur.</p>
          <a className="btn btn-gold act-btn" href="#client">Aller à ma boutique</a>
          <button className="btn btn-line" style={{ marginTop: 8 }} onClick={onSignOut}>Déconnexion</button>
        </div>
      </div>
    );
  }

  return (
    <div className="reseller">
      <header className="reseller-top">
        <div className="reseller-brand"><BrandMark logo={logo} /><div><div className="brand-name">Espace revendeur</div><div className="brand-sub">{authUser.email}</div></div></div>
        <div className="reseller-actions">
          <button className="btn btn-gold" onClick={() => setModal({ mode: "create" })}><Plus size={16} /> Nouvelle boutique</button>
          <button className="btn btn-line" onClick={() => setModal({ mode: "pricing" })}>Prix / Formules</button>
          <button className="btn btn-line" onClick={onSignOut}><LogOut size={15} /> Déconnexion</button>
        </div>
      </header>

      {!loading && !err && (
        <div className="reseller-stats">
          <div className="stat"><div className="stat-val">{fcfa(totalEncaisse)}</div><div className="stat-lab">Total encaissé</div></div>
          <div className="stat"><div className="stat-val">{fcfa(encaisseMois)}</div><div className="stat-lab">Encaissé ce mois</div></div>
          <div className="stat"><div className="stat-val">{activeCount}</div><div className="stat-lab">Boutiques actives</div></div>
          <div className={`stat ${soonCount ? "stat-amber" : ""}`}><div className="stat-val">{soonCount}</div><div className="stat-lab">Expire ≤ 7 jours</div></div>
          <div className={`stat ${problemCount ? "stat-red" : ""}`}><div className="stat-val">{problemCount}</div><div className="stat-lab">Expirées / suspendues</div></div>
        </div>
      )}

      {loading ? (
        <p className="muted" style={{ padding: 24 }}>Chargement des boutiques…</p>
      ) : err ? (
        <div style={{ padding: 24 }}><p className="lock-err">{err}</p><button className="btn btn-line" onClick={load}>Réessayer</button></div>
      ) : shops.length === 0 ? (
        <div className="reseller-empty">
          <p className="muted">Aucune boutique pour l'instant.</p>
          <button className="btn btn-gold" onClick={() => setModal({ mode: "create" })}><Plus size={16} /> Créer la première boutique</button>
        </div>
      ) : (
        <div className="reseller-list">
          {sortedShops.map((s) => {
            const st = statusOf(s);
            const wa = waReminder(s);
            const needsAction = st.tone === "red" || st.tone === "amber";
            return (
              <div className={`shop-card ${needsAction ? "shop-flag" : ""}`} key={s.id}>
                <div className="shop-main">
                  <div className="shop-name">{s.name}</div>
                  {Array.isArray(s.name_history) && s.name_history.length > 0 && (
                    <div className="shop-history">Anciens noms : {s.name_history.slice(-3).map((h) => h && h.name).filter(Boolean).join(" · ")}</div>
                  )}
                  <div className="shop-meta">
                    <span className={`pill pill-${st.tone}`}>{st.label}</span>
                    {s.plan && FORMULAS[s.plan] && <span className="pill pill-plan">{FORMULAS[s.plan].name}</span>}
                    {s.plan && FORMULAS[s.plan] && <span className="muted small">{priceLabelOf(s.plan)}</span>}
                    {s.expiry && <span className="muted small">Fin : {dateFr(String(s.expiry).slice(0, 10))}</span>}
                    {s.phone && <span className="muted small">{s.phone}</span>}
                  </div>
                </div>
                <div className="shop-actions">
                  {wa && <a className={`btn ${needsAction ? "btn-gold" : "btn-line"}`} href={wa} target="_blank" rel="noreferrer">{needsAction ? "Relancer" : "WhatsApp"}</a>}
                  <button className="btn btn-line" onClick={() => setModal({ mode: "account", shop: s })}>Compte</button>
                  <button className="btn btn-line" onClick={() => setModal({ mode: "payments", shop: s })}>Paiements</button>
                  <button className="btn btn-line" onClick={() => setModal({ mode: "renew", shop: s })}><RefreshCw size={15} /> Renouveler</button>
                  <button className={`btn ${s.status === "suspended" ? "btn-gold" : "btn-line"}`} onClick={() => toggleStatus(s)}>{s.status === "suspended" ? "Réactiver" : "Suspendre"}</button>
                  <button className="btn btn-line danger" onClick={() => setDeleteShop(s)}><Trash2 size={15} /> Supprimer</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button className="editor-link" onClick={onExit}>Retour à l'application</button>

      {modal && modal.mode === "create" && <ShopFormModal mode="create" onClose={() => setModal(null)} onSubmit={createShop} />}
      {modal && modal.mode === "account" && <AccountModal shop={modal.shop} onClose={() => setModal(null)} onSubmit={(vals) => createAccountForShop(modal.shop, vals)} />}
      {modal && modal.mode === "renew" && <ShopFormModal mode="renew" shop={modal.shop} onClose={() => setModal(null)} onSubmit={(vals) => renewShop(modal.shop, vals)} />}
      {modal && modal.mode === "pricing" && <PricingModal onClose={() => setModal(null)} onSaved={onPricesSaved} />}
      {modal && modal.mode === "payments" && <PaymentsModal shop={modal.shop} onClose={() => { setModal(null); load(); }} />}
      {confirmShop && <ConfirmModal title={confirmShop.next === "suspended" ? "Suspendre cette boutique ?" : "Réactiver cette boutique ?"} message={confirmShop.next === "suspended" ? `« ${confirmShop.shop.name} » : l'accès sera bloqué jusqu'à réactivation.` : `« ${confirmShop.shop.name} » : l'accès sera rétabli.`} okLabel={confirmShop.next === "suspended" ? "Suspendre" : "Réactiver"} danger={confirmShop.next === "suspended"} onCancel={() => setConfirmShop(null)} onOk={() => { const c = confirmShop; setConfirmShop(null); doToggleStatus(c.shop, c.next); }} />}
      {deleteShop && <DeleteShopModal shop={deleteShop} onCancel={() => setDeleteShop(null)} onConfirm={() => doDeleteShop(deleteShop)} />}
      {notice && <NoticeModal message={notice} onClose={() => setNotice(null)} />}
    </div>
  );
}

function BackupModal({ mode, json, onClose, onImport }) {
  const [text, setText] = useState(mode === "export" ? json : "");
  const [copied, setCopied] = useState(false);
  const fileRef = useRef(null);
  const copy = async () => { try { await navigator.clipboard.writeText(json); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch (e) { /* */ } };
  const download = () => {
    try {
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `atelierdor-sauvegarde-${TODAY}.json`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (e) { setNotice("Le téléchargement est bloqué ici — utilise plutôt « Copier »."); }
  };
  const pickFile = (e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => setText(String(r.result)); r.readAsText(f); };
  const [confirming, setConfirming] = useState(null);
  const [notice, setNotice] = useState(null);
  const doImport = () => {
    let d; try { d = JSON.parse(text); } catch (e) { setNotice("Texte illisible : ce n'est pas un JSON valide."); return; }
    if (!d || (!d.sales && !d.gold)) { setNotice("Ce fichier n'est pas une sauvegarde Atelier d'Or."); return; }
    setConfirming(d);
  };
  return (
    <>
    <Modal title={mode === "export" ? "Exporter la sauvegarde" : "Importer une sauvegarde"} onClose={onClose}
      footer={mode === "export"
        ? <div className="foot-actions" style={{ marginLeft: 0, width: "100%", flexWrap: "wrap" }}><button className="btn btn-ghost" onClick={onClose}>Fermer</button><button className="btn btn-line" onClick={copy}>{copied ? "Copié ✓" : "Copier"}</button><button className="btn btn-gold" onClick={download}>Télécharger le fichier</button></div>
        : <div className="foot-actions" style={{ marginLeft: 0, width: "100%", flexWrap: "wrap" }}><button className="btn btn-ghost" onClick={onClose}>Annuler</button><button className="btn btn-line" onClick={() => fileRef.current?.click()}>Choisir un fichier</button><button className="btn btn-clay" onClick={doImport}>Importer</button></div>}>
      {mode === "export"
        ? <p className="muted small" style={{ marginTop: 0 }}>Garde ce fichier (ou ce texte) en lieu sûr. Tu pourras le réimporter sur un autre appareil pour y retrouver toute ta boutique.</p>
        : <p className="muted small" style={{ marginTop: 0 }}>Choisis ton fichier de sauvegarde, ou colle son contenu ci-dessous, puis appuie sur Importer.</p>}
      <textarea className="backup-area num" value={text} onChange={(e) => setText(e.target.value)} readOnly={mode === "export"} placeholder={mode === "import" ? "Colle ici le contenu de ta sauvegarde…" : ""} />
      <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: "none" }} onChange={pickFile} />
    </Modal>
    {confirming && <ConfirmModal title="Importer cette sauvegarde ?" message="Elle remplacera toutes les données actuelles de cette boutique." okLabel="Importer" danger onCancel={() => setConfirming(null)} onOk={() => { const d = confirming; setConfirming(null); onImport(d); }} />}
    {notice && <NoticeModal message={notice} onClose={() => setNotice(null)} />}
    </>
  );
}

function ActivationScreen({ onActivate, onAdmin, onTrial, onChoose, onContact, trialUsed, logo }) {
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const submit = () => {
    const r = onActivate(code.trim());
    if (!r.valid) setErr(r.reason === "expiré" ? "Ce code a expiré." : "Code invalide — vérifie la saisie.");
  };
  return (
    <div className="lock activate-scroll">
      <div className="lock-brand"><BrandMark logo={logo} lg /><div className="lock-title">Atelier d'Or</div><div className="lock-sub">{trialUsed ? "Essai terminé" : "Bienvenue"}</div></div>

      {trialUsed ? (
        <>
          <div className="trial-over">
            <strong>Ton essai gratuit de 7 jours est terminé.</strong>
            <span>L'application est bloquée. Contacte ton revendeur pour obtenir un code d'activation, puis saisis-le ci-dessous.</span>
          </div>
          <div className="act-box">
            <p className="lock-q">J'ai reçu un code de mon revendeur</p>
            <input className="act-input num" value={code} onChange={(e) => { setCode(e.target.value); setErr(""); }} placeholder="AOR-X-XXXX-XXXX" onKeyDown={(e) => e.key === "Enter" && submit()} />
            {err && <p className="lock-err">{err}</p>}
            <button className="btn btn-gold act-btn" onClick={submit}>Activer</button>
            <div className="act-or">— ou —</div>
            <button className="btn btn-line act-btn" onClick={onContact}>Contacter le revendeur</button>
          </div>
        </>
      ) : (
        <div className="act-box">
          <p className="lock-intro">Pour utiliser l'application, saisis le code fourni par ton revendeur (code d'essai ou d'abonnement).</p>
          <input className="act-input num" value={code} onChange={(e) => { setCode(e.target.value); setErr(""); }} placeholder="AOR-X-XXXX-XXXX" onKeyDown={(e) => e.key === "Enter" && submit()} />
          {err && <p className="lock-err">{err}</p>}
          <button className="btn btn-gold act-btn" onClick={submit}>Activer</button>
          <div className="act-or">— ou —</div>
          <button className="btn btn-line act-btn" onClick={onContact}>Contacter le revendeur</button>
        </div>
      )}

      <button className="editor-link" onClick={onAdmin}>Espace éditeur</button>
    </div>
  );
}

function AdminSpace({ onExit, shop, setShop, users, setUsers, resellerPhone, setResellerPhone }) {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [autherr, setAutherr] = useState(false);
  const [plan, setPlan] = useState("S");
  const [client, setClient] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [code, setCode] = useState(null);
  const [log, setLog] = useState([]);
  const [copied, setCopied] = useState(false);
  const [check, setCheck] = useState("");
  const [checkRes, setCheckRes] = useState(null);
  const patron = (users || []).find((u) => u.role === "patron") || null;
  const [pName, setPName] = useState(patron ? patron.name : "Patron");
  const [pEmail, setPEmail] = useState(patron ? (patron.email || "") : "");
  const [pPass, setPPass] = useState("");
  const [shopName, setShopName] = useState(shop?.name || "");
  const [shopPhone, setShopPhone] = useState(shop?.phone || "");
  const [shopAddr, setShopAddr] = useState(shop?.addr || "");
  const [shopLogo, setShopLogo] = useState(shop?.logo || "");
  const [savedMsg, setSavedMsg] = useState("");
  const [confirmDel, setConfirmDel] = useState(null);

  useEffect(() => { (async () => { try { const v = await STORE.get("atelierdor:admincodes"); if (v) setLog(JSON.parse(v)); } catch (e) { /* */ } try { const a = await STORE.get("atelierdor:adminok"); if (a === "1") setAuthed(true); } catch (e) { /* */ } })(); }, []);
  const saveLog = (l) => { setLog(l); STORE.set("atelierdor:admincodes", JSON.stringify(l)); };
  const delCode = (i) => setConfirmDel(i);
  const tryAuth = () => { if (pw === MASTER_PW) { setAuthed(true); try { STORE.set("atelierdor:adminok", "1"); } catch (e) { /* */ } } else setAutherr(true); };
  const lockAdmin = () => { try { STORE.del("atelierdor:adminok"); } catch (e) { /* */ } setAuthed(false); setPw(""); };
  const generate = () => {
    const c = genActivation(plan);
    const v = verifyActivation(c);
    const f = FORMULAS[plan];
    const entry = { code: c, plan: f.name, client: client.trim(), expiry: v.lifetime ? "À vie" : dateFull(v.expiry) };
    setCode(entry); saveLog([entry, ...log]);
  };
  const copy = async () => { try { await navigator.clipboard.writeText(code.code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch (e) { /* */ } };
  const runCheck = () => setCheckRes(verifyActivation(check.trim()));
  const flash = (m) => { setSavedMsg(m); setTimeout(() => setSavedMsg(""), 2000); };
  const saveReseller = () => { flash("Contact revendeur enregistré."); };
  const saveShop = () => { setShop({ name: shopName || "Atelier d'Or", phone: shopPhone, addr: shopAddr, logo: shopLogo }); flash("Boutique enregistrée sur cet appareil."); };
  const savePatron = () => {
    const list = (users || []).slice();
    const idx = list.findIndex((u) => u.role === "patron");
    const cur = idx >= 0 ? list[idx] : null;
    let salt = cur ? cur.salt : null, pwHash = cur ? cur.pwHash : null;
    if (pPass) {
      if (pPass.length < 4) { flash("Le mot de passe doit faire 4 caractères minimum."); return; }
      salt = genSalt(); pwHash = hashPwd(pPass, salt);
    } else if (!cur) { flash("Définis un mot de passe pour le patron."); return; }
    const rec = { id: cur ? cur.id : uid(), name: pName || "Patron", email: pEmail.trim(), role: "patron", salt, pwHash };
    if (idx >= 0) list[idx] = rec; else list.unshift(rec);
    setUsers(list); flash("Compte patron enregistré.");
  };

  if (!authed) {
    return (
      <div className="lock">
        <div className="lock-brand"><div className="brand-mark lg">⚙</div><div className="lock-title">Espace éditeur</div><div className="lock-sub">Accès réservé</div></div>
        <div className="act-box">
          <p className="lock-q">Mot de passe maître</p>
          <input className="act-input" type="password" value={pw} onChange={(e) => { setPw(e.target.value); setAutherr(false); }} placeholder="••••••••" onKeyDown={(e) => e.key === "Enter" && tryAuth()} />
          {autherr && <p className="lock-err">Mot de passe incorrect.</p>}
          <button className="btn btn-gold act-btn" onClick={tryAuth}>Entrer</button>
        </div>
        <button className="editor-link" onClick={onExit}>← Retour à l'app</button>
      </div>
    );
  }
  return (
    <div className="admin">
      <div className="admin-bar">
        <div><strong>Espace éditeur</strong> <span className="muted">· licences & configuration</span></div>
        <div className="head-btns">
          <button className="btn btn-line" onClick={lockAdmin}>Verrouiller</button>
          <button className="btn btn-line" onClick={onExit}>← Retour à l'app</button>
        </div>
      </div>
      {savedMsg && <div className="admin-flash">{savedMsg}</div>}
      <div className="admin-grid">
        <div className="card">
          <div className="card-head"><h3>Générer / renouveler un code</h3></div>
          <p className="muted small" style={{ margin: "0 0 10px" }}>Pour un nouveau client comme pour un <strong>renouvellement à l'échéance</strong> : choisis la formule, génère le code et envoie-le. En le saisissant dans l'app, le client (ré)active son abonnement jusqu'à la nouvelle date d'expiration.</p>
          <div className="field-label" style={{ marginBottom: 7 }}>Formule</div>
          <div className="plan-row">
            {Object.entries(FORMULAS).map(([k, f]) => <button key={k} className={`plan ${plan === k ? "on" : ""}`} onClick={() => setPlan(k)}>{f.name}</button>)}
          </div>
          <p className="muted small" style={{ margin: "0 0 10px" }}>{priceLabelOf(plan)} · {FORMULAS[plan].admins >= 99 ? "admins illimités" : `${FORMULAS[plan].admins} admin${FORMULAS[plan].admins > 1 ? "s" : ""}`} · {FORMULAS[plan].users >= 99 ? "utilisateurs illimités" : `${FORMULAS[plan].users} utilisateurs`}</p>
          <div className="grid2">
            <Field label="Client / boutique (optionnel)"><input className="input" value={client} onChange={(e) => setClient(e.target.value)} placeholder="ex : Bijouterie Sandaga" /></Field>
            <Field label="WhatsApp du client (optionnel)"><input className="input num" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="221770000000" /></Field>
          </div>
          <button className="btn btn-gold" onClick={generate}><Plus size={15} /> Générer le code</button>
          {code && (
            <div className="code-out">
              <div className="code-val num">{code.code}</div>
              <div className="code-meta">{code.plan} · expire : {code.expiry}{code.client ? ` · ${code.client}` : ""}</div>
              <div className="head-btns">
                <button className="btn btn-line" onClick={copy}>{copied ? "Copié ✓" : "Copier le code"}</button>
                {clientPhone.replace(/[^\d]/g, "") && <a className="btn btn-gold" href={`https://wa.me/${clientPhone.replace(/[^\d]/g, "")}?text=${encodeURIComponent(`Bonjour, voici votre code d'activation Atelier d'Or (${code.plan}) : ${code.code} — valable jusqu'au ${code.expiry}. Saisissez-le dans l'application (écran d'accueil → « j'ai déjà un code ») pour activer ou renouveler votre abonnement.`)}`} target="_blank" rel="noreferrer">Envoyer au client</a>}
              </div>
            </div>
          )}
        </div>
        <div className="card">
          <div className="card-head"><h3>Vérifier un code</h3></div>
          <Field label="Code à vérifier"><input className="input num" value={check} onChange={(e) => { setCheck(e.target.value); setCheckRes(null); }} placeholder="AOR-…" /></Field>
          <button className="btn btn-line" onClick={runCheck}>Vérifier</button>
          {checkRes && <div className={`check-res ${checkRes.valid ? "ok" : "bad"}`}>{checkRes.valid ? (checkRes.lifetime ? `Valide · ${FORMULAS[checkRes.plan]?.name} · à vie` : `Valide · ${FORMULAS[checkRes.plan]?.name} · expire le ${dateFull(checkRes.expiry)}`) : (checkRes.reason === "expiré" ? `Expiré le ${dateFull(checkRes.expiry)}` : "Code invalide")}</div>}
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h3>Contact revendeur</h3></div>
        <p className="muted small" style={{ margin: "0 0 12px" }}>Ton numéro WhatsApp : c'est lui qui est prévenu quand un client choisit une formule en fin d'essai.</p>
        <Field label="WhatsApp (format international)"><input className="input num" value={resellerPhone || ""} onChange={(e) => setResellerPhone(e.target.value)} placeholder="221770000000" /></Field>
        <button className="btn btn-line" onClick={saveReseller}>Enregistrer le contact</button>
      </div>

      <div className="card">
        <div className="card-head"><h3>Configurer la boutique du client</h3></div>
        <Field label="Logo de la boutique"><LogoField logo={shopLogo} onChange={setShopLogo} /></Field>
        <p className="muted small" style={{ margin: "0 0 12px" }}>Pratique quand le client ne sait pas le faire : prépare sa boutique et son compte patron, puis remets-lui l'appareil prêt à l'emploi.</p>
        <div className="grid2">
          <Field label="Nom de la boutique"><input className="input" value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="Bijouterie Sandaga" /></Field>
          <Field label="Téléphone boutique"><input className="input num" value={shopPhone} onChange={(e) => setShopPhone(e.target.value)} placeholder="77 000 00 00" /></Field>
        </div>
        <Field label="Adresse"><input className="input" value={shopAddr} onChange={(e) => setShopAddr(e.target.value)} placeholder="Marché Sandaga, Dakar" /></Field>
        <button className="btn btn-line" onClick={saveShop}>Enregistrer la boutique</button>
        <div className="cfg-sep" />
        <div className="field-label" style={{ marginBottom: 7 }}>Compte patron (pour se connecter)</div>
        <div className="grid2">
          <Field label="Nom du patron"><input className="input" value={pName} onChange={(e) => setPName(e.target.value)} placeholder="ex : Modou" /></Field>
          <Field label="Identifiant / e-mail"><input className="input" value={pEmail} onChange={(e) => setPEmail(e.target.value)} placeholder="ex : modou@boutique.sn" /></Field>
        </div>
        <Field label="Mot de passe du patron"><input className="input" type="password" value={pPass} onChange={(e) => setPPass(e.target.value)} placeholder="min. 4 (vide = inchangé)" /></Field>
        <button className="btn btn-line" onClick={savePatron}>Enregistrer le compte patron</button>
      </div>

      <div className="card">
        <div className="card-head"><h3>Codes générés <span className="count">{log.length}</span></h3></div>
        {log.length === 0 ? <p className="muted small">Aucun code généré pour l'instant.</p> : (
          <table className="table">
            <thead><tr><th>Code</th><th>Formule</th><th>Client</th><th>Expire</th><th></th></tr></thead>
            <tbody>{log.map((e, i) => <tr key={i}><td className="num">{e.code}</td><td>{e.plan}</td><td className="muted">{e.client || "—"}</td><td className="muted">{e.expiry}</td><td className="r"><button className="icon-btn" title="Supprimer ce code" onClick={() => delCode(i)}><Trash2 size={15} /></button></td></tr>)}</tbody>
          </table>
        )}
      </div>
      <p className="disclaim">Protection locale : codes signés et vérifiés hors-ligne. La configuration s'applique à <strong>cet appareil</strong> (idéal pour préparer le téléphone du client avant de lui remettre). Une vraie configuration à distance, l'anti-partage et la révocation nécessitent une vérification en ligne. Change <strong>LIC_SECRET</strong> et <strong>MASTER_PW</strong> avant de revendre.</p>
      {confirmDel != null && <ConfirmModal title="Supprimer ce code ?" message="Le code sera retiré de l'historique de cet appareil." okLabel="Supprimer" danger onCancel={() => setConfirmDel(null)} onOk={() => { saveLog(log.filter((_, j) => j !== confirmDel)); setConfirmDel(null); }} />}
    </div>
  );
}

/* ------------------------------- reçus ---------------------------------- */
function buildReceipt(tx) {
  const isSale = tx.kind !== "purchase";
  const lines = [];
  if (!isSale) {
    lines.push({ desc: `Or${tx.karat ? ` ${tx.karat}K` : " brut"} — rachat`, detail: `${g(tx.weight)} × ${fcfa(tx.ppg)}/g`, amount: tx.total });
  } else if ((tx.kind === "or" || tx.kind === "bijoux") && tx.weight) {
    lines.push({
      desc: `${tx.itemType || "Or"}${tx.karat ? ` ${tx.karat}K` : ""}`,
      detail: `${g(tx.weight)} × ${fcfa(tx.ppg)}/g${tx.facon ? ` + façon ${fcfa(tx.facon)}` : ""}`,
      amount: tx.total,
    });
  } else if (tx.kind === "divers" && tx.dName) {
    lines.push({ desc: tx.dName, detail: `${tx.dQty} × ${fcfa(tx.dPrice)}`, amount: tx.total });
  } else {
    lines.push({ desc: tx.label || "Article", detail: "", amount: tx.total });
  }
  return {
    kind: isSale ? "sale" : "purchase",
    no: tx.no || (isSale ? "V" : "A") + String(tx.id || "").toUpperCase().slice(0, 5),
    date: dateFr(tx.date), time: tx.time || "",
    client: tx.client, pay: isSale ? tx.pay : null, note: tx.note || "",
    paid: tx.paid != null ? tx.paid : null,
    balance: tx.paid != null ? Math.max(0, tx.total - tx.paid) : 0,
    lines, total: tx.total,
  };
}

function buildReceiptText(d, shop) {
  const L = [];
  L.push(shop.name);
  if (shop.addr) L.push(shop.addr);
  if (shop.phone) L.push("Tel : " + shop.phone);
  L.push("--------------------------------");
  L.push((d.kind === "sale" ? "RECU DE VENTE" : "BORDEREAU D'ACHAT") + "   N° " + d.no);
  L.push(d.date + (d.time ? " " + d.time : "") + "   " + (d.client || "Client comptant"));
  L.push("--------------------------------");
  d.lines.forEach((l) => {
    L.push(l.desc + " ......... " + fcfa(l.amount));
    if (l.detail) L.push("   " + l.detail);
  });
  L.push("--------------------------------");
  L.push("TOTAL : " + fcfa(d.total));
  if (d.balance > 0) {
    L.push("Paye : " + fcfa(d.paid));
    L.push("RESTE DU : " + fcfa(d.balance));
  }
  if (d.pay) L.push("Paiement : " + d.pay);
  if (d.note) L.push("Note : " + d.note);
  L.push("--------------------------------");
  L.push("Merci de votre confiance — " + shop.name);
  return L.join("\n");
}

// --- QR code (carte de contact vCard) : librairie charg\u00e9e \u00e0 la demande, rendu local (hors-ligne friendly) ---
let _qrLib = null, _qrLoading = null;
function loadQrLib() {
  if (_qrLib) return Promise.resolve(_qrLib);
  if (typeof window !== "undefined" && window.qrcode) { _qrLib = window.qrcode; return Promise.resolve(_qrLib); }
  if (_qrLoading) return _qrLoading;
  _qrLoading = new Promise((resolve) => {
    try {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js";
      s.async = true;
      s.onload = () => { _qrLib = (typeof window !== "undefined" && window.qrcode) || null; resolve(_qrLib); };
      s.onerror = () => resolve(null);
      document.head.appendChild(s);
    } catch (e) { resolve(null); }
  });
  return _qrLoading;
}
function vcardFor(shop) {
  const name = (shop && shop.name) || "Atelier d'Or";
  const tel = (shop && shop.phone) || "";
  const adr = (shop && shop.addr) || "";
  return "BEGIN:VCARD\nVERSION:3.0\nFN:" + name + "\nORG:" + name +
    (tel ? "\nTEL;TYPE=CELL:" + tel : "") + (adr ? "\nADR:;;" + adr + ";;;;" : "") + "\nEND:VCARD";
}
function qrSummaryFor(data, shop) {
  const L = [];
  L.push((shop && shop.name) || "Atelier d'Or");
  if (shop && shop.addr) L.push(shop.addr);
  if (shop && shop.phone) L.push("Tel: " + shop.phone);
  L.push("");
  L.push((data.kind === "sale" ? "Recu de vente" : "Bordereau d'achat") + " N " + data.no);
  L.push(data.date + (data.time ? " " + data.time : ""));
  if (data.client) L.push("Client: " + data.client);
  L.push("Total: " + fcfa(data.total));
  if (data.balance > 0) {
    L.push("Paye: " + fcfa(data.paid));
    L.push("Reste du: " + fcfa(data.balance));
    L.push("Statut: PARTIEL");
  } else {
    L.push("Paye: " + fcfa(data.total));
    L.push("Statut: PAYE INTEGRALEMENT");
  }
  return L.join("\n");
}
async function qrMatrix(text) {
  const lib = await loadQrLib();
  if (!lib) return null;
  try {
    const qr = lib(0, "M");
    qr.addData(text); qr.make();
    const n = qr.getModuleCount();
    const cells = [];
    for (let r = 0; r < n; r++) { const row = []; for (let c = 0; c < n; c++) row.push(qr.isDark(r, c)); cells.push(row); }
    return { n, cells };
  } catch (e) { return null; }
}
function QrContact({ data, shop, size = 96 }) {
  const [m, setM] = useState(null);
  useEffect(() => {
    let alive = true;
    qrMatrix(qrSummaryFor(data, shop)).then((r) => { if (alive) setM(r); });
    return () => { alive = false; };
  }, [data ? data.no : "", data ? data.total : 0, data ? data.balance : 0, shop ? shop.name : "", shop ? shop.phone : ""]);
  if (!m) return null;
  const cell = size / m.n;
  const rects = [];
  for (let r = 0; r < m.n; r++) for (let c = 0; c < m.n; c++) if (m.cells[r][c]) rects.push(<rect key={r + "-" + c} x={(c * cell).toFixed(2)} y={(r * cell).toFixed(2)} width={(cell + 0.4).toFixed(2)} height={(cell + 0.4).toFixed(2)} fill="#1c1611" />);
  return (
    <div className="rc-qr">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}><rect width={size} height={size} fill="#fff" />{rects}</svg>
      <div className="rc-qr-cap">Scannez pour voir le détail du reçu</div>
    </div>
  );
}

function ReceiptCard({ data, shop }) {
  const docLogo = shop.docLogo || shop.logo;
  return (
    <div className="receipt">
      <div className="rc-head">
        {docLogo && <img className="rc-logo" src={docLogo} alt="" />}
        <div className="rc-shop">{shop.name}</div>
        {shop.addr && <div className="rc-sub">{shop.addr}</div>}
        {shop.phone && <div className="rc-sub">Tél : {shop.phone}</div>}
      </div>
      <div className="rc-sep" />
      <div className="rc-meta"><strong>{data.kind === "sale" ? "REÇU DE VENTE" : "BORDEREAU D'ACHAT"}</strong><span>N° {data.no}</span></div>
      <div className="rc-meta"><span>{data.date}{data.time ? ` · ${data.time}` : ""}</span><span>{data.client || "Client comptant"}</span></div>
      <div className="rc-sep" />
      <div className="rc-lines">
        {data.lines.map((l, i) => (
          <div className="rc-item" key={i}>
            <div className="rc-item-row"><span>{l.desc}</span><span className="num">{fcfa(l.amount)}</span></div>
            {l.detail && <div className="rc-item-detail">{l.detail}</div>}
          </div>
        ))}
      </div>
      <div className="rc-sep" />
      <div className="rc-total"><span>TOTAL</span><strong className="num">{fcfa(data.total)}</strong></div>
      {data.balance > 0 && <div className="rc-meta sm"><span>Payé</span><span className="num">{fcfa(data.paid)}</span></div>}
      {data.balance > 0 && <div className="rc-meta sm" style={{ fontWeight: 700, color: "#9c4a35" }}><span>Reste dû</span><span className="num">{fcfa(data.balance)}</span></div>}
      {data.pay && <div className="rc-meta sm"><span>Paiement</span><span>{data.pay}</span></div>}
      {data.note && <div className="rc-note">{data.note}</div>}
      <div className="rc-sep dashed" />
      <div className="rc-foot">Merci de votre confiance</div>
      <div className="rc-foot tiny">Prix selon le cours du jour · titre d'or garanti</div>
      <QrContact data={data} shop={shop} size={112} />
    </div>
  );
}

function rcSep(color, W, P, dashed) {
  return (ctx, y) => {
    ctx.strokeStyle = color; ctx.lineWidth = 1;
    if (dashed && ctx.setLineDash) ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(P, y + 10); ctx.lineTo(W - P, y + 10); ctx.stroke();
    if (ctx.setLineDash) ctx.setLineDash([]);
  };
}
function receiptImageBlob(data, shop) {
  return new Promise(async (resolve) => {
    const W = 680, P = 44, scale = 2;
    const INK = "#1c1611", MUT = "#8a7d68", CLAY = "#9c4a35", LINE = "#e6ddcc", GOLD = "#b8862f";
    const rows = [];
    const push = (h, draw) => rows.push({ h, draw });
    push(42, (ctx, y) => { ctx.fillStyle = INK; ctx.font = "700 30px Georgia, serif"; ctx.textAlign = "center"; ctx.fillText(shop.name || "Atelier d'Or", W / 2, y + 30); });
    if (shop.addr) push(24, (ctx, y) => { ctx.fillStyle = MUT; ctx.font = "16px Arial"; ctx.textAlign = "center"; ctx.fillText(shop.addr, W / 2, y + 18); });
    if (shop.phone) push(24, (ctx, y) => { ctx.fillStyle = MUT; ctx.font = "16px Arial"; ctx.textAlign = "center"; ctx.fillText("Tél : " + shop.phone, W / 2, y + 18); });
    push(26, (ctx, y) => { ctx.strokeStyle = GOLD; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(W / 2 - 42, y + 12); ctx.lineTo(W / 2 + 42, y + 12); ctx.stroke(); ctx.lineWidth = 1; });
    push(34, (ctx, y) => { ctx.fillStyle = INK; ctx.font = "700 19px Arial"; ctx.textAlign = "left"; ctx.fillText(data.kind === "sale" ? "REÇU DE VENTE" : "BORDEREAU D'ACHAT", P, y + 22); ctx.fillStyle = MUT; ctx.font = "15px Arial"; ctx.textAlign = "right"; ctx.fillText("N° " + data.no, W - P, y + 22); });
    push(28, (ctx, y) => { ctx.fillStyle = MUT; ctx.font = "15px Arial"; ctx.textAlign = "left"; ctx.fillText(data.date + (data.time ? " · " + data.time : ""), P, y + 20); ctx.textAlign = "right"; ctx.fillText(data.client || "Client comptant", W - P, y + 20); });
    push(24, rcSep(LINE, W, P));
    data.lines.forEach((l) => {
      push(28, (ctx, y) => { ctx.fillStyle = INK; ctx.font = "17px Arial"; ctx.textAlign = "left"; ctx.fillText(l.desc, P, y + 20); ctx.font = "700 17px Arial"; ctx.textAlign = "right"; ctx.fillText(fcfa(l.amount), W - P, y + 20); });
      if (l.detail) push(22, (ctx, y) => { ctx.fillStyle = MUT; ctx.font = "14px Arial"; ctx.textAlign = "left"; ctx.fillText(l.detail, P, y + 16); });
    });
    push(24, rcSep(LINE, W, P));
    push(48, (ctx, y) => {
      const bx = P - 14, bw = W - 2 * P + 28, by = y + 2, bh = 38;
      ctx.fillStyle = "#f7eed6";
      if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 9); ctx.fill(); } else ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = INK; ctx.font = "700 22px Arial"; ctx.textAlign = "left"; ctx.fillText("TOTAL", P, y + 28);
      ctx.fillStyle = "#7a5a18"; ctx.textAlign = "right"; ctx.fillText(fcfa(data.total), W - P, y + 28);
    });
    if (data.balance > 0) {
      push(26, (ctx, y) => { ctx.fillStyle = MUT; ctx.font = "16px Arial"; ctx.textAlign = "left"; ctx.fillText("Payé", P, y + 18); ctx.textAlign = "right"; ctx.fillText(fcfa(data.paid), W - P, y + 18); });
      push(30, (ctx, y) => { ctx.fillStyle = CLAY; ctx.font = "700 18px Arial"; ctx.textAlign = "left"; ctx.fillText("Reste dû", P, y + 20); ctx.textAlign = "right"; ctx.fillText(fcfa(data.balance), W - P, y + 20); });
    }
    if (data.pay) push(26, (ctx, y) => { ctx.fillStyle = MUT; ctx.font = "16px Arial"; ctx.textAlign = "left"; ctx.fillText("Paiement", P, y + 18); ctx.textAlign = "right"; ctx.fillText(data.pay, W - P, y + 18); });
    if (data.note) push(26, (ctx, y) => { ctx.fillStyle = MUT; ctx.font = "italic 15px Arial"; ctx.textAlign = "left"; ctx.fillText("Note : " + data.note, P, y + 18); });
    push(28, rcSep(LINE, W, P, true));
    push(28, (ctx, y) => { ctx.fillStyle = GOLD; ctx.font = "700 16px Arial"; ctx.textAlign = "center"; ctx.fillText("Merci de votre confiance", W / 2, y + 18); });
    push(22, (ctx, y) => { ctx.fillStyle = MUT; ctx.font = "13px Arial"; ctx.textAlign = "center"; ctx.fillText((shop.name || "Atelier d'Or") + (shop.phone ? " · " + shop.phone : ""), W / 2, y + 15); });

    const qr = await qrMatrix(qrSummaryFor(data, shop));
    if (qr) {
      const QS = 168;
      push(20, (ctx, y) => { ctx.fillStyle = MUT; ctx.font = "13px Arial"; ctx.textAlign = "center"; ctx.fillText("Scannez pour voir le détail du reçu", W / 2, y + 14); });
      push(QS + 16, (ctx, y) => {
        const cell = QS / qr.n, ox = (W - QS) / 2, oy = y + 6;
        ctx.fillStyle = "#ffffff"; ctx.fillRect(ox - 8, oy - 8, QS + 16, QS + 16);
        ctx.fillStyle = "#1c1611";
        for (let r = 0; r < qr.n; r++) for (let c = 0; c < qr.n; c++) if (qr.cells[r][c]) ctx.fillRect(ox + c * cell, oy + r * cell, cell + 0.5, cell + 0.5);
      });
    }

    const render = (logoImg, lw, lh) => {
      const logoH = lh ? lh + 14 : 0;
      const totalH = rows.reduce((a, r) => a + r.h, 0) + P * 2 + logoH;
      const canvas = document.createElement("canvas");
      canvas.width = W * scale; canvas.height = totalH * scale;
      const ctx = canvas.getContext("2d");
      ctx.scale(scale, scale);
      ctx.fillStyle = "#fffdf8"; ctx.fillRect(0, 0, W, totalH);
      ctx.strokeStyle = LINE; ctx.lineWidth = 1; ctx.strokeRect(10.5, 10.5, W - 21, totalH - 21);
      ctx.fillStyle = GOLD; ctx.fillRect(0, 0, W, 6);
      let y = P;
      if (logoImg && lh) { try { ctx.drawImage(logoImg, (W - lw) / 2, y, lw, lh); } catch (e) { /* logo non dessinable */ } y += logoH; }
      rows.forEach((r) => { r.draw(ctx, y); y += r.h; });
      try { canvas.toBlob((b) => resolve(b), "image/png"); } catch (e) { resolve(null); }
    };
    if (shop.docLogo || shop.logo) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const ratio = (img.width && img.height) ? img.width / img.height : 1;
        let lh = Math.min(70, img.height || 70), lw = lh * ratio;
        if (lw > 240) { lw = 240; lh = lw / ratio; }
        render(img, lw, lh);
      };
      img.onerror = () => render(null, 0, 0);
      img.src = shop.docLogo || shop.logo;
    } else {
      render(null, 0, 0);
    }
  });
}

function ReceiptModal({ data, shop, onClose }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(buildReceiptText(data, shop)); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    catch (e) { setCopied(false); }
  };
  const whatsapp = () => {
    try { window.open("https://wa.me/?text=" + encodeURIComponent(buildReceiptText(data, shop)), "_blank"); } catch (e) { /* bloqué : utiliser Copier */ }
  };
  const [imgBusy, setImgBusy] = useState(false);
  const sendImage = async () => {
    setImgBusy(true);
    try {
      const blob = await receiptImageBlob(data, shop);
      const file = new File([blob], `recu-${data.no}.png`, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: "Reçu", text: `Reçu ${data.no}` }); } catch (e) { /* annulé */ }
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = `recu-${data.no}.png`; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }
    } catch (e) { /* */ }
    setImgBusy(false);
  };
  return (
    <Modal title="Reçu" sub={`N° ${data.no}`} onClose={onClose}
      footer={<div className="foot-actions" style={{ marginLeft: 0, width: "100%", flexWrap: "wrap" }}>
        <button className="btn btn-ghost" onClick={onClose}>Fermer</button>
        <button className="btn btn-line" onClick={whatsapp}>WhatsApp (texte)</button>
        <button className="btn btn-gold" onClick={sendImage} disabled={imgBusy}>{imgBusy ? "…" : "Envoyer en image"}</button>
        <button className="btn btn-line" onClick={copy}>{copied ? "Copié ✓" : "Copier"}</button>
        <button className="btn btn-line" onClick={() => window.print()}>Imprimer</button>
      </div>}>
      <ReceiptCard data={data} shop={shop} />
    </Modal>
  );
}

const ZRow = ({ label, value, strong, tone }) => (
  <div className={`rc-meta ${strong ? "rc-strong" : ""}`}>
    <span>{label}</span><span className={`num ${tone || ""}`}>{value}</span>
  </div>
);

function ZCard({ data, shop }) {
  const ec = data.ecart;
  const ecTone = ec === 0 ? "pos" : ec < 0 ? "neg" : "";
  return (
    <div className="receipt">
      <div className="rc-head">
        {(shop.docLogo || shop.logo) && <img className="rc-logo" src={shop.docLogo || shop.logo} alt="" />}
        <div className="rc-shop">{shop.name}</div>
        {shop.addr && <div className="rc-sub">{shop.addr}</div>}
      </div>
      <div className="rc-sep" />
      <div className="rc-meta"><strong>RAPPORT Z — CLÔTURE</strong><span>{data.date}{data.time ? ` · ${data.time}` : ""}</span></div>
      <div className="rc-sep" />
      <div className="rc-lines">
        <ZRow label="Espèces" value={fcfa(data.esp)} />
        <ZRow label="Wave" value={fcfa(data.wave)} />
        <ZRow label="Orange Money" value={fcfa(data.om)} />
        <ZRow label="Banque" value={fcfa(data.vir)} />
      </div>
      <div className="rc-sep" />
      <div className="rc-total"><span>TOTAL VENTES</span><strong className="num">{fcfa(data.caTotal)}</strong></div>
      <div className="rc-sep dashed" />
      <ZRow label="Fond de caisse" value={fcfa(data.fond)} />
      <ZRow label="+ Ventes espèces" value={fcfa(data.esp)} />
      <ZRow label="− Rachats payés" value={fcfa(data.rachats)} />
      <ZRow label="− Dépenses" value={fcfa(data.depenses)} />
      <ZRow label="= Espèces théoriques" value={fcfa(data.theorique)} strong />
      <ZRow label="Espèces comptées" value={fcfa(data.compte)} />
      <ZRow label="Écart" value={`${ec > 0 ? "+" : ""}${fcfa(ec)}`} strong tone={ecTone} />
      <div className="rc-sep dashed" />
      <div className="rc-foot" style={{ marginTop: 14 }}>Visa responsable : ______________</div>
    </div>
  );
}

function ZModal({ data, shop, onClose }) {
  return (
    <Modal title="Rapport Z" sub={`Clôture du ${data.date}`} onClose={onClose}
      footer={<div className="foot-actions" style={{ marginLeft: 0, width: "100%" }}>
        <button className="btn btn-ghost" onClick={onClose}>Fermer</button>
        <button className="btn btn-gold" onClick={() => window.print()}>Imprimer</button>
      </div>}>
      <ZCard data={data} shop={shop} />
    </Modal>
  );
}

function AcompteModal({ sale, balance, onClose, onSave }) {
  const [amount, setAmount] = useState(Math.round(balance));
  const [pay, setPay] = useState("Espèces");
  const a = Math.min(parseFloat(amount) || 0, balance);
  const restant = balance - a;
  return (
    <Modal title="Encaisser un acompte" sub={sale.label} onClose={onClose}
      footer={<>
        <div className="foot-total">Restera <strong className="num">{fcfa(restant)}</strong></div>
        <div className="foot-actions">
          <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button className="btn btn-gold" disabled={a <= 0} onClick={() => onSave({ amount: a, pay })}>Encaisser</button>
        </div>
      </>}>
      <div className="recon-row total" style={{ borderTop: "none" }}><span>Reste dû</span><span className="num">{fcfa(balance)}</span></div>
      <div className="grid2">
        <Field label="Montant reçu"><input className="input num" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        <Field label="Paiement">
          <select className="input" value={pay} onChange={(e) => setPay(e.target.value)}>{PAY_METHODS.map((p) => <option key={p}>{p}</option>)}</select>
        </Field>
      </div>
    </Modal>
  );
}
function RetourModal({ sale, onClose, onSave }) {
  const [amount, setAmount] = useState(Math.round(sale.total));
  const [pay, setPay] = useState("Espèces");
  const [restock, setRestock] = useState(!!(sale.stockId || sale.diversId));
  const [motif, setMotif] = useState("");
  const a = Math.max(0, parseFloat(amount) || 0);
  const hasItem = !!(sale.stockId || sale.diversId);
  return (
    <Modal title="Retour / avoir" sub={sale.label} onClose={onClose}
      footer={<>
        <div className="foot-total">Remboursement <strong className="num">{fcfa(a)}</strong></div>
        <div className="foot-actions">
          <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button className="btn btn-clay" onClick={() => onSave({ amount: a, pay, restock, motif })}>Valider le retour</button>
        </div>
      </>}>
      <div className="grid2">
        <Field label="Montant remboursé"><input className="input num" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        <Field label="Moyen"><select className="input" value={pay} onChange={(e) => setPay(e.target.value)}>{PAY_METHODS.map((p) => <option key={p}>{p}</option>)}</select></Field>
      </div>
      {hasItem ? (
        <label className="chk-row"><input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} /><span>Remettre l'article en stock</span></label>
      ) : <p className="muted small" style={{ margin: "4px 0 10px" }}>Vente libre : aucun article précis à remettre en stock.</p>}
      <Field label="Motif (optionnel)"><input className="input" value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="ex : taille incorrecte" /></Field>
      <p className="note-box">Le remboursement est enregistré comme une sortie d'argent (dépense « Remboursement ») — la caisse et la trésorerie sont mises à jour. La vente d'origine reste dans l'historique, marquée « retournée ».</p>
    </Modal>
  );
}

function SettlePurchaseModal({ purchase, balance, onClose, onSave }) {
  const [amount, setAmount] = useState(Math.round(balance));
  const [pay, setPay] = useState("Espèces");
  const a = Math.min(parseFloat(amount) || 0, balance);
  const restant = balance - a;
  return (
    <Modal title="Payer le reste au client" sub={`Rachat ${purchase.karat}K · ${g(purchase.weight)}`} onClose={onClose}
      footer={<>
        <div className="foot-total">Restera <strong className="num">{fcfa(restant)}</strong></div>
        <div className="foot-actions">
          <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
          <button className="btn btn-clay" disabled={a <= 0} onClick={() => onSave({ amount: a, pay })}>Payer</button>
        </div>
      </>}>
      <div className="recon-row total" style={{ borderTop: "none" }}><span>Reste à payer</span><span className="num">{fcfa(balance)}</span></div>
      <div className="grid2">
        <Field label="Montant payé"><input className="input num" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        <Field label="Moyen de paiement">
          <select className="input" value={pay} onChange={(e) => setPay(e.target.value)}>{PAY_METHODS.map((p) => <option key={p}>{p}</option>)}</select>
        </Field>
      </div>
    </Modal>
  );
}
function FormulaModal({ req, onClose }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => { try { await navigator.clipboard.writeText(req.msg); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch (e) { setCopied(false); } };
  return (
    <Modal title={`Demande — formule ${req.name}`} sub="Envoie ce message à ton revendeur" onClose={onClose}
      footer={<div className="foot-actions" style={{ marginLeft: 0, width: "100%", flexWrap: "wrap" }}>
        <button className="btn btn-ghost" onClick={onClose}>Fermer</button>
        <button className="btn btn-line" onClick={copy}>{copied ? "Copié ✓" : "Copier le message"}</button>
        <a className="btn btn-gold" href={req.url} target="_blank" rel="noreferrer" onClick={onClose}>Envoyer sur WhatsApp</a>
      </div>}>
      <div className="req-msg">{req.msg}</div>
      {!req.hasPhone && <p className="muted small" style={{ marginTop: 10 }}>Aucun numéro de revendeur n'est encore enregistré : le bouton ouvrira WhatsApp et tu choisiras le contact. Tu peux aussi copier le message et l'envoyer toi-même.</p>}
    </Modal>
  );
}
function PasswordChange() {
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const submit = async () => {
    if (p1.length < 6) { setMsg({ err: true, t: "6 caractères minimum." }); return; }
    if (p1 !== p2) { setMsg({ err: true, t: "Les deux mots de passe ne correspondent pas." }); return; }
    setBusy(true); setMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: p1 });
      if (error) setMsg({ err: true, t: "Échec : " + (error.message || "réessaie plus tard.") });
      else { setMsg({ err: false, t: "Mot de passe modifié avec succès." }); setP1(""); setP2(""); }
    } catch (e) { setMsg({ err: true, t: "Connexion requise pour changer le mot de passe." }); }
    setBusy(false);
  };
  return (
    <div className="pwd-change">
      <Field label="Nouveau mot de passe"><input className="input" type="password" value={p1} onChange={(e) => { setP1(e.target.value); setMsg(null); }} placeholder="6 caractères minimum" /></Field>
      <Field label="Confirmer le mot de passe"><input className="input" type="password" value={p2} onChange={(e) => { setP2(e.target.value); setMsg(null); }} placeholder="Retape le mot de passe" /></Field>
      {msg && <p className={`small ${msg.err ? "pwd-err" : "pwd-ok"}`} style={{ margin: "0 0 10px" }}>{msg.t}</p>}
      <button className="btn btn-gold" onClick={submit} disabled={busy || !p1 || !p2}>{busy ? "Modification…" : "Changer mon mot de passe"}</button>
    </div>
  );
}
function InstallButton({ prompt, installed, onInstall, isIos }) {
  const [showHelp, setShowHelp] = useState(false);
  const install = async () => {
    const ok = onInstall ? await onInstall() : false;
    if (!ok) setShowHelp(true);
  };
  if (installed) return <p className="muted small" style={{ margin: 0 }}>✓ L'application est déjà installée sur cet appareil.</p>;
  return (
    <div>
      <button className="btn btn-gold" onClick={install}><Download size={15} /> Installer l'application</button>
      {(showHelp || (isIos && !prompt)) && (
        <p className="muted small" style={{ margin: "10px 0 0", lineHeight: 1.5 }}>
          {isIos
            ? <>Sur iPhone / iPad : appuie sur le bouton <strong>Partager</strong> (le carré avec une flèche ↑) en bas de Safari, puis choisis <strong>« Sur l'écran d'accueil »</strong>.</>
            : <>Dans le menu de ton navigateur (le <strong>⋮</strong> en haut à droite), choisis <strong>« Installer l'application »</strong> ou <strong>« Ajouter à l'écran d'accueil »</strong>.</>}
        </p>
      )}
    </div>
  );
}
const PAGE_NOTES = {
  sales: "Enregistre ici chaque vente (or, bijou ou divers). Le prix se base sur le cours du jour. Tu peux encaisser la totalité ou laisser un reste à payer (crédit).",
  buy: "Achats d'or = rachats clients : quand un client te vend de l'or, enregistre-le ici. Le prix de rachat se calcule sur le cours du jour, moins ta marge.",
  stock: "Ton inventaire : or brut, bijoux et divers. La valeur de l'or se met à jour toute seule avec le cours. Ajoute un article avec son poids et son carat.",
  clients: "Ton carnet de clients. Note leur nom et téléphone pour suivre leurs achats et crédits, et leur envoyer des rappels par WhatsApp.",
  credits: "Suis ce que les clients te doivent (ventes à crédit) et ce que tu dois (rachats non réglés). Tu peux relancer par WhatsApp en un clic.",
  caisse: "Compte ta caisse en fin de journée : l'app compare l'argent attendu avec ce que tu as réellement, et signale tout écart.",
  depenses: "Enregistre tes dépenses (loyer, électricité, salaires…). Elles sont déduites de ton bénéfice dans les rapports.",
  cours: "Le cours mondial de l'or en direct, converti en FCFA. Règle ta prime et tes marges ici : tous tes prix de vente et de rachat en découlent.",
  calc: "Calcule vite la valeur d'un or selon son poids et son carat, ou convertis des devises. Pratique au comptoir.",
  reports: "Tes chiffres : chiffre d'affaires, bénéfices, meilleurs produits et performance par vendeur, sur la période de ton choix.",
  journal: "Retrouve ici toutes tes opérations (ventes, achats, paiements, clôtures) avec la date et l'auteur. Clique une ligne pour voir le détail ou le reçu.",
  settings: "Règle le nom et le logo de ta boutique, ton mot de passe, tes utilisateurs, l'installation de l'app et tes sauvegardes.",
  equipe: "Crée les comptes de tes employés, puis via « Accès » choisis leur poste et exactement ce que chacun peut voir ou modifier.",
  abo: "Ta formule actuelle et sa date de fin. Compare les formules et contacte ton revendeur pour renouveler ou changer d'offre.",
};

function PageNote({ id, children }) {
  const [show, setShow] = useState(false);
  useEffect(() => { let on = true; (async () => { try { const v = await STORE.get("atelierdor:note:" + id); if (on && v !== "1") setShow(true); } catch (e) { if (on) setShow(true); } })(); return () => { on = false; }; }, [id]);
  if (!show) return null;
  const hide = () => { setShow(false); try { STORE.set("atelierdor:note:" + id, "1"); } catch (e) { /* */ } };
  return (
    <div className="page-note">
      <span className="page-note-ico">💡</span>
      <div className="page-note-txt">{children}</div>
      <button className="page-note-x" onClick={hide} title="J'ai compris"><X size={15} /></button>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("dash");
  const [navOpen, setNavOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null); // événement beforeinstallprompt capté
  const [installedPWA, setInstalledPWA] = useState(false);
  const [installDismissed, setInstallDismissed] = useState(false);
  const [gold, setGold] = useState(seedGold);
  const [divers, setDivers] = useState(seedDivers);
  const [clients, setClients] = useState(seedClients);
  const [sales, setSales] = useState(seedSales);
  const [purchases, setPurchases] = useState(seedPurchases);
  const [purchasePayments, setPurchasePayments] = useState(seedPurchasePayments);
  const [modal, setModal] = useState(null);
  const [stockTab, setStockTab] = useState("or");
  const [reportPeriod, setReportPeriod] = useState("month");
  const [journalKind, setJournalKind] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [q, setQ] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved | error
  const [syncState, setSyncState] = useState("idle"); // idle | syncing | synced | offline | error
  const [netTick, setNetTick] = useState(0); // incrémenté pour forcer une tentative de synchro
  const [dataReady, setDataReady] = useState(false); // true quand le local correspond bien à la boutique (après hydratation)
  const pushedRef = useRef({}); // {collection:id -> json déjà synchronisé}
  const lastPullRef = useRef(null); // dernier updated_at récupéré
  const dataShopRef = useRef(null); // boutique à laquelle appartient le local
  const settingsRef = useRef(null); // réglages locaux à jour (pour la fusion)
  const [receipt, setReceipt] = useState(null);
  const [shop, setShop] = useState({ name: "Atelier d'Or", phone: "", addr: "Dakar, Sénégal" });
  const [closures, setClosures] = useState(seedClosures);
  const [payments, setPayments] = useState(seedPayments);
  const [expenses, setExpenses] = useState(seedExpenses);
  const [treasury, setTreasury] = useState(seedTreasury);
  const [journal, setJournal] = useState([]);
  const [messages, setMessages] = useState([]);
  const [reads, setReads] = useState([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatSeen, setChatSeen] = useState({}); // { all: ts, [userId]: ts }
  const [users, setUsers] = useState(seedUsers);
  const [teamMembers, setTeamMembers] = useState([]); // vraie équipe en ligne (profiles Supabase)
  const [currentUser, setCurrentUser] = useState(null);
  const [authUser, setAuthUser] = useState(null);   // compte Supabase connecté (ou null)
  const [authReady, setAuthReady] = useState(false); // session en ligne restaurée ?
  const [onlineReady, setOnlineReady] = useState(false); // boutique en ligne vérifiée et autorisée ?
  const [pricesVersion, setPricesVersion] = useState(0); // recharge l'affichage quand les prix Supabase arrivent
  const [backup, setBackup] = useState(null); // null | "export" | "import"
  const [updateReady, setUpdateReady] = useState(false); // nouvelle version déployée détectée
  const [expiryDismissed, setExpiryDismissed] = useState(false); // alerte d'expiration masquée pour la session
  const [guideDismissed, setGuideDismissed] = useState(false); // guide de démarrage masqué
  const swRegRef = useRef(null);
  const [upsell, setUpsell] = useState(null); // null | nom de la fonction réservée
  const [mediaUpsell, setMediaUpsell] = useState(null); // null | { message }
  const [opsTab, setOpsTab] = useState("sales"); // tableau de bord : "sales" | "purchases"
  const [history, setHistory] = useState(null); // { type:"sale"|"purchase", item } pour l'historique au clic
  const [now, setNow] = useState(new Date());
  const [tickerMode, setTickerMode] = useState("vente"); // barre des cours : "vente" | "achat"
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  const [route, setRoute] = useState(() => { const h = (typeof window !== "undefined" ? (window.location.hash || "") : "").replace(/^#/, ""); return h === "admin-create" ? "admin" : h === "espace" ? "espace" : h === "client" ? "client" : "app"; });
  const [license, setLicense] = useState(null);
  const [licReady, setLicReady] = useState(false);
  const [resellerPhone, setResellerPhone] = useState("");
  const [trialUsed, setTrialUsed] = useState(false);
  const [acompteFor, setAcompteFor] = useState(null);
  const [settleFor, setSettleFor] = useState(null);
  const [formulaReq, setFormulaReq] = useState(null);
  const [clientView, setClientView] = useState(null);
  const [productView, setProductView] = useState(null);
  const [returnFor, setReturnFor] = useState(null);
  const [confirm, setConfirm] = useState(null); // { title, message, okLabel, danger, onOk }
  const ask = (opts) => setConfirm(opts);
  const [notice, setNotice] = useState(null); // { title, message }
  const notify = (message, title) => setNotice({ message, title });
  const [pin, setPin] = useState(null); // { salt, hash, len } | null — verrou local de l'appareil
  const [pinOk, setPinOk] = useState(false); // déverrouillé pour cette session
  const [lockDelay, setLockDelay] = useState(5); // minutes d'inactivité avant reverrouillage (0 = jamais)
  const saveLockDelay = (min) => { setLockDelay(min); try { STORE.set("atelierdor:lockdelay", String(min)); } catch (e) { /* */ } };
  const savePin = (cfg) => { setPin(cfg); try { if (cfg) STORE.set("atelierdor:pin", JSON.stringify(cfg)); else STORE.del("atelierdor:pin"); } catch (e) { /* */ } };
  const [fondCaisse, setFondCaisse] = useState(100000);
  const [compteCaisse, setCompteCaisse] = useState("");
  const [zView, setZView] = useState(null);

  // ---- cours en direct + réglages ----
  const [spot, setSpot] = useState(SEED_SPOT);
  const [rate, setRate] = useState(SEED_RATE);
  const [asof, setAsof] = useState("");
  const [updated, setUpdated] = useState(null);
  const [coursLoading, setCoursLoading] = useState(true);
  const [coursErr, setCoursErr] = useState(null);
  const [auto, setAuto] = useState(true);
  const [ago, setAgo] = useState(0);
  const [prime, setPrime] = useState(3);
  const [mVente, setMVente] = useState(8);
  const [mAchat, setMAchat] = useState(4);
  const coursTimer = useRef(null);

  const fetchLive = useCallback(async () => {
    setCoursLoading(true); setCoursErr(null);
    // 1. Sources publiques sans clé (fonctionnent une fois l'app hébergée sur un vrai site)
    try {
      const [gRes, fRes] = await Promise.all([
        fetch("https://api.gold-api.com/price/XAU"),
        fetch("https://open.er-api.com/v6/latest/USD"),
      ]);
      const g = await gRes.json();
      const f = await fRes.json();
      const oz = Number(g.price ?? g.Price ?? g.rate);
      const xof = Number(f && f.rates && f.rates.XOF);
      if (oz > 0 && xof > 0) {
        setSpot(oz); setRate(xof);
        setAsof(new Date().toLocaleString("fr-FR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }));
        setUpdated(new Date()); setCoursLoading(false); return;
      }
      throw new Error("incomplet");
    } catch (e) { /* on tente le repli */ }
    // 2. Repli dans l'aperçu Claude : recherche web via l'API interne (ne marche que dans Claude)
    if (typeof window !== "undefined" && window.storage) {
      try {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-sonnet-4-6",
            max_tokens: 1000,
            messages: [{
              role: "user",
              content:
                "Recherche sur le web le prix spot ACTUEL de l'or (en USD par once troy) et le taux de change ACTUEL USD vers XOF (franc CFA BCEAO). " +
                "Réponds STRICTEMENT avec un seul objet JSON, sans aucun texte ni Markdown autour : " +
                '{"gold_usd_per_oz": <nombre>, "usd_xof": <nombre>, "asof": "<date et heure courtes>"}',
            }],
            tools: [{ type: "web_search_20250305", name: "web_search" }],
          }),
        });
        const data = await res.json();
        const text = (data.content || []).map((b) => (b.type === "text" ? b.text : "")).join(" ");
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
          const o = JSON.parse(match[0]);
          if (o.gold_usd_per_oz && o.usd_xof) {
            setSpot(Number(o.gold_usd_per_oz)); setRate(Number(o.usd_xof));
            setAsof(o.asof || ""); setUpdated(new Date()); setCoursLoading(false); return;
          }
        }
      } catch (e2) { /* */ }
    }
    // 3. Rien : on garde les dernières valeurs (saisie manuelle possible)
    setCoursErr("Cours en direct indisponible — tu peux saisir le cours et le taux à la main dans l'onglet Cours.");
    setCoursLoading(false);
  }, []);

  useEffect(() => { fetchLive(); }, [fetchLive]);
  useEffect(() => {
    if (coursTimer.current) clearInterval(coursTimer.current);
    if (auto) coursTimer.current = setInterval(fetchLive, 120000);
    return () => coursTimer.current && clearInterval(coursTimer.current);
  }, [auto, fetchLive]);
  useEffect(() => {
    const id = setInterval(() => { if (updated) setAgo(Math.floor((Date.now() - updated.getTime()) / 1000)); }, 1000);
    return () => clearInterval(id);
  }, [updated]);

  // ---- sauvegarde : chargement au démarrage ----
  useEffect(() => {
    (async () => {
      try {
        const v = await STORE.get("atelierdor:data");
        const d = v ? JSON.parse(v) : null;
        if (d) {
          if (d.gold) setGold(d.gold);
          if (d.divers) setDivers(d.divers);
          if (d.clients) setClients(d.clients);
          if (d.sales) setSales(d.sales);
          if (d.purchases) setPurchases(d.purchases);
          if (d.purchasePayments) setPurchasePayments(d.purchasePayments);
          if (d.closures) setClosures(d.closures);
          if (d.payments) setPayments(d.payments);
          if (d.expenses) setExpenses(d.expenses);
    if (d.treasury) setTreasury(d.treasury);
          if (d.treasury) setTreasury(d.treasury);
          if (d.journal) setJournal(d.journal);
          if (d.messages) setMessages(d.messages);
          if (d.reads) setReads(d.reads);
          if (d.users && d.users.length) setUsers(d.users);
          if (d.settings) {
            setPrime(d.settings.prime ?? 3);
            setMVente(d.settings.mVente ?? 8);
            setMAchat(d.settings.mAchat ?? 4);
            if (d.settings.shop) setShop(d.settings.shop);
            if (d.settings.fondCaisse != null) setFondCaisse(d.settings.fondCaisse);
            if (d.settings.resellerPhone) setResellerPhone(d.settings.resellerPhone);
          }
        }
        // reconnexion automatique + page mémorisée
        try {
          const uList = (d && d.users && d.users.length) ? d.users : seedUsers;
          const sid = await STORE.get("atelierdor:session");
          if (sid) { const u = uList.find((x) => x.id === sid); if (u) setCurrentUser(u); }
          const vw = await STORE.get("atelierdor:view");
          if (vw) setView(vw);
        } catch (e) { /* pas de session */ }
      } catch (e) { /* aucune donnée enregistrée : on garde les exemples */ }
      finally { setLoaded(true); }
    })();
  }, []);

  // mémoriser la page courante pour la rouvrir après rafraîchissement
  useEffect(() => { if (loaded) { try { STORE.set("atelierdor:view", view); } catch (e) { /* */ } } }, [view, loaded]);

  // ---- session en ligne Supabase (restauration + écoute) ----
  useEffect(() => {
    let sub = null;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setAuthUser(data && data.session ? data.session.user : null);
      } catch (e) { /* hors ligne ou non configuré */ }
      finally { setAuthReady(true); }
      try {
        const r = supabase.auth.onAuthStateChange((_evt, session) => setAuthUser(session ? session.user : null));
        sub = r && r.data ? r.data.subscription : null;
      } catch (e) { /* */ }
    })();
    return () => { try { sub && sub.unsubscribe(); } catch (e) { /* */ } };
  }, []);

  // si le compte en ligne change (connexion/déconnexion), re-vérifier la boutique
  useEffect(() => { setOnlineReady(false); }, [authUser ? authUser.id : null]);

  // ---- prix des formules chargés depuis Supabase (modifiables par le revendeur) ----
  const loadPrices = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("pricing").select("*");
      if (!error && data && data.length) {
        const map = {};
        data.forEach((r) => { map[r.plan] = r; });
        LIVE_PRICES = map;
        setPricesVersion((v) => v + 1);
      }
    } catch (e) { /* on garde les prix par défaut */ }
  }, []);
  useEffect(() => { loadPrices(); }, [loadPrices]);

  // ---- routage #admin-create + vérification de la licence ----
  useEffect(() => {
    const onHash = () => { const h = (window.location.hash || "").replace(/^#/, ""); setRoute(h === "admin-create" ? "admin" : h === "espace" ? "espace" : h === "client" ? "client" : "app"); };
    window.addEventListener("hashchange", onHash);
    (async () => {
      try {
        const c = await STORE.get("atelierdor:license");
        if (c) { const v = verifyActivation(c); if (v.valid) setLicense({ ...v, code: c }); }
      } catch (e) { /* pas de licence */ }
      try {
        const t = await STORE.get("atelierdor:trialused"); if (t === "1") setTrialUsed(true);
      } catch (e) { /* */ }
      try {
        const p = await STORE.get("atelierdor:pin"); if (p) setPin(JSON.parse(p));
        const ld = await STORE.get("atelierdor:lockdelay"); if (ld != null && ld !== "") setLockDelay(parseInt(ld) || 0);
        const cs = await STORE.get("atelierdor:chatseenmap"); if (cs) { try { setChatSeen(JSON.parse(cs) || {}); } catch (e) { /* */ } }
      } catch (e) { /* */ }
      finally { setLicReady(true); }
    })();
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // ---- sauvegarde : enregistrement automatique (anti-rebond) ----
  useEffect(() => {
    if (!loaded) return;
    if (!STORE.available) { setSaveState("error"); return; }
    setSaveState("saving");
    const t = setTimeout(async () => {
      const ok = await STORE.set("atelierdor:data", JSON.stringify({
        gold, divers, clients, sales, purchases, purchasePayments, closures, payments, expenses, treasury, journal, messages, reads, users,
        settings: { prime, mVente, mAchat, shop, fondCaisse, resellerPhone },
      }));
      setSaveState(ok ? "saved" : "error");
    }, 600);
    return () => clearTimeout(t);
  }, [loaded, gold, divers, clients, sales, purchases, purchasePayments, closures, payments, expenses, treasury, journal, messages, reads, users, prime, mVente, mAchat, shop, fondCaisse, resellerPhone]);

  // ---- détection de la connexion : signale vite, et relance la synchro au retour ----
  useEffect(() => {
    const onOnline = () => { setSyncState("syncing"); setNetTick((n) => n + 1); };
    const onOffline = () => setSyncState("offline");
    if (typeof window !== "undefined") {
      window.addEventListener("online", onOnline);
      window.addEventListener("offline", onOffline);
    }
    if (typeof navigator !== "undefined" && navigator.onLine === false) setSyncState("offline");
    const hb = setInterval(() => setNetTick((n) => n + 1), 2500); // reprise auto toutes les 2,5 s
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("online", onOnline);
        window.removeEventListener("offline", onOffline);
      }
      clearInterval(hb);
    };
  }, []);

  // garde les réglages locaux à jour (pour la fusion sans écraser une modif locale)
  useEffect(() => { settingsRef.current = { id: "main", prime, mVente, mAchat, shop, fondCaisse, resellerPhone }; }, [prime, mVente, mAchat, shop, fondCaisse, resellerPhone]);

  // au changement de boutique connectée, on rebascule en "non prêt" (réhydratation)
  useEffect(() => { setDataReady(false); dataShopRef.current = null; pushedRef.current = {}; lastPullRef.current = null; }, [currentUser ? currentUser.shopId : null]);
  useEffect(() => {
    const sid = currentUser ? currentUser.shopId : null;
    if (!sid) { setTeamMembers([]); return; }
    let alive = true;
    (async () => {
      try {
        const { data, error } = await supabase.from("profiles").select("id, name, role").eq("shop_id", sid);
        if (!error && alive) setTeamMembers(data || []);
      } catch (e) { /* hors ligne : on garde la liste vide */ }
    })();
    return () => { alive = false; };
  }, [currentUser ? currentUser.shopId : null, netTick]);

  // rafraîchit automatiquement mes permissions/poste/rôle ET la formule/expiration de la boutique,
  // pour qu'un changement de droits ou de plan soit pris en compte SANS se reconnecter.
  useEffect(() => {
    if (!authUser || !currentUser || !currentUser.shopId) return;
    let alive = true;
    const sid = currentUser.shopId;
    const refresh = async () => {
      try {
        const { data: prof } = await supabase.from("profiles").select("role, poste, perms").eq("id", authUser.id).maybeSingle();
        if (alive && prof) setCurrentUser((p) => {
          if (!p) return p;
          const role = prof.role === "admin" ? "patron" : "vendeur";
          const perms = Array.isArray(prof.perms) ? prof.perms : null;
          const poste = prof.poste || "";
          if (p.role === role && p.poste === poste && JSON.stringify(p.perms) === JSON.stringify(perms)) return p;
          return { ...p, role, poste, perms };
        });
        const { data: sh } = await supabase.from("shops").select("plan, expiry, status").eq("id", sid).maybeSingle();
        if (alive && sh) setLicense((l) => {
          const expiry = sh.expiry ? new Date(sh.expiry) : null;
          const plan = sh.plan || "S";
          if (l && l.plan === plan && String(l.expiry || "") === String(expiry || "")) return l;
          return { valid: true, plan, lifetime: false, expiry, code: "online" };
        });
      } catch (e) { /* hors-ligne : on conserve l'état courant */ }
    };
    refresh();
    const iv = setInterval(refresh, 60000);
    const onFocus = () => refresh();
    const onVis = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => { alive = false; clearInterval(iv); window.removeEventListener("focus", onFocus); window.removeEventListener("online", onFocus); document.removeEventListener("visibilitychange", onVis); };
  }, [authUser ? authUser.id : null, currentUser ? currentUser.id : null, currentUser ? currentUser.shopId : null]);

  const applyRemoteSettingsData = (d) => {
    if (!d) return;
    if (typeof d.prime === "number") setPrime(d.prime);
    if (typeof d.mVente === "number") setMVente(d.mVente);
    if (typeof d.mAchat === "number") setMAchat(d.mAchat);
    if (d.shop) setShop(d.shop);
    if (typeof d.fondCaisse === "number") setFondCaisse(d.fondCaisse);
    if (typeof d.resellerPhone === "string") setResellerPhone(d.resellerPhone);
  };

  const SYNC_SETTERS = { gold: setGold, divers: setDivers, clients: setClients, sales: setSales, payments: setPayments, purchases: setPurchases, purchasePayments: setPurchasePayments, closures: setClosures, expenses: setExpenses, treasury: setTreasury, journal: setJournal, messages: setMessages, reads: setReads };

  // remplace tout le local par la version serveur (adoption d'une boutique sur un nouvel appareil)
  const hydrateFromServer = (rows) => {
    const snap = {};
    const byColl = {};
    rows.forEach((r) => { (byColl[r.collection] = byColl[r.collection] || []).push(r); });
    Object.entries(SYNC_SETTERS).forEach(([coll, setter]) => {
      const live = (byColl[coll] || []).filter((r) => !r.deleted);
      setter(sortColl(coll, live.map((r) => r.data)));
      (byColl[coll] || []).forEach((r) => { snap[coll + ":" + r.id] = r.deleted ? "__del__" : JSON.stringify(r.data); });
    });
    const setR = (byColl["settings"] || []).find((r) => String(r.id) === "main" && !r.deleted);
    if (setR) { applyRemoteSettingsData(setR.data); snap["settings:main"] = JSON.stringify(setR.data); }
    pushedRef.current = snap;
  };

  // fusion d'une collection : applique le serveur, mais garde les éléments modifiés localement (non encore envoyés)
  const mergeColl = (coll, prev, rows) => {
    const snap = pushedRef.current;
    const map = new Map((prev || []).map((it) => [String(it.id), it]));
    let changed = false;
    rows.forEach((r) => {
      const key = coll + ":" + r.id;
      const local = map.get(String(r.id));
      const pendingLocal = local && JSON.stringify(local) !== snap[key];
      if (pendingLocal) return;
      if (r.deleted) {
        if (local) { map.delete(String(r.id)); changed = true; }
        snap[key] = "__del__";
      } else {
        const js = JSON.stringify(r.data);
        if (!local || JSON.stringify(local) !== js) { map.set(String(r.id), r.data); changed = true; }
        snap[key] = js;
      }
    });
    return changed ? sortColl(coll, Array.from(map.values())) : prev;
  };

  const applyRemote = (rows) => {
    const byColl = {};
    rows.forEach((r) => { (byColl[r.collection] = byColl[r.collection] || []).push(r); });
    Object.entries(byColl).forEach(([coll, rs]) => {
      if (coll === "settings") {
        const r = rs.find((x) => String(x.id) === "main");
        if (r && !r.deleted) {
          const snap = pushedRef.current;
          const cur = settingsRef.current;
          const curJs = cur ? JSON.stringify(cur) : undefined;
          const pending = snap["settings:main"] !== undefined && curJs !== undefined && curJs !== snap["settings:main"];
          if (!pending) { applyRemoteSettingsData(r.data); snap["settings:main"] = JSON.stringify(r.data); }
        }
        return;
      }
      const setter = SYNC_SETTERS[coll];
      if (setter) setter((prev) => mergeColl(coll, prev, rs));
    });
  };

  // ---- synchro en ligne : RÉCUPÉRATION (serveur -> local) ----
  useEffect(() => {
    if (!loaded || !currentUser || !currentUser.shopId) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    const shopId = currentUser.shopId;
    let cancelled = false;
    (async () => {
      try {
        // le local appartient-il déjà à cette boutique ?
        let belongs = dataShopRef.current === shopId;
        if (!belongs) { try { belongs = (await STORE.get("atelierdor:datashop")) === shopId; } catch (e) { /* */ } }
        if (cancelled) return;
        if (!belongs) {
          // adoption : on prend la version serveur (ou vide si boutique neuve)
          const { data, error } = await supabase.from("records").select("collection, id, data, updated_at, deleted").eq("shop_id", shopId);
          if (error || cancelled) return;
          hydrateFromServer(data || []);
          let mx = null; (data || []).forEach((r) => { if (!mx || r.updated_at > mx) mx = r.updated_at; });
          lastPullRef.current = mx;
          dataShopRef.current = shopId;
          try { await STORE.set("atelierdor:datashop", shopId); } catch (e) { /* */ }
          setDataReady(true); setSyncState("synced");
          return;
        }
        if (!dataReady) setDataReady(true);
        // récupération incrémentale
        let q = supabase.from("records").select("collection, id, data, updated_at, deleted").eq("shop_id", shopId);
        if (lastPullRef.current) q = q.gt("updated_at", lastPullRef.current);
        const { data, error } = await q;
        if (error || !data || cancelled || data.length === 0) return;
        applyRemote(data);
        let mx = lastPullRef.current; data.forEach((r) => { if (!mx || r.updated_at > mx) mx = r.updated_at; });
        lastPullRef.current = mx;
      } catch (e) { /* hors ligne : on réessaiera */ }
    })();
    return () => { cancelled = true; };
  }, [loaded, currentUser, dataReady, netTick]);

  // ---- synchro en ligne : TEMPS RÉEL (réception instantanée des changements) ----
  useEffect(() => {
    if (!currentUser || !currentUser.shopId || !dataReady) return;
    const shopId = currentUser.shopId;
    let channel = null;
    try {
      channel = supabase
        .channel("records-" + shopId)
        .on("postgres_changes", { event: "*", schema: "public", table: "records", filter: "shop_id=eq." + shopId }, (payload) => {
          const r = payload.new || payload.old;
          if (!r || !r.collection) return;
          applyRemote([r]);
          if (r.updated_at && (!lastPullRef.current || r.updated_at > lastPullRef.current)) lastPullRef.current = r.updated_at;
        })
        .subscribe();
    } catch (e) { /* temps réel indisponible : la récupération périodique prend le relais */ }
    return () => { try { if (channel) supabase.removeChannel(channel); } catch (e) { /* */ } };
  }, [currentUser, dataReady]);

  // ---- synchro en ligne : ENVOI (local -> serveur), par élément ----
  useEffect(() => {
    if (!loaded) return;
    if (!currentUser || !currentUser.shopId) return;
    if (!dataReady) return;
    const shopId = currentUser.shopId;
    const collections = { gold, divers, clients, sales, payments, purchases, purchasePayments, closures, expenses, treasury, journal, messages, reads };
    const settingsDoc = { id: "main", prime, mVente, mAchat, shop, fondCaisse, resellerPhone };
    const t = setTimeout(async () => {
      if (typeof navigator !== "undefined" && navigator.onLine === false) { setSyncState("offline"); return; }
      try {
        const snap = pushedRef.current;
        const now = new Date().toISOString();
        const rows = [];
        Object.entries(collections).forEach(([coll, arr]) => {
          const seen = new Set();
          (arr || []).forEach((item) => {
            if (!item || item.id == null) return;
            const idStr = String(item.id);
            seen.add(idStr);
            const js = JSON.stringify(item);
            if (snap[coll + ":" + idStr] !== js) rows.push({ shop_id: shopId, collection: coll, id: idStr, data: item, updated_at: now, deleted: false });
          });
          Object.keys(snap).forEach((k) => {
            if (k.indexOf(coll + ":") !== 0) return;
            const idPart = k.slice(coll.length + 1);
            if (!seen.has(idPart) && snap[k] !== "__del__") rows.push({ shop_id: shopId, collection: coll, id: idPart, data: {}, updated_at: now, deleted: true });
          });
        });
        const setJs = JSON.stringify(settingsDoc);
        if (snap["settings:main"] !== setJs) rows.push({ shop_id: shopId, collection: "settings", id: "main", data: settingsDoc, updated_at: now, deleted: false });

        if (rows.length === 0) { setSyncState("synced"); return; }
        setSyncState("syncing");
        const { error } = await supabase.from("records").upsert(rows, { onConflict: "shop_id,collection,id" });
        if (error) { setSyncState(typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "error"); return; }
        rows.forEach((r) => { snap[r.collection + ":" + r.id] = r.deleted ? "__del__" : JSON.stringify(r.data); });
        setSyncState("synced");
      } catch (e) { setSyncState(typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "error"); }
    }, 600);
    return () => clearTimeout(t);
  }, [loaded, currentUser, dataReady, netTick, gold, divers, clients, sales, payments, purchases, purchasePayments, closures, expenses, treasury, journal, messages, reads, prime, mVente, mAchat, shop, fondCaisse, resellerPhone]);

  const resetData = () => ask({ title: "Tout réinitialiser ?", message: "Toutes les données seront effacées et remplacées par les exemples. Cette action est définitive.", danger: true, okLabel: "Réinitialiser", onOk: async () => {
    await STORE.del("atelierdor:data");
    try { await STORE.del("atelierdor:session"); await STORE.del("atelierdor:view"); } catch (e) { /* */ }
    setGold(seedGold); setDivers(seedDivers); setClients(seedClients);
    setSales(seedSales); setPurchases(seedPurchases); setPurchasePayments(seedPurchasePayments); setClosures(seedClosures); setPayments(seedPayments); setExpenses(seedExpenses); setUsers(seedUsers);
    setPrime(3); setMVente(8); setMAchat(4); setFondCaisse(100000);
    setShop({ name: "Atelier d'Or", phone: "", addr: "Dakar, Sénégal" });
  } });

  // verrouillage automatique après inactivité (si un PIN est défini)
  useEffect(() => {
    if (!pin || !pinOk || !lockDelay) return;
    let timer;
    const reset = () => { clearTimeout(timer); timer = setTimeout(() => setPinOk(false), lockDelay * 60000); };
    const evs = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    if (typeof window !== "undefined") evs.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => { clearTimeout(timer); if (typeof window !== "undefined") evs.forEach((e) => window.removeEventListener(e, reset)); };
  }, [pin, pinOk, lockDelay]);

  // marque les messages comme lus quand le chat est ouvert (et à l'arrivée de nouveaux)
  // la lecture par conversation est gérée par markSeen via le ChatWidget

  // notifications (son + navigateur) à la réception d'un message d'un autre
  const notifInit = useRef(false);
  const notifTsRef = useRef(0);
  useEffect(() => {
    if (!currentUser || !messages.length) return;
    const maxTs = messages.reduce((mx, m) => Math.max(mx, m.ts || 0), 0);
    if (!notifInit.current) { notifInit.current = true; notifTsRef.current = maxTs; return; }
    const incoming = messages.filter((m) => m.userId !== currentUser.id && (m.ts || 0) > notifTsRef.current && !m.removed && (!m.to || m.to === "all" || m.to === currentUser.id));
    notifTsRef.current = maxTs;
    if (!incoming.length) return;
    const last = [...incoming].sort((a, b) => (a.ts || 0) - (b.ts || 0)).pop();
    const hidden = typeof document !== "undefined" && document.hidden;
    if (!chatOpen || hidden) {
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (Ctx) { const ac = new Ctx(); const o = ac.createOscillator(); const gn = ac.createGain(); o.connect(gn); gn.connect(ac.destination); o.type = "sine"; o.frequency.value = 660; gn.gain.setValueAtTime(0.0001, ac.currentTime); gn.gain.exponentialRampToValueAtTime(0.18, ac.currentTime + 0.02); gn.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.3); o.start(); o.stop(ac.currentTime + 0.32); o.onended = () => ac.close(); }
      } catch (e) { /* */ }
    }
    if (hidden && typeof Notification !== "undefined" && Notification.permission === "granted") {
      const body = last.text || (last.image ? "📷 Photo" : last.audio ? "🎤 Message vocal" : last.file ? ("📎 " + (last.file.name || "Document")) : "Nouveau message");
      try { new Notification(`${last.by} · ${shop.name || "Atelier d'Or"}`, { body }); } catch (e) { /* */ }
    }
  }, [messages]);

  const perGram24 = (spot / OZ) * rate;
  const prices = useMemo(() => {
    const o = {};
    KARATS.forEach((k) => {
      const world = perGram24 * purity(k);
      const local = world * (1 + prime / 100);
      o[k] = { world, vente: local * (1 + mVente / 100), achat: local * (1 - mAchat / 100) };
    });
    return o;
  }, [perGram24, prime, mVente, mAchat]);

  const agoTxt = ago < 60 ? `il y a ${ago}s` : `il y a ${Math.floor(ago / 60)} min`;

  /* ------------------------------ calculs ------------------------------ */
  const m = useMemo(() => {
    const stockOrValue = gold.reduce((s, it) => s + it.weight * it.qty * prices[it.karat].vente, 0);
    const stockOrWeight = gold.reduce((s, it) => s + it.weight * it.qty, 0);
    const stockDiversValue = divers.reduce((s, it) => s + it.price * it.qty, 0);
    const totalVentes = sales.reduce((s, x) => s + x.total, 0);
    const totalAchats = purchases.reduce((s, x) => s + x.total, 0);
    const totalAchatsPaye = purchasePayments.reduce((s, x) => s + x.amount, 0);
    const dettesAchats = purchases.reduce((s, x) => s + Math.max(0, x.total - purchasePayments.filter((pp) => pp.purchaseId === x.id).reduce((a, b) => a + b.amount, 0)), 0);
    const totalEncaisse = payments.reduce((s, x) => s + x.amount, 0);
    const creances = sales.reduce((s, x) => s + Math.max(0, x.total - payments.filter((p) => p.saleId === x.id).reduce((a, b) => a + b.amount, 0)), 0);
    const tresorerie = INITIAL_CASH + totalEncaisse - totalAchatsPaye;
    const beneficeVentes = sales.reduce((s, x) => s + (x.total - x.cost), 0);
    const depensesTotal = expenses.reduce((s, x) => s + x.amount, 0);
    const beneficeNet = beneficeVentes - depensesTotal;
    const ventesJour = sales.filter((x) => x.date === TODAY).reduce((s, x) => s + x.total, 0);
    const achatsJour = purchases.filter((x) => x.date === TODAY).reduce((s, x) => s + x.total, 0);
    const lowStock = divers.filter((it) => it.qty <= it.min);
    return { stockOrValue, stockOrWeight, stockDiversValue, totalVentes, totalAchats, totalAchatsPaye, dettesAchats, tresorerie, beneficeVentes, depensesTotal, beneficeNet, ventesJour, achatsJour, lowStock, creances };
  }, [gold, divers, sales, purchases, payments, purchasePayments, expenses, prices]);

  const dailySeries = useMemo(() => {
    const days = [];
    for (let i = 9; i >= 0; i--) {
      const d = daysAgo(i);
      days.push({
        jour: dateFr(d).slice(0, 5),
        Ventes: sales.filter((s) => s.date === d).reduce((a, b) => a + b.total, 0),
        Achats: purchases.filter((p) => p.date === d).reduce((a, b) => a + b.total, 0),
      });
    }
    return days;
  }, [sales, purchases]);

  const karatBreakdown = useMemo(() => {
    const map = {};
    gold.forEach((it) => { map[it.karat] = (map[it.karat] || 0) + it.weight * it.qty * prices[it.karat].vente; });
    return KARATS.filter((k) => map[k]).map((k) => ({ name: `${k}K`, value: Math.round(map[k]) }));
  }, [gold, prices]);

  /* ----------------------------- handlers ----------------------------- */
  const nowTime = () => new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const me = () => (currentUser ? currentUser.name : "—");
  const log = (kind, verb, detail) => setJournal((arr) => [{ id: uid(), date: TODAY, time: nowTime(), by: me(), kind, verb, detail }, ...arr].slice(0, 1000));
  // retire le splash de chargement (logo Au dans index.html) une fois l'app affichée
  useEffect(() => { const b = typeof document !== "undefined" && document.getElementById("boot"); if (b) { b.style.opacity = "0"; setTimeout(() => { try { b.remove(); } catch (e) { /* */ } }, 350); } }, []);
  useEffect(() => { (async () => { try { const v = await STORE.get("atelierdor:guidedone"); if (v === "1") setGuideDismissed(true); } catch (e) { /* */ } })(); }, []);
  const dismissGuide = () => { setGuideDismissed(true); try { STORE.set("atelierdor:guidedone", "1"); } catch (e) { /* */ } };
  // enregistre le service worker + détecte les nouvelles versions déployées
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let baseHtml = null;       // contenu de la page au démarrage (référence)
    let stop = false;
    const fetchIndex = async () => {
      try { const r = await fetch("/?_v=" + Date.now(), { cache: "no-store" }); return r.ok ? await r.text() : null; }
      catch (e) { return null; }
    };
    const watchWorker = (sw) => { if (sw) sw.addEventListener("statechange", () => { if (sw.state === "installed" && navigator.serviceWorker.controller) setUpdateReady(true); }); };
    try {
      navigator.serviceWorker.register("/sw.js").then((reg) => {
        swRegRef.current = reg;
        if (reg.waiting && navigator.serviceWorker.controller) setUpdateReady(true);
        reg.addEventListener("updatefound", () => watchWorker(reg.installing));
      }).catch(() => {});
    } catch (e) { /* */ }
    let reloaded = false;
    const onCtrl = () => { if (reloaded) return; reloaded = true; window.location.reload(); };
    navigator.serviceWorker.addEventListener("controllerchange", onCtrl);
    const check = async () => {
      if (stop) return;
      if (swRegRef.current) swRegRef.current.update().catch(() => {});
      const html = await fetchIndex();
      if (!html) return;
      if (baseHtml === null) { baseHtml = html; return; }   // première fois : on mémorise la référence
      if (html !== baseHtml) setUpdateReady(true);
    };
    (async () => { baseHtml = await fetchIndex(); })();      // établit la référence au démarrage
    const t0 = setTimeout(check, 8000);                      // 1ère vérif rapide
    const iv = setInterval(check, 30000);                    // puis toutes les 30 s
    const onVis = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", check);
    window.addEventListener("online", check);
    return () => { stop = true; clearTimeout(t0); clearInterval(iv); document.removeEventListener("visibilitychange", onVis); window.removeEventListener("focus", check); window.removeEventListener("online", check); navigator.serviceWorker.removeEventListener("controllerchange", onCtrl); };
  }, []);
  const applyUpdate = () => {
    const reg = swRegRef.current;
    if (reg && reg.waiting) { reg.waiting.postMessage({ type: "SKIP_WAITING" }); setTimeout(() => window.location.reload(), 800); }
    else window.location.reload();
  };

  const chatUpsell = (info) => {
    const plan = license ? license.plan : "S";
    const planName = (FORMULAS[plan] || FORMULAS.S).name;
    let message;
    if (info.type === "file") message = `Ce document dépasse la limite de ${info.limit} Mo de ta formule ${planName}. Passe en Pro pour envoyer jusqu'à 15 Mo (Premium : 50 Mo), ou choisis un fichier plus léger.`;
    else message = `Les messages vocaux sont limités à ${info.limit} s avec ta formule ${planName}. Passe en Pro pour des vocaux jusqu'à 2 min (Premium : 5 min).`;
    setMediaUpsell({ message });
  };
  const sendMessage = (payload) => {
    if (!currentUser) return;
    const p = typeof payload === "string" ? { text: payload } : (payload || {});
    const text = (p.text || "").trim();
    if (!text && !p.image && !p.audio && !p.file) return;
    const msg = { id: uid(), userId: currentUser.id, by: me(), role: currentUser.role, date: TODAY, time: nowTime(), ts: Date.now() };
    if (p.to && p.to !== "all") msg.to = p.to;
    if (text) msg.text = text;
    if (p.image) msg.image = p.image;
    if (p.audio) msg.audio = p.audio;
    if (p.file) msg.file = p.file;
    setMessages((arr) => [...arr, msg].slice(-500));
  };
  const deleteMessage = (m) => {
    if (!m) return;
    ask({
      title: "Supprimer ce message ?", message: "Ce message sera retiré pour toute l'équipe. Cette action est irréversible.",
      danger: true, okLabel: "Supprimer",
      onOk: () => {
        const paths = [];
        [m.image, m.audio, m.file].forEach((md) => { if (md && typeof md === "object" && md.path) paths.push(md.path); });
        if (paths.length) { try { supabase.storage.from("chat").remove(paths); } catch (e) { /* */ } }
        setMessages((arr) => arr.map((x) => x.id === m.id ? { id: x.id, userId: x.userId, by: x.by, role: x.role, date: x.date, time: x.time, ts: x.ts, ...(x.to ? { to: x.to } : {}), removed: true } : x));
      },
    });
  };
  const markSeen = (key, ts) => {
    if (!ts) return;
    setChatSeen((prev) => { if ((prev[key] || 0) >= ts) return prev; const next = { ...prev, [key]: ts }; try { STORE.set("atelierdor:chatseenmap", JSON.stringify(next)); } catch (e) { /* */ } return next; });
    if (currentUser) setReads((arr) => { const cur = arr.find((r) => r.id === currentUser.id); const newTs = Math.max(cur ? cur.ts || 0 : 0, ts); const others = arr.filter((r) => r.id !== currentUser.id); return [...others, { id: currentUser.id, userId: currentUser.id, name: me(), ts: newTs, active: Date.now() }]; });
  };
  // présence "en ligne" : pendant que la messagerie est ouverte, on rafraîchit notre activité (synchronisé via reads)
  useEffect(() => {
    if (!currentUser || !chatOpen) return;
    const beat = () => setReads((arr) => {
      const cur = arr.find((r) => r.id === currentUser.id);
      const others = arr.filter((r) => r.id !== currentUser.id);
      return [...others, { id: currentUser.id, userId: currentUser.id, name: me(), ts: cur ? (cur.ts || 0) : 0, active: Date.now() }];
    });
    beat();
    const iv = setInterval(beat, 30000);
    return () => clearInterval(iv);
  }, [currentUser ? currentUser.id : null, chatOpen]);
  const paidFor = (saleId) => payments.filter((p) => p.saleId === saleId).reduce((a, b) => a + b.amount, 0);
  const balanceFor = (sale) => sale.total - paidFor(sale.id);
  const purchasePaidFor = (pid) => purchasePayments.filter((p) => p.purchaseId === pid).reduce((a, b) => a + b.amount, 0);
  const purchaseBalance = (p) => p.total - purchasePaidFor(p.id);
  const ensureClient = (name) => { if (name && !clients.find((c) => c.name === name)) setClients((c) => [...c, { id: uid(), name, phone: "", note: "" }]); };
  const addSale = (s) => {
    ensureClient(s.client);
    const rec = { id: uid(), date: TODAY, time: nowTime(), no: "V" + Date.now().toString(36).slice(-5).toUpperCase(), by: me(), ...s };
    setSales((arr) => [rec, ...arr]);
    setPayments((arr) => [{ id: uid(), saleId: rec.id, date: TODAY, time: rec.time, amount: s.paid != null ? s.paid : s.total, pay: s.pay, by: me() }, ...arr]);
    if ((s.kind === "or" || s.kind === "bijoux") && s.stockId) setGold((arr) => arr.map((it) => it.id === s.stockId ? { ...it, qty: Math.max(0, it.qty - 1) } : it));
    if (s.kind === "divers" && s.diversId) setDivers((arr) => arr.map((it) => it.id === s.diversId ? { ...it, qty: Math.max(0, it.qty - s.dQty) } : it));
    log("vente", "Vente créée", `${s.label} · ${fcfa(s.total)}${s.client ? " · " + s.client : ""}`);
    setModal(null);
    setReceipt(buildReceipt(rec));
  };
  const recordPayment = (sale, { amount, pay }) => {
    setPayments((arr) => [{ id: uid(), saleId: sale.id, date: TODAY, time: nowTime(), amount, pay, by: me() }, ...arr]);
    log("paiement", "Encaissement", `${fcfa(amount)} · ${sale.label}${sale.client ? " · " + sale.client : ""}`);
    setAcompteFor(null);
  };
  const addPurchase = (p) => {
    ensureClient(p.client);
    const rec = { id: uid(), date: TODAY, time: nowTime(), no: "A" + Date.now().toString(36).slice(-5).toUpperCase(), kind: "purchase", by: me(), ...p };
    setPurchases((arr) => [rec, ...arr]);
    setPurchasePayments((arr) => [{ id: uid(), purchaseId: rec.id, date: TODAY, time: rec.time, amount: p.paid != null ? p.paid : p.total, pay: p.pay || "Espèces", by: me() }, ...arr]);
    setGold((arr) => [{ id: uid(), type: "Débris", desc: `Rachat ${p.client || "client"}`, karat: p.karat, weight: p.weight, qty: 1, cat: "or", origin: { from: "rachat", client: p.client || "", date: TODAY, price: p.total, purchaseId: rec.id } }, ...arr]);
    log("achat", "Achat d'or créé", `${p.karat ? p.karat + "K" : "or brut"} · ${g(p.weight)} · ${fcfa(p.total)}${p.client ? " · " + p.client : ""}`);
    setModal(null);
    setReceipt(buildReceipt(rec));
  };
  const settlePurchase = (purchase, { amount, pay }) => {
    setPurchasePayments((arr) => [{ id: uid(), purchaseId: purchase.id, date: TODAY, time: nowTime(), amount, pay, by: me() }, ...arr]);
    log("paiement", "Règlement d'un rachat", `${fcfa(amount)}${purchase.client ? " · " + purchase.client : ""}`);
    setSettleFor(null);
  };
  const recordReturn = (sale, { amount, pay, restock, motif }) => {
    if (amount > 0) setExpenses((arr) => [{ id: uid(), date: TODAY, label: `Retour — ${sale.label}${motif ? " · " + motif : ""}`, cat: "Remboursement", pay, amount, by: me() }, ...arr]);
    if (restock) {
      if (sale.stockId) setGold((arr) => arr.map((it) => it.id === sale.stockId ? { ...it, qty: it.qty + 1 } : it));
      else if (sale.diversId) setDivers((arr) => arr.map((it) => it.id === sale.diversId ? { ...it, qty: it.qty + (sale.dQty || 1) } : it));
    }
    setSales((arr) => arr.map((s) => s.id === sale.id ? { ...s, returned: true } : s));
    log("retour", "Retour de vente", `${sale.label}${amount > 0 ? " · remboursé " + fcfa(amount) : ""}`);
    setReturnFor(null);
  };
  const saveGold = (it) => { setGold((arr) => it.id ? arr.map((x) => x.id === it.id ? it : x) : [{ id: uid(), added: TODAY, ...it }, ...arr]); log("stock", it.id ? "Article or modifié" : "Article or ajouté", `${it.desc || it.type || "Or"}${it.karat ? " · " + it.karat + "K" : ""}`); setModal(null); };
  const saveDivers = (it) => { setDivers((arr) => it.id ? arr.map((x) => x.id === it.id ? it : x) : [{ id: uid(), added: TODAY, ...it }, ...arr]); log("stock", it.id ? "Article divers modifié" : "Article divers ajouté", `${it.name}${it.qty != null ? " · qté " + it.qty : ""}`); setModal(null); };
  const saveClient = (it) => { setClients((arr) => it.id ? arr.map((x) => x.id === it.id ? it : x) : [{ id: uid(), ...it }, ...arr]); log("client", it.id ? "Client modifié" : "Client ajouté", it.name || ""); setModal(null); };
  const saveExpense = (it) => { setExpenses((arr) => it.id ? arr.map((x) => x.id === it.id ? it : x) : [{ id: uid(), date: TODAY, by: me(), ...it }, ...arr]); log("depense", it.id ? "Dépense modifiée" : "Dépense ajoutée", `${it.label || ""} · ${fcfa(it.amount || 0)}`); setModal(null); };

  // ---- Trésorerie (Banque / Wave / Orange Money) ----
  const acctInit = (acc) => { const xs = treasury.filter((t) => t.type === "init" && t.account === acc).sort((a, b) => a.ts - b.ts); return xs.length ? xs[xs.length - 1].amount : 0; };
  const acctIn = (acc) => treasury.filter((t) => (t.type === "depot" && t.account === acc) || (t.type === "transfert" && t.to === acc)).reduce((s, t) => s + t.amount, 0);
  const acctOut = (acc) => treasury.filter((t) => (t.type === "retrait" && t.account === acc) || (t.type === "transfert" && t.account === acc)).reduce((s, t) => s + t.amount, 0);
  const acctBal = (acc) => acctInit(acc) + acctIn(acc) - acctOut(acc);
  const treasuryBalances = { banque: acctBal("banque"), wave: acctBal("wave"), om: acctBal("om"), caisse: acctBal("caisse") };
  const accLabelT = (id) => (TREASURY_ACCOUNTS.find((a) => a.id === id) || {}).label || (id === "caisse" ? "Caisse" : id);
  const saveTreasury = (mv) => {
    const entry = { id: uid(), ts: Date.now(), date: TODAY, by: me(), ...mv };
    setTreasury((arr) => mv.type === "init" ? [...arr.filter((t) => !(t.type === "init" && t.account === mv.account)), entry] : [...arr, entry]);
    const d = mv.type === "init" ? `Solde initial ${accLabelT(mv.account)} : ${fcfa(mv.amount)}`
      : mv.type === "depot" ? `Dépôt ${accLabelT(mv.account)} : ${fcfa(mv.amount)}`
      : mv.type === "retrait" ? `Retrait ${accLabelT(mv.account)} : ${fcfa(mv.amount)}`
      : `Transfert ${accLabelT(mv.account)} → ${accLabelT(mv.to)} : ${fcfa(mv.amount)}`;
    log("caisse", "Trésorerie", d);
    setModal(null);
  };
  const delTreasury = (id) => ask({ title: "Supprimer cette opération ?", message: "Le solde du compte sera recalculé.", danger: true, okLabel: "Supprimer", onOk: () => { setTreasury((arr) => arr.filter((t) => t.id !== id)); log("caisse", "Trésorerie", "Opération supprimée"); } });
  const paySalary = ({ name, amount, pay, month }) => {
    setExpenses((arr) => [{ id: uid(), date: TODAY, by: me(), label: `Salaire — ${name}${month ? " · " + month : ""}`, cat: "Salaire", pay, amount, note: "" }, ...arr]);
    log("depense", "Salaire versé", `${name} · ${fcfa(amount)}`);
    setModal(null);
  };
  const saveUser = (it) => {
    const f = license ? FORMULAS[license.plan] : null;
    if (f && !it.id) {
      const admins = users.filter((u) => u.role === "patron").length;
      const vend = users.filter((u) => u.role === "vendeur").length;
      if (it.role === "patron" && admins >= f.admins) { notify(`La formule ${f.name} autorise ${f.admins} admin(s). Choisis une formule supérieure pour en ajouter.`, "Limite atteinte"); return; }
      if (it.role === "vendeur" && vend >= f.users) { notify(`La formule ${f.name} autorise ${f.users} utilisateur(s). Choisis une formule supérieure pour en ajouter.`, "Limite atteinte"); return; }
    }
    setUsers((arr) => {
      if (it.id) {
        return arr.map((x) => {
          if (x.id !== it.id) return x;
          const base = { id: x.id, name: it.name, email: it.email, role: it.role, salt: x.salt, pwHash: x.pwHash };
          if (it.password) { const salt = genSalt(); base.salt = salt; base.pwHash = hashPwd(it.password, salt); }
          return base;
        });
      }
      const salt = genSalt();
      return [...arr, { id: uid(), name: it.name, email: it.email, role: it.role, salt, pwHash: hashPwd(it.password || "", salt) }];
    });
    if (currentUser && it.id === currentUser.id) setCurrentUser((p) => ({ ...p, name: it.name, email: it.email, role: it.role }));
    log("user", it.id ? "Utilisateur modifié" : "Utilisateur créé", `${it.name || ""} (${it.role === "patron" ? "patron" : "vendeur"})`);
    setModal(null);
  };
  const delUser = (id) => {
    if (users.length <= 1) { notify("Il faut garder au moins un utilisateur.", "Action impossible"); return; }
    const u = users.find((x) => x.id === id);
    ask({ title: "Supprimer cet employé ?", message: u ? `« ${u.name} » ne pourra plus se connecter.` : "Cet employé ne pourra plus se connecter.", danger: true, okLabel: "Supprimer", onOk: () => { setUsers((arr) => arr.filter((x) => x.id !== id)); log("user", "Utilisateur supprimé", u ? u.name : ""); } });
  };
  const login = (u) => { setCurrentUser(u); setView("dash"); try { STORE.set("atelierdor:session", u.id); } catch (e) { /* */ } };
  const logout = () => {
    try { STORE.del("atelierdor:session"); } catch (e) { /* */ }
    try { STORE.del("atelierdor:view"); } catch (e) { /* */ }
    try { supabase.auth.signOut(); } catch (e) { /* */ }
    setOnlineReady(false); setCurrentUser(null); setView("dash"); setNavOpen(false);
  };
  // entrée en ligne : reconstitue licence + utilisateur à partir de la boutique Supabase
  const enterOnline = useCallback((profile, shopRow) => {
    const expS = shopRow.expiry ? String(shopRow.expiry).slice(0, 10) : "";
    setLicense({ valid: true, plan: shopRow.plan || "S", lifetime: false, expiry: expS ? new Date(expS) : null, code: "online" });
    const mail = authUser && authUser.email ? authUser.email : "";
    setCurrentUser({ id: authUser ? authUser.id : "online", name: profile.name || (mail ? mail.split("@")[0] : "Utilisateur"), email: mail, role: profile.role === "admin" ? "patron" : "vendeur", poste: profile.poste || "", perms: Array.isArray(profile.perms) ? profile.perms : null, shopId: shopRow.id });
    setOnlineReady(true);
  }, [authUser]);
  const activate = (c) => {
    const v = verifyActivation(c);
    if (v.valid) { const norm = c.replace(/\s+/g, "").toUpperCase(); STORE.set("atelierdor:license", norm); setLicense({ ...v, code: norm }); }
    return v;
  };
  const startTrial = () => {
    const code = genActivation("E");
    const v = verifyActivation(code);
    STORE.set("atelierdor:license", code); STORE.set("atelierdor:trialused", "1");
    setTrialUsed(true); setLicense({ ...v, code });
  };
  const chooseFormula = (k) => {
    const f = FORMULAS[k];
    const msg = `Bonjour, je souhaite la formule ${f.name} (${priceLabelOf(k)}) pour Atelier d'Or${shop?.name ? ` — boutique : ${shop.name}` : ""}.`;
    const phone = String(resellerPhone || "").replace(/[^\d]/g, "");
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    setFormulaReq({ name: f.name, msg, url, hasPhone: !!phone });
  };
  const contactReseller = () => {
    const msg = `Bonjour, je souhaite activer / renouveler mon abonnement Atelier d'Or${shop?.name ? ` (boutique : ${shop.name})` : ""}.`;
    const phone = String(resellerPhone || "").replace(/[^\d]/g, "");
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    setFormulaReq({ name: "abonnement", msg, url, hasPhone: !!phone });
  };
  const goAdmin = () => { try { window.location.hash = "admin-create"; } catch (e) { /* */ } setRoute("admin"); };
  const exitAdmin = () => { try { window.location.hash = ""; } catch (e) { /* */ } setRoute("app"); };
  const authSignOut = async () => { try { await supabase.auth.signOut(); } catch (e) { /* */ } setAuthUser(null); };
  const exitEspace = () => { try { window.location.hash = ""; } catch (e) { /* */ } setRoute("app"); };
  const exitClient = () => { try { window.location.hash = ""; } catch (e) { /* */ } setRoute("app"); };

  const buildBackupJson = () => JSON.stringify({
    _app: "AtelierDor", _exportedAt: new Date().toISOString(),
    gold, divers, clients, sales, purchases, purchasePayments, closures, payments, expenses, treasury, users,
    settings: { prime, mVente, mAchat, shop, fondCaisse, resellerPhone },
  }, null, 2);

  const applyImport = (d) => {
    if (d.gold) setGold(d.gold);
    if (d.divers) setDivers(d.divers);
    if (d.clients) setClients(d.clients);
    if (d.sales) setSales(d.sales);
    if (d.purchases) setPurchases(d.purchases);
    if (d.purchasePayments) setPurchasePayments(d.purchasePayments);
    if (d.closures) setClosures(d.closures);
    if (d.payments) setPayments(d.payments);
    if (d.expenses) setExpenses(d.expenses);
    if (d.users && d.users.length) setUsers(d.users);
    if (d.settings) {
      setPrime(d.settings.prime ?? 3);
      setMVente(d.settings.mVente ?? 8);
      setMAchat(d.settings.mAchat ?? 4);
      if (d.settings.shop) setShop(d.settings.shop);
      if (d.settings.fondCaisse != null) setFondCaisse(d.settings.fondCaisse);
    }
    setBackup(null);
    notify("Toutes les données ont été restaurées.", "Sauvegarde importée");
  };
  const del = (setter, id, kind, label) => ask({ title: "Supprimer cet élément ?", message: label ? `« ${label} » sera définitivement retiré.` : "Cet élément sera définitivement retiré. Cette action est irréversible.", danger: true, okLabel: "Supprimer", onOk: () => { setter((arr) => arr.filter((x) => x.id !== id)); if (kind) log(kind, "Suppression", label || ""); } });

  /* ------------------------------- vues ------------------------------- */
  const NAV = [
    { id: "dash", label: "Tableau de bord", icon: LayoutGrid },
    { id: "sales", label: "Ventes", icon: ShoppingCart },
    { id: "buy", label: "Achats d'or", icon: ArrowDownLeft },
    { id: "stock", label: "Stock", icon: Package },
    { id: "clients", label: "Clients", icon: Users },
    { id: "credits", label: "Crédits & dettes", icon: Receipt },
    { id: "caisse", label: "Clôture de caisse", icon: Banknote },
    { id: "banque", label: "Banque & comptes", icon: Landmark },
    { id: "depenses", label: "Dépenses", icon: TrendingDown },
    { id: "reports", label: "Rapports", icon: BarChart3 },
    { id: "journal", label: "Historique", icon: History },
    { id: "cours", label: "Cours de l'or", icon: Coins },
    { id: "calc", label: "Calculatrice", icon: Calculator },
    { id: "settings", label: "Paramètres", icon: Settings },
    { id: "abo", label: "Abonnement", icon: Wallet },
  ];
  const go = (id) => { setView(id); setNavOpen(false); };
  useEffect(() => { setQ(""); }, [view]);

  // --- Bouton/flèche RETOUR : navigue dans l'app au lieu de quitter ---
  const navStackRef = useRef(["dash"]);
  const poppingRef = useRef(false);
  const overlayRef = useRef({ nav: false, modal: false, backup: false });
  useEffect(() => { overlayRef.current = { nav: navOpen, modal: !!modal, backup: !!backup }; }, [navOpen, modal, backup]);
  useEffect(() => {
    if (!currentUser) return;
    if (poppingRef.current) { poppingRef.current = false; return; }
    const st = navStackRef.current;
    if (st[st.length - 1] === view) return;
    st.push(view);
    try { window.history.pushState({ adv: view }, ""); } catch (e) { /* */ }
  }, [view, currentUser]);
  useEffect(() => {
    // entrée dans l'app : un état "tampon" pour intercepter le 1er retour
    if (currentUser) { try { window.history.pushState({ adGuard: 1 }, ""); } catch (e) { /* */ } navStackRef.current = ["dash"]; }
  }, [currentUser ? currentUser.id : null]);
  useEffect(() => {
    const onPop = () => {
      const ov = overlayRef.current;
      // 1) fermer le menu latéral
      if (ov.nav) { setNavOpen(false); try { window.history.pushState({}, ""); } catch (e) { /* */ } return; }
      // 2) fermer une fenêtre ouverte
      if (ov.backup) { setBackup(null); try { window.history.pushState({}, ""); } catch (e) { /* */ } return; }
      if (ov.modal) { setModal(null); try { window.history.pushState({}, ""); } catch (e) { /* */ } return; }
      // 3) revenir à l'écran précédent
      const st = navStackRef.current;
      if (st.length > 1) { st.pop(); poppingRef.current = true; setView(st[st.length - 1]); }
      // sinon (tableau de bord) : on laisse le retour quitter normalement
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // --- Installation PWA : on capte l'événement dès le chargement (sinon trop tard) ---
  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setInstallPrompt(e); };
    const onInstalled = () => { setInstalledPWA(true); setInstallPrompt(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    try { if ((window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone) setInstalledPWA(true); } catch (e) { /* */ }
    try { const d = STORE.get("atelierdor:installdismiss"); if (d && d.then) d.then((v) => { if (v === "1") setInstallDismissed(true); }); } catch (e) { /* */ }
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);
  const doInstall = async () => {
    if (installPrompt) { try { installPrompt.prompt(); await installPrompt.userChoice; } catch (e) { /* */ } setInstallPrompt(null); return true; }
    return false;
  };
  const dismissInstall = () => { setInstallDismissed(true); try { STORE.set("atelierdor:installdismiss", "1"); } catch (e) { /* */ } };
  const isIosDevice = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent || "");
  const isPhone = typeof navigator !== "undefined" && /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent || "");
  const showInstallBar = currentUser && !installedPWA && !installDismissed && (installPrompt || isIosDevice) && isPhone;

  // empêche la page du fond de défiler quand le menu OU le chat (téléphone) est ouvert (fix iPhone)
  useEffect(() => {
    const lock = navOpen || (chatOpen && isPhone);
    if (!lock) return;
    const y = window.scrollY || window.pageYOffset || 0;
    const b = document.body;
    const prev = { position: b.style.position, top: b.style.top, left: b.style.left, right: b.style.right, width: b.style.width, overflow: b.style.overflow };
    b.style.position = "fixed"; b.style.top = "-" + y + "px"; b.style.left = "0"; b.style.right = "0"; b.style.width = "100%"; b.style.overflow = "hidden";
    return () => {
      b.style.position = prev.position; b.style.top = prev.top; b.style.left = prev.left; b.style.right = prev.right; b.style.width = prev.width; b.style.overflow = prev.overflow;
      window.scrollTo(0, y);
    };
  }, [navOpen, chatOpen, isPhone]);
  const PIE = ["#b8862f", "#d9a441", "#8a6520", "#caa45e", "#6e4f1c"];

  /* ----------------------- Excel : export / import ---------------------- */
  const rowsVentes = () => sales.map((s) => ({ Date: dateFr(s.date), Type: KIND_LABEL[s.kind] || "Or", Détail: s.label, Client: s.client || "", Vendeur: s.by || "", Paiement: s.pay || "", Total: s.total, Payé: paidFor(s.id), Reste: Math.max(0, balanceFor(s)), Coût: s.cost, Marge: s.total - s.cost }));
  const rowsAchats = () => purchases.map((p) => ({ Date: dateFr(p.date), Client: p.client || "", Carat: p.karat, "Poids (g)": p.weight, "Prix/g": p.ppg, Total: p.total, Payé: purchasePaidFor(p.id), Reste: Math.max(0, purchaseBalance(p)), Note: p.note || "", Par: p.by || "" }));
  const rowsGold = (list) => list.map((it) => ({ Catégorie: goldCat(it) === "or" ? "Or brut" : "Bijou", Type: it.type, Description: it.desc || "", Carat: it.karat, "Poids (g)": it.weight, Qté: it.qty }));
  const rowsDivers = () => divers.map((it) => ({ Désignation: it.name, Catégorie: it.cat, Qté: it.qty, Unité: it.unit, Coût: it.cost, Vente: it.price, "Seuil min": it.min }));
  const rowsClients = () => clients.map((c) => ({ Nom: c.name, Téléphone: c.phone || "", Note: c.note || "", "Fournisseur pro": c.pro ? "Oui" : "" }));
  const rowsDepenses = () => expenses.map((e) => ({ Date: dateFr(e.date), Libellé: e.label, Catégorie: e.cat, Motif: e.note || "", Paiement: e.pay, Par: e.by || "", Montant: e.amount }));

  const canExcel = planAllows(license ? license.plan : "S", "excel");
  const xlsxExportG = (filename, sheets) => { if (!canExcel) { setUpsell("Export Excel"); return; } xlsxExport(filename, sheets); };
  const guardImport = (fn) => (file) => { if (!canExcel) { setUpsell("Import Excel"); return; } fn(file); };
  const exportAllXlsx = () => xlsxExportG(`atelier-dor-${TODAY}.xlsx`, {
    "Ventes": rowsVentes(), "Achats": rowsAchats(),
    "Stock or": rowsGold(gold.filter((it) => goldCat(it) === "or")),
    "Stock bijoux": rowsGold(gold.filter((it) => goldCat(it) === "bijou")),
    "Divers": rowsDivers(), "Clients": rowsClients(), "Dépenses": rowsDepenses(),
  });

  const importGold = (file) => xlsxRead(file, (rows) => {
    const add = rows.map((r) => ({
      id: uid(), type: pick(r, ["Type"]) || "Bague", desc: pick(r, ["Description", "Desc"]),
      karat: parseInt(numOf(pick(r, ["Carat", "Karat"]))) || 21,
      weight: numOf(pick(r, ["Poids (g)", "Poids", "Weight"])),
      qty: parseInt(numOf(pick(r, ["Qté", "Quantité", "Quantite", "Qty"]))) || 1,
      cat: String(pick(r, ["Catégorie", "Categorie", "Cat"])).toLowerCase().startsWith("or") ? "or" : "bijou",
    })).filter((x) => x.weight > 0);
    if (!add.length) { notify("Aucune ligne valide (colonnes attendues : Type, Description, Carat, Poids (g), Qté, Catégorie).", "Import"); return; }
    setGold((arr) => [...add, ...arr]); notify(`${add.length} article(s) or importé(s).`, "Import réussi");
  });
  const importDivers = (file) => xlsxRead(file, (rows) => {
    const add = rows.map((r) => ({
      id: uid(), name: pick(r, ["Désignation", "Designation", "Nom", "Name"]),
      cat: pick(r, ["Catégorie", "Categorie"]) || "Fourniture",
      qty: parseInt(numOf(pick(r, ["Qté", "Quantité", "Quantite", "Qty"]))) || 0,
      unit: pick(r, ["Unité", "Unite", "Unit"]) || "pièce",
      cost: numOf(pick(r, ["Coût", "Cout", "Cost"])), price: numOf(pick(r, ["Vente", "Prix", "Price"])),
      min: parseInt(numOf(pick(r, ["Seuil min", "Min"]))) || 0,
    })).filter((x) => x.name);
    if (!add.length) { notify("Aucune ligne valide (colonnes attendues : Désignation, Catégorie, Qté, Unité, Coût, Vente, Seuil min).", "Import"); return; }
    setDivers((arr) => [...add, ...arr]); notify(`${add.length} article(s) divers importé(s).`, "Import réussi");
  });
  const importClients = (file) => xlsxRead(file, (rows) => {
    const add = rows.map((r) => ({ id: uid(), name: pick(r, ["Nom", "Name", "Client"]), phone: String(pick(r, ["Téléphone", "Telephone", "Phone", "Tel"])), note: pick(r, ["Note", "Remarque"]), pro: /oui|yes|1|x/i.test(String(pick(r, ["Fournisseur pro", "Pro"]))) }))
      .filter((c) => c.name && !clients.find((x) => x.name === c.name));
    if (!add.length) { notify("Aucun nouveau client (colonnes attendues : Nom, Téléphone, Note).", "Import"); return; }
    setClients((arr) => [...arr, ...add]); notify(`${add.length} client(s) importé(s).`, "Import réussi");
  });


  const renderDash = () => {
    const daysSince = (d) => Math.floor((Date.now() - new Date(d + "T00:00:00").getTime()) / 86400000);
    const lowStock = divers.filter((d) => (d.qty || 0) <= 2);
    const lateCredits = sales.filter((s) => !s.returned && balanceFor(s) > 0 && daysSince(s.date) >= 30);
    const lateTotal = lateCredits.reduce((a, s) => a + balanceFor(s), 0);
    const lastClosure = [...closures].sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
    const caisseAlert = lastClosure && Math.abs(lastClosure.ecart || 0) >= 1000 ? lastClosure : null;
    const alerts = [];
    if (lowStock.length) alerts.push({ key: "stock", icon: Package, tone: "clay", text: `${lowStock.length} article${lowStock.length > 1 ? "s" : ""} en stock bas`, sub: lowStock.slice(0, 3).map((d) => `${d.name} (${d.qty || 0})`).join(" · "), act: () => { go("stock"); setStockTab("divers"); } });
    if (lateCredits.length) alerts.push({ key: "credits", icon: Receipt, tone: "clay", text: `${lateCredits.length} créance${lateCredits.length > 1 ? "s" : ""} en retard (+30 jours)`, sub: `${fcfa(lateTotal)} à recouvrer`, act: () => go("credits") });
    if (isPatron && caisseAlert) alerts.push({ key: "caisse", icon: Wallet, tone: caisseAlert.ecart < 0 ? "clay" : "gold", text: caisseAlert.ecart < 0 ? `Manquant à la dernière clôture : ${fcfa(Math.abs(caisseAlert.ecart))}` : `Excédent à la dernière clôture : ${fcfa(caisseAlert.ecart)}`, sub: `Clôture du ${dateFr(caisseAlert.date)}`, act: () => go("caisse") });
    const guideSteps = [
      { id: "stock", label: "Ajouter ton stock d'or ou tes bijoux", done: gold.length > 0 || divers.length > 0, view: "stock", cta: "Aller au stock" },
      { id: "client", label: "Enregistrer un premier client", done: clients.length > 0, view: "clients", cta: "Ajouter un client" },
      { id: "sale", label: "Faire ta première vente", done: sales.length > 0, view: "sales", cta: "Nouvelle vente" },
      { id: "team", label: "Créer un compte employé", done: (teamMembers.length || 0) > 1, view: "equipe", cta: "Gérer l'équipe" },
    ];
    const guideCount = guideSteps.filter((s) => s.done).length;
    const showGuide = isPatron && !guideDismissed && guideCount < guideSteps.length;
    return (
    <>
      {showGuide && (
        <div className="card guide-card">
          <div className="guide-head">
            <div><h3 className="guide-title">👋 Bienvenue ! Quelques étapes pour bien démarrer</h3><p className="muted small" style={{ margin: "2px 0 0" }}>{guideCount} / {guideSteps.length} terminé</p></div>
            <button className="icon-btn" onClick={dismissGuide} title="Masquer le guide"><X size={16} /></button>
          </div>
          <div className="guide-bar"><div className="guide-fill" style={{ width: `${(guideCount / guideSteps.length) * 100}%` }} /></div>
          <div className="guide-steps">
            {guideSteps.map((s) => (
              <div key={s.id} className={`guide-step ${s.done ? "done" : ""}`}>
                <span className="guide-check">{s.done ? <Check size={14} /> : ""}</span>
                <span className="guide-lab">{s.label}</span>
                {!s.done && <button className="btn btn-xs btn-gold" onClick={() => go(s.view)}>{s.cta}</button>}
              </div>
            ))}
          </div>
        </div>
      )}
      {license && license.plan === "E" && (
        <button className="trial-banner" onClick={() => go("abo")}>
          <span className="trial-banner-dot" />
          <span>Essai gratuit — {planDaysLeft()} jour{planDaysLeft() > 1 ? "s" : ""} restant{planDaysLeft() > 1 ? "s" : ""}. Voir les formules et passer à un abonnement</span>
          <span className="trial-banner-arr">→</span>
        </button>
      )}
      {alerts.length > 0 && (
        <div className="alerts">
          {alerts.map((a) => (
            <button key={a.key} className={`alert-row alert-${a.tone}`} onClick={a.act}>
              <a.icon size={18} />
              <div className="alert-main"><div className="alert-text">{a.text}</div>{a.sub && <div className="alert-sub">{a.sub}</div>}</div>
              <span className="alert-arr">→</span>
            </button>
          ))}
        </div>
      )}
      <div className="kpis">
        <Kpi icon={Coins} label="Valeur du stock or" value={fcfa(m.stockOrValue)} sub={`${g(m.stockOrWeight)} · au cours du jour`} tone="gold" />
        <Kpi icon={Wallet} label="Trésorerie" value={fcfa(m.tresorerie)} sub="caisse + mobile money" tone="green" />
        <Kpi icon={TrendingUp} label="Ventes du jour" value={fcfa(m.ventesJour)} sub={seeMargin ? `Bénéfice cumulé ${fcfa(m.beneficeVentes)}` : "chiffre d'affaires du jour"} tone="gold" />
        <Kpi icon={TrendingDown} label="Achats du jour" value={fcfa(m.achatsJour)} sub="rachats clients" tone="clay" />
      </div>
      <div className="row2">
        <div className="card">
          <div className="card-head"><h3>Mouvements — 10 derniers jours</h3><span className="muted">FCFA</span></div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={dailySeries} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6ddcc" vertical={false} />
                <XAxis dataKey="jour" tick={{ fontSize: 11, fill: "#8a7d68" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#8a7d68" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip formatter={(v) => fcfaLong(v)} contentStyle={{ borderRadius: 10, border: "1px solid #e6ddcc", fontSize: 12 }} />
                <Bar dataKey="Ventes" fill="#b8862f" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Achats" fill="#9c4a35" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><h3>Stock or par carat</h3></div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={karatBreakdown} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={2}>
                  {karatBreakdown.map((e, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => fcfaLong(v)} contentStyle={{ borderRadius: 10, border: "1px solid #e6ddcc", fontSize: 12 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {m.lowStock.length > 0 && (
        <div className="card alert-card">
          <div className="alert-ico"><AlertTriangle size={18} /></div>
          <div><strong>Stock bas — {m.lowStock.length} article(s)</strong><p className="muted">{m.lowStock.map((x) => `${x.name} (${x.qty} ${x.unit})`).join(" · ")}</p></div>
          <button className="btn btn-line" onClick={() => { go("stock"); setStockTab("divers"); }}>Voir le stock</button>
        </div>
      )}

      <div className="card">
        <div className="card-head">
          <h3>Dernières opérations</h3>
          <div className="seg" style={{ marginBottom: 0 }}>
            <button className={`seg-btn ${opsTab === "sales" ? "active" : ""}`} onClick={() => setOpsTab("sales")}>Ventes</button>
            <button className={`seg-btn ${opsTab === "purchases" ? "active" : ""}`} onClick={() => setOpsTab("purchases")}>Achats</button>
          </div>
        </div>
        <table className="table fit">
          <thead><tr><th>Date</th><th className="hide-sm">Type</th><th>Détail</th><th className="hide-sm">Client</th><th className="r">Montant</th></tr></thead>
          <tbody>
            {opsTab === "sales" ? sortColl("sales", sales).slice(0, 10).map((s) => (
              <tr key={s.id} className="row-click" onClick={() => setHistory({ type: "sale", item: s })}>
                <td className="num">{dateFr(s.date)}{s.time && <span className="cell-time">{s.time}</span>}</td>
                <td className="hide-sm"><span className={`pill ${s.kind === "divers" ? "pill-ink" : "pill-gold"}`}>Vente {(KIND_LABEL[s.kind] || "Or").toLowerCase()}</span></td>
                <td>{s.label}<StatusPill total={s.total} paid={s.total - balanceFor(s)} returned={s.returned} /></td>
                <td className="hide-sm">{clientCell(s.client)}</td>
                <td className="r num pos">+{fcfa(s.total)}</td>
              </tr>
            )) : sortColl("purchases", purchases).slice(0, 10).map((p) => (
              <tr key={p.id} className="row-click" onClick={() => setHistory({ type: "purchase", item: p })}>
                <td className="num">{dateFr(p.date)}{p.time && <span className="cell-time">{p.time}</span>}</td>
                <td className="hide-sm"><span className="pill pill-clay">Achat or</span></td>
                <td>{p.karat ? p.karat + "K" : "Or brut"} · {g(p.weight)}<StatusPill total={p.total} paid={purchasePaidFor(p.id)} /></td>
                <td className="hide-sm">{clientCell(p.client)}</td>
                <td className="r num neg">−{fcfa(p.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
  };

  const renderSales = () => {
    const list = sortColl("sales", sales.filter((s) => (s.label + s.client).toLowerCase().includes(q.toLowerCase())));
    return (
      <div className="card">
        <div className="card-head">
          <h3>Historique des ventes <span className="count">{sales.length}</span></h3>
          <div className="head-btns">
            <button className="btn btn-line" onClick={() => xlsxExportG(`ventes-${TODAY}.xlsx`, { Ventes: rowsVentes() })}><Download size={15} /> Excel</button>
            {canEdit("sales") && <button className="btn btn-gold" onClick={() => setModal({ type: "sale" })}><Plus size={16} /> Nouvelle vente</button>}
          </div>
        </div>
        <table className="table fit">
          <thead><tr><th>Date</th><th className="hide-sm">Type</th><th>Détail</th><th className="hide-sm">Client</th><th className="hide-sm">Vendeur</th><th className="hide-sm">Paiement</th>{seeMargin && <th className="r hide-sm">Marge</th>}<th className="r">Total</th><th></th></tr></thead>
          <tbody>
            {list.map((s) => {
              const bal = balanceFor(s);
              return (
              <tr key={s.id} className="row-click" onClick={() => setHistory({ type: "sale", item: s })}>
                <td className="num">{dateFr(s.date)}{s.time && <span className="cell-time">{s.time}</span>}</td>
                <td className="hide-sm"><span className={`pill ${s.kind === "divers" ? "pill-ink" : "pill-gold"}`}>{KIND_LABEL[s.kind] || "Or"}</span></td>
                <td>{s.label}<StatusPill total={s.total} paid={s.total - bal} returned={s.returned} />{bal > 0 && <span className="mini-warn">reste {fcfa(bal)}</span>}{s.returned && <span className="pill pill-ink" style={{ marginLeft: 6 }}>retournée</span>}</td>
                <td className="hide-sm">{clientCell(s.client)}</td>
                <td className="muted hide-sm">{s.by || "—"}</td>
                <td className="muted hide-sm">{s.pay}</td>
                {seeMargin && <td className="r num hide-sm">{fcfa(s.total - s.cost)}</td>}
                <td className="r num pos">{fcfa(s.total)}</td>
                <td className="r"><div className="rowbtns" onClick={(e) => e.stopPropagation()}>
                  {isPatron && !s.returned && <button className="btn btn-xs btn-line" onClick={() => setReturnFor(s)}>Retour</button>}
                  <button className="icon-btn" title="Voir le reçu" onClick={() => setReceipt(buildReceipt(s))}><Receipt size={15} /></button>
                </div></td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderBuy = () => (
    <div className="card">
      <div className="card-head">
        <h3>Achats d'or (rachats clients) <span className="count">{purchases.length}</span></h3>
        <div className="head-btns">
          <button className="btn btn-line" onClick={() => xlsxExportG(`achats-${TODAY}.xlsx`, { Achats: rowsAchats() })}><Download size={15} /> Excel</button>
          {canEdit("buy") && <button className="btn btn-clay" onClick={() => setModal({ type: "purchase" })}><Plus size={16} /> Nouvel achat</button>}
        </div>
      </div>
      <table className="table fit">
        <thead><tr><th>Date</th><th>Client</th><th className="hide-sm">Carat</th><th className="r">Poids</th><th className="r hide-sm">Prix/g</th><th className="hide-sm">Note</th><th className="hide-sm">Par</th><th className="r">Payé</th><th></th></tr></thead>
        <tbody>
          {sortColl("purchases", purchases).map((p) => {
            const bal = purchaseBalance(p);
            return (
            <tr key={p.id} className="row-click" onClick={() => setHistory({ type: "purchase", item: p })}>
              <td className="num">{dateFr(p.date)}{p.time && <span className="cell-time">{p.time}</span>}</td>
              <td>{clientCell(p.client)}</td>
              <td className="hide-sm"><Badge k={p.karat} /></td>
              <td className="r num">{g(p.weight)}</td>
              <td className="r num hide-sm">{fcfa(p.ppg)}</td>
              <td className="muted hide-sm">{p.note}</td>
              <td className="muted hide-sm">{p.by || "—"}</td>
              <td className="r num neg">
                −{fcfa(purchasePaidFor(p.id))}
                <div><StatusPill total={p.total} paid={purchasePaidFor(p.id)} /></div>
                {bal > 0 && <div className="mini-warn">reste {fcfa(bal)}</div>}
              </td>
              <td className="r"><div className="rowbtns" onClick={(e) => e.stopPropagation()}>
                {bal > 0 && <button className="btn btn-xs btn-clay" onClick={() => setSettleFor(p)}>Solder</button>}
                <button className="icon-btn" title="Voir le bordereau" onClick={() => setReceipt(buildReceipt({ ...p, paid: purchasePaidFor(p.id), kind: "purchase" }))}><Receipt size={15} /></button>
              </div></td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const clientCell = (name) => name
    ? <button className="name-link" onClick={() => setClientView(name)}>{name}</button>
    : <span className="muted">—</span>;

  const renderClientHistory = () => {
    const name = clientView;
    const cl = clients.find((c) => c.name === name);
    const cSales = sales.filter((s) => s.client === name);
    const cPurch = purchases.filter((p) => p.client === name);
    const totV = cSales.reduce((a, s) => a + s.total, 0);
    const totA = cPurch.reduce((a, p) => a + p.total, 0);
    const creance = cSales.reduce((a, s) => a + Math.max(0, balanceFor(s)), 0);
    const reste = cPurch.reduce((a, p) => a + Math.max(0, purchaseBalance(p)), 0);
    const cat = { or: 0, bijoux: 0, divers: 0 };
    cSales.forEach((s) => { cat[s.kind === "divers" ? "divers" : s.kind === "bijoux" ? "bijoux" : "or"] += s.total; });
    const isClient = cSales.length > 0;
    const isFourn = cPurch.length > 0;
    return (
      <Modal title={name} sub={cl && cl.phone ? `Tél : ${cl.phone}` : "Historique"} onClose={() => setClientView(null)}>
        <div className="role-tags">
          {isClient && <span className="pill pill-gold">Client</span>}
          {isFourn && <span className="pill pill-ink">Fournisseur</span>}
          {!isClient && !isFourn && <span className="muted small">Aucune opération enregistrée.</span>}
        </div>
        <div className="ch-kpis">
          <div className="ch-kpi"><span>Ventes</span><strong className="num">{fcfa(totV)}</strong></div>
          <div className="ch-kpi"><span>Achats</span><strong className="num">{fcfa(totA)}</strong></div>
          <div className="ch-kpi"><span>Il te doit</span><strong className="num neg">{fcfa(creance)}</strong></div>
          <div className="ch-kpi"><span>À lui payer</span><strong className="num neg">{fcfa(reste)}</strong></div>
        </div>
        {isClient && (cat.or + cat.bijoux + cat.divers > 0) && (
          <div className="cat-split">
            <span className="cat-chip"><em>Or</em> {fcfa(cat.or)}</span>
            <span className="cat-chip"><em>Bijoux</em> {fcfa(cat.bijoux)}</span>
            <span className="cat-chip"><em>Divers</em> {fcfa(cat.divers)}</span>
          </div>
        )}
        <h4 className="ch-h">Ventes <span className="count">{cSales.length}</span></h4>
        {cSales.length === 0 ? <p className="muted small">Aucune vente.</p> : (
          <table className="table compact"><tbody>
            {cSales.map((s) => {
              const bal = balanceFor(s);
              return (
                <tr key={s.id}>
                  <td className="num">{dateFr(s.date)}</td>
                  <td><span className={`pill ${s.kind === "divers" ? "pill-ink" : "pill-gold"}`}>{KIND_LABEL[s.kind] || "Or"}</span></td>
                  <td>{s.label}{bal > 0 && <span className="mini-warn">reste {fcfa(bal)}</span>}</td>
                  <td className="r num pos">{fcfa(s.total)}</td>
                  <td className="r"><button className="icon-btn" title="Voir le reçu" onClick={() => setReceipt(buildReceipt(s))}><Receipt size={15} /></button></td>
                </tr>
              );
            })}
          </tbody></table>
        )}
        <h4 className="ch-h">Achats / rachats <span className="count">{cPurch.length}</span></h4>
        {cPurch.length === 0 ? <p className="muted small">Aucun achat.</p> : (
          <table className="table compact"><tbody>
            {cPurch.map((p) => {
              const bal = purchaseBalance(p);
              return (
                <tr key={p.id}>
                  <td className="num">{dateFr(p.date)}</td>
                  <td>Rachat {p.karat}K · {g(p.weight)}{bal > 0 && <span className="mini-warn">reste {fcfa(bal)}</span>}</td>
                  <td className="r num neg">{fcfa(p.total)}</td>
                  <td className="r"><button className="icon-btn" title="Voir le bordereau" onClick={() => setReceipt(buildReceipt({ ...p, paid: purchasePaidFor(p.id), kind: "purchase" }))}><Receipt size={15} /></button></td>
                </tr>
              );
            })}
          </tbody></table>
        )}
      </Modal>
    );
  };

  const renderProductHistory = () => {
    const { kind, item } = productView;
    if (kind === "gold") {
      const linked = sales.filter((s) => s.stockId === item.id);
      const sold = linked.reduce((a, s) => a + s.total, 0);
      const marge = linked.reduce((a, s) => a + (s.total - s.cost), 0);
      const o = item.origin;
      return (
        <Modal title={`${item.type} ${item.karat}K · ${g(item.weight)}`} sub={item.desc || "Article du stock"} onClose={() => setProductView(null)}>
          {item.photo && <img className="prod-photo" src={item.photo} alt="" />}
          <div className="ch-kpis">
            <div className="ch-kpi"><span>En stock</span><strong className="num">{item.qty}</strong></div>
            <div className="ch-kpi"><span>Vendu (total)</span><strong className="num pos">{fcfa(sold)}</strong></div>
            {seeMargin && <div className="ch-kpi"><span>Marge</span><strong className="num">{fcfa(marge)}</strong></div>}
            <div className="ch-kpi"><span>En stock depuis</span><strong>{daysInStock(item) != null ? `${daysInStock(item)} j` : "—"}</strong></div>
          </div>
          <h4 className="ch-h">Entrée</h4>
          {o ? (
            <p className="req-msg">Racheté le {dateFr(o.date)}{o.client ? ` à ${o.client}` : ""} · payé {fcfa(o.price)}.</p>
          ) : enteredDate(item) ? (
            <p className="req-msg">Ajouté au stock le {dateFr(enteredDate(item))}.</p>
          ) : (
            <p className="muted small">Ajouté manuellement au stock (date non enregistrée).</p>
          )}
          <h4 className="ch-h">Sorties / ventes <span className="count">{linked.length}</span></h4>
          {linked.length === 0 ? <p className="muted small">Pas encore vendu via cet article. <span className="muted">(Les ventes « libres » ne sont pas rattachées.)</span></p> : (
            <table className="table compact"><tbody>
              {linked.map((s) => (
                <tr key={s.id}>
                  <td className="num">{dateFr(s.date)}</td>
                  <td>{s.client || "—"}</td>
                  <td className="r num pos">{fcfa(s.total)}</td>
                  <td className="r num">marge {fcfa(s.total - s.cost)}</td>
                  <td className="r"><button className="icon-btn" title="Voir le reçu" onClick={() => setReceipt(buildReceipt(s))}><Receipt size={15} /></button></td>
                </tr>
              ))}
            </tbody></table>
          )}
        </Modal>
      );
    }
    const linked = sales.filter((s) => s.diversId === item.id);
    const qtySold = linked.reduce((a, s) => a + (s.dQty || 0), 0);
    const sold = linked.reduce((a, s) => a + s.total, 0);
    return (
      <Modal title={item.name} sub="Article divers" onClose={() => setProductView(null)}>
        {item.photo && <img className="prod-photo" src={item.photo} alt="" />}
        <div className="ch-kpis">
          <div className="ch-kpi"><span>En stock</span><strong className="num">{item.qty} {item.unit}</strong></div>
          <div className="ch-kpi"><span>Vendu (qté)</span><strong className="num">{qtySold}</strong></div>
          <div className="ch-kpi"><span>Vendu (total)</span><strong className="num pos">{fcfa(sold)}</strong></div>
          <div className="ch-kpi"><span>Prix unitaire</span><strong className="num">{fcfa(item.price)}</strong></div>
        </div>
        <h4 className="ch-h">Sorties / ventes <span className="count">{linked.length}</span></h4>
        {linked.length === 0 ? <p className="muted small">Pas encore vendu.</p> : (
          <table className="table compact"><tbody>
            {linked.map((s) => (
              <tr key={s.id}>
                <td className="num">{dateFr(s.date)}</td>
                <td>{s.client || "—"}</td>
                <td className="r num">×{s.dQty}</td>
                <td className="r num pos">{fcfa(s.total)}</td>
                <td className="r"><button className="icon-btn" title="Voir le reçu" onClick={() => setReceipt(buildReceipt(s))}><Receipt size={15} /></button></td>
              </tr>
            ))}
          </tbody></table>
        )}
      </Modal>
    );
  };

  const renderStock = () => {
    const ql = q.trim().toLowerCase();
    const matchG = (it) => !ql || (`${it.type || ""} ${it.desc || it.description || ""} ${it.karat || ""}`).toLowerCase().includes(ql);
    const orItems = gold.filter((it) => goldCat(it) === "or" && matchG(it));
    const bijouxItems = gold.filter((it) => goldCat(it) === "bijou" && matchG(it));
    const goldTable = (list, title) => {
      const wt = list.reduce((a, it) => a + it.weight * it.qty, 0);
      const val = list.reduce((a, it) => a + it.weight * it.qty * prices[it.karat].vente, 0);
      return (
        <div className="card">
          <div className="card-head">
            <h3>{title} — {g(wt)} · {fcfa(val)}</h3>
            <div className="head-btns">
              <button className="btn btn-line" onClick={() => xlsxExportG(`stock-${title.toLowerCase().replace(/\s/g, "-")}-${TODAY}.xlsx`, { [title]: rowsGold(list) })}><Download size={15} /> Excel</button>
              <XlsxImportBtn label="Importer" onFile={guardImport(importGold)} />
              {canEdit("stock") && <button className="btn btn-gold" onClick={() => setModal({ type: "gold" })}><Plus size={16} /> Ajouter</button>}
            </div>
          </div>
          <table className="table">
            <thead><tr><th>Type</th><th>Description</th><th>Carat</th><th className="r">Poids u.</th><th className="r">Qté</th><th className="r">Valeur</th><th></th></tr></thead>
            <tbody>
              {list.length === 0 ? <tr><td colSpan={7} className="muted small">Aucun article dans cette catégorie.</td></tr> : list.map((it) => (
                <tr key={it.id}>
                  <td>
                    <div className="prod-cell">
                      {it.photo ? <img className="prod-thumb" src={it.photo} alt="" /> : <span className="prod-thumb ph">📷</span>}
                      <button className="name-link" onClick={() => setProductView({ kind: "gold", item: it })}>{it.type}</button>
                    </div>
                  </td>
                  <td className="muted">{it.desc}{daysInStock(it) != null && daysInStock(it) >= 90 && <span className="mini-warn">dort {daysInStock(it)} j</span>}</td>
                  <td><Badge k={it.karat} /></td>
                  <td className="r num">{g(it.weight)}</td>
                  <td className="r num">{it.qty}</td>
                  <td className="r num">{fcfa(it.weight * it.qty * prices[it.karat].vente)}</td>
                  <td className="r"><div className="rowbtns">
                    {canEdit("stock") && <button className="icon-btn" onClick={() => setModal({ type: "gold", data: it })}><Pencil size={15} /></button>}
                    {isPatron && <button className="icon-btn" onClick={() => del(setGold, it.id, "stock", `${it.desc || it.type || "Or"}${it.karat ? " · " + it.karat + "K" : ""}`)}><Trash2 size={15} /></button>}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    };
    return (
    <>
      <div className="seg seg-lg seg-3">
        <button className={`seg-btn ${stockTab === "or" ? "active" : ""}`} onClick={() => setStockTab("or")}><Coins size={15} /> Or brut <span className="count">{orItems.length}</span></button>
        <button className={`seg-btn ${stockTab === "bijoux" ? "active" : ""}`} onClick={() => setStockTab("bijoux")}><Gem size={15} /> Bijoux <span className="count">{bijouxItems.length}</span></button>
        <button className={`seg-btn ${stockTab === "divers" ? "active" : ""}`} onClick={() => setStockTab("divers")}><Hammer size={15} /> Divers <span className="count">{divers.length}</span></button>
      </div>
      {stockTab === "or" && goldTable(orItems, "Or brut")}
      {stockTab === "bijoux" && goldTable(bijouxItems, "Bijoux")}
      {stockTab === "divers" && (
        <div className="card">
          <div className="card-head">
            <h3>Divers — valeur {fcfa(m.stockDiversValue)}</h3>
            <div className="head-btns">
              <button className="btn btn-line" onClick={() => xlsxExportG(`stock-divers-${TODAY}.xlsx`, { Divers: rowsDivers() })}><Download size={15} /> Excel</button>
              <XlsxImportBtn label="Importer" onFile={guardImport(importDivers)} />
              {canEdit("stock") && <button className="btn btn-gold" onClick={() => setModal({ type: "divers" })}><Plus size={16} /> Ajouter</button>}
            </div>
          </div>
          <table className="table">
            <thead><tr><th>Désignation</th><th>Catégorie</th><th className="r">Qté</th>{seeMargin && <th className="r">Coût</th>}<th className="r">Vente</th>{seeMargin && <th className="r">Marge u.</th>}<th></th></tr></thead>
            <tbody>
              {divers.map((it) => (
                <tr key={it.id} className={it.qty <= it.min ? "warn-row" : ""}>
                  <td><div className="prod-cell">{it.photo ? <img className="prod-thumb" src={it.photo} alt="" /> : <span className="prod-thumb ph">📷</span>}<button className="name-link" onClick={() => setProductView({ kind: "divers", item: it })}>{it.name}</button></div>{it.qty <= it.min && <span className="mini-warn">stock bas</span>}</td>
                  <td className="muted">{it.cat}</td>
                  <td className="r num">{it.qty} {it.unit}</td>
                  {seeMargin && <td className="r num">{fcfa(it.cost)}</td>}
                  <td className="r num">{fcfa(it.price)}</td>
                  {seeMargin && <td className="r num">{fcfa(it.price - it.cost)}</td>}
                  <td className="r"><div className="rowbtns">
                    {canEdit("stock") && <button className="icon-btn" onClick={() => setModal({ type: "divers", data: it })}><Pencil size={15} /></button>}
                    {isPatron && <button className="icon-btn" onClick={() => del(setDivers, it.id, "stock", it.name)}><Trash2 size={15} /></button>}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
    );
  };

  const renderClients = () => (
    <div className="card">
      <div className="card-head">
        <h3>Clients <span className="count">{clients.length}</span></h3>
        <div className="head-btns">
          <button className="btn btn-line" onClick={() => xlsxExportG(`clients-${TODAY}.xlsx`, { Clients: rowsClients() })}><Download size={15} /> Excel</button>
          <XlsxImportBtn label="Importer" onFile={guardImport(importClients)} />
          {canEdit("clients") && <button className="btn btn-gold" onClick={() => setModal({ type: "client" })}><Plus size={16} /> Nouveau client</button>}
        </div>
      </div>
      <div className="seg seg-lg seg-3" style={{ marginBottom: 14 }}>
        <button className={`seg-btn ${clientFilter === "all" ? "active" : ""}`} onClick={() => setClientFilter("all")}>Tous</button>
        <button className={`seg-btn ${clientFilter === "clients" ? "active" : ""}`} onClick={() => setClientFilter("clients")}>Clients</button>
        <button className={`seg-btn ${clientFilter === "fourn" ? "active" : ""}`} onClick={() => setClientFilter("fourn")}>Fournisseurs</button>
      </div>
      <div className="client-grid">
        {clients.filter((c) => {
          if (q.trim() && !(`${c.name || ""} ${c.phone || ""} ${c.note || ""}`).toLowerCase().includes(q.trim().toLowerCase())) return false;
          if (clientFilter === "clients") return sales.some((s) => s.client === c.name);
          if (clientFilter === "fourn") return c.pro || purchases.some((p) => p.client === c.name);
          return true;
        }).map((c) => {
          const nv = sales.filter((s) => s.client === c.name).length;
          const na = purchases.filter((p) => p.client === c.name).length;
          return (
            <div className="client-card" key={c.id}>
              <div className="avatar">{c.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</div>
              <div className="client-main">
                <button className="name-link" style={{ fontSize: 15 }} onClick={() => setClientView(c.name)}>{c.name}</button>
                <span className="muted">{c.phone || "—"}</span>
                {c.note && <span className="client-note">{c.note}</span>}
                <div className="role-tags" style={{ margin: "4px 0 0" }}>
                  {nv > 0 && <span className="pill pill-gold">Client</span>}
                  {(na > 0 || c.pro) && <span className="pill pill-ink">Fournisseur</span>}
                  {c.pro && <span className="pill pill-gold">Pro</span>}
                </div>
                <span className="muted small">{nv} vente(s) · {na} rachat(s)</span>
              </div>
              <div className="rowbtns">
                {canEdit("clients") && <button className="icon-btn" onClick={() => setModal({ type: "client", data: c })}><Pencil size={15} /></button>}
                {isPatron && <button className="icon-btn" onClick={() => del(setClients, c.id, "client", c.name)}><Trash2 size={15} /></button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderCredits = () => {
    const credits = sales.map((s) => ({ s, bal: balanceFor(s) })).filter((x) => x.bal > 0).sort((a, b) => String(a.s.date).localeCompare(String(b.s.date)));
    const dettes = purchases.map((p) => ({ p, bal: purchaseBalance(p) })).filter((x) => x.bal > 0).sort((a, b) => String(a.p.date).localeCompare(String(b.p.date)));
    const clientPhone = (name) => { const c = clients.find((x) => x.name === name); return c && c.phone ? String(c.phone).replace(/[^\d]/g, "") : ""; };
    const remindCredit = (s, bal) => { const ph = clientPhone(s.client); if (!ph) return null; const msg = `Bonjour ${s.client || ""}, petit rappel : il reste ${fcfaLong(bal)} à régler sur votre achat (${s.label}) chez ${shop.name || "notre bijouterie"}. Merci !`; return `https://wa.me/${ph}?text=${encodeURIComponent(msg)}`; };
    const remindDebt = (p, bal) => { const ph = clientPhone(p.client); if (!ph) return null; const msg = `Bonjour ${p.client || ""}, nous avons ${fcfaLong(bal)} à vous remettre pour votre vente d'or (${p.karat ? p.karat + "K" : "or brut"} · ${g(p.weight)}) chez ${shop.name || "notre bijouterie"}. Passez quand vous voulez. Merci !`; return `https://wa.me/${ph}?text=${encodeURIComponent(msg)}`; };
    return (
      <>
        <div className="kpis">
          <Kpi icon={Receipt} label="Total des créances" value={fcfa(m.creances)} sub="clients qui te doivent" tone="clay" />
          <Kpi icon={ArrowDownLeft} label="Restes à payer" value={fcfa(m.dettesAchats)} sub="que tu dois aux clients" tone="gold" />
          <Kpi icon={Wallet} label="Trésorerie" value={fcfa(m.tresorerie)} sub="encaissé − rachats payés" tone="green" />
        </div>
        <div className="card">
          <div className="card-head"><h3>Ventes à crédit <span className="count">{credits.length}</span></h3><span className="muted">argent à recouvrer</span></div>
          {credits.length === 0 ? (
            <p className="muted small">Aucune créance en cours. Toutes les ventes sont soldées.</p>
          ) : (
            <table className="table">
              <thead><tr><th>Date</th><th>Client</th><th>Détail</th><th className="r">Total</th><th className="r">Payé</th><th className="r">Reste dû</th><th></th></tr></thead>
              <tbody>
                {credits.map(({ s, bal }) => (
                  <tr key={s.id}>
                    <td className="num">{dateFr(s.date)}</td>
                    <td>{clientCell(s.client)}</td>
                    <td>{s.label}</td>
                    <td className="r num">{fcfa(s.total)}</td>
                    <td className="r num">{fcfa(s.total - bal)}</td>
                    <td className="r num neg"><strong>{fcfa(bal)}</strong></td>
                    <td className="r"><div className="rowbtns">
                      {remindCredit(s, bal) && <a className="btn btn-line btn-xs" href={remindCredit(s, bal)} target="_blank" rel="noreferrer">Rappel</a>}
                      {canEdit("credits") && <button className="btn btn-gold btn-xs" onClick={() => setAcompteFor(s)}>Encaisser</button>}
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="card">
          <div className="card-head"><h3>Restes à payer aux clients <span className="count">{dettes.length}</span></h3><span className="muted">rachats non soldés</span></div>
          {dettes.length === 0 ? (
            <p className="muted small">Aucun reste à payer. Tous les rachats sont soldés.</p>
          ) : (
            <table className="table">
              <thead><tr><th>Date</th><th>Client</th><th>Détail</th><th className="r">Total</th><th className="r">Payé</th><th className="r">Reste à payer</th><th></th></tr></thead>
              <tbody>
                {dettes.map(({ p, bal }) => (
                  <tr key={p.id}>
                    <td className="num">{dateFr(p.date)}</td>
                    <td>{clientCell(p.client)}</td>
                    <td>Rachat {p.karat}K · {g(p.weight)}</td>
                    <td className="r num">{fcfa(p.total)}</td>
                    <td className="r num">{fcfa(p.total - bal)}</td>
                    <td className="r num neg"><strong>{fcfa(bal)}</strong></td>
                    <td className="r"><div className="rowbtns">
                      {remindDebt(p, bal) && <a className="btn btn-line btn-xs" href={remindDebt(p, bal)} target="_blank" rel="noreferrer">Rappel</a>}
                      <button className="btn btn-clay btn-xs" onClick={() => setSettleFor(p)}>Payer</button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </>
    );
  };

  const renderCaisse = () => {
    const todaySales = sales.filter((s) => s.date === TODAY);
    const todayPays = payments.filter((p) => p.date === TODAY);
    const byPay = (m2) => Math.round(todayPays.filter((p) => p.pay === m2).reduce((a, b) => a + b.amount, 0));
    const esp = byPay("Espèces"), wave = byPay("Wave"), om = byPay("Orange Money"), vir = byPay("Banque");
    const encTotal = Math.round(todayPays.reduce((a, b) => a + b.amount, 0));
    const caTotal = Math.round(todaySales.reduce((a, b) => a + b.total, 0));
    const rachats = Math.round(purchasePayments.filter((p) => p.date === TODAY && p.pay === "Espèces").reduce((a, b) => a + b.amount, 0));
    const depenses = Math.round(expenses.filter((e) => e.date === TODAY && e.pay === "Espèces").reduce((a, b) => a + b.amount, 0));
    const transfIn = Math.round(treasury.filter((t) => t.type === "transfert" && t.to === "caisse" && t.date === TODAY).reduce((a, b) => a + b.amount, 0));
    const transfOut = Math.round(treasury.filter((t) => t.type === "transfert" && t.account === "caisse" && t.date === TODAY).reduce((a, b) => a + b.amount, 0));
    const theorique = fondCaisse + esp - rachats - depenses + transfIn - transfOut;
    const compte = parseFloat(compteCaisse) || 0;
    const compted = compteCaisse !== "";
    const ecart = compte - theorique;
    const closedToday = closures.find((c) => c.date === TODAY);

    const cloturer = () => {
      const c = { id: uid(), date: TODAY, time: nowTime(), by: me(), fond: fondCaisse, esp, wave, om, vir, caTotal: encTotal, rachats, depenses, transfIn, transfOut, theorique, compte, ecart };
      setClosures((arr) => [c, ...arr]);
      log("caisse", "Clôture de caisse", `Théorique ${fcfa(theorique)} · Compté ${fcfa(compte)} · Écart ${fcfa(ecart)}`);
      setCompteCaisse("");
      setZView(c);
    };

    return (
      <>
        <div className="kpis">
          <Kpi icon={Receipt} label="Encaissé aujourd'hui" value={fcfa(encTotal)} sub={`${todayPays.length} encaissement(s)`} tone="gold" />
          <Kpi icon={Banknote} label="Dont espèces" value={fcfa(esp)} sub="entre en caisse" tone="green" />
          <Kpi icon={ArrowDownLeft} label="Rachats du jour" value={fcfa(rachats)} sub="sortie de caisse" tone="clay" />
          <Kpi icon={Wallet} label="Espèces théoriques" value={fcfa(theorique)} sub="attendues dans le tiroir" tone="gold" />
        </div>

        <div className="row2">
          <div className="card">
            <div className="card-head"><h3>Encaissements du jour</h3><span className="muted">paiements + acomptes reçus</span></div>
            <div className="enc-grid">
              <div className="enc-cell"><span className="enc-lab">Espèces</span><span className="enc-val num">{fcfa(esp)}</span></div>
              <div className="enc-cell"><span className="enc-lab">Wave</span><span className="enc-val num">{fcfa(wave)}</span></div>
              <div className="enc-cell"><span className="enc-lab">Orange Money</span><span className="enc-val num">{fcfa(om)}</span></div>
              <div className="enc-cell"><span className="enc-lab">Banque</span><span className="enc-val num">{fcfa(vir)}</span></div>
            </div>
            <div className="enc-sum">
              <div className="enc-sum-row"><span>Total encaissé</span><span className="num pos">{fcfa(encTotal)}</span></div>
              <div className="enc-sum-row sub"><span>Valeur vendue (CA du jour)</span><span className="num">{fcfa(caTotal)}</span></div>
            </div>
            {(() => {
              const vend = [...new Set(todayPays.map((p) => p.by).filter((x) => x && x !== "—"))];
              if (vend.length < 2) return null;
              return (
                <div className="byvend">
                  <div className="byvend-h">Par vendeur</div>
                  {vend.map((v) => (
                    <div className="byvend-row" key={v}><span>{v}</span><span className="num">{fcfa(todayPays.filter((p) => p.by === v).reduce((a, b) => a + b.amount, 0))}</span></div>
                  ))}
                </div>
              );
            })()}
          </div>

          <div className="card">
            <div className="card-head"><h3>Réconciliation caisse (espèces)</h3></div>
            <div className="recon">
              <div className="recon-row"><span>Fond de caisse d'ouverture</span>
                <input className="input num input-sm" type="number" value={fondCaisse} onChange={(e) => setFondCaisse(Number(e.target.value) || 0)} /></div>
              <div className="recon-row"><span>+ Encaissements espèces</span><span className="num">{fcfa(esp)}</span></div>
              <div className="recon-row"><span>− Rachats payés</span><span className="num neg">{fcfa(rachats)}</span></div>
              <div className="recon-row"><span>− Dépenses</span><span className="num">{fcfa(depenses)}</span></div>
              {transfIn > 0 && <div className="recon-row"><span>+ Transferts reçus en caisse</span><span className="num pos">{fcfa(transfIn)}</span></div>}
              {transfOut > 0 && <div className="recon-row"><span>− Transferts vers banque / Wave / OM</span><span className="num neg">{fcfa(transfOut)}</span></div>}
              <div className="recon-row total"><span>= Espèces théoriques</span><span className="num">{fcfa(theorique)}</span></div>
              <div className="recon-row"><span>Espèces comptées</span>
                <input className="input num input-sm" type="number" value={compteCaisse} onChange={(e) => setCompteCaisse(e.target.value)} placeholder="0" /></div>
              {compted && (
                <div className={`recon-ecart ${ecart === 0 ? "ok" : ecart < 0 ? "bad" : "over"}`}>
                  <span>Écart</span><strong className="num">{ecart > 0 ? "+" : ""}{fcfa(ecart)}</strong>
                </div>
              )}
              {canEdit("caisse") && <button className="btn btn-gold recon-btn" disabled={!compted} onClick={cloturer}>Clôturer la journée</button>}
              {closedToday && <p className="muted small" style={{ margin: "10px 0 0" }}>Journée déjà clôturée à {closedToday.time} (écart {closedToday.ecart > 0 ? "+" : ""}{fcfa(closedToday.ecart)}). Tu peux re-clôturer si besoin.</p>}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h3>Historique des clôtures <span className="count">{closures.length}</span></h3></div>
          {closures.length === 0 ? (
            <p className="muted small">Aucune clôture pour l'instant. Clôture ta journée pour générer un rapport Z.</p>
          ) : (
            <table className="table">
              <thead><tr><th>Date</th><th>Heure</th><th className="r">Encaissé</th><th className="r">Théorique</th><th className="r">Compté</th><th className="r">Écart</th><th></th></tr></thead>
              <tbody>
                {closures.map((c) => (
                  <tr key={c.id}>
                    <td className="num">{dateFr(c.date)}</td>
                    <td className="muted">{c.time}</td>
                    <td className="r num">{fcfa(c.caTotal)}</td>
                    <td className="r num">{fcfa(c.theorique)}</td>
                    <td className="r num">{fcfa(c.compte)}</td>
                    <td className={`r num ${c.ecart === 0 ? "pos" : c.ecart < 0 ? "neg" : ""}`}>{c.ecart > 0 ? "+" : ""}{fcfa(c.ecart)}</td>
                    <td className="r"><button className="icon-btn" title="Voir le rapport Z" onClick={() => setZView(c)}><Receipt size={15} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {(() => {
          const byMonth = {};
          closures.forEach((c) => {
            const mk = c.date.slice(0, 7);
            if (!byMonth[mk]) byMonth[mk] = { month: mk, n: 0, ca: 0, rachats: 0, depenses: 0, ecart: 0 };
            byMonth[mk].n += 1; byMonth[mk].ca += c.caTotal || 0; byMonth[mk].rachats += c.rachats || 0;
            byMonth[mk].depenses += c.depenses || 0; byMonth[mk].ecart += c.ecart || 0;
          });
          const months = Object.values(byMonth).sort((a, b) => b.month.localeCompare(a.month));
          if (!months.length) return null;
          return (
            <div className="card">
              <div className="card-head">
                <h3>Récap mensuel des clôtures <span className="count">{months.length}</span></h3>
                <button className="btn btn-line" onClick={() => xlsxExportG(`recap-mensuel-${TODAY}.xlsx`, { "Récap mensuel": months.map((mo) => ({ Mois: monthLabel(mo.month), Clôtures: mo.n, "CA encaissé": mo.ca, Rachats: mo.rachats, Dépenses: mo.depenses, "Écart cumulé": mo.ecart })) })}><Download size={15} /> Excel</button>
              </div>
              <table className="table">
                <thead><tr><th>Mois</th><th className="r">Clôtures</th><th className="r">CA encaissé</th><th className="r">Rachats</th><th className="r">Dépenses</th><th className="r">Écart cumulé</th></tr></thead>
                <tbody>
                  {months.map((mo) => (
                    <tr key={mo.month}>
                      <td><strong>{monthLabel(mo.month)}</strong></td>
                      <td className="r num">{mo.n}</td>
                      <td className="r num pos">{fcfa(mo.ca)}</td>
                      <td className="r num neg">{fcfa(mo.rachats)}</td>
                      <td className="r num">{fcfa(mo.depenses)}</td>
                      <td className={`r num ${mo.ecart === 0 ? "pos" : mo.ecart < 0 ? "neg" : ""}`}>{mo.ecart > 0 ? "+" : ""}{fcfa(mo.ecart)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="muted small" style={{ margin: "10px 0 0" }}>Construit à partir de tes clôtures quotidiennes. L'écart cumulé additionne les écarts de chaque jour clôturé.</p>
            </div>
          );
        })()}
      </>
    );
  };

  const renderBanque = () => {
    const canEditB = canEdit("banque");
    const hist = treasury.filter((t) => t.type !== "init").sort((a, b) => b.ts - a.ts);
    const totalSolde = TREASURY_ACCOUNTS.reduce((s, acc) => s + acctBal(acc.id), 0);
    return (
      <>
        <div className="card-head" style={{ marginBottom: 14 }}>
          <h3>Soldes des comptes — total {fcfa(totalSolde)}</h3>
          {canEditB && <button className="btn btn-gold" onClick={() => setModal({ type: "treasury", op: "transfert", account: "banque" })}><ArrowDownLeft size={15} /> Nouveau transfert</button>}
        </div>
        <div className="acct-grid">
          {TREASURY_ACCOUNTS.map((acc) => (
            <div className={"card acct-card acct-" + acc.id} key={acc.id}>
              <div className="acct-top">
                <span className="acct-ico">{acc.icon}</span>
                <div><div className="acct-name">{acc.label}</div><div className="muted small">Solde initial : {fcfa(acctInit(acc.id))}</div></div>
              </div>
              <div className="acct-bal num">{fcfa(acctBal(acc.id))}</div>
              <div className="acct-lines">
                <div><span className="muted small">Entrées</span><span className="num pos">{fcfa(acctIn(acc.id))}</span></div>
                <div><span className="muted small">Sorties</span><span className="num neg">{fcfa(acctOut(acc.id))}</span></div>
              </div>
              {canEditB && (
                <div className="acct-acts">
                  <button className="btn btn-xs btn-line" onClick={() => setModal({ type: "treasury", op: "depot", account: acc.id })}>Dépôt</button>
                  <button className="btn btn-xs btn-line" onClick={() => setModal({ type: "treasury", op: "retrait", account: acc.id })}>Retrait</button>
                  <button className="btn btn-xs btn-ghost" onClick={() => setModal({ type: "treasury", op: "init", account: acc.id })}>Solde initial</button>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="card">
          <div className="card-head"><h3>Historique des opérations</h3></div>
          <table className="table">
            <thead><tr><th>Date</th><th>Opération</th><th className="r">Montant</th><th className="hide-sm">Note</th>{canEditB && <th></th>}</tr></thead>
            <tbody>
              {hist.length === 0 ? <tr><td colSpan={canEditB ? 5 : 4} className="muted small">Aucune opération enregistrée.</td></tr> : hist.map((t) => (
                <tr key={t.id}>
                  <td className="muted small">{t.date}</td>
                  <td>{t.type === "depot" ? "Dépôt " + accLabelT(t.account) : t.type === "retrait" ? "Retrait " + accLabelT(t.account) : <>Transfert <span className="muted small">{accLabelT(t.account)} → {accLabelT(t.to)}</span></>}</td>
                  <td className={`r num ${t.type === "depot" ? "pos" : t.type === "retrait" ? "neg" : ""}`}>{fcfa(t.amount)}</td>
                  <td className="hide-sm muted small">{t.note || "—"}</td>
                  {canEditB && <td className="r"><button className="icon-btn" onClick={() => delTreasury(t.id)}><Trash2 size={15} /></button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  const renderDepenses = () => {
    const ym = TODAY.slice(0, 7);
    const moisTotal = expenses.filter((e) => e.date.startsWith(ym)).reduce((a, b) => a + b.amount, 0);
    const total = expenses.reduce((a, b) => a + b.amount, 0);
    return (
      <>
        <div className="kpis">
          <Kpi icon={TrendingDown} label="Dépenses ce mois-ci" value={fcfa(moisTotal)} sub="charges du mois en cours" tone="clay" />
          <Kpi icon={Receipt} label="Dépenses cumulées" value={fcfa(total)} sub={`${expenses.length} dépense(s)`} tone="clay" />
          {seeMargin && <Kpi icon={TrendingUp} label="Bénéfice net" value={fcfa(m.beneficeNet)} sub={`Marge brute ${fcfa(m.beneficeVentes)}`} tone="green" />}
        </div>
        <div className="card">
          <div className="card-head">
            <h3>Dépenses & charges <span className="count">{expenses.length}</span></h3>
            <div className="head-btns">
              <button className="btn btn-line" onClick={() => xlsxExportG(`depenses-${TODAY}.xlsx`, { Dépenses: rowsDepenses() })}><Download size={15} /> Excel</button>
              {canEdit("depenses") && <button className="btn btn-line" onClick={() => setModal({ type: "salary" })}><Users size={16} /> Verser un salaire</button>}
              {canEdit("depenses") && <button className="btn btn-clay" onClick={() => setModal({ type: "expense" })}><Plus size={16} /> Nouvelle dépense</button>}
            </div>
          </div>
          {expenses.length === 0 ? (
            <p className="muted small">Aucune dépense enregistrée. Ajoute loyer, électricité, salaires… pour suivre ton bénéfice net.</p>
          ) : (
            <table className="table">
              <thead><tr><th>Date</th><th>Libellé</th><th>Catégorie</th><th>Paiement</th><th>Par</th><th className="r">Montant</th><th></th></tr></thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id}>
                    <td className="num">{dateFr(e.date)}</td>
                    <td><strong>{e.label}</strong>{e.note && <div className="muted small">{e.note}</div>}</td>
                    <td><span className="pill pill-ink">{e.cat}</span></td>
                    <td className="muted">{e.pay}</td>
                    <td className="muted">{e.by || "—"}</td>
                    <td className="r num neg">−{fcfa(e.amount)}</td>
                    <td className="r"><div className="rowbtns">
                      {canEdit("depenses") && <button className="icon-btn" onClick={() => setModal({ type: "expense", data: e })}><Pencil size={15} /></button>}
                      {isPatron && <button className="icon-btn" onClick={() => del(setExpenses, e.id, "depense", `${e.label} · ${fcfa(e.amount)}`)}><Trash2 size={15} /></button>}
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </>
    );
  };

  const renderEquipe = () => (
    <OnlineTeam shopId={currentUser.shopId} plan={license ? license.plan : "S"} meId={currentUser.id} onBack={() => go("settings")} />
  );

  const renderReports = () => {
    if (!planAllows(license ? license.plan : "S", "reports")) {
      return (
        <div className="card locked-card">
          <span className="pill pill-gold">Pro</span>
          <h3 style={{ margin: "12px 0 6px" }}>Rapports détaillés — disponible en Pro</h3>
          <p className="muted small" style={{ maxWidth: 460, margin: "0 auto 16px" }}>Les analyses et graphiques détaillés sont inclus dans les formules Pro et Premium. Passe à une formule supérieure pour les débloquer.</p>
          <button className="btn btn-gold" onClick={() => go("abo")}>Voir les formules</button>
        </div>
      );
    }
    const pSales = sales.filter((s) => inPeriod(s.date, reportPeriod));
    const pPurch = purchases.filter((p) => inPeriod(p.date, reportPeriod));
    const pExp = expenses.filter((e) => inPeriod(e.date, reportPeriod));
    const pCA = pSales.reduce((a, s) => a + s.total, 0);
    const pMarge = pSales.reduce((a, s) => a + (s.total - s.cost), 0);
    const pDep = pExp.reduce((a, e) => a + e.amount, 0);
    const pNet = pMarge - pDep;
    const pAchats = pPurch.reduce((a, p) => a + p.total, 0);
    const topDivers = [...divers].map((it) => ({ ...it, sold: pSales.filter((s) => s.kind === "divers" && s.label.startsWith(it.name)).length }))
      .sort((a, b) => b.sold - a.sold).slice(0, 5);
    const typeMap = {};
    pSales.forEach((s) => {
      const key = s.kind === "divers" ? (s.dName || s.label) : `${s.itemType || "Or"}${s.karat ? " " + s.karat + "K" : ""}`;
      if (!typeMap[key]) typeMap[key] = { type: key, kind: s.kind, qty: 0, revenue: 0, marge: 0 };
      typeMap[key].qty += s.kind === "divers" ? (s.dQty || 1) : 1;
      typeMap[key].revenue += s.total;
      typeMap[key].marge += s.total - s.cost;
    });
    const byType = Object.values(typeMap).sort((a, b) => b.revenue - a.revenue);
    const kindRev = { or: 0, bijoux: 0, divers: 0 };
    pSales.forEach((s) => { kindRev[s.kind === "divers" ? "divers" : (s.kind === "bijoux" ? "bijoux" : "or")] += s.total; });
    const pieData = [{ name: "Or", value: kindRev.or }, { name: "Bijoux", value: kindRev.bijoux }, { name: "Divers", value: kindRev.divers }].filter((d) => d.value > 0);
    const pPays = payments.filter((p) => inPeriod(p.date, reportPeriod));
    const vendMap = {};
    const vAdd = (name) => { const k = name || "—"; if (!vendMap[k]) vendMap[k] = { name: k, nSales: 0, ca: 0, marge: 0, enc: 0 }; return vendMap[k]; };
    pSales.forEach((s) => { const v = vAdd(s.by); v.nSales += 1; v.ca += s.total; v.marge += s.total - s.cost; });
    pPays.forEach((p) => { vAdd(p.by).enc += p.amount; });
    const byVend = Object.values(vendMap).sort((a, b) => b.ca - a.ca);
    const exportPeriode = () => xlsxExportG(`rapport-${reportPeriod}-${TODAY}.xlsx`, {
      "Ventes": pSales.map((s) => ({ Date: s.date, Heure: s.time || "", Produit: s.label, Client: s.client || "", Total: s.total, "Payé": s.total - balanceFor(s), Paiement: s.pay || "" })),
      "Achats": pPurch.map((p) => ({ Date: p.date, Heure: p.time || "", Carat: p.karat ? p.karat + "K" : "brut", "Poids (g)": p.weight, "Prix/g": p.ppg, Client: p.client || "", Total: p.total })),
      "Dépenses": pExp.map((e) => ({ Date: e.date, "Libellé": e.label, "Catégorie": e.cat, Montant: e.amount, Paiement: e.pay || "" })),
    });
    return (
      <>
        <div className="rep-toolbar">
          <div className="seg seg-lg seg-4">
            {["today", "month", "year", "all"].map((p) => (
              <button key={p} className={`seg-btn ${reportPeriod === p ? "active" : ""}`} onClick={() => setReportPeriod(p)}>{PERIOD_LABEL[p]}</button>
            ))}
          </div>
          <button className="btn btn-line" onClick={exportPeriode}><Download size={15} /> Exporter la période</button>
        </div>
        <div className="kpis">
          <Kpi icon={Receipt} label={`Chiffre d'affaires · ${PERIOD_LABEL[reportPeriod].toLowerCase()}`} value={fcfa(pCA)} sub={seeMargin ? `Marge brute ${fcfa(pMarge)} · ${pSales.length} vente(s)` : `${pSales.length} vente(s)`} tone="gold" />
          <Kpi icon={ArrowDownLeft} label="Achats / rachats" value={fcfa(pAchats)} sub={`${pPurch.length} rachat(s)`} tone="clay" />
          {seeMargin && <Kpi icon={TrendingUp} label="Bénéfice net" value={fcfa(pNet)} sub={`marge − dépenses (${fcfa(pDep)})`} tone="green" />}
          <Kpi icon={Scale} label="Or en stock (actuel)" value={g(m.stockOrWeight)} sub={fcfa(m.stockOrValue)} tone="gold" />
        </div>
        <div className="row2">
          <div className="card">
            <div className="card-head"><h3>Ventes vs achats</h3><span className="muted">tendance des derniers jours</span></div>
            <div style={{ height: 280 }}>
              <ResponsiveContainer>
                <BarChart data={dailySeries} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e6ddcc" vertical={false} />
                  <XAxis dataKey="jour" tick={{ fontSize: 11, fill: "#8a7d68" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#8a7d68" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip formatter={(v) => fcfaLong(v)} contentStyle={{ borderRadius: 10, border: "1px solid #e6ddcc", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Ventes" fill="#b8862f" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Achats" fill="#9c4a35" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="card">
            <div className="card-head"><h3>Répartition du CA</h3><span className="muted">{PERIOD_LABEL[reportPeriod].toLowerCase()}</span></div>
            <div style={{ height: 280 }}>
              {pieData.length === 0 ? <p className="muted small">Aucune vente sur la période.</p> : (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={92} label={(e) => `${e.name}`}>
                      {pieData.map((e, i) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => fcfaLong(v)} contentStyle={{ borderRadius: 10, border: "1px solid #e6ddcc", fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><h3>Articles divers les plus vendus</h3></div>
          <table className="table">
            <thead><tr><th>Article</th><th className="r">Ventes</th><th className="r">En stock</th></tr></thead>
            <tbody>{topDivers.map((it) => <tr key={it.id}><td>{it.name}</td><td className="r num">{it.sold}</td><td className="r num">{it.qty}</td></tr>)}</tbody>
          </table>
        </div>
        <div className="card">
          <div className="card-head">
            <h3>Ventes par type de produit <span className="count">{byType.length}</span></h3>
            <button className="btn btn-line" onClick={() => xlsxExportG(`ventes-par-type-${TODAY}.xlsx`, { "Par type": byType.map((t) => ({ Produit: t.type, Catégorie: KIND_LABEL[t.kind] || "Or", "Qté vendue": t.qty, "Chiffre d'affaires": t.revenue, Marge: t.marge })) })}><Download size={15} /> Excel</button>
          </div>
          {byType.length === 0 ? <p className="muted small">Aucune vente enregistrée pour l'instant.</p> : (
            <table className="table">
              <thead><tr><th>Produit</th><th>Catégorie</th><th className="r">Qté vendue</th><th className="r">Chiffre d'affaires</th>{seeMargin && <th className="r">Marge</th>}</tr></thead>
              <tbody>
                {byType.map((t, i) => (
                  <tr key={i}>
                    <td><strong>{t.type}</strong></td>
                    <td><span className={`pill ${t.kind === "divers" ? "pill-ink" : "pill-gold"}`}>{KIND_LABEL[t.kind] || "Or"}</span></td>
                    <td className="r num">{t.qty}</td>
                    <td className="r num pos">{fcfa(t.revenue)}</td>
                    {seeMargin && <td className="r num">{fcfa(t.marge)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="card">
          <div className="card-head">
            <h3>Performance par vendeur <span className="count">{byVend.length}</span></h3>
            <span className="muted">{PERIOD_LABEL[reportPeriod].toLowerCase()}</span>
          </div>
          {byVend.length === 0 ? <p className="muted small">Aucune vente sur la période.</p> : (
            <table className="table">
              <thead><tr><th>Vendeur</th><th className="r">Ventes</th><th className="r">Chiffre d'affaires</th>{seeMargin && <th className="r">Bénéfice</th>}<th className="r">Encaissé</th></tr></thead>
              <tbody>
                {byVend.map((v, i) => (
                  <tr key={i}>
                    <td><strong>{i === 0 && v.ca > 0 ? "🏆 " : ""}{v.name}</strong></td>
                    <td className="r num">{v.nSales}</td>
                    <td className="r num pos">{fcfa(v.ca)}</td>
                    {seeMargin && <td className="r num">{fcfa(v.marge)}</td>}
                    <td className="r num">{fcfa(v.enc)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </>
    );
  };

  const renderJournal = () => {
    const JKIND = { vente: { label: "Vente", cls: "pill-gold" }, achat: { label: "Achat", cls: "pill-clay" }, paiement: { label: "Paiement", cls: "pill-green" }, retour: { label: "Retour", cls: "pill-red" }, caisse: { label: "Caisse", cls: "pill-green" }, stock: { label: "Stock", cls: "pill-ink" }, client: { label: "Client", cls: "pill-ink" }, depense: { label: "Dépense", cls: "pill-clay" }, user: { label: "Utilisateur", cls: "pill-amber" } };
    const kinds = [["all", "Tout"], ["vente", "Ventes"], ["achat", "Achats"], ["paiement", "Paiements"], ["caisse", "Caisse"], ["stock", "Stock"], ["client", "Clients"], ["depense", "Dépenses"], ["user", "Utilisateurs"]];
    const ql = q.toLowerCase();
    const list = journal.filter((j) => (journalKind === "all" || j.kind === journalKind) && (`${j.verb || ""} ${j.detail || ""} ${j.by || ""}`).toLowerCase().includes(ql));
    return (
      <>
        <div className="card">
          <div className="card-head">
            <h3>Historique des actions <span className="count">{list.length}</span></h3>
            <button className="btn btn-line" onClick={() => xlsxExportG(`historique-${TODAY}.xlsx`, { Historique: list.map((j) => ({ Date: j.date, Heure: j.time, Utilisateur: j.by, Type: (JKIND[j.kind] || {}).label || j.kind, Action: j.verb, "Détail": j.detail })) })}><Download size={15} /> Excel</button>
          </div>
          <div className="jfilter">
            {kinds.map(([k, lbl]) => <button key={k} className={`chip ${journalKind === k ? "chip-on" : ""}`} onClick={() => setJournalKind(k)}>{lbl}</button>)}
          </div>
          {list.length === 0 ? <p className="muted small">Aucune action enregistrée{journalKind !== "all" ? " pour ce filtre" : ""}.</p> : (
            <div className="timeline jrnl">
              {list.map((j) => (
                <div key={j.id} className="tl-item">
                  <div className="tl-dot" />
                  <div className="tl-body">
                    <div className="jrow">
                      <span className={`pill ${(JKIND[j.kind] || {}).cls || "pill-ink"}`}>{(JKIND[j.kind] || {}).label || j.kind}</span>
                      <strong>{j.verb}</strong>
                      <span className="jdetail">{j.detail}</span>
                    </div>
                    <div className="jmeta">{j.by} · {dateFr(j.date)} {j.time}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </>
    );
  };

  const renderCours = () => (
    <>
      <div className="cours-hero">
        <div className="ch-top">
          <div className="live-tag"><span className={`dot ${coursLoading ? "pulse" : ""}`} />{coursLoading ? "Actualisation…" : "En direct"}</div>
          <h2>Cours de l'or</h2>
          <p className="ch-sub">Cours mondial converti en FCFA — actualisé automatiquement. Alimente les prix de toute la boutique.</p>
        </div>
        <div className="cours-grid">
          <div className="stat"><div className="stat-ico"><Globe size={15} /></div><span className="stat-lab">Cours mondial</span><span className="stat-val">{dec(spot)} $<small>/once</small> <span className="stat-sep">·</span> {dec(spot / OZ)} $<small>/g</small></span></div>
          <div className="stat"><div className="stat-ico"><TrendingUp size={15} /></div><span className="stat-lab">Dollar (USD → FCFA)</span><span className="stat-val">{nf.format(Math.round(rate))}<small> F</small></span></div>
          <div className="stat hl"><div className="stat-ico gold"><Coins size={15} /></div><span className="stat-lab">Or pur 24K</span><span className="stat-val">{fcfa(perGram24)}<small>/g</small></span></div>
        </div>
        <p className="cours-desc">💡 <strong>Or pur 24K</strong> = la valeur mondiale d'1 g d'or pur convertie en FCFA, <strong>sans marge ni prime</strong>. C'est le repère de base : tes prix de <strong>vente</strong> (plus haut) et de <strong>rachat</strong> (plus bas) se calculent dessus, et c'est lui qui sert à <strong>valoriser ton stock</strong>.</p>
        <div className="ch-foot">
          <span className="upd"><Wifi size={13} />{updated ? `Mis à jour ${agoTxt}` : "En attente…"}{asof && <em> · marché : {asof}</em>}</span>
          <div className="ch-ctrls">
            <label className="switch"><input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /><span>Auto (2 min)</span></label>
            <button className="refresh" onClick={fetchLive} disabled={coursLoading}><RefreshCw size={14} className={coursLoading ? "spin" : ""} /> Actualiser</button>
          </div>
        </div>
      </div>

      {coursErr && <div className="warn-line"><AlertTriangle size={16} /><span>{coursErr}</span></div>}

      <div className="card">
        <div className="card-head"><h3>Prix par gramme — selon le carat</h3><span className="muted">Tes prix = mondial + prime + marge</span></div>
        <table className="table">
          <thead><tr><th>Carat</th><th className="r">Mondial /g</th><th className="r">Tu rachètes /g</th><th className="r">Tu vends /g</th></tr></thead>
          <tbody>
            {KARATS.map((k) => (
              <tr key={k}>
                <td><Badge k={k} /> <span className="pct">{Math.round(purity(k) * 100)}%</span></td>
                <td className="r num muted">{fcfa(prices[k].world)}</td>
                <td className="r num achat">{fcfa(prices[k].achat)}</td>
                <td className="r num vente">{fcfa(prices[k].vente)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="card-head"><h3><Settings size={15} /> Tes réglages</h3><span className="muted">Ajuste selon ton marché à Dakar</span></div>
        <div className="sliders">
          <Slider label="Prime / frais locaux" value={prime} set={setPrime} max={20} />
          <Slider label="Marge de vente" value={mVente} set={setMVente} max={30} />
          <Slider label="Marge sur rachat" value={mAchat} set={setMAchat} max={20} />
        </div>
        <div className="manual">
          <Field label="Cours mondial (USD/once)"><input className="input num" type="number" step="0.01" value={Math.round(spot * 100) / 100} onChange={(e) => setSpot(Number(e.target.value) || 0)} /></Field>
          <Field label="Taux USD → FCFA"><input className="input num" type="number" step="0.01" value={Math.round(rate * 100) / 100} onChange={(e) => setRate(Number(e.target.value) || 0)} /></Field>
        </div>
        <p className="note-box">Le cours et le taux se remplissent tout seuls en direct ; tu peux les corriger à la main si besoin. Tout le reste — ventes, rachats, valeur du stock — se recalcule à partir d'ici.</p>
        <p className="src-note">Sources en direct : prix de l'or via gold-api.com · taux de change via <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer">Exchange Rate API</a>.</p>
      </div>

      <p className="disclaim">Données de marché à titre indicatif — à vérifier avant toute transaction importante.</p>
    </>
  );

  const syncShopName = async (nm) => {
    const name = (nm || "").trim();
    if (!name || !authUser) return;
    try { await supabase.rpc("rename_my_shop", { new_name: name }); } catch (e) { /* hors-ligne ou non autorisé */ }
  };
  const renderSettings = () => (
    <>
      <div className="card">
        <div className="card-head"><h3><ShieldCheck size={15} /> Utilisateurs & équipe</h3></div>
        <p className="muted small" style={{ margin: "0 0 14px" }}>Gère les comptes de connexion en ligne (patron et vendeurs) : qui peut se connecter et avec quels droits.</p>
        <button className="btn btn-gold" onClick={() => go("equipe")}><Users size={15} /> Gérer les utilisateurs</button>
      </div>

      <div className="card">
        <div className="card-head"><h3><ShieldCheck size={15} /> Sécurité — Code PIN</h3><span className={`pill ${pin ? "pill-green" : "pill-ink"}`}>{pin ? "Activé" : "Désactivé"}</span></div>
        <p className="muted small" style={{ margin: "0 0 14px" }}>Protège l'ouverture de l'app sur <strong>cet appareil</strong> par un code à 4-6 chiffres. En cas d'oubli, le mot de passe de ton compte permet de déverrouiller.</p>
        <button className="btn btn-gold" onClick={() => setModal({ type: "pin" })}><ShieldCheck size={15} /> {pin ? "Changer ou retirer le code" : "Définir un code PIN"}</button>
        {pin && (
          <div className="lock-delay">
            <span className="muted small">Verrouiller automatiquement après</span>
            <select className="input" style={{ maxWidth: 200 }} value={lockDelay} onChange={(e) => saveLockDelay(parseInt(e.target.value))}>
              <option value={1}>1 minute d'inactivité</option>
              <option value={5}>5 minutes d'inactivité</option>
              <option value={15}>15 minutes d'inactivité</option>
              <option value={30}>30 minutes d'inactivité</option>
              <option value={0}>Jamais (seulement à l'ouverture)</option>
            </select>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-head"><h3><Receipt size={15} /> Logo des documents</h3><span className="muted">Reçus & bordereaux uniquement</span></div>
        <Field label="Logo de tes documents (reçus, bordereaux)"><LogoField logo={shop.docLogo} onChange={(v) => setShop((s) => ({ ...s, docLogo: v }))} /></Field>
        <p className="muted small" style={{ margin: "-4px 0 8px" }}>Ce logo apparaît seulement en haut de tes reçus et bordereaux. Le logo de l'application ne change pas.</p>
        <Field label="Nom de la boutique"><input className="input" value={shop.name} onChange={(e) => setShop((s) => ({ ...s, name: e.target.value }))} onBlur={() => syncShopName(shop.name)} /></Field>
        {authUser && <p className="muted small" style={{ margin: "-6px 0 4px" }}>Le nom est automatiquement mis à jour chez ton revendeur.</p>}
        <div className="manual" style={{ marginTop: 0, paddingTop: 0, borderTop: "none" }}>
          <Field label="Adresse"><input className="input" value={shop.addr} onChange={(e) => setShop((s) => ({ ...s, addr: e.target.value }))} placeholder="ex : Marché Sandaga, Dakar" /></Field>
          <Field label="Téléphone"><input className="input" value={shop.phone} onChange={(e) => setShop((s) => ({ ...s, phone: e.target.value }))} placeholder="77 000 00 00" /></Field>
        </div>
      </div>

      {authUser && (
        <div className="card">
          <div className="card-head"><h3><ShieldCheck size={15} /> Mon mot de passe</h3><span className="muted">Compte en ligne</span></div>
          <p className="muted small" style={{ margin: "0 0 14px" }}>Change le mot de passe de connexion de ta boutique. Tu resteras connecté sur cet appareil.</p>
          <PasswordChange />
        </div>
      )}

      <div className="card">
        <div className="card-head"><h3><Download size={15} /> Installer l'application</h3><span className="muted">Ordi & téléphone</span></div>
        <p className="muted small" style={{ margin: "0 0 14px" }}>Ajoute Atelier d'Or sur ton écran d'accueil ou ton bureau : ça s'ouvre comme une vraie app, en plein écran, et même sans connexion.</p>
        <InstallButton prompt={installPrompt} installed={installedPWA} onInstall={doInstall} isIos={isIosDevice} />
      </div>

      <div className="card">
        <div className="card-head">
          <h3><Download size={15} /> Données & sauvegarde</h3>
          <span className="muted">{saveState === "error" ? "Indisponible" : "À jour"}</span>
        </div>
        <p className="muted small" style={{ margin: "0 0 14px" }}>
          Tout est enregistré automatiquement sur cet appareil. La sauvegarde te permet d'en garder une copie de secours et de transférer ta boutique sur un autre téléphone.
        </p>
        {isPatron ? (
          <>
            <div className="data-actions">
              <button className="btn btn-gold" onClick={() => setBackup("export")}><Download size={15} /> Exporter</button>
              <button className="btn btn-line" onClick={() => setBackup("import")}><Upload size={15} /> Importer</button>
              {currentUser.shopId && <button className="btn btn-line" onClick={() => { setSyncState("syncing"); setNetTick((n) => n + 1); }}><RefreshCw size={15} /> Synchroniser maintenant</button>}
              <button className="btn btn-line" onClick={exportAllXlsx}><Download size={15} /> Excel (tout)</button>
              <button className="btn btn-line danger" onClick={resetData}><Trash2 size={15} /> Réinitialiser</button>
            </div>
            <p className="note-box">Exporter crée un fichier (ou un texte à copier) contenant toute ta boutique. Importer le restaure — sur ce téléphone ou un autre. « Excel (tout) » crée un classeur avec une feuille par catégorie (ventes, achats, stock, clients, dépenses). Réinitialiser revient aux données d'exemple.</p>
            {currentUser.shopId && <p className="note-box" style={{ marginTop: 10 }}><b>Passer en production / changer de téléphone :</b> 1. <b>Exporter</b> sur l'appareil qui a les vraies données. 2. Se connecter en ligne sur le nouvel appareil. 3. <b>Importer</b> le fichier → tes données partent automatiquement dans le cloud et se synchronisent partout. Garde toujours le fichier d'export comme sauvegarde.</p>}
          </>
        ) : (
          <p className="muted small" style={{ margin: 0 }}>Seul le patron peut exporter, importer ou réinitialiser les données.</p>
        )}
      </div>
    </>
  );

  const planDaysLeft = () => {
    if (!license || license.lifetime || !license.expiry) return null;
    return Math.max(0, Math.ceil((new Date(license.expiry).getTime() - Date.now()) / DAY));
  };
  const renderAbo = () => {
    const f = license ? FORMULAS[license.plan] : null;
    const left = planDaysLeft();
    return (
      <>
        {f && (
          <div className="card lic-card">
            <div className="card-head"><h3>Mon forfait</h3><span className={`pill ${f.trial ? "pill-ink" : "pill-gold"}`}>{f.name}</span></div>
            <p className="muted small" style={{ margin: "0 0 4px" }}>
              {license.lifetime ? "Sans expiration" : (left != null ? `${left} jour${left > 1 ? "s" : ""} restant${left > 1 ? "s" : ""} · expire le ${dateFull(new Date(license.expiry))}` : "")}
            </p>
            <p className="muted small" style={{ margin: 0 }}>
              {f.admins >= 99 ? "Admins illimités" : `${f.admins} admin${f.admins > 1 ? "s" : ""}`} · {f.users >= 99 ? "utilisateurs illimités" : `${f.users} utilisateurs`}
            </p>
            {f.trial && <p className="muted small" style={{ marginTop: 8 }}>Tu es en essai gratuit. Choisis une formule ci-dessous pour continuer après l'essai — ton revendeur sera prévenu.</p>}
          </div>
        )}
        <div className="formulas-grid">
          {PAID_FORMULAS.map((k) => {
            const ff = FORMULAS[k];
            const current = license && license.plan === k;
            const live = LIVE_PRICES && LIVE_PRICES[k];
            const monthlyAmt = (live && live.amount > 0 && (live.period || "mois") === "mois") ? live.amount : ff.monthly;
            const showYear = monthlyAmt && !(live && live.amount > 0 && live.period === "an");
            return (
              <div className={`formula ${current ? "formula-current" : ""}`} key={k}>
                <div className="formula-top"><span className="formula-name">{ff.name}</span><span className="formula-price">{priceLabelOf(k)}</span></div>
                {showYear && <div className="formula-year">ou {nf.format(monthlyAmt * 10)} F / an · <strong>2 mois offerts</strong></div>}
                <ul className="formula-feats">{ff.features.map((x, i) => <li key={i}>{x}</li>)}</ul>
                {current
                  ? <button className="btn btn-line formula-btn" disabled>Formule actuelle</button>
                  : <button className="btn btn-gold formula-btn" onClick={() => chooseFormula(k)}>Choisir {ff.name}</button>}
              </div>
            );
          })}
        </div>
        <p className="src-note">En choisissant une formule, un message prérempli part vers ton revendeur (WhatsApp) avec le nom de ta boutique. Il met à jour ton abonnement directement — aucun code à saisir.</p>
      </>
    );
  };

  const VIEWS = { dash: renderDash, sales: renderSales, buy: renderBuy, stock: renderStock, clients: renderClients, credits: renderCredits, caisse: renderCaisse, banque: renderBanque, depenses: renderDepenses, equipe: renderEquipe, reports: renderReports, cours: renderCours, calc: () => <GoldCalc prices={prices} spot={spot} rate={rate} perGram24={perGram24} mVente={mVente} mAchat={mAchat} canSell={canEdit("sales")} canBuy={canEdit("buy")} onUse={(type, data) => { if (type === "sale") { if (!canEdit("sales")) return; setView("sales"); setModal({ type: "sale", init: data }); } else { if (!canEdit("buy")) return; setView("buy"); setModal({ type: "purchase", init: data }); } setNavOpen(false); }} />, settings: renderSettings, abo: renderAbo, journal: renderJournal };
  const titles = { dash: "Tableau de bord", sales: "Ventes", buy: "Achats d'or", stock: "Stock", clients: "Clients", credits: "Crédits & dettes", caisse: "Clôture de caisse", depenses: "Dépenses & charges", equipe: "Équipe & sécurité", reports: "Rapports", cours: "Cours de l'or", calc: "Calculatrice or", settings: "Paramètres", abo: "Abonnement" };

  if (route === "admin") {
    return (<div className="app"><style>{CSS}</style><AdminSpace onExit={exitAdmin} shop={shop} setShop={setShop} users={users} setUsers={setUsers} resellerPhone={resellerPhone} setResellerPhone={setResellerPhone} /></div>);
  }
  if (route === "espace") {
    return (
      <div className="app"><style>{CSS}</style>
        {!authReady
          ? (<div className="lock"><div className="lock-brand"><BrandMark logo={null} lg /><div className="lock-sub">Chargement…</div></div></div>)
          : !authUser
            ? (<OnlineLogin onExit={exitEspace} logo={null} />)
            : (<ResellerSpace authUser={authUser} onSignOut={authSignOut} onExit={exitEspace} onPricesSaved={loadPrices} logo={null} />)}
      </div>
    );
  }
  if (route === "client") {
    return (
      <div className="app"><style>{CSS}</style>
        {!authReady
          ? (<div className="lock"><div className="lock-brand"><BrandMark logo={null} lg /><div className="lock-sub">Chargement…</div></div></div>)
          : !authUser
            ? (<OnlineLogin onExit={exitClient} logo={null} sub="Ta boutique" heading="Connexion à ta boutique" />)
            : (<ClientGate authUser={authUser} onSignOut={authSignOut} onExit={exitClient} resellerPhone={resellerPhone} logo={null} />)}
      </div>
    );
  }
  if (!authReady) {
    return (<div className="app"><style>{CSS}</style><div className="lock"><div className="lock-brand"><BrandMark logo={null} lg /><div className="lock-sub">Chargement…</div></div></div></div>);
  }
  if (!authUser) {
    return (<div className="app"><style>{CSS}</style><OnlineLogin logo={null} sub="Ta boutique" heading="Connexion à ta boutique" /></div>);
  }
  if (!onlineReady || !currentUser) {
    return (<div className="app"><style>{CSS}</style><ClientGate authUser={authUser} onSignOut={authSignOut} resellerPhone={resellerPhone} logo={null} onAuthorized={enterOnline} /></div>);
  }
  if (pin && !pinOk) {
    return (<div className="app"><style>{CSS}</style><PinScreen pin={pin} email={authUser ? authUser.email : ""} shopName={shop.name} logo={null} onUnlock={() => setPinOk(true)} onLogout={logout} /></div>);
  }
  const isPatron = currentUser.role === "patron";
  const myPerms = isPatron ? null : (!permsEmpty(currentUser.perms) ? currentUser.perms : DEFAULT_VENDOR_PERMS);
  const lvl = (id) => (isPatron ? "edit" : permLevel(myPerms, id));
  const canSee = (id) => lvl(id) !== "none";
  const canEdit = (id) => lvl(id) === "edit";
  const seeMargin = isPatron || permLevel(myPerms, "benefices") === "view";
  const expiryDate = license && license.expiry ? new Date(license.expiry) : null;
  const daysLeft = expiryDate ? Math.ceil((expiryDate.getTime() - Date.now()) / DAY) : null;
  const showExpiryWarn = !(license && license.lifetime) && daysLeft !== null && daysLeft >= 0 && daysLeft <= 7 && !expiryDismissed;
  const chatUnreadMap = (() => {
    const map = { all: 0 };
    messages.forEach((m) => {
      if (m.removed || m.userId === currentUser.id) return;
      if (!m.to || m.to === "all") { if ((m.ts || 0) > (chatSeen.all || 0)) map.all += 1; }
      else if (m.to === currentUser.id) { const k = m.userId; if ((m.ts || 0) > (chatSeen[k] || 0)) map[k] = (map[k] || 0) + 1; }
    });
    return map;
  })();
  const chatUnread = Object.values(chatUnreadMap).reduce((a, b) => a + b, 0);
  const navItems = NAV.filter((n) => canSee(n.id));
  const cur = (navItems.some((n) => n.id === view) || (canSee("equipe") && view === "equipe")) ? view : "dash";

  return (
    <div className="app">
      <style>{CSS}</style>

      {navOpen && <div className="scrim" onClick={() => setNavOpen(false)} />}
      <aside className={`sidebar ${navOpen ? "open" : ""}`}>
        <div className="brand">
          <BrandMark />
          <div><div className="brand-name">{shop.name || "Atelier d'Or"}</div><div className="brand-sub">{currentUser.name} · {isPatron ? "Patron" : (currentUser.poste || "Vendeur")}</div></div>
        </div>
        <nav>
          {navItems.map((n) => (
            <button key={n.id} className={`nav-item ${cur === n.id ? "active" : ""}`} onClick={() => go(n.id)}>
              <n.icon size={18} /> <span>{n.label}</span>
            </button>
          ))}
        </nav>
        <div className="side-foot">
          <button className="btn logout-btn" onClick={logout}><LogOut size={15} /> Déconnexion</button>
          <div className="save-ind">
            <span className={`save-dot ${saveState === "error" ? "error" : "saved"}`} />
            {saveState === "error" ? "Sauvegarde indisponible" : "Données enregistrées"}
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="top-left">
            <button className="icon-btn menu-btn" onClick={() => setNavOpen((o) => !o)}><Menu size={20} /></button>
            <div>
              <h1>{titles[cur]}</h1>
              <span className="muted small shop-line">{shop.name || "Atelier d'Or"}</span>
            </div>
          </div>

          <div className="cours-ticker" onClick={() => go("cours")} title="Voir le cours en direct">
            <span className="ticker-live"><span className="dot live" /></span>
            <button className={`ticker-toggle ${tickerMode}`} onClick={(e) => { e.stopPropagation(); setTickerMode((m) => m === "vente" ? "achat" : "vente"); }} title="Basculer prix de vente / prix d'achat">
              {tickerMode === "vente" ? "Vente ⇄" : "Achat ⇄"}
            </button>
            {KARATS.map((k) => (
              <div className="assay" key={k}>
                <span className="assay-k">{k}K</span>
                <span className="assay-p num">{nf.format(Math.round(prices[k][tickerMode]))}</span>
              </div>
            ))}
          </div>

          <div className="clock-box">
            <div className="clock-time">{now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</div>
            <div className="clock-date">{now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}{syncState !== "idle" && <span className={`net-pill ${(syncState === "offline" || syncState === "error") ? "off" : "on"}`}><span className="net-dot" />{(syncState === "offline" || syncState === "error") ? "Hors ligne" : "En ligne"}</span>}</div>
          </div>

          <div className="top-actions">
            {SEARCH_PH[view] && (
              <div className="search"><Search size={15} /><input placeholder={SEARCH_PH[view]} value={q} onChange={(e) => setQ(e.target.value)} /></div>
            )}
            {canEdit("buy") && <button className="btn btn-clay" onClick={() => setModal({ type: "purchase" })}><ArrowDownLeft size={16} /> Achat</button>}
            {canEdit("sales") && <button className="btn btn-gold" onClick={() => setModal({ type: "sale" })}><Plus size={16} /> Vente</button>}
          </div>
        </header>

        <main className="content">{cur !== "dash" && PAGE_NOTES[cur] && <PageNote id={cur}>{PAGE_NOTES[cur]}</PageNote>}{VIEWS[cur]()}</main>
      </div>

      {modal?.type === "sale" && <SaleModal prices={prices} gold={gold} divers={divers} clients={clients} init={modal.init} onClose={() => setModal(null)} onSave={addSale} onNewArticle={() => { go("stock"); setStockTab("divers"); setModal({ type: "divers" }); }} />}
      {modal?.type === "purchase" && <PurchaseModal prices={prices} clients={clients} init={modal.init} onClose={() => setModal(null)} onSave={addPurchase} />}
      {modal?.type === "gold" && <GoldModal item={modal.data} defaultCat={stockTab === "or" ? "or" : "bijou"} onClose={() => setModal(null)} onSave={saveGold} />}
      {modal?.type === "divers" && <DiversModal item={modal.data} onClose={() => setModal(null)} onSave={saveDivers} />}
      {modal?.type === "client" && <ClientModal item={modal.data} onClose={() => setModal(null)} onSave={saveClient} />}
      {modal?.type === "expense" && <ExpenseModal item={modal.data} onClose={() => setModal(null)} onSave={saveExpense} />}
      {modal?.type === "treasury" && <TreasuryModal op={modal.op} account={modal.account} accounts={TREASURY_ACCOUNTS} balances={treasuryBalances} onClose={() => setModal(null)} onSave={saveTreasury} />}
      {modal?.type === "salary" && <SalaryModal names={teamMembers.map((m) => m.name).filter(Boolean)} onClose={() => setModal(null)} onSave={paySalary} />}
      {modal?.type === "pin" && <PinSetModal hasPin={!!pin} onClose={() => setModal(null)} onSave={(cfg) => { savePin(cfg); setModal(null); notify("Code PIN enregistré. Il sera demandé à la prochaine ouverture.", "Sécurité"); }} onRemove={() => { savePin(null); setPinOk(true); setModal(null); notify("Code PIN retiré.", "Sécurité"); }} />}
      {modal?.type === "user" && <UserModal item={modal.data} onClose={() => setModal(null)} onSave={saveUser} />}
      {backup && <BackupModal mode={backup} json={buildBackupJson()} onClose={() => setBackup(null)} onImport={applyImport} />}
      {upsell && (
        <Modal title={`${upsell} — disponible en Pro`} onClose={() => setUpsell(null)}
          footer={<><button className="btn btn-line" onClick={() => setUpsell(null)}>Fermer</button><button className="btn btn-gold" onClick={() => { setUpsell(null); go("abo"); }}>Voir les formules</button></>}>
          <p className="muted small" style={{ margin: 0 }}>Cette fonction est incluse dans les formules <strong>Pro</strong> et <strong>Premium</strong>. Passe à une formule supérieure pour l'utiliser.</p>
        </Modal>
      )}
      {mediaUpsell && (
        <Modal title="Limite de ta formule atteinte" onClose={() => setMediaUpsell(null)}
          footer={<><button className="btn btn-line" onClick={() => setMediaUpsell(null)}>Garder ma formule</button><button className="btn btn-gold" onClick={() => { setMediaUpsell(null); go("abo"); }}>Passer en Pro</button></>}>
          <p className="muted small" style={{ margin: 0, lineHeight: 1.5 }}>{mediaUpsell.message}</p>
        </Modal>
      )}
      {clientView && renderClientHistory()}
      {productView && renderProductHistory()}
      {receipt && <ReceiptModal data={receipt} shop={shop} onClose={() => setReceipt(null)} />}
      {zView && <ZModal data={zView} shop={shop} onClose={() => setZView(null)} />}
      {acompteFor && <AcompteModal sale={acompteFor} balance={balanceFor(acompteFor)} onClose={() => setAcompteFor(null)} onSave={(p) => recordPayment(acompteFor, p)} />}
      {settleFor && <SettlePurchaseModal purchase={settleFor} balance={purchaseBalance(settleFor)} onClose={() => setSettleFor(null)} onSave={(p) => settlePurchase(settleFor, p)} />}
      {formulaReq && <FormulaModal req={formulaReq} onClose={() => setFormulaReq(null)} />}
      {returnFor && <RetourModal sale={returnFor} onClose={() => setReturnFor(null)} onSave={(p) => recordReturn(returnFor, p)} />}
      {confirm && (
        <ConfirmModal title={confirm.title} message={confirm.message} okLabel={confirm.okLabel} danger={confirm.danger}
          onCancel={() => setConfirm(null)}
          onOk={() => { const f = confirm.onOk; setConfirm(null); if (f) f(); }} />
      )}
      {notice && <NoticeModal title={notice.title} message={notice.message} onClose={() => setNotice(null)} />}
      {history && (() => {
        const it = history.item;
        const isSale = history.type === "sale";
        const pays = (isSale ? payments.filter((p) => p.saleId === it.id) : purchasePayments.filter((p) => p.purchaseId === it.id));
        const paidSum = pays.reduce((a, b) => a + (b.amount || 0), 0);
        const total = it.total || 0;
        const bal = Math.max(0, total - paidSum);
        const ev = [];
        ev.push({ date: it.date, t: it.time || "", label: isSale ? "Vente enregistrée" : "Achat enregistré", detail: isSale ? it.label : `${it.karat}K · ${g(it.weight)}`, amount: total, by: it.by, kind: "create" });
        pays.forEach((p, i) => ev.push({ date: p.date, t: p.time || "", label: i === 0 ? "Paiement initial" : "Versement", detail: p.pay, amount: p.amount, by: p.by, kind: "pay" }));
        if (it.returned) ev.push({ date: it.date, t: "", label: "Vente retournée", detail: "", amount: null, kind: "return" });
        ev.sort((a, b) => String(a.date + a.t).localeCompare(String(b.date + b.t)));
        return (
          <Modal title={isSale ? "Historique de la vente" : "Historique de l'achat"} sub={isSale ? it.label : (it.client || "")} onClose={() => setHistory(null)}
            footer={<button className="btn btn-line" onClick={() => setHistory(null)}>Fermer</button>}>
            <div className="hist-grid">
              <div><span className="muted small">Client</span><b>{it.client || "—"}</b></div>
              <div><span className="muted small">Total</span><b>{fcfa(total)}</b></div>
              <div><span className="muted small">Payé</span><b className="pos">{fcfa(paidSum)}</b></div>
              <div><span className="muted small">Reste</span><b className={bal > 0 ? "neg" : "pos"}>{fcfa(bal)}</b></div>
            </div>
            <div className="timeline">
              {ev.map((e, i) => (
                <div className="tl-item" key={i}>
                  <span className={`tl-dot ${e.kind}`} />
                  <div className="tl-body">
                    <div className="tl-top"><strong>{e.label}</strong>{e.amount != null && <span className={`num ${e.kind === "pay" ? "pos" : ""}`}>{fcfa(e.amount)}</span>}</div>
                    <div className="muted small">{dateFr(e.date)}{e.t ? ` · ${e.t}` : ""}{e.detail ? ` · ${e.detail}` : ""}{e.by ? ` · ${e.by}` : ""}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="data-actions" style={{ marginTop: 14, marginBottom: 0 }}>
              <button className="btn btn-line" onClick={() => { setHistory(null); setReceipt(buildReceipt(isSale ? it : { ...it, paid: purchasePaidFor(it.id), kind: "purchase" })); }}>{isSale ? "Voir le reçu" : "Bordereau"}</button>
              {isSale && bal > 0 && canEdit("credits") && <button className="btn btn-gold" onClick={() => { setHistory(null); setAcompteFor(it); }}>Encaisser</button>}
              {isPatron && isSale && !it.returned && <button className="btn btn-clay" onClick={() => { setHistory(null); setReturnFor(it); }}>Retour</button>}
              {!isSale && bal > 0 && canEdit("buy") && <button className="btn btn-clay" onClick={() => { setHistory(null); setSettleFor(it); }}>Solder</button>}
            </div>
          </Modal>
        );
      })()}

      <div className="print-receipt">{receipt ? <ReceiptCard data={receipt} shop={shop} /> : zView ? <ZCard data={zView} shop={shop} /> : null}</div>
      {showInstallBar && !showExpiryWarn && (
        <div className="install-bar">
          <span className="install-txt"><Download size={16} /> {isIosDevice
            ? <>Ajoute Atelier d'Or à ton écran d'accueil : <strong>Partager</strong> ↑ puis <strong>« Sur l'écran d'accueil »</strong>.</>
            : <>Installe Atelier d'Or sur ton écran d'accueil.</>}</span>
          <div className="install-acts">
            <button className="btn btn-xs btn-ghost" onClick={dismissInstall}>Plus tard</button>
            {!isIosDevice && <button className="btn btn-xs btn-gold" onClick={doInstall}>Installer</button>}
          </div>
        </div>
      )}
      {showExpiryWarn && (
        <div className="expiry-bar">
          <span className="expiry-txt"><AlertTriangle size={15} /> {daysLeft === 0 ? "Ton abonnement expire aujourd'hui." : `Ton abonnement expire dans ${daysLeft} jour${daysLeft > 1 ? "s" : ""}.`} Pense à le renouveler.</span>
          <div className="expiry-acts">
            <button className="btn btn-xs btn-ghost" onClick={() => setExpiryDismissed(true)}>Plus tard</button>
            {isPatron && <button className="btn btn-xs btn-gold" onClick={() => { setView("abo"); setNavOpen(false); }}>Renouveler</button>}
          </div>
        </div>
      )}
      {updateReady && (
        <div className="update-bar">
          <span className="update-txt"><RefreshCw size={15} /> Une nouvelle version est disponible.</span>
          <div className="update-acts">
            <button className="btn btn-xs btn-ghost" onClick={() => setUpdateReady(false)}>Plus tard</button>
            <button className="btn btn-xs btn-gold" onClick={applyUpdate}>Mettre à jour</button>
          </div>
        </div>
      )}
      <ChatWidget messages={messages} reads={reads} people={(teamMembers && teamMembers.length ? teamMembers : users).filter((u) => u.id && u.id !== currentUser.id)} myId={currentUser.id} isPatron={isPatron} open={chatOpen} onToggle={() => setChatOpen((o) => !o)} onSend={sendMessage} onDelete={deleteMessage} unread={chatUnread} unreadMap={chatUnreadMap} onSeen={markSeen} onNotice={notify} limits={mediaLimit(license ? license.plan : "S")} shopId={currentUser.shopId} onUpsell={chatUpsell} />
    </div>
  );
}

/* --------------------------------- CSS ---------------------------------- */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap');
* { box-sizing:border-box; }
.app {
  --ink:#1c1611; --ink2:#2a221b; --paper:#f6f1e7; --card:#fffdf8;
  --gold:#b8862f; --gold2:#d9a441; --gold-soft:#f3e7cb;
  --green:#3c5a43; --green-soft:#e3ece4; --clay:#9c4a35; --clay-soft:#f1ddd6;
  --line:#e6ddcc; --text:#2a2017; --muted:#8a7d68;
  display:flex; min-height:100vh; background:var(--paper); color:var(--text);
  font-family:'Inter',system-ui,sans-serif; font-size:14px; line-height:1.45;
}
.app h1,.app h2,.app h3 { font-family:'Fraunces',Georgia,serif; font-weight:600; margin:0; letter-spacing:-.01em; }
.num { font-family:'JetBrains Mono',monospace; font-variant-numeric:tabular-nums; white-space:nowrap; }
.muted { color:var(--muted); } .small{ font-size:12px; } .r{ text-align:right; }
.pos{ color:var(--green); } .neg{ color:var(--clay); }

.sidebar { width:248px; background:var(--ink); color:#e9e0d0; display:flex; flex-direction:column;
  position:fixed; inset:0 auto 0 0; z-index:40; padding:calc(18px + env(safe-area-inset-top, 0px)) 14px 18px;
  overflow-y:auto; -webkit-overflow-scrolling:touch; overscroll-behavior:contain; }
.brand { display:flex; align-items:center; gap:11px; padding:6px 8px 20px; }
.brand-mark { width:40px; height:40px; border-radius:10px; display:grid; place-items:center;
  background:var(--ink); color:var(--gold); border:1.5px solid rgba(184,134,47,.55);
  font-family:'Fraunces',serif; font-weight:700; font-size:18px; }
.brand-mark.has-logo { background:#fff; overflow:hidden; border:none; }
.brand-mark.has-logo img { width:100%; height:100%; object-fit:contain; }
.logo-field { display:flex; align-items:center; gap:12px; }
.logo-preview { width:54px; height:54px; border-radius:11px; border:1px solid var(--line); background:#fff; display:grid; place-items:center; overflow:hidden; flex:none; }
.logo-preview img { width:100%; height:100%; object-fit:contain; }
.logo-preview span { font-family:'Fraunces',serif; font-weight:700; font-size:20px; color:var(--gold); }
.logo-actions { display:flex; flex-wrap:wrap; gap:8px; }
.btn-line.danger { color:#9c4a35; border-color:#caa; }
.rc-logo { display:block; max-height:54px; max-width:70%; margin:0 auto 8px; object-fit:contain; }
.brand-name { font-family:'Fraunces',serif; font-weight:600; font-size:16px; color:#fff; }
.brand-sub { font-size:11px; color:#a99c84; }
nav { display:flex; flex-direction:column; gap:3px; flex:1; }
.nav-item { display:flex; align-items:center; gap:11px; padding:10px 12px; border-radius:9px;
  background:none; border:0; color:#c8bca6; font:inherit; font-size:13.5px; cursor:pointer; text-align:left; transition:.15s; }
.nav-item:hover { background:rgba(255,255,255,.05); color:#fff; }
.nav-item.active { background:rgba(216,164,65,.14); color:var(--gold2); }
.side-foot { border-top:1px solid rgba(255,255,255,.08); padding-top:14px; }
.side-cash { display:flex; flex-direction:column; gap:2px; padding:10px 12px; background:rgba(255,255,255,.04); border-radius:9px; }
.side-cash span { font-size:11px; color:#a99c84; } .side-cash strong { color:var(--gold2); font-size:16px; }

.main { flex:1; margin-left:248px; min-width:0; display:flex; flex-direction:column; }
.topbar { display:flex; align-items:center; gap:16px; padding:calc(14px + env(safe-area-inset-top, 0px)) 24px 14px; background:rgba(255,253,248,.85);
  backdrop-filter:blur(8px); border-bottom:1px solid var(--line); position:sticky; top:0; z-index:20; flex-wrap:wrap; }
.top-left { display:flex; align-items:center; gap:12px; margin-right:auto; }
.topbar h1 { font-size:21px; }
.shop-line { font-weight:600; color:var(--gold); text-transform:capitalize; }
.sync-chip { display:inline-block; margin-left:10px; padding:1px 9px; border-radius:20px; font-size:10.5px; font-weight:600; background:var(--gold-soft,#f3e7c9); color:var(--gold); vertical-align:middle; }
.cell-time { display:block; font-size:11px; color:var(--muted); margin-top:1px; }
.sync-chip.offline, .sync-chip.error { background:#f3e3dd; color:var(--clay); }
.sync-chip.synced { background:#e4efe6; color:var(--green); }
.cours-ticker { display:flex; align-items:center; gap:7px; margin:0; flex-wrap:wrap; cursor:pointer;
  padding:8px 13px; border-radius:14px; border:1px solid rgba(184,134,47,.4);
  background:#1c1611 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='480' height='96'%3E%3Cdefs%3E%3ClinearGradient id='a' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%23241b12'/%3E%3Cstop offset='1' stop-color='%231a140f'/%3E%3C/linearGradient%3E%3CradialGradient id='b' cx='0.86' cy='0.12' r='0.95'%3E%3Cstop offset='0' stop-color='%23d8a441' stop-opacity='0.5'/%3E%3Cstop offset='1' stop-color='%23d8a441' stop-opacity='0'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect width='480' height='96' fill='url(%23a)'/%3E%3Crect width='480' height='96' fill='url(%23b)'/%3E%3Ccircle cx='70' cy='74' r='26' fill='%23d8a441' opacity='0.10'/%3E%3Ccircle cx='180' cy='22' r='13' fill='%23f0c869' opacity='0.10'/%3E%3Ccircle cx='320' cy='70' r='20' fill='%23d8a441' opacity='0.08'/%3E%3Ccircle cx='440' cy='30' r='30' fill='%23b8862f' opacity='0.10'/%3E%3C/svg%3E") center/cover no-repeat;
  box-shadow:0 4px 14px rgba(28,22,17,.18); }
.clock-box { display:flex; flex-direction:column; align-items:flex-end; line-height:1.12; }
.clock-time { font-size:26px; font-weight:700; font-variant-numeric:tabular-nums; color:var(--gold); letter-spacing:.5px; }
.clock-date { font-size:12px; color:var(--muted); text-transform:capitalize; margin-top:1px; }
.net-pill { display:inline-flex; align-items:center; gap:5px; margin-left:8px; font-size:11px; font-weight:600; color:var(--green); vertical-align:middle; text-transform:none; }
.net-pill.off { color:var(--clay); }
.net-dot { width:7px; height:7px; border-radius:50%; background:#3fae6a; display:inline-block; }
.net-pill.off .net-dot { background:var(--clay); }
.ticker-live { display:inline-flex; align-items:center; }
.assay { display:flex; flex-direction:column; align-items:center; border:1px solid var(--line);
  border-radius:8px; padding:4px 9px; background:var(--card); min-width:58px; }
.assay-k { font-size:10px; font-weight:700; color:var(--gold); letter-spacing:.04em; }
.assay-p { font-size:12px; font-weight:600; }
.assay-world { background:var(--gold-soft,#f3e7c9); border-color:rgba(184,134,47,.5); min-width:64px; }
.calc-hint { font-size:11.5px; color:var(--muted); margin-top:6px; line-height:1.45; background:#faf6ec; border:1px solid var(--line); border-radius:9px; padding:9px 11px; }
.field-hint { font-size:11px; color:var(--muted); line-height:1.35; }
.calc-conv { margin-top:16px; }
.ticker-toggle { display:inline-flex; align-items:center; justify-content:center; border:0; cursor:pointer;
  padding:7px 13px; border-radius:9px; font-size:12.5px; font-weight:800; letter-spacing:.03em;
  color:#fff !important; white-space:nowrap; line-height:1; min-width:62px; }
.ticker-toggle.vente { background:var(--green); }
.ticker-toggle.achat { background:var(--clay); }
.stat-sep { color:var(--muted); font-weight:400; margin:0 2px; }
.assay-world .assay-k { color:var(--ink2,#3a2e1d); }
.assay-world .assay-p { color:var(--gold); }
.top-actions { display:flex; align-items:center; gap:9px; }
.search { display:flex; align-items:center; gap:7px; background:var(--card); border:1px solid var(--line);
  border-radius:9px; padding:7px 11px; color:var(--muted); }
.search input { border:0; background:none; outline:none; font:inherit; width:130px; color:var(--text); }
.icon-btn.menu-btn { display:none; }
.menu-btn:focus, .menu-btn:focus-visible { outline:none; }

.content { padding:24px; max-width:1240px; width:100%; }

.card { background:var(--card); border:1px solid var(--line); border-radius:14px; padding:18px;
  margin-bottom:18px; box-shadow:0 1px 2px rgba(40,30,15,.03); }
.card-head { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:14px; flex-wrap:wrap; }
.card-head h3 { font-size:16px; display:flex; align-items:center; gap:9px; }
.count { font-family:'JetBrains Mono',monospace; font-size:11px; background:var(--gold-soft);
  color:var(--gold); padding:1px 8px; border-radius:20px; font-weight:600; }
.row2 { display:grid; grid-template-columns:1.6fr 1fr; gap:18px; }

.kpis { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:18px; }
.kpi { padding:16px; }
.kpi-ico { width:34px; height:34px; border-radius:9px; display:grid; place-items:center; margin-bottom:10px; }
.tone-gold { background:var(--gold-soft); color:var(--gold); }
.tone-green { background:var(--green-soft); color:var(--green); }
.tone-clay { background:var(--clay-soft); color:var(--clay); }
.kpi-label { font-size:12px; color:var(--muted); }
.kpi-value { font-size:23px; font-weight:600; margin-top:3px; font-family:'Fraunces',serif; }
.kpi-sub { font-size:11.5px; color:var(--muted); margin-top:3px; }

.table { width:100%; border-collapse:collapse; }
.table th { text-align:left; font-size:11px; text-transform:uppercase; letter-spacing:.04em;
  color:var(--muted); font-weight:600; padding:8px 10px; border-bottom:1px solid var(--line); }
.table td { padding:11px 10px; border-bottom:1px solid #f0eadb; font-size:13.5px; }
.table tr:last-child td { border-bottom:0; }
.table tbody tr:hover { background:#faf6ec; }
.warn-row { background:#fdf4ec; }
.mini-warn { font-size:10px; color:var(--clay); background:var(--clay-soft); padding:1px 6px; border-radius:10px; margin-left:8px; }

.karat { font-family:'JetBrains Mono',monospace; font-size:11px; font-weight:600; color:var(--gold);
  border:1px solid var(--gold); border-radius:6px; padding:2px 7px; display:inline-block; }
.pct { font-size:11px; color:var(--muted); margin-left:4px; }
.calc-grid { column-count:2; column-gap:16px; }
.calc-grid > .card { break-inside:avoid; margin-bottom:16px; display:inline-block; width:100%; }
.calc-res { display:flex; gap:12px; margin-top:8px; }
.calc-res > div { flex:1; background:#faf6ec; border:1px solid var(--line); border-radius:11px; padding:11px 13px; display:flex; flex-direction:column; gap:2px; }
.calc-res .lab { font-size:12px; color:var(--muted); }
.calc-res .val { font-size:19px; font-weight:700; font-variant-numeric:tabular-nums; }
.input-ro { background:#f6f1e6; display:flex; align-items:center; font-weight:700; }
.calc-disp { background:var(--ink); color:#fff; border-radius:12px; padding:14px 18px; text-align:right; font-size:27px; font-weight:700; font-variant-numeric:tabular-nums; overflow:hidden; min-height:34px; position:relative; }
.calc-op-ind { position:absolute; left:16px; top:8px; font-size:13px; font-weight:600; color:var(--gold2); }
.calc-pad { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-top:10px; }
.calc-key { padding:15px 0; border-radius:11px; border:1px solid var(--line); background:var(--card); font-size:17px; font-weight:600; cursor:pointer; color:var(--ink); }
.calc-key:hover { background:#f3ecdd; }
.calc-key.fn { background:#efe8d9; color:var(--muted); }
.calc-key.op { background:var(--gold-soft); color:var(--gold); }
.calc-key.eq { background:var(--gold); color:#fff; border-color:var(--gold); }
.calc-key.wide { grid-column:span 2; }
@media (max-width:760px){ .calc-grid { column-count:1; } }
.achat { color:var(--clay); font-weight:600; } .vente { color:var(--green); font-weight:600; }
.pill { font-size:11px; font-weight:600; padding:2px 9px; border-radius:20px; }
.pill-gold { background:var(--gold-soft); color:var(--gold); }
.pill-ink { background:#ece5d6; color:var(--ink2); }
.pill-clay { background:#f3e3dd; color:var(--clay); }
.pst-paid { background:#e4efe6; color:var(--green); }
.pst-part { background:var(--gold-soft,#f3e7c9); color:var(--gold); }
.pst-none { background:#f3e3dd; color:var(--clay); }
.pst-ret { background:#ece5d6; color:var(--ink2); }
.row-click { cursor:pointer; }
.row-click:hover { background:rgba(184,134,47,.06); }
.hist-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; padding:12px 14px; background:#faf6ec; border:1px solid var(--line); border-radius:11px; margin-bottom:14px; }
.hist-grid span { display:block; }
.hist-grid b { font-size:15px; }
.timeline { display:flex; flex-direction:column; gap:2px; }
.tl-item { display:flex; gap:12px; padding:8px 0; }
.tl-dot { width:10px; height:10px; border-radius:50%; background:var(--gold); margin-top:5px; flex:none; }
.tl-dot.pay { background:var(--green); }
.tl-dot.return { background:var(--clay); }
.tl-body { flex:1; min-width:0; }
.tl-top { display:flex; justify-content:space-between; align-items:center; gap:10px; }
@media (max-width:560px){ .hist-grid { grid-template-columns:repeat(2,1fr); } }
.enc-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:12px; }
.acct-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-bottom:18px; }
.acct-card { display:flex; flex-direction:column; gap:10px; padding:16px; }
.acct-top { display:flex; align-items:center; gap:11px; }
.acct-ico { font-size:24px; width:42px; height:42px; display:grid; place-items:center; background:var(--gold-soft); border-radius:11px; flex:none; }
.acct-name { font-weight:700; font-size:15px; color:var(--ink); }
.acct-bal { font-size:24px; font-weight:800; color:var(--ink); letter-spacing:-.01em; }
.acct-lines { display:flex; gap:10px; }
.acct-lines > div { flex:1; display:flex; flex-direction:column; gap:1px; background:var(--paper); border:1px solid var(--line); border-radius:9px; padding:7px 10px; }
.acct-acts { display:flex; flex-wrap:wrap; gap:6px; margin-top:2px; }
.acct-wave .acct-ico { background:#9fd0f5; }
.acct-om .acct-ico { background:#ffac61; }
.btn-xs { padding:6px 10px; font-size:12px; }
@media (max-width:760px){ .acct-grid { grid-template-columns:1fr; } }
.enc-cell { background:var(--paper); border:1px solid var(--line); border-radius:10px; padding:9px 11px; display:flex; flex-direction:column; gap:2px; min-width:0; }
.enc-lab { font-size:11.5px; color:var(--muted); line-height:1.25; }
.enc-val { font-size:15px; font-weight:600; color:var(--text); }
.enc-sum { display:flex; flex-direction:column; gap:7px; padding-top:10px; border-top:1px solid var(--line); }
.enc-sum-row { display:flex; justify-content:space-between; align-items:baseline; gap:12px; font-weight:600; }
.enc-sum-row .num { font-weight:700; }
.enc-sum-row.sub { font-weight:400; color:var(--muted); font-size:12px; }
.enc-sum-row.sub .num { font-weight:400; }
@media (max-width:560px){ .enc-grid { grid-template-columns:repeat(2,1fr); } }

.btn { display:inline-flex; align-items:center; gap:7px; border:0; border-radius:9px; padding:9px 15px;
  font:inherit; font-size:13.5px; font-weight:600; cursor:pointer; transition:.15s; white-space:nowrap; }
.btn:disabled { opacity:.45; cursor:not-allowed; }
.btn-gold { background:var(--gold); color:#fff; } .btn-gold:hover:not(:disabled){ background:#a4781f; }
.btn-clay { background:var(--clay); color:#fff; } .btn-clay:hover:not(:disabled){ background:#85402d; }
.btn-ghost { background:#efe8d9; color:var(--text); } .btn-ghost:hover{ background:#e6ddcc; }
.btn-line { background:none; border:1px solid var(--line); color:var(--text); }
.icon-btn { background:none; border:0; color:var(--muted); cursor:pointer; padding:5px; border-radius:7px; display:grid; place-items:center; }
.icon-btn:hover { background:#ece5d6; color:var(--text); }
.rowbtns { display:inline-flex; gap:2px; }

.alert-card { display:flex; align-items:center; gap:14px; border-color:#eccfae; background:#fdf6ec; }
.alert-ico { width:36px; height:36px; border-radius:9px; background:var(--clay-soft); color:var(--clay); display:grid; place-items:center; flex-shrink:0; }
.alert-card p { margin:2px 0 0; font-size:12.5px; }
.alert-card .btn { margin-left:auto; }

.client-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:12px; }
.client-card { display:flex; gap:12px; align-items:flex-start; border:1px solid var(--line); border-radius:12px; padding:14px; background:#fffefb; }
.avatar { width:42px; height:42px; border-radius:50%; background:var(--ink); color:var(--gold2);
  display:grid; place-items:center; font-weight:600; font-size:14px; flex-shrink:0; font-family:'Fraunces',serif; }
.client-main { display:flex; flex-direction:column; gap:1px; flex:1; min-width:0; }
.client-note { font-size:12px; color:var(--gold); }

.field { display:flex; flex-direction:column; gap:5px; margin-bottom:12px; }
.field-label { font-size:12px; font-weight:600; color:var(--muted); }
.input { border:1px solid var(--line); border-radius:9px; padding:9px 11px; font:inherit; font-size:14px;
  background:#fffefb; color:var(--text); outline:none; width:100%; }
.input:focus { border-color:var(--gold); box-shadow:0 0 0 3px rgba(184,134,47,.12); }
.grid2 { display:grid; grid-template-columns:1fr 1fr; gap:0 14px; }
.note-box { margin:14px 0 0; font-size:12.5px; color:var(--muted); background:#faf6ec; border:1px dashed var(--line); border-radius:9px; padding:11px 13px; }

.seg { display:inline-flex; gap:4px; background:#efe8d9; border-radius:10px; padding:4px; margin-bottom:14px; }
.seg-3 { display:flex; width:100%; }
.seg-4 { display:flex; width:100%; }
.seg-4 .seg-btn { flex:1; justify-content:center; padding:8px 6px; font-size:12.5px; }
.head-btns { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
.req-msg { background:#f6efe1; border:1px solid var(--line); border-radius:11px; padding:14px 16px; color:var(--ink); font-size:14.5px; line-height:1.5; }
.name-link { border:0; background:none; padding:0; font:inherit; color:var(--gold2); font-weight:600; cursor:pointer; text-decoration:underline; text-underline-offset:2px; }
.name-link:hover { color:var(--gold); }
.ch-kpis { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:14px; }
.ch-kpi { background:#f6efe1; border:1px solid var(--line); border-radius:10px; padding:10px 12px; display:flex; flex-direction:column; gap:3px; }
.ch-kpi span { font-size:11px; color:var(--muted); } .ch-kpi strong { font-size:15px; }
.ch-h { font-family:'Fraunces',serif; font-size:15px; margin:14px 0 6px; color:var(--ink); }
.role-tags { display:flex; gap:8px; margin-bottom:12px; flex-wrap:wrap; }
.cat-split { display:flex; gap:8px; flex-wrap:wrap; margin:-4px 0 14px; }
.cat-chip { background:#f6efe1; border:1px solid var(--line); border-radius:999px; padding:5px 12px; font-size:12.5px; font-weight:600; }
.cat-chip em { color:var(--muted); font-style:normal; font-weight:500; margin-right:5px; }
.prod-cell { display:flex; align-items:center; gap:9px; }
.prod-thumb { width:34px; height:34px; border-radius:8px; object-fit:cover; border:1px solid var(--line); flex:none; }
.prod-thumb.ph { display:grid; place-items:center; background:#f1ead9; font-size:15px; }
.prod-photo { display:block; width:100%; max-height:200px; object-fit:contain; background:#f6efe1; border:1px solid var(--line); border-radius:12px; margin-bottom:14px; }
.chk-row { display:flex; align-items:center; gap:9px; margin:6px 0 12px; font-size:14px; cursor:pointer; }
.chk-row input { width:17px; height:17px; accent-color:var(--gold); }
.table.compact td { padding:7px 8px; font-size:13px; }
@media (max-width:560px){ .ch-kpis { grid-template-columns:repeat(2,1fr); } }
a.btn { text-decoration:none; display:inline-flex; align-items:center; justify-content:center; }
.seg-3 .seg-btn { flex:1; justify-content:center; padding:8px 6px; font-size:12px; gap:5px; }
@media (max-width:480px){ .seg-3 .seg-btn { font-size:11px; padding:8px 4px; } .seg-3 .seg-btn svg { display:none; } }
.seg-lg { margin-bottom:18px; }
.seg-btn { display:inline-flex; align-items:center; gap:7px; border:0; background:none; padding:8px 14px;
  border-radius:7px; font:inherit; font-size:13px; font-weight:600; color:var(--muted); cursor:pointer; }
.seg-btn.active { background:var(--card); color:var(--text); box-shadow:0 1px 2px rgba(0,0,0,.06); }

.overlay { position:fixed; inset:0; background:rgba(28,22,17,.45); backdrop-filter:blur(3px);
  display:grid; place-items:center; z-index:200; padding:18px; }
.modal { background:var(--paper); border-radius:16px; width:100%; max-width:560px; max-height:92vh;
  overflow:auto; box-shadow:0 24px 60px rgba(28,22,17,.3); }
.modal-head { display:flex; justify-content:space-between; align-items:flex-start; padding:18px 20px 12px; }
.modal-head h3 { font-size:18px; } .modal-sub { margin:3px 0 0; font-size:12.5px; color:var(--muted); }
.modal-body { padding:4px 20px 8px; }
.modal-foot { display:flex; align-items:center; justify-content:space-between; gap:12px;
  padding:14px 20px; border-top:1px solid var(--line); background:var(--card); position:sticky; bottom:0; flex-wrap:wrap; }
.foot-total { font-size:13px; color:var(--muted); } .foot-total strong { font-size:18px; color:var(--text); margin-left:6px; }
.foot-actions { display:flex; gap:9px; margin-left:auto; }
.scrim { display:none; }

/* ---- cours en direct ---- */
.cours-hero { background:linear-gradient(155deg,#241c14,#1c1611); color:#ece3d2; border-radius:16px; padding:20px; margin-bottom:18px; box-shadow:0 10px 26px rgba(28,22,17,.2); }
.cours-hero h2 { color:#fff; font-size:23px; margin-top:8px; }
.ch-sub { color:#a99c84; font-size:12.5px; margin:3px 0 0; max-width:520px; }
.cours-desc { margin:12px 0 0; padding:10px 12px; background:var(--gold-soft); border:1px solid var(--line); border-radius:12px; font-size:12.5px; line-height:1.5; color:var(--ink2); }
.cours-desc strong { color:var(--ink); }
.live-tag { display:inline-flex; align-items:center; gap:7px; font-size:11px; font-weight:700; letter-spacing:.05em; text-transform:uppercase; color:var(--gold2); background:rgba(216,164,65,.12); padding:4px 10px; border-radius:20px; }
.src-note { font-size:11px; color:var(--muted); margin:10px 0 0; }
.src-note a { color:var(--gold); text-decoration:none; }
.src-note a:hover { text-decoration:underline; }
.dot { width:7px; height:7px; border-radius:50%; background:var(--gold2); }
.dot.pulse { animation:pulse 1.4s infinite; }
.dot.live { background:#3fae6a; animation:livedot 1.3s ease-in-out infinite; }
@keyframes livedot { 0%,100%{ box-shadow:0 0 0 0 rgba(63,174,106,.6); opacity:1; } 50%{ box-shadow:0 0 0 6px rgba(63,174,106,0); opacity:.35; } }
.clock-now { font-variant-numeric:tabular-nums; font-weight:600; color:var(--gold); }
@keyframes pulse { 0%{box-shadow:0 0 0 0 rgba(216,164,65,.55);} 70%{box-shadow:0 0 0 7px rgba(216,164,65,0);} 100%{box-shadow:0 0 0 0 rgba(216,164,65,0);} }
.cours-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-top:16px; }
.stat { background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.07); border-radius:12px; padding:13px; display:flex; flex-direction:column; gap:3px; }
.stat.hl { background:rgba(216,164,65,.12); border-color:rgba(216,164,65,.3); }
.stat-ico { width:26px; height:26px; border-radius:7px; background:rgba(255,255,255,.08); display:grid; place-items:center; color:#cdbfa6; margin-bottom:3px; }
.stat-ico.gold { background:rgba(216,164,65,.2); color:var(--gold2); }
.stat-lab { font-size:11px; color:#a99c84; }
.stat-val { font-family:'Fraunces',serif; font-size:20px; font-weight:600; color:#fff; }
.stat-val small { font-size:11px; color:#a99c84; font-weight:400; font-family:'Inter',sans-serif; }
.stat.hl .stat-val { color:var(--gold2); }
.ch-foot { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-top:16px; padding-top:14px; border-top:1px solid rgba(255,255,255,.08); flex-wrap:wrap; }
.upd { display:inline-flex; align-items:center; gap:6px; font-size:12px; color:#a99c84; }
.upd em { color:#7d7160; font-style:normal; }
.ch-ctrls { display:flex; align-items:center; gap:10px; }
.switch { display:inline-flex; align-items:center; gap:6px; font-size:12px; color:#cdbfa6; cursor:pointer; }
.switch input { accent-color:var(--gold2); }
.refresh { display:inline-flex; align-items:center; gap:7px; background:var(--gold); color:#fff; border:0; border-radius:9px; padding:8px 13px; font:inherit; font-size:13px; font-weight:600; cursor:pointer; }
.refresh:hover:not(:disabled){ background:#a4781f; } .refresh:disabled{ opacity:.6; cursor:default; }
.spin { animation:spin 1s linear infinite; } @keyframes spin { to { transform:rotate(360deg); } }
.warn-line { display:flex; align-items:center; gap:9px; background:#fdf4ec; border:1px solid #eccfae; color:var(--clay); border-radius:12px; padding:11px 14px; font-size:13px; margin-bottom:18px; }
.sliders { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; }
.ctrl-top { display:flex; justify-content:space-between; font-size:12.5px; margin-bottom:6px; }
.ctrl-top strong { color:var(--gold); }
.ctrl input[type=range] { width:100%; accent-color:var(--gold); }
.manual { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-top:16px; padding-top:16px; border-top:1px solid var(--line); }
.disclaim { font-size:11.5px; color:var(--muted); margin:14px 4px 0; line-height:1.5; }
.save-ind { display:flex; align-items:center; gap:7px; margin-top:10px; font-size:11px; color:#a99c84; }
.save-dot { width:7px; height:7px; border-radius:50%; background:var(--green2,#6fa07a); flex-shrink:0; }
.save-dot.saving { background:var(--gold2); animation:pulse 1.4s infinite; }
.save-dot.saved { background:#6fa07a; }
.save-dot.error { background:var(--clay); }
.save-dot.idle { background:#5a5044; }

/* ---- reçu ---- */
.receipt { background:#fff; color:#1a1a1a; border:1px solid #e3dccb; border-radius:10px; padding:20px 22px; max-width:340px; margin:0 auto; font-size:13px; }
.rc-head { text-align:center; }
.rc-shop { font-family:'Fraunces',serif; font-weight:700; font-size:19px; letter-spacing:.01em; }
.rc-sub { font-size:11.5px; color:#666; margin-top:1px; }
.rc-sep { border-top:1px solid #e0d8c6; margin:12px 0; }
.rc-sep.dashed { border-top:1px dashed #cfc6b2; }
.rc-meta { display:flex; justify-content:space-between; gap:10px; font-size:12px; margin-bottom:3px; }
.rc-meta strong { font-size:12px; letter-spacing:.03em; }
.rc-meta.sm { font-size:11.5px; color:#555; }
.rc-lines { display:flex; flex-direction:column; gap:8px; }
.rc-item-row { display:flex; justify-content:space-between; gap:10px; font-weight:600; }
.rc-item-detail { font-size:11.5px; color:#777; margin-top:1px; }
.rc-total { display:flex; justify-content:space-between; align-items:baseline; font-size:14px; font-weight:700; }
.rc-total strong { font-size:18px; font-family:'Fraunces',serif; }
.rc-note { font-size:11.5px; color:#666; font-style:italic; margin-top:8px; }
.rc-foot { text-align:center; font-size:11.5px; color:#555; margin-top:4px; }
.rc-foot.tiny { font-size:10px; color:#999; margin-top:2px; }
.rc-qr { display:flex; flex-direction:column; align-items:center; gap:5px; margin-top:12px; }
.rc-qr svg { border-radius:6px; }
.rc-qr-cap { font-size:10px; color:#999; }
.rc-strong { font-weight:700; }
.rc-strong span:first-child { font-weight:700; }

.input-sm { max-width:150px; text-align:right; }
.recon { display:flex; flex-direction:column; gap:0; }
.recon-row { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:9px 0; border-bottom:1px solid #f0eadb; font-size:13.5px; }
.recon-row span:first-child { color:var(--text); }
.recon-row.total { font-weight:700; border-bottom:2px solid var(--line); }
.recon-row .input-sm { padding:6px 9px; }
.recon-ecart { display:flex; align-items:center; justify-content:space-between; margin-top:12px; padding:11px 14px; border-radius:10px; font-weight:600; }
.recon-ecart strong { font-size:18px; }
.recon-ecart.ok { background:var(--green-soft); color:var(--green); }
.recon-ecart.bad { background:var(--clay-soft); color:var(--clay); }
.recon-ecart.over { background:var(--gold-soft); color:var(--gold); }
.recon-btn { margin-top:14px; width:100%; justify-content:center; }
.credit-note { background:var(--clay-soft); color:var(--clay); border-radius:9px; padding:9px 12px; font-size:12.5px; margin-bottom:12px; }
.btn-xs { padding:5px 11px; font-size:12px; border-radius:8px; }

/* ---- équipe / sécurité ---- */
.mini-tag { font-size:10px; color:var(--gold); background:var(--gold-soft); padding:1px 6px; border-radius:10px; margin-left:8px; }
.perm-rows { display:flex; flex-direction:column; gap:6px; margin-bottom:6px; }
.perm-row { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:6px 2px; border-bottom:1px solid var(--line); }
.perm-benef-row { border-bottom:none; margin-top:4px; padding-top:10px; border-top:2px solid var(--line); font-weight:600; }
.perm-lab { font-size:.88rem; }
.lvl-seg { display:inline-flex; border:1px solid var(--line); border-radius:9px; overflow:hidden; flex:0 0 auto; }
.lvl-btn { border:none; background:#fff; padding:5px 11px; font-size:.78rem; font-weight:600; color:var(--muted); cursor:pointer; border-left:1px solid var(--line); }
.lvl-btn:first-child { border-left:none; }
.lvl-btn.on.none { background:#ece5d6; color:var(--ink2); }
.lvl-btn.on.view { background:var(--gold-soft); color:var(--gold); }
.lvl-btn.on.edit { background:var(--gold); color:#fff; }
.nowrap { white-space:nowrap; }
.avatar.sm { width:32px; height:32px; font-size:12px; }
.side-user { display:flex; align-items:center; gap:9px; padding:8px 6px 12px; }
.side-user .avatar { background:rgba(255,255,255,.1); }
.side-user-main { display:flex; flex-direction:column; line-height:1.2; flex:1; min-width:0; }
.side-user-main strong { color:#fff; font-size:13px; }
.side-user-main em { color:#a99c84; font-size:11px; font-style:normal; }
.side-user .icon-btn { color:#a99c84; }
.side-user .icon-btn:hover { background:rgba(255,255,255,.08); color:#fff; }
.logout-btn { width:100%; justify-content:center; margin-top:8px; background:rgba(255,255,255,.06); color:#e9e0d0; border:1px solid rgba(255,255,255,.12); }
.logout-btn:hover { background:rgba(156,74,53,.25); border-color:rgba(156,74,53,.5); color:#fff; }
.data-actions { display:flex; flex-wrap:wrap; gap:9px; margin-bottom:12px; }
.locked-card { text-align:center; padding:34px 22px; }
.btn.danger { color:var(--clay); border:1px solid #eccfae; background:none; }
.btn.danger:hover { background:var(--clay-soft); }
.backup-area { width:100%; min-height:150px; margin-top:6px; border:1px solid var(--line); border-radius:10px;
  padding:11px; font-size:11px; line-height:1.5; background:#fffefb; color:var(--text); outline:none; resize:vertical; }
.backup-area:focus { border-color:var(--gold); box-shadow:0 0 0 3px rgba(184,134,47,.12); }
.activate-scroll { justify-content:flex-start; padding-top:34px; overflow-y:auto; }
.formulas { width:100%; max-width:360px; display:flex; flex-direction:column; gap:11px; margin:6px 0 18px; }
.formula { background:#fffefb; border:1px solid var(--line); border-radius:14px; padding:14px 15px; text-align:left; }
.formula-top { display:flex; align-items:baseline; justify-content:space-between; gap:8px; }
.formula-name { font-family:'Fraunces',serif; font-size:17px; font-weight:600; color:var(--ink); }
.formula-price { font-size:13px; font-weight:600; color:var(--gold); }
.formula-year { font-size:11.5px; color:var(--muted); margin-top:3px; }
.formula-year strong { color:var(--green); }
.formula-feats { list-style:none; margin:9px 0 12px; padding:0; display:flex; flex-direction:column; gap:5px; }
.formula-feats li { font-size:12.5px; color:var(--muted); padding-left:16px; position:relative; }
.formula-feats li::before { content:"✓"; position:absolute; left:0; color:var(--green); font-weight:700; }
.formula-btn { width:100%; justify-content:center; }
.trial-over { width:100%; max-width:360px; background:var(--gold-soft); border:1px solid var(--gold); color:var(--ink); border-radius:12px; padding:14px 16px; font-size:13px; margin-bottom:16px; text-align:center; display:flex; flex-direction:column; gap:6px; }
.trial-over strong { font-size:14px; }
.lock-intro { text-align:center; font-size:13.5px; color:var(--muted); margin:0 0 4px; }
.act-or { text-align:center; font-size:12px; color:var(--muted); margin:10px 0; }
.formulas-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:14px; }
.formula-current { border-color:var(--gold); background:var(--gold-soft); }
.trial-banner { width:100%; display:flex; align-items:center; gap:10px; margin-bottom:16px; padding:12px 16px;
  background:linear-gradient(100deg, var(--gold-soft), #fffefb); border:1px solid var(--gold); border-radius:12px;
  color:var(--ink); font-size:13.5px; text-align:left; cursor:pointer; font-family:inherit; }
.trial-banner:hover { box-shadow:0 4px 14px rgba(184,134,47,.18); }
.trial-banner-dot { width:9px; height:9px; border-radius:50%; background:var(--gold); flex:none; }
.trial-banner span:nth-child(2) { flex:1; }
.trial-banner-arr { font-weight:700; color:var(--gold); }
.cfg-sep { height:1px; background:var(--line); margin:14px 0; }
.admin-flash { max-width:1000px; margin:0 auto 14px; background:var(--green-soft); border:1px solid #bcd3c2; color:var(--green); border-radius:10px; padding:10px 14px; font-size:13px; }
.lic-card { border-color:var(--gold); background:linear-gradient(180deg,var(--gold-soft),#fffefb); }
.byvend { margin-top:12px; border-top:1px dashed var(--line); padding-top:10px; }
.byvend-h { font-size:11px; text-transform:uppercase; letter-spacing:.04em; color:var(--muted); margin-bottom:6px; }
.byvend-row { display:flex; justify-content:space-between; font-size:13px; padding:3px 0; }

.lock { min-height:100vh; width:100%; display:flex; flex-direction:column; align-items:center; justify-content:center;
  background:linear-gradient(160deg,#241c14,#16110c); color:#ece3d2; padding:24px; }
.lock-brand { text-align:center; margin-bottom:26px; }
.brand-mark.lg { width:60px; height:60px; font-size:26px; border-radius:15px; margin:0 auto 12px; }
.lock-title { font-family:'Fraunces',serif; font-weight:700; font-size:24px; color:#fff; }
.lock-sub { color:#a99c84; font-size:12.5px; }
.lock-q { color:#cdbfa6; font-size:14px; text-align:center; margin:0 0 16px; }
.lock-users { display:flex; flex-direction:column; gap:10px; width:100%; max-width:300px; }
.lock-user { display:flex; align-items:center; gap:12px; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.08);
  border-radius:12px; padding:12px 14px; color:#ece3d2; cursor:pointer; font:inherit; text-align:left; transition:.15s; }
.lock-user:hover { background:rgba(216,164,65,.12); border-color:rgba(216,164,65,.3); }
.lock-user span:last-child { display:flex; flex-direction:column; line-height:1.25; }
.lock-user strong { color:#fff; font-size:14px; } .lock-user em { color:#a99c84; font-size:11.5px; font-style:normal; }
.lock-pin { display:flex; flex-direction:column; align-items:center; width:100%; max-width:280px; position:relative; }
.lock-change { position:absolute; top:-2px; left:0; background:none; border:0; color:#a99c84; font:inherit; font-size:12px; cursor:pointer; }
.pin-dots { display:flex; gap:14px; margin:6px 0 10px; }
.pin-dot { width:13px; height:13px; border-radius:50%; border:1.5px solid #a99c84; }
.pin-dot.on { background:var(--gold2); border-color:var(--gold2); }
.pin-dots.shake { animation:shake .4s; }
@keyframes shake { 0%,100%{transform:translateX(0);} 20%,60%{transform:translateX(-7px);} 40%,80%{transform:translateX(7px);} }
.lock-err { color:#e0a08f; font-size:12px; margin:0 0 6px; }
.keypad { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-top:8px; }
.key { width:66px; height:66px; border-radius:50%; border:1px solid rgba(255,255,255,.12); background:rgba(255,255,255,.05);
  color:#fff; font-family:'Fraunces',serif; font-size:22px; cursor:pointer; display:grid; place-items:center; transition:.12s; }
.key:hover { background:rgba(216,164,65,.18); } .key:active { transform:scale(.93); }
.key-back { font-size:16px; }
.lock-hint { color:#7d7160; font-size:11px; margin-top:18px; }

/* ---- activation / espace éditeur ---- */
.act-box { width:100%; max-width:320px; display:flex; flex-direction:column; align-items:center; }
.act-input { width:100%; border:1px solid rgba(255,255,255,.15); background:rgba(255,255,255,.06); color:#fff;
  border-radius:10px; padding:12px 14px; font-size:15px; text-align:center; outline:none; letter-spacing:.04em; }
.act-input::placeholder { color:#7d7160; letter-spacing:0; }
.act-input:focus { border-color:var(--gold2); }
.modal .act-input { color:var(--ink); background:var(--card); border:1px solid var(--line); }
.modal .act-input::placeholder { color:var(--muted); }
.act-btn { width:100%; justify-content:center; margin-top:12px; }
.editor-link { margin:22px auto 8px; display:block; background:none; border:0; color:#6b6051; font:inherit; font-size:12px; cursor:pointer; }
.editor-link:hover { color:#a99c84; text-decoration:underline; }
.admin { min-height:100vh; background:var(--paper); padding:20px; max-width:1000px; margin:0 auto; }
.admin-bar { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:18px; flex-wrap:wrap; }
.admin-bar strong { font-family:'Fraunces',serif; font-size:17px; }
.admin-grid { display:grid; grid-template-columns:1fr 1fr; gap:18px; }
.plan-row { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:14px; }
.creds-sep { margin:16px 0 10px; padding-top:14px; border-top:1px solid var(--line); font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; color:var(--muted); }
.pwd-row { display:flex; gap:8px; align-items:center; }
.pwd-row .act-input { flex:1; }
.creds-box { border:1px solid var(--line); border-radius:11px; background:#faf6ec; padding:6px 14px; }
.creds-row { display:flex; justify-content:space-between; align-items:center; gap:12px; padding:9px 0; border-bottom:1px solid var(--line); }
.creds-row:last-child { border-bottom:none; }
.creds-row span { color:var(--muted); font-size:13px; }
.creds-row b { color:var(--ink); font-size:15px; font-family:ui-monospace,monospace; }
.plan { border:1px solid var(--line); background:var(--card); border-radius:9px; padding:8px 14px; font:inherit; font-size:13px; font-weight:600; color:var(--muted); cursor:pointer; }
.plan.on { background:var(--gold-soft); color:var(--gold); border-color:var(--gold); }
.code-out { margin-top:14px; padding:16px; border:1px dashed var(--gold); border-radius:11px; background:#faf6ec; text-align:center; }
.code-val { font-size:21px; font-weight:700; color:var(--gold); letter-spacing:.05em; }
.code-meta { font-size:12px; color:var(--muted); margin:7px 0 11px; }
.check-res { margin-top:12px; padding:10px 13px; border-radius:9px; font-size:13px; font-weight:600; }
.check-res.ok { background:var(--green-soft); color:var(--green); }
.check-res.bad { background:var(--clay-soft); color:var(--clay); }
@media (max-width:760px){ .admin-grid { grid-template-columns:1fr; } }

.print-receipt { display:none; }

@media print {
  @page { margin: 8mm; }
  .sidebar, .main, .scrim, .overlay { display:none !important; }
  .app { display:block !important; min-height:0 !important; background:#fff !important; }
  .print-receipt { display:block !important; }
  .receipt { border:none; max-width:none; padding:0; }
}

@media (max-width:960px){
  .row2 { grid-template-columns:1fr; }
  .kpis { grid-template-columns:repeat(2,1fr); }
  .cours-ticker { order:3; width:100%; margin:0; justify-content:flex-start; }
  .cours-grid { grid-template-columns:1fr; }
  .sliders { grid-template-columns:1fr; }
}
@media (max-width:760px){
  .sidebar { transform:translateX(-100%); transition:transform .25s; box-shadow:0 0 40px rgba(0,0,0,.3); }
  .sidebar.open { transform:translateX(0); }
  .scrim { display:block; position:fixed; inset:0; background:rgba(28,22,17,.4); z-index:35; touch-action:none; overscroll-behavior:none; }
  .main { margin-left:0; min-width:0; overflow-x:hidden; }
  .icon-btn.menu-btn { display:grid; width:38px; height:38px; border-radius:10px; background:var(--card); border:1px solid var(--line); color:var(--ink); flex:none; }
  .content { padding:16px; max-width:100%; }
  .grid2 { grid-template-columns:1fr; }
  .manual { grid-template-columns:1fr; }
  .search { display:none; }
  .topbar { flex-wrap:wrap; gap:10px; padding:calc(12px + env(safe-area-inset-top, 0px)) 14px 12px; }
  .top-actions { margin-left:auto; }
  .clock-box { align-items:flex-start; order:4; }
  .clock-time { font-size:21px; }
  .card { overflow-x:auto; -webkit-overflow-scrolling:touch; overscroll-behavior-x:contain; }
  .cours-ticker { overflow-x:auto; -webkit-overflow-scrolling:touch; }
  .table { min-width:540px; }
  .table.fit { min-width:0; }
  .table.fit th, .table.fit td { padding:10px 7px; font-size:13px; }
  .hide-sm { display:none !important; }
  .chat-fab { right:16px; bottom:calc(78px + env(safe-area-inset-bottom, 0px)); width:54px; height:54px; }
}
@media (max-width:460px){ .kpis { grid-template-columns:1fr; } }
/* ----- Espace revendeur ----- */
.reseller { max-width:880px; margin:0 auto; padding:24px 16px 64px; }
.reseller-top { display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; margin-bottom:20px; }
.reseller-brand { display:flex; align-items:center; gap:12px; }
.reseller-brand .brand-name { color:var(--ink); }
.reseller-brand .brand-sub { color:var(--muted); }
.reseller-actions { display:flex; gap:8px; flex-wrap:wrap; }
.reseller-empty { text-align:center; padding:48px 16px; display:flex; flex-direction:column; align-items:center; gap:14px; }
.reseller-list { display:flex; flex-direction:column; gap:12px; }
.reseller-stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:12px; margin-bottom:18px; }
.stat-amber { border-color:#e6c46a; background:#fdf6e3; }
.stat-amber .stat-val { color:var(--gold); }
.stat-red { border-color:#e3b3a6; background:#fbeee9; }
.stat-red .stat-val { color:var(--clay); }
.shop-flag { border-left:4px solid var(--gold); }
.rep-toolbar { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:16px; }
.rep-toolbar .seg { margin-bottom:0; }
.alerts { display:flex; flex-direction:column; gap:8px; margin-bottom:16px; }
.alert-row { display:flex; align-items:center; gap:12px; width:100%; text-align:left; padding:12px 14px; border-radius:12px; border:1px solid var(--line); background:var(--card); cursor:pointer; transition:transform .15s, box-shadow .15s; }
.alert-row:hover { transform:translateY(-1px); box-shadow:0 4px 14px rgba(0,0,0,.06); }
.alert-clay { border-left:4px solid var(--clay); }
.alert-gold { border-left:4px solid var(--gold); }
.alert-clay > svg { color:var(--clay); flex-shrink:0; }
.alert-gold > svg { color:var(--gold); flex-shrink:0; }
.alert-main { flex:1; min-width:0; }
.alert-text { font-weight:600; color:var(--ink); font-size:.95rem; }
.alert-sub { font-size:.8rem; color:var(--muted); margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.alert-arr { color:var(--muted); font-weight:700; flex-shrink:0; }
.jfilter { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:16px; }
.chip { padding:6px 12px; border-radius:999px; border:1px solid var(--line); background:var(--card); color:var(--muted); font-size:.82rem; font-weight:600; cursor:pointer; transition:.15s; }
.chip:hover { border-color:var(--gold); }
.chip-on { background:var(--gold); color:#fff; border-color:var(--gold); }
.chip.on { background:var(--gold); color:#fff; border-color:var(--gold); }
.chip-row { display:flex; gap:6px; flex-wrap:wrap; margin:-2px 0 10px; }
.update-bar { position:fixed; left:50%; transform:translateX(-50%); bottom:calc(18px + env(safe-area-inset-bottom, 0px)); z-index:120; display:flex; align-items:center; gap:14px; background:var(--ink); color:#fff; padding:10px 14px; border-radius:14px; box-shadow:0 10px 30px rgba(0,0,0,.28); max-width:92vw; }
.expiry-bar { position:fixed; left:50%; transform:translateX(-50%); top:calc(14px + env(safe-area-inset-top, 0px)); z-index:121; display:flex; align-items:center; gap:14px; background:var(--clay); color:#fff; padding:9px 14px; border-radius:12px; box-shadow:0 8px 24px rgba(0,0,0,.25); max-width:94vw; }
.install-bar { position:fixed; left:50%; transform:translateX(-50%); top:calc(14px + env(safe-area-inset-top, 0px)); z-index:121; display:flex; align-items:center; gap:14px; background:var(--ink); color:#fff; padding:9px 14px; border-radius:12px; box-shadow:0 8px 24px rgba(0,0,0,.28); max-width:94vw; }
.install-txt { display:flex; align-items:center; gap:8px; font-size:.86rem; font-weight:500; }
.install-txt strong { color:var(--gold2); }
.install-acts { display:flex; gap:8px; flex-shrink:0; }
.install-bar .btn-ghost { background:transparent; color:#fff; border:1px solid rgba(255,255,255,.45); }
.install-bar .btn-ghost:hover { background:rgba(255,255,255,.14); }
.guide-card { border:1px solid var(--gold); background:linear-gradient(180deg,var(--gold-soft),var(--card)); }
.guide-head { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
.guide-title { margin:0; font-size:1rem; }
.guide-bar { height:6px; border-radius:99px; background:#e7decb; overflow:hidden; margin:10px 0 12px; }
.guide-fill { height:100%; background:var(--gold); border-radius:99px; transition:width .4s ease; }
.guide-steps { display:flex; flex-direction:column; gap:8px; }
.guide-step { display:flex; align-items:center; gap:10px; padding:8px 10px; border:1px solid var(--line); border-radius:10px; background:var(--paper); }
.guide-step.done { opacity:.72; background:transparent; }
.guide-check { width:22px; height:22px; flex-shrink:0; border-radius:50%; border:2px solid var(--line); display:flex; align-items:center; justify-content:center; color:#fff; }
.guide-step.done .guide-check { background:var(--green); border-color:var(--green); }
.guide-lab { flex:1; font-size:.9rem; }
.page-note { display:flex; align-items:flex-start; gap:10px; background:var(--gold-soft); border:1px solid var(--line); border-radius:12px; padding:11px 12px; margin-bottom:14px; }
.page-note-ico { flex-shrink:0; font-size:15px; line-height:1.5; }
.page-note-txt { flex:1; font-size:12.8px; line-height:1.5; color:var(--ink2); }
.page-note-x { flex-shrink:0; background:transparent; border:none; color:var(--muted); cursor:pointer; padding:2px; border-radius:6px; }
.page-note-x:hover { background:rgba(0,0,0,.06); color:var(--ink); }
.guide-step.done .guide-lab { text-decoration:line-through; color:var(--muted); }
.expiry-txt { display:flex; align-items:center; gap:8px; font-size:.88rem; font-weight:600; }
.expiry-acts { display:flex; gap:8px; flex-shrink:0; }
.expiry-bar .btn-ghost { background:transparent; color:#fff; border:1px solid rgba(255,255,255,.45); }
.expiry-bar .btn-ghost:hover { background:rgba(255,255,255,.14); }
.update-txt { display:flex; align-items:center; gap:8px; font-size:.9rem; font-weight:600; }
.update-acts { display:flex; gap:8px; flex-shrink:0; }
.update-bar .btn-ghost { background:transparent; color:#fff; border:1px solid rgba(255,255,255,.4); }
.update-bar .btn-ghost:hover { background:rgba(255,255,255,.14); }
.jrnl .tl-body { padding-bottom:14px; }
.jrow { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.jdetail { color:var(--ink); }
.jmeta { font-size:.78rem; color:var(--muted); margin-top:3px; }
.pin-box { display:flex; flex-direction:column; align-items:center; gap:14px; margin-top:18px; width:100%; max-width:300px; }
.pin-dots { display:flex; gap:14px; }
.pin-dot { width:14px; height:14px; border-radius:50%; border:2px solid var(--gold); background:transparent; transition:.15s; }
.pin-dot.on { background:var(--gold); transform:scale(1.05); }
.pin-pad { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; width:100%; }
.pin-key { height:62px; border-radius:16px; border:1px solid var(--line); background:var(--card); color:var(--ink); font-size:1.5rem; font-weight:600; cursor:pointer; transition:.12s; display:flex; align-items:center; justify-content:center; }
.pin-key:hover { border-color:var(--gold); background:var(--gold-soft); }
.pin-key:active { transform:scale(.95); }
.pin-back { color:var(--muted); font-size:1.1rem; }
.shake { animation:shake .4s; }
@keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-8px)} 40%,80%{transform:translateX(8px)} }
.lock-delay { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-top:14px; }
.chat-fab { position:fixed; right:22px; bottom:calc(22px + env(safe-area-inset-bottom, 0px)); width:60px; height:60px; border-radius:50%; border:none; background:linear-gradient(150deg,var(--gold),var(--gold2,#9a6f1f)); color:#fff; box-shadow:0 8px 24px rgba(184,134,47,.45); cursor:pointer; display:flex; align-items:center; justify-content:center; z-index:70; transition:box-shadow .15s; touch-action:none; user-select:none; }
.chat-fab:hover { transform:translateY(-2px) scale(1.04); box-shadow:0 12px 30px rgba(184,134,47,.55); }
.chat-fab:active { transform:scale(.96); }
.chat-badge { position:absolute; top:-2px; right:-2px; min-width:22px; height:22px; padding:0 6px; border-radius:11px; background:var(--clay); color:#fff; font-size:.72rem; font-weight:800; display:flex; align-items:center; justify-content:center; border:2px solid var(--paper); }
.chat-panel { position:fixed; right:22px; bottom:94px; width:360px; max-width:calc(100vw - 32px); height:520px; max-height:calc(100vh - 130px); background:var(--paper); border:1px solid var(--line); border-radius:18px; box-shadow:0 18px 50px rgba(28,22,17,.28); display:flex; flex-direction:column; overflow:hidden; z-index:70; animation:chatpop .18s ease-out; }
@keyframes chatpop { from{opacity:0; transform:translateY(12px) scale(.98)} to{opacity:1; transform:translateY(0) scale(1)} }
.chat-head { display:flex; align-items:center; gap:8px; padding:14px 16px; border-bottom:1px solid var(--line); color:var(--ink); background:var(--gold-soft); }
.chat-x { margin-left:auto; background:none; border:0; color:var(--muted); cursor:pointer; padding:5px; border-radius:8px; display:grid; place-items:center; flex:none; }
.chat-pres { display:inline-flex; align-items:center; gap:5px; }
.pres-dot { width:8px; height:8px; border-radius:50%; background:#34c759; box-shadow:0 0 0 2px rgba(52,199,89,.22); flex:none; display:inline-block; }
.chat-x:hover { background:rgba(28,22,17,.08); color:var(--ink); }
.chat-head strong { font-size:1rem; }
.chat-list { flex:1; overflow-y:auto; padding:14px; display:flex; flex-direction:column; gap:10px; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
.chat-empty { text-align:center; margin:auto; line-height:1.6; }
.chat-msg { display:flex; flex-direction:column; align-items:flex-start; max-width:82%; }
.chat-msg.mine { align-self:flex-end; align-items:flex-end; }
.chat-name { font-size:.72rem; font-weight:700; color:var(--gold); margin:0 0 2px 4px; }
.chat-bubble { padding:9px 13px; border-radius:16px; background:var(--card); border:1px solid var(--line); color:var(--ink); font-size:.92rem; line-height:1.4; border-bottom-left-radius:4px; word-break:break-word; white-space:pre-wrap; }
.chat-msg.mine .chat-bubble { background:var(--gold); color:#fff; border-color:var(--gold); border-bottom-left-radius:16px; border-bottom-right-radius:4px; }
.chat-time { font-size:.68rem; color:var(--muted); margin:2px 6px 0; }
.chat-input { display:flex; gap:8px; padding:12px; border-top:1px solid var(--line); }
.chat-input .input { flex:1; }
.chat-send { width:44px; flex-shrink:0; border:none; border-radius:12px; background:var(--gold); color:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:.12s; }
.chat-send:hover:not(:disabled) { background:var(--gold2,#9a6f1f); }
.chat-send:disabled { opacity:.4; cursor:default; }
.chat-icon { width:38px; height:40px; flex-shrink:0; border:1px solid var(--line); border-radius:11px; background:var(--card); cursor:pointer; font-size:1.05rem; display:flex; align-items:center; justify-content:center; transition:.12s; }
.chat-icon:hover { border-color:var(--gold); background:var(--gold-soft); }
.chat-icon:disabled { opacity:.4; cursor:default; }
.chat-loading { font-size:.8rem; color:var(--muted); font-style:italic; }
.chat-foot { display:flex; align-items:center; gap:8px; margin-top:2px; }
.chat-msg.mine .chat-foot { flex-direction:row-reverse; }
.chat-del { background:none; border:none; padding:0; font-size:.68rem; color:var(--muted); cursor:pointer; opacity:0; transition:.12s; text-decoration:underline; }
.chat-msg:hover .chat-del { opacity:.7; }
.chat-del:hover { opacity:1; color:var(--clay); }
.chat-read { font-size:.66rem; color:var(--muted); white-space:nowrap; }
.chat-read.seen { color:var(--gold); font-weight:600; }
.chat-bubble.removed { background:transparent !important; border:1px dashed var(--line); }
.chat-removed { font-style:italic; color:var(--muted); font-size:.82rem; }
.chat-tabs { display:flex; gap:6px; padding:8px 10px; border-bottom:1px solid var(--line); overflow-x:auto; flex-shrink:0; }
.chat-tab { flex-shrink:0; border:1px solid var(--line); background:var(--card); color:var(--ink); border-radius:999px; padding:5px 12px; font-size:.78rem; font-weight:600; cursor:pointer; white-space:nowrap; transition:.12s; }
.chat-tab:hover { border-color:var(--gold); }
.chat-tab.on { background:var(--gold); color:#fff; border-color:var(--gold); }
.tab-dot { display:inline-flex; align-items:center; justify-content:center; min-width:16px; height:16px; padding:0 4px; margin-left:5px; border-radius:999px; background:var(--clay); color:#fff; font-size:.62rem; font-weight:700; vertical-align:middle; }
.chat-tab.on .tab-dot { background:#fff; color:var(--gold); }
.chat-img { max-width:200px; max-height:220px; border-radius:10px; display:block; cursor:pointer; margin-bottom:2px; }
.chat-audio { width:210px; max-width:100%; height:38px; }
.chat-file { display:inline-flex; align-items:center; gap:6px; font-weight:600; color:var(--gold); text-decoration:none; word-break:break-all; }
.chat-msg.mine .chat-file { color:#fff; text-decoration:underline; }
.chat-txt { display:block; }
.chat-bubble > .chat-img + .chat-txt, .chat-bubble > .chat-audio + .chat-txt, .chat-bubble > .chat-file + .chat-txt { margin-top:6px; }
.chat-notif { margin-left:auto; border:1px solid var(--gold); background:var(--paper); color:var(--gold); border-radius:999px; padding:4px 10px; font-size:.74rem; font-weight:700; cursor:pointer; }
.chat-notif:hover { background:var(--gold); color:#fff; }
.chat-rec { display:flex; align-items:center; gap:10px; padding:12px; border-top:1px solid var(--line); }
.rec-dot { width:12px; height:12px; border-radius:50%; background:var(--clay); animation:livedot 1s infinite; }
.rec-time { font-variant-numeric:tabular-nums; font-weight:700; color:var(--ink); }
.chat-lightbox { position:fixed; inset:0; background:rgba(28,22,17,.85); display:grid; place-items:center; z-index:90; padding:24px; cursor:zoom-out; }
.chat-lightbox img { max-width:100%; max-height:100%; border-radius:12px; }
.stat { background:var(--card); border:1px solid var(--line); border-radius:14px; padding:16px; text-align:center; }
.stat-val { font-family:'Fraunces',serif; font-size:1.4rem; font-weight:700; color:var(--ink); }
.stat-lab { font-size:.8rem; color:var(--muted); margin-top:4px; }
@media (max-width:560px){ .reseller-stats { grid-template-columns:1fr; } }
.shop-card { background:var(--card); border:1px solid var(--line); border-radius:14px; padding:16px; display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap; }
.shop-main { min-width:200px; flex:1; }
.shop-name { font-weight:700; font-size:1.05rem; color:var(--ink); margin-bottom:6px; }
.shop-meta { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
.shop-actions { display:flex; gap:8px; flex-wrap:wrap; }
.pill { display:inline-block; padding:3px 10px; border-radius:999px; font-size:.78rem; font-weight:600; }
.pill-green { background:rgba(60,90,67,.14); color:var(--green); }
.pill-amber { background:rgba(184,134,47,.16); color:var(--gold); }
.pill-red { background:rgba(156,74,53,.14); color:var(--clay); }
.pill-plan { background:rgba(28,22,17,.06); color:var(--muted); }
.plan-row { display:flex; gap:8px; flex-wrap:wrap; }
.plan-pick { font-size:.85rem; padding:8px 12px; }
.price-row { display:flex; align-items:center; gap:10px; margin-bottom:10px; }
.price-name { flex:1; font-weight:600; color:var(--ink); }
.price-amount { width:120px; }
.price-period { width:120px; }
.pay-form { display:flex; flex-direction:column; gap:4px; padding-bottom:14px; border-bottom:1px solid var(--line); margin-bottom:14px; }
.pay-hist-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
.pay-list { display:flex; flex-direction:column; gap:8px; }
.pay-item { display:flex; align-items:center; gap:10px; flex-wrap:wrap; padding:8px 10px; background:var(--card); border:1px solid var(--line); border-radius:10px; }
.pay-amt { font-weight:700; color:var(--ink); }
.pwd-err { color:var(--clay); font-weight:600; }
.pwd-ok { color:var(--green); font-weight:600; }
.shop-history { font-size:.74rem; color:var(--muted); margin:2px 0 6px; font-style:italic; }
`;
