// src/api.js — Toutes les fonctions d'appel à l'API backend

const BASE = process.env.REACT_APP_API_URL || "http://localhost:3001/api";

// ── Token JWT stocké en mémoire (jamais en localStorage) ──
let _token = null;
export const setToken = t => { _token = t; };
export const getToken = ()  => _token;
export const clearToken = () => { _token = null; };

async function req(method, path, body) {
  const headers = { "Content-Type": "application/json" };
  if (_token) headers["Authorization"] = `Bearer ${_token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erreur serveur");
  return data;
}

// ════════════════════════════════════════════
// AUTH
// ════════════════════════════════════════════
export const authLogin  = (email, password)   => req("POST", "/auth/login",  { email, password });
export const authVerify = (userId, code)       => req("POST", "/auth/verify", { userId, code });
export const authMe     = ()                   => req("GET",  "/auth/me");

// ════════════════════════════════════════════
// USERS
// ════════════════════════════════════════════
export const getUsers   = ()     => req("GET",    "/users");
export const createUser = user   => req("POST",   "/users",       user);
export const updateUser = user   => req("PUT",    `/users/${user.id}`, user);
export const deleteUser = id     => req("DELETE", `/users/${id}`);

// ════════════════════════════════════════════
// DEMANDS
// ════════════════════════════════════════════
export const getDemands      = ()              => req("GET",  "/demands");
export const createDemand    = demand          => req("POST", "/demands",                     demand);
export const updateStatut    = (id, statut)    => req("PUT",  `/demands/${id}/statut`,         { statut });
export const updateResult    = (id, result, statut) => req("PUT", `/demands/${id}/result`,    { result, statut });
export const updateResultClient = (id, result) => req("PUT",  `/demands/${id}/result-client`, { result });
export const generateMatrice = id             => req("POST", `/demands/${id}/generate`);

// ════════════════════════════════════════════
// NOTES
// ════════════════════════════════════════════
export const deleteDocument    = id              => req("DELETE", `/documents/${id}`);
export const forgotPassword    = email            => req("POST",  "/auth/forgot-password", { email });
export const resetPassword     = (userId, token, password) => req("POST", "/auth/reset-password", { userId, token, password });