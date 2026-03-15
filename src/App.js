// src/App.js — PédagoGen Frontend Production
// Connecté à l'API backend via src/api.js

import { useState, useRef, useEffect, useCallback } from "react";
import * as api from "./api";

/* ══════════════════════════════════════════════════
   CONSTANTES
══════════════════════════════════════════════════ */
const STATUTS = ["Déposé","En traitement","Généré","Envoyé au client","Validé"];
const TONS    = ["Formel","Simple","Expert"];
const PUBLICS = ["Débutants","Professionnels","Étudiants","Managers","Tout public"];
const SM = {
  "Déposé":          {color:"#6366f1",bg:"#eef2ff",icon:"📥"},
  "En traitement":   {color:"#f59e0b",bg:"#fffbeb",icon:"⚙️"},
  "Généré":          {color:"#3b82f6",bg:"#eff6ff",icon:"✨"},
  "Envoyé au client":{color:"#8b5cf6",bg:"#f5f3ff",icon:"📤"},
  "Validé":          {color:"#10b981",bg:"#f0fdf4",icon:"✅"},
};

/* ══════════════════════════════════════════════════
   ROOT
══════════════════════════════════════════════════ */
export default function App() {
  const [screen,  setScreen]  = useState("login");
  const [session, setSession] = useState(null);
  const [pending, setPending] = useState(null); // { userId }
  const [demands, setDemands] = useState([]);
  const [users,   setUsers]   = useState([]);
  const [nav,     setNav]     = useState({ view:"list", demandId:null });
  const [showProfile, setShowProfile] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  /* ── Charger les demandes ── */
  const loadDemands = useCallback(async () => {
    try {
      const data = await api.getDemands();
      setDemands(data);
    } catch(e) { console.error(e); }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch(e) { console.error(e); }
  }, []);

  useEffect(() => {
    if (session) {
      loadDemands();
      if (session.role === "admin") loadUsers();
    }
  }, [session, loadDemands, loadUsers]);

  /* ── AUTH ── */
  const handleLogin = async (email, password) => {
    setLoading(true); setError("");
    try {
      const res = await api.authLogin(email, password);
      setPending({ userId: res.userId });
      setScreen("2fa");
    } catch(e) { setError(e.message); }
    setLoading(false);
  };

  const handleVerify = async (code) => {
    setLoading(true); setError("");
    try {
      const res = await api.authVerify(pending.userId, code);
      api.setToken(res.token);
      setSession(res.user);
      setScreen("app");
    } catch(e) { setError(e.message); }
    setLoading(false);
  };

  const logout = () => {
    api.clearToken();
    setSession(null);
    setDemands([]);
    setUsers([]);
    setNav({ view:"list", demandId:null });
    setScreen("login");
    setError("");
  };

  /* ── Navigation ── */
  const goList   = () => setNav({ view:"list",   demandId:null });
  const goDetail = id => setNav({ view:"detail", demandId:id  });
  const goNew    = () => setNav({ view:"new",    demandId:null });

  /* ── Mutations demands ── */
  const upsertLocal = (id, patch) =>
    setDemands(prev => prev.map(d => d.id===id ? {...d,...patch} : d));

  const handleStatut = async (id, statut) => {
    try {
      await api.updateStatut(id, statut);
      upsertLocal(id, { statut });
    } catch(e) { alert(e.message); }
  };

  const handleResult = async (id, result, statut, isClient) => {
    try {
      if (isClient) await api.updateResultClient(id, result);
      else          await api.updateResult(id, result, statut);
      upsertLocal(id, { result, ...(statut ? { statut } : {}) });
    } catch(e) { alert(e.message); }
  };

  const handleNote = async (demandId, texte) => {
    try {
      const note = await api.addNote(demandId, texte);
      setDemands(prev => prev.map(d =>
        d.id===demandId ? { ...d, notes:[...(d.notes||[]), note] } : d
      ));
    } catch(e) { alert(e.message); }
  };

  const handleGenerate = async (demandId) => {
    try {
      const res = await api.generateMatrice(demandId);
      upsertLocal(demandId, { result: res.result, statut: res.statut });
      return res;
    } catch(e) { throw e; }
  };

  const handleDeleteDoc = async (docId, demandId) => {
    if (!window.confirm("Supprimer ce document ?")) return;
    try {
      await api.deleteDocument(docId);
      setDemands(prev => prev.map(d => d.id===demandId
        ? {...d, docs: d.docs.filter(doc => doc.id!==docId)}
        : d
      ));
    } catch(e) { alert(e.message); }
  };

  const handleForgotPassword = async (email) => {
    try {
      await api.forgotPassword(email);
      return true;
    } catch(e) { return false; }
  };

  const handleResetPassword = async (userId, token, password) => {
    try {
      await api.resetPassword(userId, token, password);
      return true;
    } catch(e) { return false; }
  };
    try {
      const demand = await api.createDemand(entry);
      setDemands(prev => [demand, ...prev]);
      goList();
    } catch(e) { alert(e.message); }
  };

  /* ── Screens ── */
  if (screen==="login")  return <LoginScreen onLogin={handleLogin} onForgot={handleForgotPassword} loading={loading} error={error}/>;
  if (screen==="2fa")    return <TwoFAScreen onVerify={handleVerify} loading={loading} error={error} onBack={()=>{ setScreen("login"); setError(""); }}/>;
  if (screen==="reset")  return <ResetPasswordScreen onReset={handleResetPassword} onBack={()=>setScreen("login")}/>;

  const isAdmin  = session.role==="admin";
  const isGest   = session.role==="gestionnaire";
  const isClient = session.role==="client";
  const accent   = isAdmin?"#dc2626":isGest?"#7c3aed":"#2563eb";
  const demand   = demands.find(d=>d.id===nav.demandId)??null;
  const visible  = isClient ? demands.filter(d=>d.client_id===session.id) : demands;

  return (
    <div style={{fontFamily:"Inter,sans-serif",background:"#f8fafc",minHeight:"100vh",color:"#1e293b"}}>

      {/* HEADER */}
      <div style={{background:"#fff",borderBottom:"1px solid #e2e8f0"}}>
        <div style={{maxWidth:1140,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 24px"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:34,height:34,background:accent,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17}}>📚</div>
            <div>
              <div style={{fontWeight:700,fontSize:15}}>PédagoGen</div>
              <div style={{fontSize:11,color:"#94a3b8"}}>{isAdmin?"👑 Administration":isGest?"🛠️ Back-office":"👤 Portail client"}</div>
            </div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {isAdmin && <HBtn active={nav.view==="admin"} onClick={()=>setNav({view:"admin",demandId:null})}>⚙️ Gestion</HBtn>}
            <HBtn active={showProfile} onClick={()=>setShowProfile(v=>!v)}>👤 {session.prenom} {session.nom}</HBtn>
            <button onClick={logout} style={{padding:"7px 14px",background:"#fef2f2",border:"none",borderRadius:8,cursor:"pointer",fontWeight:600,fontSize:13,color:"#ef4444"}}>Déconnexion</button>
          </div>
        </div>
      </div>

      {/* CONTENU */}
      <div style={{maxWidth:1140,margin:"0 auto",padding:"28px 20px"}}>

        {showProfile && (
          <ProfilePage
            user={session}
            onSave={async u => {
              try {
                const updated = await api.updateUser(u);
                setSession({...session,...updated});
                setShowProfile(false);
              } catch(e) { alert(e.message); }
            }}
            onCancel={()=>setShowProfile(false)}
          />
        )}

        {!showProfile && nav.view==="admin" && isAdmin && (
          <AdminPage
            users={users}
            onAdd={async u => { const res=await api.createUser(u); setUsers(p=>[...p,res]); }}
            onSave={async u => { const res=await api.updateUser(u); setUsers(p=>p.map(x=>x.id===res.id?res:x)); }}
            onDel={async id => { await api.deleteUser(id); setUsers(p=>p.filter(x=>x.id!==id)); }}
          />
        )}

        {!showProfile && nav.view==="new" && isClient && (
          <NewDemandForm session={session} onSubmit={handleAddDemand} onCancel={goList}/>
        )}

        {!showProfile && nav.view==="detail" && demand && (
          <DemandDetail
            demand={demand}
            isClient={isClient}
            isGest={isGest}
            onBack={goList}
            onStatut={handleStatut}
            onResult={handleResult}
            onNote={handleNote}
            onGenerate={handleGenerate}
            onRefresh={loadDemands}
          />
        )}

        {!showProfile && (nav.view==="list" || (nav.view==="detail" && !demand)) && (
          <Dashboard
            demands={visible}
            isClient={isClient}
            isGest={isGest}
            onOpen={goDetail}
            onNew={isClient ? goNew : null}
            onRefresh={loadDemands}
          />
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   LOGIN
══════════════════════════════════════════════════ */
function LoginScreen({onLogin,onForgot,loading,error}) {
  const [email,setEmail]=useState("");
  const [pwd,setPwd]=useState("");
  const [forgotMode,setForgotMode]=useState(false);
  const [forgotEmail,setForgotEmail]=useState("");
  const [forgotSent,setForgotSent]=useState(false);
  const [forgotLoading,setForgotLoading]=useState(false);

  const handleForgot = async () => {
    setForgotLoading(true);
    await onForgot(forgotEmail);
    setForgotSent(true);
    setForgotLoading(false);
  };

  if (forgotMode) return (
    <div style={{fontFamily:"Inter,sans-serif",minHeight:"100vh",background:"#f8fafc",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:"#fff",borderRadius:20,padding:"40px 36px",width:"min(420px,100%)",boxShadow:"0 4px 24px #0002"}}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:40,marginBottom:10}}>🔑</div>
          <h2 style={{margin:"0 0 6px",fontSize:20,fontWeight:800}}>Mot de passe oublié</h2>
        </div>
        {forgotSent ? (
          <div>
            <div style={{background:"#f0fdf4",border:"1px solid #86efac",borderRadius:10,padding:"14px 16px",color:"#166534",fontSize:14,marginBottom:16}}>
              ✅ Un email de réinitialisation a été envoyé si votre adresse est connue.
            </div>
            <Btn full onClick={()=>{setForgotMode(false);setForgotSent(false);}}>← Retour à la connexion</Btn>
          </div>
        ) : (
          <div>
            <FL label="Votre email" type="email" value={forgotEmail} set={setForgotEmail} ph="votre@email.com"/>
            <Btn full onClick={handleForgot} disabled={!forgotEmail||forgotLoading} style={{marginTop:16}}>
              {forgotLoading?"Envoi...":"Envoyer le lien de réinitialisation"}
            </Btn>
            <button onClick={()=>setForgotMode(false)} style={{marginTop:12,background:"none",border:"none",color:"#64748b",fontSize:13,cursor:"pointer",width:"100%"}}>← Retour à la connexion</button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={{fontFamily:"Inter,sans-serif",minHeight:"100vh",background:"#f8fafc",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:"#fff",borderRadius:20,padding:"40px 36px",width:"min(420px,100%)",boxShadow:"0 4px 24px #0002"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{width:52,height:52,background:"#2563eb",borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,margin:"0 auto 14px"}}>📚</div>
          <h1 style={{margin:"0 0 4px",fontSize:22,fontWeight:800}}>PédagoGen</h1>
          <p style={{margin:0,color:"#64748b",fontSize:14}}>Connectez-vous à votre espace</p>
        </div>
        <FL label="Email" type="email" value={email} set={setEmail} ph="votre@email.fr"/>
        <div style={{height:10}}/>
        <FL label="Mot de passe" type="password" value={pwd} set={setPwd} ph="••••••••"/>
        {error && <Err>{error}</Err>}
        <Btn full onClick={()=>onLogin(email,pwd)} disabled={!email||!pwd||loading} style={{marginTop:18}}>
          {loading ? "Connexion…" : "Se connecter →"}
        </Btn>
        <button onClick={()=>setForgotMode(true)} style={{marginTop:12,background:"none",border:"none",color:"#2563eb",fontSize:13,cursor:"pointer",width:"100%",textAlign:"center"}}>
          Mot de passe oublié ?
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   2FA
══════════════════════════════════════════════════ */
function TwoFAScreen({onVerify,loading,error,onBack}) {
  const [code,setCode]=useState("");
  return (
    <div style={{fontFamily:"Inter,sans-serif",minHeight:"100vh",background:"#f8fafc",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:"#fff",borderRadius:20,padding:"40px 36px",width:"min(420px,100%)",boxShadow:"0 4px 24px #0002",textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:14}}>🔐</div>
        <h2 style={{margin:"0 0 8px",fontSize:20,fontWeight:800}}>Vérification 2FA</h2>
        <p style={{color:"#64748b",fontSize:14,margin:"0 0 20px"}}>Un code vient d'être envoyé à votre email.</p>
        <FL label="Code à 6 chiffres" value={code} set={setCode} ph="000000"/>
        {error && <Err>{error}</Err>}
        <Btn full onClick={()=>onVerify(code)} disabled={code.length!==6||loading} style={{marginTop:14}}>
          {loading ? "Vérification…" : "Valider"}
        </Btn>
        <button onClick={onBack} style={{marginTop:10,background:"none",border:"none",color:"#64748b",fontSize:13,cursor:"pointer"}}>← Retour</button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   RESET PASSWORD SCREEN
══════════════════════════════════════════════════ */
function ResetPasswordScreen({onReset,onBack}) {
  const params  = new URLSearchParams(window.location.search);
  const token   = params.get("token");
  const userId  = params.get("userId");
  const [pwd,setPwd]     = useState("");
  const [pwd2,setPwd2]   = useState("");
  const [done,setDone]   = useState(false);
  const [loading,setLoading] = useState(false);
  const [err,setErr]     = useState("");

  const handleSubmit = async () => {
    if (pwd !== pwd2) { setErr("Les mots de passe ne correspondent pas."); return; }
    if (pwd.length < 6) { setErr("Le mot de passe doit faire au moins 6 caractères."); return; }
    setLoading(true);
    const ok = await onReset(userId, token, pwd);
    if (ok) setDone(true);
    else setErr("Lien invalide ou expiré. Recommencez.");
    setLoading(false);
  };

  return (
    <div style={{fontFamily:"Inter,sans-serif",minHeight:"100vh",background:"#f8fafc",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:"#fff",borderRadius:20,padding:"40px 36px",width:"min(420px,100%)",boxShadow:"0 4px 24px #0002",textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:14}}>🔑</div>
        <h2 style={{margin:"0 0 20px",fontSize:20,fontWeight:800}}>Nouveau mot de passe</h2>
        {done ? (
          <div>
            <div style={{background:"#f0fdf4",border:"1px solid #86efac",borderRadius:10,padding:"14px 16px",color:"#166534",fontSize:14,marginBottom:16}}>
              ✅ Mot de passe modifié avec succès !
            </div>
            <Btn full onClick={onBack}>← Se connecter</Btn>
          </div>
        ) : (
          <div style={{textAlign:"left"}}>
            <FL label="Nouveau mot de passe" type="password" value={pwd} set={setPwd} ph="••••••••"/>
            <div style={{height:12}}/>
            <FL label="Confirmer le mot de passe" type="password" value={pwd2} set={setPwd2} ph="••••••••"/>
            {err && <Err>{err}</Err>}
            <Btn full onClick={handleSubmit} disabled={!pwd||!pwd2||loading} style={{marginTop:16}}>
              {loading?"Enregistrement...":"Enregistrer le mot de passe"}
            </Btn>
          </div>
        )}
      </div>
    </div>
  );
}
function Dashboard({demands,isClient,isGest,onOpen,onNew,onRefresh}) {
  const [fc,setFc]=useState(""); const [fs,setFs]=useState("");
  const counts = STATUTS.reduce((a,s)=>({...a,[s]:demands.filter(d=>d.statut===s).length}),{});
  const filtered = demands.filter(d=>{
    const q = fc.toLowerCase();
    return (!fc || d.titre?.toLowerCase().includes(q) || d.client?.toLowerCase().includes(q))
      && (!fs || d.statut===fs);
  });
  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22,flexWrap:"wrap",gap:12}}>
        <div>
          <h2 style={{margin:"0 0 4px",fontSize:20}}>{isClient?"Mes formations":"Tableau de bord"}</h2>
          <p style={{margin:0,color:"#64748b",fontSize:14}}>{isClient?"Déposez et suivez vos demandes.":"Gérez et traitez les demandes clients."}</p>
        </div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={onRefresh} style={{padding:"8px 14px",background:"#f1f5f9",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,color:"#64748b",fontWeight:600}}>🔄 Actualiser</button>
          {isClient && onNew && <Btn onClick={onNew}>+ Nouvelle demande</Btn>}
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:"flex",gap:12,marginBottom:24,flexWrap:"wrap"}}>
        {STATUTS.map(s=>{const m=SM[s];return(
          <div key={s} onClick={()=>setFs(f=>f===s?"":s)}
            style={{flex:"1 1 100px",background:"#fff",borderRadius:12,padding:"13px 16px",boxShadow:"0 1px 4px #0001",borderTop:`3px solid ${m.color}`,cursor:"pointer",opacity:fs&&fs!==s?0.4:1,transition:"opacity .15s"}}>
            <div style={{fontSize:22,fontWeight:800,color:m.color}}>{counts[s]||0}</div>
            <div style={{fontSize:11,color:"#64748b",marginTop:2}}>{m.icon} {s}</div>
          </div>
        );})}
      </div>

      {/* Filtres */}
      <div style={{background:"#fff",borderRadius:12,padding:"12px 16px",boxShadow:"0 1px 4px #0001",marginBottom:16,display:"flex",gap:12,flexWrap:"wrap"}}>
        <input value={fc} onChange={e=>setFc(e.target.value)}
          placeholder={isClient?"🔍 Rechercher…":"🔍 Filtrer par client ou formation…"}
          style={{flex:1,padding:"8px 12px",border:"1px solid #e2e8f0",borderRadius:8,fontSize:13,outline:"none",minWidth:160}}/>
        <select value={fs} onChange={e=>setFs(e.target.value)}
          style={{padding:"8px 12px",border:"1px solid #e2e8f0",borderRadius:8,fontSize:13,outline:"none",background:"#fff"}}>
          <option value="">Tous les statuts</option>
          {STATUTS.map(s=><option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Tableau */}
      <div style={{background:"#fff",borderRadius:14,boxShadow:"0 1px 6px #0001",overflow:"hidden"}}>
        {filtered.length===0
          ?<div style={{textAlign:"center",padding:"52px 0",color:"#94a3b8",fontSize:14}}>
            {demands.length===0?"Aucune demande pour l'instant.":"Aucun résultat."}
          </div>
          :<div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead>
                <tr style={{background:"#f8fafc",borderBottom:"2px solid #e2e8f0"}}>
                  {[isGest?"Client":"Formation",isGest?"Formation":"Public","Durée","Docs","Date","Statut",""].map((h,i)=>
                    <th key={i} style={{padding:"11px 14px",textAlign:"left",fontWeight:600,color:"#64748b",whiteSpace:"nowrap"}}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map(d=>{
                  const action = d.statut==="Envoyé au client" && isClient;
                  return (
                    <tr key={d.id}
                      style={{borderBottom:"1px solid #f1f5f9",background:action?"#faf5ff":"",cursor:"pointer"}}
                      onMouseEnter={e=>e.currentTarget.style.background=action?"#f3e8ff":"#f8fafc"}
                      onMouseLeave={e=>e.currentTarget.style.background=action?"#faf5ff":""}>
                      <td style={{padding:"12px 14px",fontWeight:700}}>
                        {isGest ? d.client : d.titre}
                        {action&&<span style={{fontSize:10,background:"#f5f3ff",color:"#8b5cf6",padding:"2px 7px",borderRadius:10,marginLeft:6,fontWeight:700}}>📬 Action requise</span>}
                      </td>
                      <td style={{padding:"12px 14px",color:"#475569"}}>{isGest ? d.titre : d.public}</td>
                      <td style={{padding:"12px 14px",color:"#64748b"}}>{d.duree}h</td>
                      <td style={{padding:"12px 14px"}}><span style={{background:"#eff6ff",color:"#2563eb",fontWeight:700,fontSize:12,padding:"2px 9px",borderRadius:12}}>📎 {d.docs?.length||0}</span></td>
                      <td style={{padding:"12px 14px",color:"#94a3b8"}}>{d.date||new Date(d.created_at).toLocaleDateString("fr-FR")}</td>
                      <td style={{padding:"12px 14px"}}><Badge statut={d.statut}/></td>
                      <td style={{padding:"12px 14px"}}>
                        <button onClick={()=>onOpen(d.id)}
                          style={{padding:"6px 14px",background:"#eff6ff",color:"#2563eb",border:"none",borderRadius:7,cursor:"pointer",fontWeight:700,fontSize:12}}>
                          Ouvrir →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   DEMAND DETAIL
══════════════════════════════════════════════════ */
function DemandDetail({demand,isClient,isGest,onBack,onStatut,onResult,onNote,onGenerate,onRefresh}) {
  const isValidé    = demand.statut==="Validé";
  const canValidate = isClient && demand.statut==="Envoyé au client";
  const hasMatrice  = !!(demand.result && !demand.result.error);
  const [loading,  setLoading]  = useState(false);
  const [manualTab,setManualTab]= useState(null);
  const prevStatus = useRef(demand.statut);

  useEffect(()=>{
    if (demand.statut !== prevStatus.current) {
      prevStatus.current = demand.statut;
      if (hasMatrice && ["Généré","Envoyé au client","Validé"].includes(demand.statut)) {
        setManualTab("matrice");
      }
    }
  },[demand.statut, hasMatrice]);

  const smartDefault = hasMatrice && ["Généré","Envoyé au client","Validé"].includes(demand.statut) ? "matrice" : "docs";
  const available    = ["docs",...(hasMatrice?["matrice"]:[]),"notes"];
  const tab          = (manualTab && available.includes(manualTab)) ? manualTab : smartDefault;

  const generate = async () => {
    setLoading(true);
    try { await onGenerate(demand.id); setManualTab("matrice"); }
    catch(e) { alert(`Erreur : ${e.message}`); }
    setLoading(false);
  };

  const tabs = [
    {key:"docs",    label:`📎 Documents (${demand.docs?.length||0})`},
    ...(hasMatrice?[{key:"matrice",label:"📊 Matrice"+(canValidate?" 🔔":"")}]:[]),
    {key:"notes",   label:`💬 Échanges (${demand.notes?.length||0})`},
  ];

  return (
    <div style={{maxWidth:1020,margin:"0 auto"}}>
      <div style={{display:"flex",gap:12,marginBottom:20,alignItems:"center"}}>
        <button onClick={onBack} style={{padding:"8px 16px",background:"#f1f5f9",border:"none",borderRadius:8,cursor:"pointer",fontWeight:600,fontSize:13}}>← Retour</button>
        <button onClick={onRefresh} style={{padding:"8px 14px",background:"#f1f5f9",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,color:"#64748b",fontWeight:600}}>🔄 Actualiser</button>
      </div>

      {/* Fiche */}
      <div style={{background:"#fff",borderRadius:14,padding:24,boxShadow:"0 1px 6px #0001",marginBottom:16}}>
        <Stepper statut={demand.statut}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:14}}>
          <div>
            <h2 style={{margin:"0 0 4px",fontSize:18}}>{demand.titre}</h2>
            <div style={{fontSize:13,color:"#64748b"}}>
              {isGest&&<><b>{demand.client}</b> · </>}
              🎯 {demand.public} · ⏱️ {demand.duree}h · 🗣️ {demand.ton} · 📅 {demand.date||new Date(demand.created_at).toLocaleDateString("fr-FR")}
            </div>
            <div style={{fontSize:12,color:"#94a3b8",marginTop:3,fontStyle:"italic"}}>{demand.objectif}</div>
          </div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
            {isGest&&demand.statut==="Déposé"           &&<Btn color="#f59e0b" onClick={()=>onStatut(demand.id,"En traitement")}>▶ En traitement</Btn>}
            {isGest&&demand.statut==="En traitement"    &&<Btn color="#2563eb" disabled={loading} onClick={generate}>{loading?"⏳ Génération...":"✨ Générer la matrice"}</Btn>}
            {isGest&&demand.statut==="Généré"           &&<Btn color="#8b5cf6" onClick={()=>onStatut(demand.id,"Envoyé au client")}>📤 Envoyer au client</Btn>}
            {isGest&&demand.statut==="Envoyé au client" &&<Pill color="#8b5cf6" bg="#f5f3ff">⏳ En attente client</Pill>}
            {isGest&&isValidé                           &&<Pill color="#166534" bg="#f0fdf4">✅ Validé par le client</Pill>}
            {canValidate&&<>
              <Btn color="#f59e0b" outline onClick={()=>setManualTab("notes")}>💬 Demander une modif</Btn>
              <Btn color="#10b981" onClick={()=>onStatut(demand.id,"Validé")}>✅ Valider</Btn>
            </>}
            {isClient&&isValidé&&<Pill color="#166534" bg="#f0fdf4">✅ Validée</Pill>}
            {isClient&&!["Envoyé au client","Validé"].includes(demand.statut)&&<Pill color="#64748b" bg="#f1f5f9">{SM[demand.statut]?.icon} {demand.statut}</Pill>}
          </div>
        </div>
      </div>

      {/* Bannière action client */}
      {canValidate&&(
        <div style={{background:"#fffbeb",border:"1px solid #fcd34d",borderRadius:12,padding:"14px 20px",marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
          <div>
            <div style={{fontWeight:700,fontSize:14,color:"#92400e"}}>📬 Votre matrice est prête !</div>
            <div style={{fontSize:13,color:"#78350f",marginTop:2}}>Consultez l'onglet Matrice, puis validez ou demandez des modifications.</div>
          </div>
          <div style={{display:"flex",gap:10}}>
            <Btn color="#f59e0b" outline onClick={()=>setManualTab("notes")}>💬 Demander une modif</Btn>
            <Btn color="#10b981" onClick={()=>onStatut(demand.id,"Validé")}>✅ Valider</Btn>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{display:"flex",borderBottom:"2px solid #e2e8f0",marginBottom:20,background:"#fff",borderRadius:"14px 14px 0 0",padding:"0 8px"}}>
        {tabs.map(t=>(
          <button key={t.key} onClick={()=>setManualTab(t.key)}
            style={{padding:"12px 20px",border:"none",background:"none",cursor:"pointer",fontWeight:tab===t.key?700:400,fontSize:13,color:tab===t.key?"#2563eb":"#64748b",borderBottom:tab===t.key?"2px solid #2563eb":"2px solid transparent",marginBottom:-2}}>
            {t.label}
          </button>
        ))}
      </div>

      {tab==="docs"    && <div style={{background:"#fff",borderRadius:"0 0 14px 14px",padding:24,boxShadow:"0 1px 6px #0001"}}><DocList docs={demand.docs}/></div>}
      {tab==="matrice" && hasMatrice && (
        <MatriceEditor
          result={demand.result}
          locked={isValidé}
          onSave={r => isClient
            ? onResult(demand.id, r, null, true)
            : onResult(demand.id, r, null, false)
          }
        />
      )}
      {tab==="notes"   && <div style={{background:"#fff",borderRadius:"0 0 14px 14px",padding:24,boxShadow:"0 1px 6px #0001"}}><Notes notes={demand.notes} onAdd={txt=>onNote(demand.id,txt)}/></div>}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   NEW DEMAND FORM
══════════════════════════════════════════════════ */
function NewDemandForm({session,onSubmit,onCancel}) {
  const [f,setF]=useState({titre:"",public:"",duree:"",objectif:"",ton:""});
  const [docs,setDocs]=useState([]); const [drag,setDrag]=useState(false);
  const [saving,setSaving]=useState(false);
  const ref=useRef();
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  const valid=Object.values(f).every(Boolean)&&docs.length>0;
  const addFile=file=>{
    if(!file)return;
    const r=new FileReader();
    r.onload=e=>{
      const r2=new FileReader();
      r2.onload=e2=>setDocs(d=>[...d,{name:file.name,size:file.size,fileType:file.type,text:e.target.result||"",dataUrl:e2.target.result||""}]);
      r2.readAsDataURL(file);
    };
    r.readAsText(file);
  };
  const submit = async () => {
    setSaving(true);
    try { await onSubmit({...f, docs}); }
    catch(e){ alert(e.message); }
    setSaving(false);
  };
  return (
    <div style={{maxWidth:720,margin:"0 auto"}}>
      <button onClick={onCancel} style={{marginBottom:20,padding:"8px 16px",background:"#f1f5f9",border:"none",borderRadius:8,cursor:"pointer",fontWeight:600,fontSize:13}}>← Retour</button>
      <h2 style={{margin:"0 0 20px",fontSize:20}}>Nouvelle demande</h2>
      <div style={{background:"#fff",borderRadius:14,padding:24,boxShadow:"0 1px 6px #0001",marginBottom:18}}>
        <h3 style={{margin:"0 0 14px",fontSize:14,fontWeight:700}}>📎 Documents sources</h3>
        <div onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)}
          onDrop={e=>{e.preventDefault();setDrag(false);Array.from(e.dataTransfer.files).forEach(addFile);}}
          onClick={()=>ref.current.click()}
          style={{border:`2px dashed ${drag?"#2563eb":"#cbd5e1"}`,borderRadius:10,padding:22,textAlign:"center",cursor:"pointer",background:drag?"#eff6ff":"#f8fafc"}}>
          <input ref={ref} type="file" accept=".pdf,.docx,.txt" multiple style={{display:"none"}} onChange={e=>Array.from(e.target.files).forEach(addFile)}/>
          <div style={{fontSize:28}}>☁️</div>
          <div style={{fontWeight:500,fontSize:14,marginTop:6}}>Glissez vos fichiers ou cliquez</div>
          <div style={{fontSize:12,color:"#94a3b8",marginTop:4}}>PDF, DOCX, TXT — plusieurs fichiers acceptés</div>
        </div>
        {docs.length>0&&docs.map((d,i)=>(
          <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:8,padding:"8px 12px",marginTop:8}}>
            <span style={{fontSize:13}}>📄 {d.name} <span style={{color:"#94a3b8",fontSize:11}}>({(d.size/1024).toFixed(1)} KB)</span></span>
            <button onClick={e=>{e.stopPropagation();setDocs(d=>d.filter((_,j)=>j!==i));}} style={{background:"none",border:"none",cursor:"pointer",color:"#ef4444",fontSize:16}}>✕</button>
          </div>
        ))}
      </div>
      <div style={{background:"#fff",borderRadius:14,padding:24,boxShadow:"0 1px 6px #0001"}}>
        <h3 style={{margin:"0 0 16px",fontSize:14,fontWeight:700}}>📋 Informations</h3>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <FL label="Titre de la formation" value={f.titre} set={v=>set("titre",v)} ph="Ex : Management agile" st={{gridColumn:"1/-1"}}/>
          <div>
            <label style={{fontSize:12,fontWeight:600,color:"#475569",display:"block",marginBottom:5}}>Public cible</label>
            <select value={f.public} onChange={e=>set("public",e.target.value)} style={{width:"100%",padding:"9px 12px",border:"1px solid #e2e8f0",borderRadius:8,fontSize:13,outline:"none",background:"#f8fafc"}}>
              <option value="">Sélectionner…</option>{PUBLICS.map(p=><option key={p}>{p}</option>)}
            </select>
          </div>
          <FL label="Durée (heures)" type="number" value={f.duree} set={v=>set("duree",v)} ph="Ex : 14"/>
          <FL label="Objectif principal" value={f.objectif} set={v=>set("objectif",v)} ph="Objectif pédagogique…" st={{gridColumn:"1/-1"}}/>
          <div style={{gridColumn:"1/-1"}}>
            <label style={{fontSize:12,fontWeight:600,color:"#475569",display:"block",marginBottom:7}}>Ton souhaité</label>
            <div style={{display:"flex",gap:10}}>{TONS.map(t=><button key={t} onClick={()=>set("ton",t)} style={{flex:1,padding:"9px 0",border:`1.5px solid ${f.ton===t?"#2563eb":"#e2e8f0"}`,borderRadius:8,background:f.ton===t?"#eff6ff":"#f8fafc",color:f.ton===t?"#2563eb":"#64748b",fontWeight:f.ton===t?700:400,fontSize:13,cursor:"pointer"}}>{t}</button>)}</div>
          </div>
        </div>
        <Btn disabled={!valid||saving} full onClick={submit} style={{marginTop:20}}>
          {saving?"Envoi en cours…":"📤 Envoyer ma demande"}
        </Btn>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   ADMIN
══════════════════════════════════════════════════ */
function AdminPage({users,onAdd,onSave,onDel}) {
  const [modal,setModal]=useState(null);
  const gests   = users.filter(u=>u.role==="gestionnaire");
  const clients = users.filter(u=>u.role==="client");
  return (
    <div>
      <h2 style={{margin:"0 0 6px",fontSize:20}}>Administration</h2>
      <p style={{margin:"0 0 24px",color:"#64748b",fontSize:14}}>Gestion des utilisateurs.</p>
      <div style={{display:"flex",gap:14,marginBottom:28,flexWrap:"wrap"}}>
        {[["👑","Admins",users.filter(u=>u.role==="admin").length,"#dc2626"],["🛠️","Gestionnaires",gests.length,"#7c3aed"],["👤","Clients",clients.length,"#2563eb"]].map(([ic,lb,ct,cl])=>(
          <div key={lb} style={{background:"#fff",borderRadius:12,padding:"14px 20px",boxShadow:"0 1px 4px #0001",borderTop:`3px solid ${cl}`,minWidth:130}}>
            <div style={{fontSize:22,fontWeight:800,color:cl}}>{ct}</div>
            <div style={{fontSize:12,color:"#64748b",marginTop:2}}>{ic} {lb}</div>
          </div>
        ))}
      </div>
      <USection title="🛠️ Gestionnaires" users={gests} onEdit={u=>setModal(u)} onDel={onDel} onNew={()=>setModal({role:"gestionnaire"})} newLabel="+ Gestionnaire"/>
      <USection title="👤 Clients" users={clients} onEdit={u=>setModal(u)} onDel={onDel} onNew={()=>setModal({role:"client"})} newLabel="+ Client" extra/>
      {modal&&<UModal user={modal.id?modal:null} role={modal.role||"client"} onSave={async u=>{modal.id?await onSave(u):await onAdd(u);setModal(null);}} onClose={()=>setModal(null)}/>}
    </div>
  );
}
function USection({title,users,onEdit,onDel,onNew,newLabel,extra}) {
  return (
    <div style={{marginBottom:28}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <h3 style={{margin:0,fontSize:15,fontWeight:700}}>{title} <span style={{fontSize:12,color:"#94a3b8",fontWeight:400}}>({users.length})</span></h3>
        <Btn onClick={onNew} style={{fontSize:12,padding:"7px 14px"}}>{newLabel}</Btn>
      </div>
      <div style={{background:"#fff",borderRadius:14,boxShadow:"0 1px 6px #0001",overflow:"hidden"}}>
        {users.length===0?<div style={{padding:"22px 0",textAlign:"center",color:"#94a3b8",fontSize:13}}>Aucun utilisateur.</div>
          :<table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead><tr style={{background:"#f8fafc",borderBottom:"2px solid #e2e8f0"}}>
              {["Nom","Prénom","Email",...(extra?["Entreprise","SIREN"]:[]),""].map(h=><th key={h} style={{padding:"10px 14px",textAlign:"left",fontWeight:600,color:"#64748b"}}>{h}</th>)}
            </tr></thead>
            <tbody>{users.map(u=>(
              <tr key={u.id} style={{borderBottom:"1px solid #f1f5f9"}}>
                <td style={{padding:"10px 14px",fontWeight:600}}>{u.nom}</td>
                <td style={{padding:"10px 14px"}}>{u.prenom}</td>
                <td style={{padding:"10px 14px",color:"#64748b"}}>{u.email}</td>
                {extra&&<><td style={{padding:"10px 14px",color:"#64748b"}}>{u.entreprise}</td><td style={{padding:"10px 14px",color:"#64748b"}}>{u.siren}</td></>}
                <td style={{padding:"10px 14px"}}>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>onEdit(u)} style={{padding:"5px 10px",background:"#eff6ff",color:"#2563eb",border:"none",borderRadius:6,cursor:"pointer",fontWeight:700,fontSize:12}}>✏️</button>
                    <button onClick={()=>{if(window.confirm("Supprimer cet utilisateur ?"))onDel(u.id);}} style={{padding:"5px 10px",background:"#fef2f2",color:"#ef4444",border:"none",borderRadius:6,cursor:"pointer",fontWeight:700,fontSize:12}}>🗑️</button>
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
        }
      </div>
    </div>
  );
}
function UModal({user,role,onSave,onClose}) {
  const isCl=role==="client";
  const [f,setF]=useState({nom:"",prenom:"",email:"",password:"",mobile:"",entreprise:"",siren:"",role,...(user||{})});
  const [saving,setSaving]=useState(false);
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  const valid=f.nom&&f.prenom&&f.email&&(!user||f.password||true)&&(!isCl||(f.mobile&&f.entreprise&&f.siren));
  return (
    <div style={{position:"fixed",inset:0,background:"#0006",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={onClose}>
      <div style={{background:"#fff",borderRadius:16,padding:28,width:"min(500px,100%)",boxShadow:"0 8px 32px #0003"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <h3 style={{margin:0,fontSize:16,fontWeight:700}}>{(user?"Modifier":"Créer")+" — "+(isCl?"Client":"Gestionnaire")}</h3>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#94a3b8"}}>✕</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <FL label="Nom" value={f.nom} set={v=>set("nom",v)}/>
          <FL label="Prénom" value={f.prenom} set={v=>set("prenom",v)}/>
          <FL label="Email" type="email" value={f.email} set={v=>set("email",v)} st={{gridColumn:"1/-1"}}/>
          <FL label={user?"Nouveau mot de passe (laisser vide = inchangé)":"Mot de passe"} type="password" value={f.password} set={v=>set("password",v)} st={{gridColumn:"1/-1"}}/>
          {isCl&&<><FL label="Mobile" value={f.mobile} set={v=>set("mobile",v)}/><FL label="SIREN" value={f.siren} set={v=>set("siren",v)}/><FL label="Entreprise" value={f.entreprise} set={v=>set("entreprise",v)} st={{gridColumn:"1/-1"}}/></>}
        </div>
        <div style={{display:"flex",gap:10,marginTop:20,justifyContent:"flex-end"}}>
          <Btn color="#64748b" onClick={onClose}>Annuler</Btn>
          <Btn disabled={!valid||saving} onClick={async()=>{setSaving(true);await onSave({...f,role});setSaving(false);}}>
            {saving?"Enregistrement…":"💾 Enregistrer"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   PROFIL
══════════════════════════════════════════════════ */
function ProfilePage({user,onSave,onCancel}) {
  const isCl=user.role==="client";
  const [f,setF]=useState({...user,password:""});
  const [saving,setSaving]=useState(false);
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  return (
    <div style={{maxWidth:520,margin:"0 auto"}}>
      <h2 style={{margin:"0 0 20px",fontSize:20}}>Mon profil</h2>
      <div style={{background:"#fff",borderRadius:14,padding:24,boxShadow:"0 1px 6px #0001"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <FL label="Nom" value={f.nom} set={v=>set("nom",v)}/>
          <FL label="Prénom" value={f.prenom} set={v=>set("prenom",v)}/>
          <FL label="Email" type="email" value={f.email} set={v=>set("email",v)} st={{gridColumn:"1/-1"}}/>
          <FL label="Nouveau mot de passe (laisser vide = inchangé)" type="password" value={f.password} set={v=>set("password",v)} st={{gridColumn:"1/-1"}}/>
          {isCl&&<><FL label="Mobile" value={f.mobile||""} set={v=>set("mobile",v)}/><FL label="SIREN" value={f.siren||""} set={v=>set("siren",v)}/><FL label="Entreprise" value={f.entreprise||""} set={v=>set("entreprise",v)} st={{gridColumn:"1/-1"}}/></>}
        </div>
        <div style={{display:"flex",gap:10,marginTop:20,justifyContent:"flex-end"}}>
          <Btn color="#64748b" onClick={onCancel}>Annuler</Btn>
          <Btn disabled={saving} onClick={async()=>{setSaving(true);await onSave(f);setSaving(false);}}>
            {saving?"Enregistrement…":"💾 Enregistrer"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   MATRICE EDITOR
══════════════════════════════════════════════════ */
function MatriceEditor({result,locked,onSave}) {
  const [editing,setEditing]=useState(false); const [draft,setDraft]=useState(null);
  const data=editing?draft:result;
  const sv=(path,val)=>{const d=JSON.parse(JSON.stringify(draft));const k=path.split(".");let c=d;for(let i=0;i<k.length-1;i++)c=c[isNaN(k[i])?k[i]:+k[i]];c[isNaN(k[k.length-1])?k[k.length-1]:+k[k.length-1]]=val;setDraft(d);};
  const inp=(p,v,multi)=>editing
    ?(multi?<textarea value={v} onChange={e=>sv(p,e.target.value)} rows={2} style={{width:"100%",padding:"6px 9px",border:"1px solid #cbd5e1",borderRadius:6,fontSize:12,outline:"none",resize:"vertical",boxSizing:"border-box"}}/>
           :<input value={v} onChange={e=>sv(p,e.target.value)} style={{width:"100%",padding:"5px 9px",border:"1px solid #cbd5e1",borderRadius:6,fontSize:12,outline:"none",boxSizing:"border-box"}}/>)
    :<span style={{fontSize:13,color:"#475569"}}>{v}</span>;
  if(result.error) return <div style={{background:"#fff",borderRadius:14,padding:24,boxShadow:"0 1px 6px #0001"}}><p style={{color:"#ef4444",margin:0}}>{result.error}</p></div>;
  return (
    <div>
      <div style={{display:"flex",justifyContent:"flex-end",marginBottom:14}}>
        {locked?<div style={{padding:"8px 16px",background:"#f0fdf4",border:"1px solid #86efac",borderRadius:9,fontSize:13,fontWeight:700,color:"#166534"}}>🔒 Matrice verrouillée</div>
          :editing?<div style={{display:"flex",gap:10}}><Btn color="#10b981" onClick={()=>{onSave(draft);setEditing(false);setDraft(null);}}>💾 Enregistrer</Btn><Btn color="#64748b" onClick={()=>{setEditing(false);setDraft(null);}}>Annuler</Btn></div>
          :<Btn color="#f59e0b" onClick={()=>{setDraft(JSON.parse(JSON.stringify(result)));setEditing(true);}}>✏️ Modifier</Btn>}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:18}}>
        <div style={{background:"#fff",borderRadius:14,padding:22,boxShadow:"0 1px 6px #0001"}}>
          <h3 style={{margin:"0 0 14px",fontSize:15,fontWeight:700,color:"#2563eb"}}>🎯 Objectifs généraux</h3>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12}}>
            {data.objectifs_generaux?.map((o,i)=>(
              <div key={i} style={{background:"#eff6ff",borderRadius:10,padding:"14px 16px",borderLeft:"4px solid #2563eb"}}>
                <div style={{marginBottom:6,fontWeight:600}}>{inp(`objectifs_generaux.${i}.titre`,o.titre)}</div>
                <div>{inp(`objectifs_generaux.${i}.description`,o.description,true)}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{background:"#fff",borderRadius:14,padding:22,boxShadow:"0 1px 6px #0001"}}>
          <h3 style={{margin:"0 0 14px",fontSize:15,fontWeight:700,color:"#7c3aed"}}>📐 Objectifs pédagogiques</h3>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead><tr style={{background:"#f5f3ff"}}>{["Code","Intitulé","Niveau Bloom","Modalité"].map(h=><th key={h} style={{padding:"10px 14px",textAlign:"left",fontWeight:700,color:"#7c3aed",borderBottom:"2px solid #e2e8f0",whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
              <tbody>{data.objectifs_pedagogiques?.map((op,i)=>(
                <tr key={i} style={{borderBottom:"1px solid #f1f5f9"}}>
                  <td style={{padding:"10px 14px"}}><span style={{background:"#f5f3ff",color:"#7c3aed",fontWeight:700,fontSize:12,padding:"3px 8px",borderRadius:6}}>{inp(`objectifs_pedagogiques.${i}.code`,op.code)}</span></td>
                  <td style={{padding:"10px 14px"}}>{inp(`objectifs_pedagogiques.${i}.intitule`,op.intitule)}</td>
                  <td style={{padding:"10px 14px"}}>{inp(`objectifs_pedagogiques.${i}.niveau_bloom`,op.niveau_bloom)}</td>
                  <td style={{padding:"10px 14px"}}>{inp(`objectifs_pedagogiques.${i}.modalite`,op.modalite)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
        <div style={{background:"#fff",borderRadius:14,padding:22,boxShadow:"0 1px 6px #0001"}}>
          <h3 style={{margin:"0 0 14px",fontSize:15,fontWeight:700,color:"#059669"}}>🗂️ Programme détaillé</h3>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead><tr style={{background:"#f0fdf4"}}>{["Module","Durée","Contenu","Méthodes"].map(h=><th key={h} style={{padding:"10px 14px",textAlign:"left",fontWeight:700,color:"#059669",borderBottom:"2px solid #e2e8f0",whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
              <tbody>{data.programme?.map((m,i)=>(
                <tr key={i} style={{borderBottom:"1px solid #f1f5f9",verticalAlign:"top"}}>
                  <td style={{padding:"11px 14px",fontWeight:700}}>{inp(`programme.${i}.module`,m.module)}</td>
                  <td style={{padding:"11px 14px",whiteSpace:"nowrap"}}>{inp(`programme.${i}.duree`,m.duree)}</td>
                  <td style={{padding:"11px 14px"}}>{editing?<textarea value={Array.isArray(m.contenu)?m.contenu.join("\n"):m.contenu} onChange={e=>sv(`programme.${i}.contenu`,e.target.value.split("\n"))} rows={3} style={{width:"100%",padding:"6px 9px",border:"1px solid #cbd5e1",borderRadius:6,fontSize:12,outline:"none",resize:"vertical",boxSizing:"border-box"}}/>:<ul style={{margin:0,paddingLeft:16}}>{(Array.isArray(m.contenu)?m.contenu:[m.contenu]).map((c,j)=><li key={j} style={{color:"#475569",marginBottom:3,lineHeight:1.5}}>{c}</li>)}</ul>}</td>
                  <td style={{padding:"11px 14px"}}>{inp(`programme.${i}.methodes`,m.methodes)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   NOTES & DOCS
══════════════════════════════════════════════════ */
function Notes({notes,onAdd}) {
  const [text,setText]=useState("");
  return (
    <div>
      <div style={{display:"flex",gap:10,marginBottom:18}}>
        <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Écrire un message…" rows={2} style={{flex:1,padding:"9px 12px",border:"1px solid #e2e8f0",borderRadius:8,fontSize:13,outline:"none",resize:"vertical"}}/>
        <Btn disabled={!text.trim()} onClick={()=>{onAdd(text);setText("");}}>Envoyer</Btn>
      </div>
      {(!notes||!notes.length)?<div style={{textAlign:"center",padding:"22px 0",color:"#94a3b8",fontSize:13}}>Aucun message.</div>
        :[...notes].reverse().map(n=>{const t=n.author==="Équipe";return(
          <div key={n.id} style={{background:t?"#eff6ff":"#f0fdf4",borderRadius:9,padding:"12px 16px",borderLeft:`3px solid ${t?"#2563eb":"#10b981"}`,marginBottom:10}}>
            <div style={{fontSize:12,fontWeight:700,color:t?"#2563eb":"#10b981",marginBottom:4}}>{t?"🛠️ Équipe":"👤 Client"}</div>
            <div style={{fontSize:13,color:"#1e293b",lineHeight:1.6}}>{n.text}</div>
            <div style={{fontSize:11,color:"#94a3b8",marginTop:4}}>{n.date}</div>
          </div>);})}
    </div>
  );
}

function DocList({docs,demandId,statut,isClient,onDelete}) {
  const [preview,setPreview]=useState(null);
  const canDelete = isClient && !["Envoyé au client","Validé"].includes(statut);
  if(!docs||!docs.length) return <div style={{color:"#94a3b8",fontSize:13}}>Aucun document.</div>;
  return (<>
    {preview&&<div style={{position:"fixed",inset:0,background:"#0007",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setPreview(null)}>
      <div style={{background:"#fff",borderRadius:16,width:"min(860px,95vw)",maxHeight:"90vh",display:"flex",flexDirection:"column",overflow:"hidden"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",borderBottom:"1px solid #e2e8f0"}}>
          <span style={{fontWeight:700,fontSize:14}}>📄 {preview.name}</span>
          <div style={{display:"flex",gap:10}}>
            {preview.dataUrl&&<a href={preview.dataUrl} download={preview.name} style={{padding:"6px 14px",background:"#eff6ff",color:"#2563eb",borderRadius:7,fontWeight:700,fontSize:12,textDecoration:"none"}}>⬇️</a>}
            <button onClick={()=>setPreview(null)} style={{padding:"6px 12px",background:"#f1f5f9",border:"none",borderRadius:7,cursor:"pointer",fontWeight:700}}>✕</button>
          </div>
        </div>
        <div style={{flex:1,overflow:"auto",padding:20}}>
          {preview.text
            ?<pre style={{margin:0,fontSize:13,color:"#475569",lineHeight:1.7,whiteSpace:"pre-wrap",fontFamily:"monospace"}}>{preview.text}</pre>
            :<div style={{color:"#94a3b8",textAlign:"center",padding:40}}>
              <div style={{fontSize:40,marginBottom:12}}>📄</div>
              <div style={{fontSize:14,marginBottom:8}}>Aperçu non disponible pour ce format.</div>
              {preview.dataUrl&&<a href={preview.dataUrl} download={preview.name} style={{padding:"8px 16px",background:"#eff6ff",color:"#2563eb",borderRadius:7,fontWeight:700,fontSize:13,textDecoration:"none",display:"inline-block"}}>⬇️ Télécharger le fichier</a>}
            </div>
          }
        </div>
      </div>
    </div>}
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
      <span style={{background:"#2563eb",color:"#fff",borderRadius:20,padding:"2px 10px",fontSize:12,fontWeight:700}}>{docs.length}</span>
      <span style={{fontSize:13,color:"#64748b"}}>document{docs.length>1?"s":""}</span>
    </div>
    {docs.map((d,i)=>(
      <div key={d.id||i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:9,padding:"10px 14px",marginBottom:8}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:20}}>{d.fileType==="application/pdf"?"📕":"📄"}</span>
          <div>
            <div style={{fontSize:13,fontWeight:600}}>{d.name}</div>
            <div style={{fontSize:11,color:"#94a3b8"}}>{d.size?(d.size/1024).toFixed(1)+" KB":""}</div>
          </div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setPreview(d)} style={{padding:"5px 12px",background:"#eff6ff",color:"#2563eb",border:"none",borderRadius:7,fontWeight:700,fontSize:12,cursor:"pointer"}}>👁 Voir</button>
          {d.dataUrl&&<a href={d.dataUrl} download={d.name} style={{padding:"5px 12px",background:"#f0fdf4",color:"#10b981",borderRadius:7,fontWeight:700,fontSize:12,textDecoration:"none"}}>⬇️</a>}
          {canDelete&&onDelete&&<button onClick={()=>onDelete(d.id,demandId)} style={{padding:"5px 12px",background:"#fef2f2",color:"#ef4444",border:"none",borderRadius:7,fontWeight:700,fontSize:12,cursor:"pointer"}}>🗑️</button>}
        </div>
      </div>
    ))}
  </>);
}

/* ══════════════════════════════════════════════════
   UI ATOMS
══════════════════════════════════════════════════ */
function Badge({statut}){const m=SM[statut]||{};return <span style={{padding:"4px 11px",borderRadius:20,background:m.bg,color:m.color,fontWeight:700,fontSize:11,whiteSpace:"nowrap"}}>{m.icon} {statut}</span>;}
function Pill({children,color,bg}){return <span style={{padding:"9px 16px",background:bg,color,borderRadius:9,fontWeight:700,fontSize:13}}>{children}</span>;}
function Btn({children,onClick,disabled,color="#2563eb",outline=false,full=false,style={}}){return <button onClick={onClick} disabled={disabled} style={{padding:"9px 18px",background:disabled?"#cbd5e1":outline?"#fff":color,color:disabled?"#fff":outline?color:"#fff",border:outline?`1.5px solid ${color}`:"none",borderRadius:9,fontWeight:700,fontSize:13,cursor:disabled?"not-allowed":"pointer",width:full?"100%":"auto",...style}}>{children}</button>;}
function HBtn({children,onClick,active}){return <button onClick={onClick} style={{padding:"7px 14px",background:active?"#eff6ff":"#f1f5f9",border:"none",borderRadius:8,cursor:"pointer",fontWeight:600,fontSize:13,color:active?"#2563eb":"#64748b"}}>{children}</button>;}
function FL({label,type="text",value,set,ph="",st={}}){return(
  <div style={st}>
    {label&&<label style={{fontSize:12,fontWeight:600,color:"#475569",display:"block",marginBottom:5}}>{label}</label>}
    <input type={type} value={value} onChange={e=>set(e.target.value)} placeholder={ph} style={{width:"100%",padding:"9px 12px",border:"1px solid #e2e8f0",borderRadius:8,fontSize:13,outline:"none",boxSizing:"border-box",background:"#f8fafc"}}/>
  </div>
);}
function Err({children}){return <div style={{color:"#ef4444",fontSize:13,marginTop:10,padding:"8px 12px",background:"#fef2f2",borderRadius:8}}>{children}</div>;}
function Stepper({statut}){
  const cur=STATUTS.indexOf(statut);
  return(<div style={{display:"flex",alignItems:"center",marginBottom:22}}>
    {STATUTS.map((s,i)=>{const done=i<cur,active=i===cur,m=SM[s];return(
      <div key={s} style={{display:"flex",alignItems:"center",flex:i<STATUTS.length-1?1:0}}>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
          <div style={{width:30,height:30,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",background:active?m.color:done?"#e2e8f0":"#f1f5f9",color:active?"#fff":done?"#64748b":"#cbd5e1",fontSize:active?13:11,fontWeight:700}}>{done?"✓":m.icon}</div>
          <span style={{fontSize:9,color:active?m.color:"#94a3b8",fontWeight:active?700:400,whiteSpace:"nowrap",maxWidth:68,textAlign:"center"}}>{s}</span>
        </div>
        {i<STATUTS.length-1&&<div style={{flex:1,height:2,background:i<cur?"#cbd5e1":"#f1f5f9",margin:"0 3px",marginBottom:14}}/>}
      </div>
    );})}
  </div>);
}