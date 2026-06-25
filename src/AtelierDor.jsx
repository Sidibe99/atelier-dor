import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  LayoutGrid, ShoppingCart, ArrowDownLeft, Package, Users, BarChart3,
  Settings, Plus, X, Pencil, Trash2, Search, Coins, Scale, Gem, Wallet,
  TrendingUp, TrendingDown, AlertTriangle, Banknote, Receipt, Menu, Hammer,
  RefreshCw, Globe, Wifi, ShieldCheck, LogOut, Delete, Download, Upload,
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
const fcfa = (n) => `${nf.format(Math.round(n || 0))} F`;
const fcfaLong = (n) => `${nf.format(Math.round(n || 0))} FCFA`;
const g = (n) => `${nf.format(Math.round((n || 0) * 100) / 100)} g`;
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
  S: { name: "Standard", days: 30, admins: 1, users: 2, priceLabel: "5 000 F / mois",
       features: ["1 admin · 2 utilisateurs", "Cours en direct, caisse, reçus", "Sauvegarde & export"] },
  P: { name: "Pro", days: 30, admins: 2, users: 5, priceLabel: "12 000 F / mois",
       features: ["2 admins · 5 utilisateurs", "Rapports détaillés", "Tout le Standard inclus"] },
  R: { name: "Premium", days: 365, admins: 99, users: 99, priceLabel: "100 000 F / an",
       features: ["Admins & utilisateurs illimités", "1 an inclus", "Toutes les fonctions"] },
};
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

const seedUsers = [
  mkUser("Patron", "patron", "patron123", "patron@atelier.sn"),
  mkUser("Awa (vendeuse)", "vendeur", "awa123", "awa@atelier.sn"),
];

const INITIAL_CASH = 3200000;

/* ------------------------------ composants ------------------------------ */
const Badge = ({ k }) => <span className="karat">{k}K</span>;

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
function SaleModal({ prices, gold, divers, clients, onClose, onSave }) {
  const [kind, setKind] = useState("or");
  const [client, setClient] = useState("");
  const [pay, setPay] = useState("Espèces");
  const [stockId, setStockId] = useState("");
  const [karat, setKarat] = useState(21);
  const [weight, setWeight] = useState("");
  const [ppg, setPpg] = useState(Math.round(prices[21].vente));
  const [facon, setFacon] = useState("");
  const [dId, setDId] = useState("");
  const [dQty, setDQty] = useState(1);
  const [paidNow, setPaidNow] = useState("");
  const isGold = kind === "or" || kind === "bijoux";

  const onPickStock = (id) => {
    setStockId(id);
    const it = gold.find((x) => x.id === id);
    if (it) { setKarat(it.karat); setWeight(String(it.weight)); setPpg(Math.round(prices[it.karat].vente)); }
  };
  const onKarat = (k) => { setKarat(k); setPpg(Math.round(prices[k].vente)); };

  const faconV = kind === "bijoux" ? (parseFloat(facon) || 0) : 0;
  const orTotal = (parseFloat(weight) || 0) * (parseFloat(ppg) || 0) + faconV;
  const dItem = divers.find((x) => x.id === dId);
  const dTotal = dItem ? dItem.price * (parseInt(dQty) || 0) : 0;
  const total = isGold ? orTotal : dTotal;
  const valid = isGold ? weight && ppg : dItem && dQty > 0;
  const paid = paidNow === "" ? total : Math.min(parseFloat(paidNow) || 0, total);
  const reste = total - paid;

  const save = () => {
    if (!valid) return;
    if (isGold) {
      const it = gold.find((x) => x.id === stockId);
      const cost = (parseFloat(weight) || 0) * prices[karat].achat;
      const defType = kind === "bijoux" ? "Bijou" : "Or";
      onSave({
        kind, client, pay, total: orTotal, cost, stockId, paid,
        label: `${it ? it.type : defType} ${karat}K · ${g(parseFloat(weight))}`,
        karat, weight: parseFloat(weight), ppg: parseFloat(ppg), facon: faconV,
        itemType: it ? it.type : defType,
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
          <Field label="Carat">
            <select className="input" value={karat} onChange={(e) => onKarat(parseInt(e.target.value))}>
              {KARATS.map((k) => <option key={k} value={k}>{k}K</option>)}
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
            <select className="input" value={dId} onChange={(e) => setDId(e.target.value)}>
              <option value="">— Choisir —</option>
              {divers.map((it) => <option key={it.id} value={it.id}>{it.name} · {fcfa(it.price)} ({it.qty} {it.unit})</option>)}
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

function PurchaseModal({ prices, clients, onClose, onSave }) {
  const [client, setClient] = useState("");
  const [karat, setKarat] = useState(18);
  const [weight, setWeight] = useState("");
  const [ppg, setPpg] = useState(Math.round(prices[18].achat));
  const [note, setNote] = useState("");
  const [pay, setPay] = useState("Espèces");
  const [paidNow, setPaidNow] = useState("");
  const onKarat = (k) => { setKarat(k); setPpg(Math.round(prices[k].achat)); };
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
          <select className="input" value={karat} onChange={(e) => onKarat(parseInt(e.target.value))}>{KARATS.map((k) => <option key={k} value={k}>{k}K</option>)}</select>
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

function GoldModal({ item, onClose, onSave }) {
  const [f, setF] = useState(item ? { cat: goldCat(item), ...item } : { type: "Bague", desc: "", karat: 21, weight: "", qty: 1, cat: "bijou" });
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const valid = f.desc && f.weight && f.qty;
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
      <Field label="Description"><input className="input" value={f.desc} onChange={(e) => set("desc", e.target.value)} placeholder="ex : Bague chevalière homme" /></Field>
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

function OnlineLogin({ onExit, logo }) {
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
      <div className="lock-brand"><BrandMark logo={logo} lg /><div className="lock-title">Atelier d'Or</div><div className="lock-sub">Espace en ligne</div></div>
      <div className="act-box">
        <p className="lock-q">Connexion à ton compte</p>
        <input className="act-input" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErr(""); }} placeholder="Adresse e-mail" onKeyDown={(e) => e.key === "Enter" && submit()} />
        <input className="act-input" type="password" value={pwd} onChange={(e) => { setPwd(e.target.value); setErr(""); }} placeholder="Mot de passe" onKeyDown={(e) => e.key === "Enter" && submit()} />
        {err && <p className="lock-err">{err}</p>}
        <button className="btn btn-gold act-btn" onClick={submit} disabled={busy}>{busy ? "Connexion…" : "Se connecter"}</button>
      </div>
      {onExit && <button className="editor-link" onClick={onExit}>Retour à l'application</button>}
    </div>
  );
}

function ShopFormModal({ mode, shop, onClose, onSubmit }) {
  const computeExpiry = (p) => { const d = new Date(); d.setDate(d.getDate() + (FORMULAS[p] ? FORMULAS[p].days : 30)); return iso(d); };
  const [name, setName] = useState(shop ? shop.name : "");
  const [phone, setPhone] = useState(shop ? (shop.phone || "") : "");
  const [plan, setPlan] = useState(shop && shop.plan ? shop.plan : "S");
  const [expiry, setExpiry] = useState(() => computeExpiry(shop && shop.plan ? shop.plan : "S"));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const pickPlan = (p) => { setPlan(p); setExpiry(computeExpiry(p)); };
  const submit = async () => {
    if (mode === "create" && !name.trim()) { setErr("Indique le nom de la boutique."); return; }
    if (!expiry) { setErr("Choisis une date de fin."); return; }
    setBusy(true); setErr("");
    try { await onSubmit({ name: name.trim(), phone: phone.trim(), plan, expiry }); }
    catch (e) { setErr("Opération impossible. Vérifie ta connexion internet."); setBusy(false); return; }
    setBusy(false);
  };
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
      {err && <p className="lock-err">{err}</p>}
    </Modal>
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

function ResellerSpace({ authUser, onSignOut, onExit, onPricesSaved, logo }) {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [modal, setModal] = useState(null); // null | { mode:"create" } | { mode:"renew", shop }

  const load = useCallback(async () => {
    setLoading(true); setErr("");
    try {
      const { data, error } = await supabase.from("shops").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setShops(data || []);
    } catch (e) { setErr("Impossible de charger les boutiques. Vérifie ta connexion."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const createShop = async ({ name, phone, plan, expiry }) => {
    const { error } = await supabase.from("shops").insert({ name, phone, plan, expiry, status: "active" });
    if (error) throw error;
    setModal(null); await load();
  };
  const renewShop = async (shop, { plan, expiry }) => {
    const { error } = await supabase.from("shops").update({ plan, expiry, status: "active" }).eq("id", shop.id);
    if (error) throw error;
    setModal(null); await load();
  };
  const toggleStatus = async (shop) => {
    const next = shop.status === "suspended" ? "active" : "suspended";
    const verb = next === "suspended" ? "suspendre" : "réactiver";
    if (!window.confirm(`Veux-tu ${verb} « ${shop.name} » ?`)) return;
    const { error } = await supabase.from("shops").update({ status: next }).eq("id", shop.id);
    if (error) { window.alert("Action impossible. Vérifie ta connexion."); return; }
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
          {shops.map((s) => {
            const st = statusOf(s);
            const wa = waLink(s.phone, s.name);
            return (
              <div className="shop-card" key={s.id}>
                <div className="shop-main">
                  <div className="shop-name">{s.name}</div>
                  <div className="shop-meta">
                    <span className={`pill pill-${st.tone}`}>{st.label}</span>
                    {s.plan && FORMULAS[s.plan] && <span className="pill pill-plan">{FORMULAS[s.plan].name}</span>}
                    {s.plan && FORMULAS[s.plan] && <span className="muted small">{priceLabelOf(s.plan)}</span>}
                    {s.expiry && <span className="muted small">Fin : {dateFr(String(s.expiry).slice(0, 10))}</span>}
                    {s.phone && <span className="muted small">{s.phone}</span>}
                  </div>
                </div>
                <div className="shop-actions">
                  {wa && <a className="btn btn-line" href={wa} target="_blank" rel="noreferrer">WhatsApp</a>}
                  <button className="btn btn-line" onClick={() => setModal({ mode: "renew", shop: s })}><RefreshCw size={15} /> Renouveler</button>
                  <button className={`btn ${s.status === "suspended" ? "btn-gold" : "btn-line"}`} onClick={() => toggleStatus(s)}>{s.status === "suspended" ? "Réactiver" : "Suspendre"}</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button className="editor-link" onClick={onExit}>Retour à l'application</button>

      {modal && modal.mode === "create" && <ShopFormModal mode="create" onClose={() => setModal(null)} onSubmit={createShop} />}
      {modal && modal.mode === "renew" && <ShopFormModal mode="renew" shop={modal.shop} onClose={() => setModal(null)} onSubmit={(vals) => renewShop(modal.shop, vals)} />}
      {modal && modal.mode === "pricing" && <PricingModal onClose={() => setModal(null)} onSaved={onPricesSaved} />}
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
    } catch (e) { window.alert("Le téléchargement est bloqué ici — utilise plutôt « Copier »."); }
  };
  const pickFile = (e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => setText(String(r.result)); r.readAsText(f); };
  const doImport = () => {
    let d; try { d = JSON.parse(text); } catch (e) { window.alert("Texte illisible : ce n'est pas un JSON valide."); return; }
    if (!d || (!d.sales && !d.gold)) { window.alert("Ce fichier n'est pas une sauvegarde Atelier d'Or."); return; }
    if (!window.confirm("Importer cette sauvegarde ? Elle remplacera toutes les données actuelles.")) return;
    onImport(d);
  };
  return (
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

  useEffect(() => { (async () => { try { const v = await STORE.get("atelierdor:admincodes"); if (v) setLog(JSON.parse(v)); } catch (e) { /* */ } try { const a = await STORE.get("atelierdor:adminok"); if (a === "1") setAuthed(true); } catch (e) { /* */ } })(); }, []);
  const saveLog = (l) => { setLog(l); STORE.set("atelierdor:admincodes", JSON.stringify(l)); };
  const delCode = (i) => { if (window.confirm("Supprimer ce code de l'historique ?")) saveLog(log.filter((_, j) => j !== i)); };
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
    </div>
  );
}

/* ------------------------------- reçus ---------------------------------- */
function buildReceipt(tx) {
  const isSale = tx.kind !== "purchase";
  const lines = [];
  if (!isSale) {
    lines.push({ desc: `Or ${tx.karat}K — rachat`, detail: `${g(tx.weight)} × ${fcfa(tx.ppg)}/g`, amount: tx.total });
  } else if ((tx.kind === "or" || tx.kind === "bijoux") && tx.weight) {
    lines.push({
      desc: `${tx.itemType || "Or"} ${tx.karat}K`,
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
  if (d.pay) L.push("Paiement : " + d.pay);
  if (d.note) L.push("Note : " + d.note);
  L.push("--------------------------------");
  L.push("Merci de votre confiance — " + shop.name);
  return L.join("\n");
}

function ReceiptCard({ data, shop }) {
  return (
    <div className="receipt">
      <div className="rc-head">
        {shop.logo && <img className="rc-logo" src={shop.logo} alt="" />}
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
    </div>
  );
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
  return (
    <Modal title="Reçu" sub={`N° ${data.no}`} onClose={onClose}
      footer={<div className="foot-actions" style={{ marginLeft: 0, width: "100%", flexWrap: "wrap" }}>
        <button className="btn btn-ghost" onClick={onClose}>Fermer</button>
        <button className="btn btn-line" onClick={whatsapp}>WhatsApp</button>
        <button className="btn btn-line" onClick={copy}>{copied ? "Copié ✓" : "Copier"}</button>
        <button className="btn btn-gold" onClick={() => window.print()}>Imprimer</button>
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
        {shop.logo && <img className="rc-logo" src={shop.logo} alt="" />}
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
export default function App() {
  const [view, setView] = useState("dash");
  const [navOpen, setNavOpen] = useState(false);
  const [gold, setGold] = useState(seedGold);
  const [divers, setDivers] = useState(seedDivers);
  const [clients, setClients] = useState(seedClients);
  const [sales, setSales] = useState(seedSales);
  const [purchases, setPurchases] = useState(seedPurchases);
  const [purchasePayments, setPurchasePayments] = useState(seedPurchasePayments);
  const [modal, setModal] = useState(null);
  const [stockTab, setStockTab] = useState("or");
  const [reportPeriod, setReportPeriod] = useState("month");
  const [clientFilter, setClientFilter] = useState("all");
  const [q, setQ] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved | error
  const [receipt, setReceipt] = useState(null);
  const [shop, setShop] = useState({ name: "Atelier d'Or", phone: "", addr: "Dakar, Sénégal" });
  const [closures, setClosures] = useState(seedClosures);
  const [payments, setPayments] = useState(seedPayments);
  const [expenses, setExpenses] = useState(seedExpenses);
  const [users, setUsers] = useState(seedUsers);
  const [currentUser, setCurrentUser] = useState(null);
  const [authUser, setAuthUser] = useState(null);   // compte Supabase connecté (ou null)
  const [authReady, setAuthReady] = useState(false); // session en ligne restaurée ?
  const [pricesVersion, setPricesVersion] = useState(0); // recharge l'affichage quand les prix Supabase arrivent
  const [backup, setBackup] = useState(null); // null | "export" | "import"
  const [route, setRoute] = useState(() => { const h = (typeof window !== "undefined" ? (window.location.hash || "") : "").replace(/^#/, ""); return h === "admin-create" ? "admin" : h === "espace" ? "espace" : "app"; });
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
    const onHash = () => { const h = (window.location.hash || "").replace(/^#/, ""); setRoute(h === "admin-create" ? "admin" : h === "espace" ? "espace" : "app"); };
    window.addEventListener("hashchange", onHash);
    (async () => {
      try {
        const c = await STORE.get("atelierdor:license");
        if (c) { const v = verifyActivation(c); if (v.valid) setLicense({ ...v, code: c }); }
      } catch (e) { /* pas de licence */ }
      try {
        const t = await STORE.get("atelierdor:trialused"); if (t === "1") setTrialUsed(true);
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
        gold, divers, clients, sales, purchases, purchasePayments, closures, payments, expenses, users,
        settings: { prime, mVente, mAchat, shop, fondCaisse, resellerPhone },
      }));
      setSaveState(ok ? "saved" : "error");
    }, 600);
    return () => clearTimeout(t);
  }, [loaded, gold, divers, clients, sales, purchases, purchasePayments, closures, payments, expenses, users, prime, mVente, mAchat, shop, fondCaisse, resellerPhone]);

  const resetData = async () => {
    if (!window.confirm("Effacer toutes les données enregistrées et revenir aux exemples ? Cette action est définitive.")) return;
    await STORE.del("atelierdor:data");
    try { await STORE.del("atelierdor:session"); await STORE.del("atelierdor:view"); } catch (e) { /* */ }
    setGold(seedGold); setDivers(seedDivers); setClients(seedClients);
    setSales(seedSales); setPurchases(seedPurchases); setPurchasePayments(seedPurchasePayments); setClosures(seedClosures); setPayments(seedPayments); setExpenses(seedExpenses); setUsers(seedUsers);
    setPrime(3); setMVente(8); setMAchat(4); setFondCaisse(100000);
    setShop({ name: "Atelier d'Or", phone: "", addr: "Dakar, Sénégal" });
  };

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
    setModal(null);
    setReceipt(buildReceipt(rec));
  };
  const recordPayment = (sale, { amount, pay }) => {
    setPayments((arr) => [{ id: uid(), saleId: sale.id, date: TODAY, time: nowTime(), amount, pay, by: me() }, ...arr]);
    setAcompteFor(null);
  };
  const addPurchase = (p) => {
    ensureClient(p.client);
    const rec = { id: uid(), date: TODAY, time: nowTime(), no: "A" + Date.now().toString(36).slice(-5).toUpperCase(), kind: "purchase", by: me(), ...p };
    setPurchases((arr) => [rec, ...arr]);
    setPurchasePayments((arr) => [{ id: uid(), purchaseId: rec.id, date: TODAY, time: rec.time, amount: p.paid != null ? p.paid : p.total, pay: p.pay || "Espèces", by: me() }, ...arr]);
    setGold((arr) => [{ id: uid(), type: "Débris", desc: `Rachat ${p.client || "client"}`, karat: p.karat, weight: p.weight, qty: 1, cat: "or", origin: { from: "rachat", client: p.client || "", date: TODAY, price: p.total, purchaseId: rec.id } }, ...arr]);
    setModal(null);
    setReceipt(buildReceipt(rec));
  };
  const settlePurchase = (purchase, { amount, pay }) => {
    setPurchasePayments((arr) => [{ id: uid(), purchaseId: purchase.id, date: TODAY, time: nowTime(), amount, pay, by: me() }, ...arr]);
    setSettleFor(null);
  };
  const recordReturn = (sale, { amount, pay, restock, motif }) => {
    if (amount > 0) setExpenses((arr) => [{ id: uid(), date: TODAY, label: `Retour — ${sale.label}${motif ? " · " + motif : ""}`, cat: "Remboursement", pay, amount, by: me() }, ...arr]);
    if (restock) {
      if (sale.stockId) setGold((arr) => arr.map((it) => it.id === sale.stockId ? { ...it, qty: it.qty + 1 } : it));
      else if (sale.diversId) setDivers((arr) => arr.map((it) => it.id === sale.diversId ? { ...it, qty: it.qty + (sale.dQty || 1) } : it));
    }
    setSales((arr) => arr.map((s) => s.id === sale.id ? { ...s, returned: true } : s));
    setReturnFor(null);
  };
  const saveGold = (it) => { setGold((arr) => it.id ? arr.map((x) => x.id === it.id ? it : x) : [{ id: uid(), added: TODAY, ...it }, ...arr]); setModal(null); };
  const saveDivers = (it) => { setDivers((arr) => it.id ? arr.map((x) => x.id === it.id ? it : x) : [{ id: uid(), added: TODAY, ...it }, ...arr]); setModal(null); };
  const saveClient = (it) => { setClients((arr) => it.id ? arr.map((x) => x.id === it.id ? it : x) : [{ id: uid(), ...it }, ...arr]); setModal(null); };
  const saveExpense = (it) => { setExpenses((arr) => it.id ? arr.map((x) => x.id === it.id ? it : x) : [{ id: uid(), date: TODAY, by: me(), ...it }, ...arr]); setModal(null); };
  const saveUser = (it) => {
    const f = license ? FORMULAS[license.plan] : null;
    if (f && !it.id) {
      const admins = users.filter((u) => u.role === "patron").length;
      const vend = users.filter((u) => u.role === "vendeur").length;
      if (it.role === "patron" && admins >= f.admins) { window.alert(`La formule ${f.name} autorise ${f.admins} admin(s). Choisis une formule supérieure pour en ajouter.`); return; }
      if (it.role === "vendeur" && vend >= f.users) { window.alert(`La formule ${f.name} autorise ${f.users} utilisateur(s). Choisis une formule supérieure pour en ajouter.`); return; }
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
    setModal(null);
  };
  const delUser = (id) => {
    if (users.length <= 1) { window.alert("Il faut garder au moins un utilisateur."); return; }
    if (window.confirm("Supprimer cet employé ?")) setUsers((arr) => arr.filter((x) => x.id !== id));
  };
  const login = (u) => { setCurrentUser(u); setView("dash"); try { STORE.set("atelierdor:session", u.id); } catch (e) { /* */ } };
  const logout = () => { try { STORE.del("atelierdor:session"); } catch (e) { /* */ } setCurrentUser(null); setNavOpen(false); };
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

  const buildBackupJson = () => JSON.stringify({
    _app: "AtelierDor", _exportedAt: new Date().toISOString(),
    gold, divers, clients, sales, purchases, purchasePayments, closures, payments, expenses, users,
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
    window.alert("Sauvegarde importée. Toutes les données ont été restaurées.");
  };
  const del = (setter, id) => { if (window.confirm("Supprimer cet élément ?")) setter((arr) => arr.filter((x) => x.id !== id)); };

  /* ------------------------------- vues ------------------------------- */
  const NAV = [
    { id: "dash", label: "Tableau de bord", icon: LayoutGrid },
    { id: "sales", label: "Ventes", icon: ShoppingCart },
    { id: "buy", label: "Achats d'or", icon: ArrowDownLeft },
    { id: "stock", label: "Stock", icon: Package },
    { id: "clients", label: "Clients", icon: Users },
    { id: "credits", label: "Crédits & dettes", icon: Receipt },
    { id: "caisse", label: "Clôture de caisse", icon: Banknote },
    { id: "depenses", label: "Dépenses", icon: TrendingDown },
    { id: "reports", label: "Rapports", icon: BarChart3 },
    { id: "cours", label: "Cours de l'or", icon: Coins },
    { id: "settings", label: "Paramètres", icon: Settings },
    { id: "abo", label: "Abonnement", icon: Wallet },
  ];
  const go = (id) => { setView(id); setNavOpen(false); };
  const PIE = ["#b8862f", "#d9a441", "#8a6520", "#caa45e", "#6e4f1c"];

  /* ----------------------- Excel : export / import ---------------------- */
  const rowsVentes = () => sales.map((s) => ({ Date: dateFr(s.date), Type: KIND_LABEL[s.kind] || "Or", Détail: s.label, Client: s.client || "", Vendeur: s.by || "", Paiement: s.pay || "", Total: s.total, Payé: paidFor(s.id), Reste: Math.max(0, balanceFor(s)), Coût: s.cost, Marge: s.total - s.cost }));
  const rowsAchats = () => purchases.map((p) => ({ Date: dateFr(p.date), Client: p.client || "", Carat: p.karat, "Poids (g)": p.weight, "Prix/g": p.ppg, Total: p.total, Payé: purchasePaidFor(p.id), Reste: Math.max(0, purchaseBalance(p)), Note: p.note || "", Par: p.by || "" }));
  const rowsGold = (list) => list.map((it) => ({ Catégorie: goldCat(it) === "or" ? "Or brut" : "Bijou", Type: it.type, Description: it.desc || "", Carat: it.karat, "Poids (g)": it.weight, Qté: it.qty }));
  const rowsDivers = () => divers.map((it) => ({ Désignation: it.name, Catégorie: it.cat, Qté: it.qty, Unité: it.unit, Coût: it.cost, Vente: it.price, "Seuil min": it.min }));
  const rowsClients = () => clients.map((c) => ({ Nom: c.name, Téléphone: c.phone || "", Note: c.note || "", "Fournisseur pro": c.pro ? "Oui" : "" }));
  const rowsDepenses = () => expenses.map((e) => ({ Date: dateFr(e.date), Libellé: e.label, Catégorie: e.cat, Motif: e.note || "", Paiement: e.pay, Par: e.by || "", Montant: e.amount }));

  const exportAllXlsx = () => xlsxExport(`atelier-dor-${TODAY}.xlsx`, {
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
    if (!add.length) { window.alert("Aucune ligne valide (colonnes attendues : Type, Description, Carat, Poids (g), Qté, Catégorie)."); return; }
    setGold((arr) => [...add, ...arr]); window.alert(`${add.length} article(s) or importé(s).`);
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
    if (!add.length) { window.alert("Aucune ligne valide (colonnes attendues : Désignation, Catégorie, Qté, Unité, Coût, Vente, Seuil min)."); return; }
    setDivers((arr) => [...add, ...arr]); window.alert(`${add.length} article(s) divers importé(s).`);
  });
  const importClients = (file) => xlsxRead(file, (rows) => {
    const add = rows.map((r) => ({ id: uid(), name: pick(r, ["Nom", "Name", "Client"]), phone: String(pick(r, ["Téléphone", "Telephone", "Phone", "Tel"])), note: pick(r, ["Note", "Remarque"]), pro: /oui|yes|1|x/i.test(String(pick(r, ["Fournisseur pro", "Pro"]))) }))
      .filter((c) => c.name && !clients.find((x) => x.name === c.name));
    if (!add.length) { window.alert("Aucun nouveau client (colonnes attendues : Nom, Téléphone, Note)."); return; }
    setClients((arr) => [...arr, ...add]); window.alert(`${add.length} client(s) importé(s).`);
  });


  const renderDash = () => (
    <>
      {license && license.plan === "E" && (
        <button className="trial-banner" onClick={() => go("abo")}>
          <span className="trial-banner-dot" />
          <span>Essai gratuit — {planDaysLeft()} jour{planDaysLeft() > 1 ? "s" : ""} restant{planDaysLeft() > 1 ? "s" : ""}. Voir les formules et passer à un abonnement</span>
          <span className="trial-banner-arr">→</span>
        </button>
      )}
      <div className="kpis">
        <Kpi icon={Coins} label="Valeur du stock or" value={fcfa(m.stockOrValue)} sub={`${g(m.stockOrWeight)} · au cours du jour`} tone="gold" />
        <Kpi icon={Wallet} label="Trésorerie" value={fcfa(m.tresorerie)} sub="caisse + mobile money" tone="green" />
        <Kpi icon={TrendingUp} label="Ventes du jour" value={fcfa(m.ventesJour)} sub={`Bénéfice cumulé ${fcfa(m.beneficeVentes)}`} tone="gold" />
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
        <div className="card-head"><h3>Dernières opérations</h3></div>
        <table className="table">
          <thead><tr><th>Date</th><th>Type</th><th>Détail</th><th>Client</th><th className="r">Montant</th></tr></thead>
          <tbody>
            {sales.slice(0, 6).map((s) => (
              <tr key={s.id}>
                <td className="num">{dateFr(s.date)}</td>
                <td><span className={`pill ${s.kind === "divers" ? "pill-ink" : "pill-gold"}`}>Vente {(KIND_LABEL[s.kind] || "Or").toLowerCase()}</span></td>
                <td>{s.label}</td>
                <td>{clientCell(s.client)}</td>
                <td className="r num pos">+{fcfa(s.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );

  const renderSales = () => {
    const list = sales.filter((s) => (s.label + s.client).toLowerCase().includes(q.toLowerCase()));
    return (
      <div className="card">
        <div className="card-head">
          <h3>Historique des ventes <span className="count">{sales.length}</span></h3>
          <div className="head-btns">
            <button className="btn btn-line" onClick={() => xlsxExport(`ventes-${TODAY}.xlsx`, { Ventes: rowsVentes() })}><Download size={15} /> Excel</button>
            <button className="btn btn-gold" onClick={() => setModal({ type: "sale" })}><Plus size={16} /> Nouvelle vente</button>
          </div>
        </div>
        <table className="table">
          <thead><tr><th>Date</th><th>Type</th><th>Détail</th><th>Client</th><th>Vendeur</th><th>Paiement</th><th className="r">Marge</th><th className="r">Total</th><th></th></tr></thead>
          <tbody>
            {list.map((s) => {
              const bal = balanceFor(s);
              return (
              <tr key={s.id}>
                <td className="num">{dateFr(s.date)}</td>
                <td><span className={`pill ${s.kind === "divers" ? "pill-ink" : "pill-gold"}`}>{KIND_LABEL[s.kind] || "Or"}</span></td>
                <td>{s.label}{bal > 0 && <span className="mini-warn">reste {fcfa(bal)}</span>}{s.returned && <span className="pill pill-ink" style={{ marginLeft: 6 }}>retournée</span>}</td>
                <td>{clientCell(s.client)}</td>
                <td className="muted">{s.by || "—"}</td>
                <td className="muted">{s.pay}</td>
                <td className="r num">{fcfa(s.total - s.cost)}</td>
                <td className="r num pos">{fcfa(s.total)}</td>
                <td className="r"><div className="rowbtns">
                  {!s.returned && <button className="btn btn-xs btn-line" onClick={() => setReturnFor(s)}>Retour</button>}
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
          <button className="btn btn-line" onClick={() => xlsxExport(`achats-${TODAY}.xlsx`, { Achats: rowsAchats() })}><Download size={15} /> Excel</button>
          <button className="btn btn-clay" onClick={() => setModal({ type: "purchase" })}><Plus size={16} /> Nouvel achat</button>
        </div>
      </div>
      <table className="table">
        <thead><tr><th>Date</th><th>Client</th><th>Carat</th><th className="r">Poids</th><th className="r">Prix/g</th><th>Note</th><th>Par</th><th className="r">Payé</th><th></th></tr></thead>
        <tbody>
          {purchases.map((p) => {
            const bal = purchaseBalance(p);
            return (
            <tr key={p.id}>
              <td className="num">{dateFr(p.date)}</td>
              <td>{clientCell(p.client)}</td>
              <td><Badge k={p.karat} /></td>
              <td className="r num">{g(p.weight)}</td>
              <td className="r num">{fcfa(p.ppg)}</td>
              <td className="muted">{p.note}</td>
              <td className="muted">{p.by || "—"}</td>
              <td className="r num neg">
                −{fcfa(purchasePaidFor(p.id))}
                {bal > 0 && <div className="mini-warn">reste {fcfa(bal)}</div>}
              </td>
              <td className="r"><div className="rowbtns">
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
            <div className="ch-kpi"><span>Marge</span><strong className="num">{fcfa(marge)}</strong></div>
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
    const orItems = gold.filter((it) => goldCat(it) === "or");
    const bijouxItems = gold.filter((it) => goldCat(it) === "bijou");
    const goldTable = (list, title) => {
      const wt = list.reduce((a, it) => a + it.weight * it.qty, 0);
      const val = list.reduce((a, it) => a + it.weight * it.qty * prices[it.karat].vente, 0);
      return (
        <div className="card">
          <div className="card-head">
            <h3>{title} — {g(wt)} · {fcfa(val)}</h3>
            <div className="head-btns">
              <button className="btn btn-line" onClick={() => xlsxExport(`stock-${title.toLowerCase().replace(/\s/g, "-")}-${TODAY}.xlsx`, { [title]: rowsGold(list) })}><Download size={15} /> Excel</button>
              <XlsxImportBtn label="Importer" onFile={importGold} />
              <button className="btn btn-gold" onClick={() => setModal({ type: "gold" })}><Plus size={16} /> Ajouter</button>
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
                    <button className="icon-btn" onClick={() => setModal({ type: "gold", data: it })}><Pencil size={15} /></button>
                    <button className="icon-btn" onClick={() => del(setGold, it.id)}><Trash2 size={15} /></button>
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
              <button className="btn btn-line" onClick={() => xlsxExport(`stock-divers-${TODAY}.xlsx`, { Divers: rowsDivers() })}><Download size={15} /> Excel</button>
              <XlsxImportBtn label="Importer" onFile={importDivers} />
              <button className="btn btn-gold" onClick={() => setModal({ type: "divers" })}><Plus size={16} /> Ajouter</button>
            </div>
          </div>
          <table className="table">
            <thead><tr><th>Désignation</th><th>Catégorie</th><th className="r">Qté</th><th className="r">Coût</th><th className="r">Vente</th><th className="r">Marge u.</th><th></th></tr></thead>
            <tbody>
              {divers.map((it) => (
                <tr key={it.id} className={it.qty <= it.min ? "warn-row" : ""}>
                  <td><div className="prod-cell">{it.photo ? <img className="prod-thumb" src={it.photo} alt="" /> : <span className="prod-thumb ph">📷</span>}<button className="name-link" onClick={() => setProductView({ kind: "divers", item: it })}>{it.name}</button></div>{it.qty <= it.min && <span className="mini-warn">stock bas</span>}</td>
                  <td className="muted">{it.cat}</td>
                  <td className="r num">{it.qty} {it.unit}</td>
                  <td className="r num">{fcfa(it.cost)}</td>
                  <td className="r num">{fcfa(it.price)}</td>
                  <td className="r num">{fcfa(it.price - it.cost)}</td>
                  <td className="r"><div className="rowbtns">
                    <button className="icon-btn" onClick={() => setModal({ type: "divers", data: it })}><Pencil size={15} /></button>
                    <button className="icon-btn" onClick={() => del(setDivers, it.id)}><Trash2 size={15} /></button>
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
          <button className="btn btn-line" onClick={() => xlsxExport(`clients-${TODAY}.xlsx`, { Clients: rowsClients() })}><Download size={15} /> Excel</button>
          <XlsxImportBtn label="Importer" onFile={importClients} />
          <button className="btn btn-gold" onClick={() => setModal({ type: "client" })}><Plus size={16} /> Nouveau client</button>
        </div>
      </div>
      <div className="seg seg-lg seg-3" style={{ marginBottom: 14 }}>
        <button className={`seg-btn ${clientFilter === "all" ? "active" : ""}`} onClick={() => setClientFilter("all")}>Tous</button>
        <button className={`seg-btn ${clientFilter === "clients" ? "active" : ""}`} onClick={() => setClientFilter("clients")}>Clients</button>
        <button className={`seg-btn ${clientFilter === "fourn" ? "active" : ""}`} onClick={() => setClientFilter("fourn")}>Fournisseurs</button>
      </div>
      <div className="client-grid">
        {clients.filter((c) => {
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
                <button className="icon-btn" onClick={() => setModal({ type: "client", data: c })}><Pencil size={15} /></button>
                <button className="icon-btn" onClick={() => del(setClients, c.id)}><Trash2 size={15} /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderCredits = () => {
    const credits = sales.map((s) => ({ s, bal: balanceFor(s) })).filter((x) => x.bal > 0);
    const dettes = purchases.map((p) => ({ p, bal: purchaseBalance(p) })).filter((x) => x.bal > 0);
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
                    <td className="r"><button className="btn btn-gold btn-xs" onClick={() => setAcompteFor(s)}>Encaisser</button></td>
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
                    <td className="r"><button className="btn btn-clay btn-xs" onClick={() => setSettleFor(p)}>Payer</button></td>
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
    const byPay = (m2) => todayPays.filter((p) => p.pay === m2).reduce((a, b) => a + b.amount, 0);
    const esp = byPay("Espèces"), wave = byPay("Wave"), om = byPay("Orange Money"), vir = byPay("Banque");
    const encTotal = todayPays.reduce((a, b) => a + b.amount, 0);
    const caTotal = todaySales.reduce((a, b) => a + b.total, 0);
    const rachats = purchasePayments.filter((p) => p.date === TODAY && p.pay === "Espèces").reduce((a, b) => a + b.amount, 0);
    const depenses = expenses.filter((e) => e.date === TODAY && e.pay === "Espèces").reduce((a, b) => a + b.amount, 0);
    const theorique = fondCaisse + esp - rachats - depenses;
    const compte = parseFloat(compteCaisse) || 0;
    const compted = compteCaisse !== "";
    const ecart = compte - theorique;
    const closedToday = closures.find((c) => c.date === TODAY);

    const cloturer = () => {
      const c = { id: uid(), date: TODAY, time: nowTime(), by: me(), fond: fondCaisse, esp, wave, om, vir, caTotal: encTotal, rachats, depenses, theorique, compte, ecart };
      setClosures((arr) => [c, ...arr]);
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
            <table className="table">
              <tbody>
                <tr><td>Espèces</td><td className="r num">{fcfa(esp)}</td></tr>
                <tr><td>Wave</td><td className="r num">{fcfa(wave)}</td></tr>
                <tr><td>Orange Money</td><td className="r num">{fcfa(om)}</td></tr>
                <tr><td>Banque</td><td className="r num">{fcfa(vir)}</td></tr>
                <tr><td><strong>Total encaissé</strong></td><td className="r num pos"><strong>{fcfa(encTotal)}</strong></td></tr>
                <tr><td className="muted small">Valeur vendue (CA du jour)</td><td className="r num muted small">{fcfa(caTotal)}</td></tr>
              </tbody>
            </table>
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
              <div className="recon-row total"><span>= Espèces théoriques</span><span className="num">{fcfa(theorique)}</span></div>
              <div className="recon-row"><span>Espèces comptées</span>
                <input className="input num input-sm" type="number" value={compteCaisse} onChange={(e) => setCompteCaisse(e.target.value)} placeholder="0" /></div>
              {compted && (
                <div className={`recon-ecart ${ecart === 0 ? "ok" : ecart < 0 ? "bad" : "over"}`}>
                  <span>Écart</span><strong className="num">{ecart > 0 ? "+" : ""}{fcfa(ecart)}</strong>
                </div>
              )}
              <button className="btn btn-gold recon-btn" disabled={!compted} onClick={cloturer}>Clôturer la journée</button>
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
                <button className="btn btn-line" onClick={() => xlsxExport(`recap-mensuel-${TODAY}.xlsx`, { "Récap mensuel": months.map((mo) => ({ Mois: monthLabel(mo.month), Clôtures: mo.n, "CA encaissé": mo.ca, Rachats: mo.rachats, Dépenses: mo.depenses, "Écart cumulé": mo.ecart })) })}><Download size={15} /> Excel</button>
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

  const renderDepenses = () => {
    const ym = TODAY.slice(0, 7);
    const moisTotal = expenses.filter((e) => e.date.startsWith(ym)).reduce((a, b) => a + b.amount, 0);
    const total = expenses.reduce((a, b) => a + b.amount, 0);
    return (
      <>
        <div className="kpis">
          <Kpi icon={TrendingDown} label="Dépenses ce mois-ci" value={fcfa(moisTotal)} sub="charges du mois en cours" tone="clay" />
          <Kpi icon={Receipt} label="Dépenses cumulées" value={fcfa(total)} sub={`${expenses.length} dépense(s)`} tone="clay" />
          <Kpi icon={TrendingUp} label="Bénéfice net" value={fcfa(m.beneficeNet)} sub={`Marge brute ${fcfa(m.beneficeVentes)}`} tone="green" />
        </div>
        <div className="card">
          <div className="card-head">
            <h3>Dépenses & charges <span className="count">{expenses.length}</span></h3>
            <div className="head-btns">
              <button className="btn btn-line" onClick={() => xlsxExport(`depenses-${TODAY}.xlsx`, { Dépenses: rowsDepenses() })}><Download size={15} /> Excel</button>
              <button className="btn btn-clay" onClick={() => setModal({ type: "expense" })}><Plus size={16} /> Nouvelle dépense</button>
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
                      <button className="icon-btn" onClick={() => setModal({ type: "expense", data: e })}><Pencil size={15} /></button>
                      <button className="icon-btn" onClick={() => del(setExpenses, e.id)}><Trash2 size={15} /></button>
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

  const renderEquipe = () => {
    const f = license ? FORMULAS[license.plan] : null;
    const nbAdmins = users.filter((u) => u.role === "patron").length;
    const nbVend = users.filter((u) => u.role === "vendeur").length;
    return (
    <>
      <button className="btn btn-line btn-xs" style={{ marginBottom: 14 }} onClick={() => go("settings")}>← Retour aux paramètres</button>
      {f && (
        <div className="card lic-card">
          <div className="card-head"><h3>Formule active</h3><span className={`pill ${f.trial ? "pill-ink" : "pill-gold"}`}>{f.name}</span></div>
          <p className="muted small" style={{ margin: "0 0 4px" }}>
            {license.lifetime ? "Sans expiration" : `Expire le ${dateFull(new Date(license.expiry))}`}
            {" · "}{f.admins >= 99 ? "admins illimités" : `${nbAdmins}/${f.admins} admin${f.admins > 1 ? "s" : ""}`}
            {" · "}{f.users >= 99 ? "utilisateurs illimités" : `${nbVend}/${f.users} utilisateurs`}
          </p>
          {f.trial && <p className="muted small" style={{ margin: 0 }}>Essai gratuit — à la fin, choisis une formule pour continuer.</p>}
        </div>
      )}
      <div className="card">
        <div className="card-head">
          <h3>Équipe & accès <span className="count">{users.length}</span></h3>
          <button className="btn btn-gold" onClick={() => setModal({ type: "user" })}><Plus size={16} /> Nouvel employé</button>
        </div>
        <table className="table">
          <thead><tr><th>Nom</th><th>Identifiant</th><th>Rôle</th><th>Mot de passe</th><th></th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td><strong>{u.name}</strong>{currentUser && u.id === currentUser.id && <span className="mini-tag">moi</span>}</td>
                <td className="muted">{u.email || "—"}</td>
                <td><span className={`pill ${u.role === "patron" ? "pill-gold" : "pill-ink"}`}>{u.role === "patron" ? "Patron" : "Vendeur"}</span></td>
                <td className="num muted">••••••</td>
                <td className="r"><div className="rowbtns">
                  <button className="icon-btn" onClick={() => setModal({ type: "user", data: u })}><Pencil size={15} /></button>
                  <button className="icon-btn" onClick={() => delUser(u.id)}><Trash2 size={15} /></button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card">
        <div className="card-head"><h3>Comment ça marche</h3></div>
        <p className="muted small" style={{ margin: 0 }}>
          À chaque ouverture, l'app se verrouille : chaque employé se connecte avec son <strong>identifiant (ou e-mail) et son mot de passe</strong>. Le <strong>patron</strong> a accès à tout (rapports, équipe, réglages) ; le <strong>vendeur</strong> accède aux ventes, achats, stock, clients, crédits, caisse et dépenses. Chaque vente, rachat et clôture retient automatiquement <em>qui</em> l'a faite.
        </p>
      </div>
    </>
    );
  };

  const renderReports = () => {
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
    return (
      <>
        <div className="seg seg-lg seg-4">
          {["today", "month", "year", "all"].map((p) => (
            <button key={p} className={`seg-btn ${reportPeriod === p ? "active" : ""}`} onClick={() => setReportPeriod(p)}>{PERIOD_LABEL[p]}</button>
          ))}
        </div>
        <div className="kpis">
          <Kpi icon={Receipt} label={`Chiffre d'affaires · ${PERIOD_LABEL[reportPeriod].toLowerCase()}`} value={fcfa(pCA)} sub={`Marge brute ${fcfa(pMarge)} · ${pSales.length} vente(s)`} tone="gold" />
          <Kpi icon={ArrowDownLeft} label="Achats / rachats" value={fcfa(pAchats)} sub={`${pPurch.length} rachat(s)`} tone="clay" />
          <Kpi icon={TrendingUp} label="Bénéfice net" value={fcfa(pNet)} sub={`marge − dépenses (${fcfa(pDep)})`} tone="green" />
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
            <div className="card-head"><h3>Articles divers les plus vendus</h3></div>
            <table className="table">
              <thead><tr><th>Article</th><th className="r">Ventes</th><th className="r">En stock</th></tr></thead>
              <tbody>{topDivers.map((it) => <tr key={it.id}><td>{it.name}</td><td className="r num">{it.sold}</td><td className="r num">{it.qty}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <div className="card-head">
            <h3>Ventes par type de produit <span className="count">{byType.length}</span></h3>
            <button className="btn btn-line" onClick={() => xlsxExport(`ventes-par-type-${TODAY}.xlsx`, { "Par type": byType.map((t) => ({ Produit: t.type, Catégorie: KIND_LABEL[t.kind] || "Or", "Qté vendue": t.qty, "Chiffre d'affaires": t.revenue, Marge: t.marge })) })}><Download size={15} /> Excel</button>
          </div>
          {byType.length === 0 ? <p className="muted small">Aucune vente enregistrée pour l'instant.</p> : (
            <table className="table">
              <thead><tr><th>Produit</th><th>Catégorie</th><th className="r">Qté vendue</th><th className="r">Chiffre d'affaires</th><th className="r">Marge</th></tr></thead>
              <tbody>
                {byType.map((t, i) => (
                  <tr key={i}>
                    <td><strong>{t.type}</strong></td>
                    <td><span className={`pill ${t.kind === "divers" ? "pill-ink" : "pill-gold"}`}>{KIND_LABEL[t.kind] || "Or"}</span></td>
                    <td className="r num">{t.qty}</td>
                    <td className="r num pos">{fcfa(t.revenue)}</td>
                    <td className="r num">{fcfa(t.marge)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
          <div className="stat"><div className="stat-ico"><Globe size={15} /></div><span className="stat-lab">Cours mondial</span><span className="stat-val">{nf.format(Math.round(spot))} $<small>/once</small></span></div>
          <div className="stat"><div className="stat-ico"><TrendingUp size={15} /></div><span className="stat-lab">Dollar (USD → FCFA)</span><span className="stat-val">{nf.format(Math.round(rate))}<small> F</small></span></div>
          <div className="stat hl"><div className="stat-ico gold"><Coins size={15} /></div><span className="stat-lab">Or pur 24K</span><span className="stat-val">{fcfa(perGram24)}<small>/g</small></span></div>
        </div>
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
          <Field label="Cours mondial (USD/once)"><input className="input num" type="number" value={Math.round(spot)} onChange={(e) => setSpot(Number(e.target.value) || 0)} /></Field>
          <Field label="Taux USD → FCFA"><input className="input num" type="number" value={Math.round(rate)} onChange={(e) => setRate(Number(e.target.value) || 0)} /></Field>
        </div>
        <p className="note-box">Le cours et le taux se remplissent tout seuls en direct ; tu peux les corriger à la main si besoin. Tout le reste — ventes, rachats, valeur du stock — se recalcule à partir d'ici.</p>
        <p className="src-note">Sources en direct : prix de l'or via gold-api.com · taux de change via <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer">Exchange Rate API</a>.</p>
      </div>

      <p className="disclaim">Données de marché à titre indicatif (pas un conseil financier). L'actualisation reflète le cours du moment ; pour un flux à la seconde près façon salle de marché, il faudra brancher un fournisseur de données dédié lors de la mise en ligne.</p>
    </>
  );

  const renderSettings = () => (
    <>
      <div className="card">
        <div className="card-head"><h3><ShieldCheck size={15} /> Utilisateurs & équipe</h3><span className="muted">{users.length} compte(s)</span></div>
        <p className="muted small" style={{ margin: "0 0 14px" }}>Gère les comptes de connexion (patron et vendeurs) : qui peut se connecter et avec quels droits.</p>
        <button className="btn btn-gold" onClick={() => go("equipe")}><Users size={15} /> Gérer les utilisateurs</button>
      </div>

      <div className="card">
        <div className="card-head"><h3><Receipt size={15} /> Boutique (en-tête des reçus)</h3><span className="muted">Apparaît en haut de chaque ticket</span></div>
        <Field label="Logo de la boutique"><LogoField logo={shop.logo} onChange={(v) => setShop((s) => ({ ...s, logo: v }))} /></Field>
        <Field label="Nom de la boutique"><input className="input" value={shop.name} onChange={(e) => setShop((s) => ({ ...s, name: e.target.value }))} /></Field>
        <div className="manual" style={{ marginTop: 0, paddingTop: 0, borderTop: "none" }}>
          <Field label="Adresse"><input className="input" value={shop.addr} onChange={(e) => setShop((s) => ({ ...s, addr: e.target.value }))} placeholder="ex : Marché Sandaga, Dakar" /></Field>
          <Field label="Téléphone"><input className="input" value={shop.phone} onChange={(e) => setShop((s) => ({ ...s, phone: e.target.value }))} placeholder="77 000 00 00" /></Field>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3><Download size={15} /> Données & sauvegarde</h3>
          <span className="muted">{saveState === "saving" ? "Enregistrement…" : saveState === "error" ? "Indisponible" : "À jour"}</span>
        </div>
        <p className="muted small" style={{ margin: "0 0 14px" }}>
          Tout est enregistré automatiquement sur cet appareil. La sauvegarde te permet d'en garder une copie de secours et de transférer ta boutique sur un autre téléphone.
        </p>
        {isPatron ? (
          <>
            <div className="data-actions">
              <button className="btn btn-gold" onClick={() => setBackup("export")}><Download size={15} /> Exporter</button>
              <button className="btn btn-line" onClick={() => setBackup("import")}><Upload size={15} /> Importer</button>
              <button className="btn btn-line" onClick={exportAllXlsx}><Download size={15} /> Excel (tout)</button>
              <button className="btn btn-line danger" onClick={resetData}><Trash2 size={15} /> Réinitialiser</button>
            </div>
            <p className="note-box">Exporter crée un fichier (ou un texte à copier) contenant toute ta boutique. Importer le restaure — sur ce téléphone ou un autre. « Excel (tout) » crée un classeur avec une feuille par catégorie (ventes, achats, stock, clients, dépenses). Réinitialiser revient aux données d'exemple.</p>
            {license && <p className="muted small" style={{ margin: "10px 0 0" }}>Licence : {license.lifetime ? "à vie" : `valable jusqu'au ${dateFull(license.expiry)}`}</p>}
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
            return (
              <div className={`formula ${current ? "formula-current" : ""}`} key={k}>
                <div className="formula-top"><span className="formula-name">{ff.name}</span><span className="formula-price">{priceLabelOf(k)}</span></div>
                <ul className="formula-feats">{ff.features.map((x, i) => <li key={i}>{x}</li>)}</ul>
                {current
                  ? <button className="btn btn-line formula-btn" disabled>Formule actuelle</button>
                  : <button className="btn btn-gold formula-btn" onClick={() => chooseFormula(k)}>Choisir {ff.name}</button>}
              </div>
            );
          })}
        </div>
        <p className="src-note">En choisissant une formule, un message prérempli part vers ton revendeur (WhatsApp) avec le nom de ta boutique. Il t'enverra ensuite un code d'activation.</p>
      </>
    );
  };

  const VIEWS = { dash: renderDash, sales: renderSales, buy: renderBuy, stock: renderStock, clients: renderClients, credits: renderCredits, caisse: renderCaisse, depenses: renderDepenses, equipe: renderEquipe, reports: renderReports, cours: renderCours, settings: renderSettings, abo: renderAbo };
  const titles = { dash: "Tableau de bord", sales: "Ventes", buy: "Achats d'or", stock: "Stock", clients: "Clients", credits: "Crédits & dettes", caisse: "Clôture de caisse", depenses: "Dépenses & charges", equipe: "Équipe & sécurité", reports: "Rapports", cours: "Cours de l'or", settings: "Paramètres", abo: "Abonnement" };

  if (route === "admin") {
    return (<div className="app"><style>{CSS}</style><AdminSpace onExit={exitAdmin} shop={shop} setShop={setShop} users={users} setUsers={setUsers} resellerPhone={resellerPhone} setResellerPhone={setResellerPhone} /></div>);
  }
  if (route === "espace") {
    return (
      <div className="app"><style>{CSS}</style>
        {!authReady
          ? (<div className="lock"><div className="lock-brand"><BrandMark logo={shop.logo} lg /><div className="lock-sub">Chargement…</div></div></div>)
          : !authUser
            ? (<OnlineLogin onExit={exitEspace} logo={shop.logo} />)
            : (<ResellerSpace authUser={authUser} onSignOut={authSignOut} onExit={exitEspace} onPricesSaved={loadPrices} logo={shop.logo} />)}
      </div>
    );
  }
  if (!licReady) {
    return (<div className="app"><style>{CSS}</style><div className="lock"><div className="lock-brand"><BrandMark logo={shop.logo} lg /><div className="lock-sub">Chargement…</div></div></div></div>);
  }
  if (!license) {
    return (<div className="app"><style>{CSS}</style><ActivationScreen onActivate={activate} onAdmin={goAdmin} onTrial={startTrial} onChoose={chooseFormula} onContact={contactReseller} trialUsed={trialUsed} logo={shop.logo} />{formulaReq && <FormulaModal req={formulaReq} onClose={() => setFormulaReq(null)} />}</div>);
  }
  if (!currentUser) {
    return (<div className="app"><style>{CSS}</style><LockScreen users={users} onUnlock={login} logo={shop.logo} /></div>);
  }
  const isPatron = currentUser.role === "patron";
  const navItems = isPatron ? NAV : NAV.filter((n) => !["equipe", "settings", "reports", "abo"].includes(n.id));
  const cur = navItems.some((n) => n.id === view) ? view : "dash";

  return (
    <div className="app">
      <style>{CSS}</style>

      {navOpen && <div className="scrim" onClick={() => setNavOpen(false)} />}
      <aside className={`sidebar ${navOpen ? "open" : ""}`}>
        <div className="brand">
          <BrandMark logo={shop.logo} />
          <div><div className="brand-name">Atelier d'Or</div><div className="brand-sub">Gestion bijouterie</div></div>
        </div>
        <nav>
          {navItems.map((n) => (
            <button key={n.id} className={`nav-item ${cur === n.id ? "active" : ""}`} onClick={() => go(n.id)}>
              <n.icon size={18} /> <span>{n.label}</span>
            </button>
          ))}
        </nav>
        <div className="side-foot">
          <div className="side-user">
            <span className="avatar sm">{currentUser.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</span>
            <span className="side-user-main"><strong>{currentUser.name}</strong><em>{isPatron ? "Patron" : "Vendeur"}</em></span>
          </div>
          <button className="btn logout-btn" onClick={logout}><LogOut size={15} /> Déconnexion</button>
          <div className="save-ind">
            <span className={`save-dot ${saveState}`} />
            {saveState === "saving" ? "Enregistrement…" : saveState === "error" ? "Sauvegarde indisponible" : "Données enregistrées"}
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="top-left">
            <button className="icon-btn menu-btn" onClick={() => setNavOpen((o) => !o)}><Menu size={20} /></button>
            <div>
              <h1>{titles[cur]}</h1>
              <span className="muted small">{new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</span>
            </div>
          </div>

          <div className="cours-ticker" onClick={() => go("cours")} title="Voir le cours en direct">
            <span className="ticker-live"><span className={`dot ${coursLoading ? "pulse" : ""}`} /></span>
            {KARATS.map((k) => (
              <div className="assay" key={k}>
                <span className="assay-k">{k}K</span>
                <span className="assay-p num">{nf.format(Math.round(prices[k].vente))}</span>
              </div>
            ))}
          </div>

          <div className="top-actions">
            {(view === "sales" || view === "dash") && (
              <div className="search"><Search size={15} /><input placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
            )}
            <button className="btn btn-clay" onClick={() => setModal({ type: "purchase" })}><ArrowDownLeft size={16} /> Achat</button>
            <button className="btn btn-gold" onClick={() => setModal({ type: "sale" })}><Plus size={16} /> Vente</button>
          </div>
        </header>

        <main className="content">{VIEWS[cur]()}</main>
      </div>

      {modal?.type === "sale" && <SaleModal prices={prices} gold={gold} divers={divers} clients={clients} onClose={() => setModal(null)} onSave={addSale} />}
      {modal?.type === "purchase" && <PurchaseModal prices={prices} clients={clients} onClose={() => setModal(null)} onSave={addPurchase} />}
      {modal?.type === "gold" && <GoldModal item={modal.data} onClose={() => setModal(null)} onSave={saveGold} />}
      {modal?.type === "divers" && <DiversModal item={modal.data} onClose={() => setModal(null)} onSave={saveDivers} />}
      {modal?.type === "client" && <ClientModal item={modal.data} onClose={() => setModal(null)} onSave={saveClient} />}
      {modal?.type === "expense" && <ExpenseModal item={modal.data} onClose={() => setModal(null)} onSave={saveExpense} />}
      {modal?.type === "user" && <UserModal item={modal.data} onClose={() => setModal(null)} onSave={saveUser} />}
      {backup && <BackupModal mode={backup} json={buildBackupJson()} onClose={() => setBackup(null)} onImport={applyImport} />}
      {clientView && renderClientHistory()}
      {productView && renderProductHistory()}
      {receipt && <ReceiptModal data={receipt} shop={shop} onClose={() => setReceipt(null)} />}
      {zView && <ZModal data={zView} shop={shop} onClose={() => setZView(null)} />}
      {acompteFor && <AcompteModal sale={acompteFor} balance={balanceFor(acompteFor)} onClose={() => setAcompteFor(null)} onSave={(p) => recordPayment(acompteFor, p)} />}
      {settleFor && <SettlePurchaseModal purchase={settleFor} balance={purchaseBalance(settleFor)} onClose={() => setSettleFor(null)} onSave={(p) => settlePurchase(settleFor, p)} />}
      {formulaReq && <FormulaModal req={formulaReq} onClose={() => setFormulaReq(null)} />}
      {returnFor && <RetourModal sale={returnFor} onClose={() => setReturnFor(null)} onSave={(p) => recordReturn(returnFor, p)} />}

      <div className="print-receipt">{receipt ? <ReceiptCard data={receipt} shop={shop} /> : zView ? <ZCard data={zView} shop={shop} /> : null}</div>
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
.num { font-family:'JetBrains Mono',monospace; font-variant-numeric:tabular-nums; }
.muted { color:var(--muted); } .small{ font-size:12px; } .r{ text-align:right; }
.pos{ color:var(--green); } .neg{ color:var(--clay); }

.sidebar { width:248px; background:var(--ink); color:#e9e0d0; display:flex; flex-direction:column;
  position:fixed; inset:0 auto 0 0; z-index:40; padding:18px 14px; }
.brand { display:flex; align-items:center; gap:11px; padding:6px 8px 20px; }
.brand-mark { width:40px; height:40px; border-radius:10px; display:grid; place-items:center;
  background:linear-gradient(150deg,var(--gold2),var(--gold)); color:var(--ink);
  font-family:'Fraunces',serif; font-weight:700; font-size:18px; }
.brand-mark.has-logo { background:#fff; overflow:hidden; }
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
.topbar { display:flex; align-items:center; gap:16px; padding:14px 24px; background:rgba(255,253,248,.85);
  backdrop-filter:blur(8px); border-bottom:1px solid var(--line); position:sticky; top:0; z-index:20; flex-wrap:wrap; }
.top-left { display:flex; align-items:center; gap:12px; }
.topbar h1 { font-size:21px; }
.cours-ticker { display:flex; align-items:center; gap:7px; margin:0 auto; flex-wrap:wrap; cursor:pointer; }
.ticker-live { display:inline-flex; align-items:center; }
.assay { display:flex; flex-direction:column; align-items:center; border:1px solid var(--line);
  border-radius:8px; padding:4px 9px; background:var(--card); min-width:58px; }
.assay-k { font-size:10px; font-weight:700; color:var(--gold); letter-spacing:.04em; }
.assay-p { font-size:12px; font-weight:600; }
.top-actions { display:flex; align-items:center; gap:9px; }
.search { display:flex; align-items:center; gap:7px; background:var(--card); border:1px solid var(--line);
  border-radius:9px; padding:7px 11px; color:var(--muted); }
.search input { border:0; background:none; outline:none; font:inherit; width:130px; color:var(--text); }
.menu-btn { display:none; }
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
.achat { color:var(--clay); font-weight:600; } .vente { color:var(--green); font-weight:600; }
.pill { font-size:11px; font-weight:600; padding:2px 9px; border-radius:20px; }
.pill-gold { background:var(--gold-soft); color:var(--gold); }
.pill-ink { background:#ece5d6; color:var(--ink2); }

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
  display:grid; place-items:center; z-index:60; padding:18px; }
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
.live-tag { display:inline-flex; align-items:center; gap:7px; font-size:11px; font-weight:700; letter-spacing:.05em; text-transform:uppercase; color:var(--gold2); background:rgba(216,164,65,.12); padding:4px 10px; border-radius:20px; }
.src-note { font-size:11px; color:var(--muted); margin:10px 0 0; }
.src-note a { color:var(--gold); text-decoration:none; }
.src-note a:hover { text-decoration:underline; }
.dot { width:7px; height:7px; border-radius:50%; background:var(--gold2); }
.dot.pulse { animation:pulse 1.4s infinite; }
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
  .scrim { display:block; position:fixed; inset:0; background:rgba(28,22,17,.4); z-index:35; }
  .main { margin-left:0; }
  .menu-btn { display:grid; width:38px; height:38px; border-radius:10px; background:var(--card); border:1px solid var(--line); color:var(--ink); flex:none; }
  .content { padding:16px; }
  .grid2 { grid-template-columns:1fr; }
  .manual { grid-template-columns:1fr; }
  .search { display:none; }
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
`;
