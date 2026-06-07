/* ===========================================================================
   chatbot.js — Widget de cotización "Cot" COMPARTIDO para todo el sitio.
   Extraído 1:1 del bot en producción de la home (mismo flujo, mismo /api/lead).
   Uso: <script src="/chatbot.js" defer></script>  (lo inyecta functions/_middleware.js)
   - Se auto-inyecta su CSS + HTML.
   - Engancha TODOS los CTA de WhatsApp de la página para que abran el chatbot
     (excepto el botón final dentro del propio chat).
   - Si la página ya trae el bot inline (la home), no se duplica.
   =========================================================================== */
(function(){
  if (window.__cotLoaded) return;
  window.__cotLoaded = true;
  // La home ya incluye el bot inline. Si el panel ya existe, no dupliques.
  if (document.getElementById('cot-panel')) return;

  /* --- inyecta CSS --- */
  var __style = document.createElement('style');
  __style.textContent = `
  /* El chatbot REEMPLAZA al sticky CTA del template: evita la doble barra fija abajo (TODAS las variantes del sitio) */
  #stickyBar,#stickyCta,#sticky,.sticky,.sticky-bar,.sticky-cta,.sticky-cta-bar{display:none!important}
  #cot-launcher,#cot-panel{--brand:#139D45;--brand-dark:#0a7a2e;--bot-text:#0f172a;--user-bg:#139D45;
    font-family:'Inter',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;}
  #cot-launcher *,#cot-panel *{box-sizing:border-box}

  #cot-launcher{
    position:fixed;left:0;right:0;bottom:0;z-index:990;
    padding:0 16px calc(18px + env(safe-area-inset-bottom, 0px));cursor:pointer;
    transform:translateY(150%);
    transition:transform .4s cubic-bezier(.22,1,.36,1);
  }
  #cot-launcher.lc-show{transform:translateY(0)}
  #cot-launcher.lc-hidden{transform:translateY(170%)}
  #cot-launcher .lc-inner{
    max-width:880px;margin:0 auto;display:flex;align-items:center;gap:22px;
    background:#fff;border:1px solid #eef2f6;border-radius:20px;
    padding:18px 26px;box-shadow:0 16px 44px rgba(2,6,23,.16);
  }
  #cot-launcher .avatar{
    width:48px;height:48px;border-radius:50%;flex:none;position:relative;
    display:grid;place-items:center;background:#f0fdf4;color:#0f172a;border:1px solid #dcfce7;
  }
  #cot-launcher .avatar svg{width:24px;height:24px}
  #cot-launcher .avatar .dot{position:absolute;bottom:2px;right:2px;width:11px;height:11px;
    background:#22c55e;border:2px solid #fff;border-radius:50%;}
  #cot-launcher .avatar .dot::after{content:"";position:absolute;inset:-2px;border-radius:50%;
    border:2px solid #22c55e;animation:lc-ping 1.8s ease-out infinite;}
  @keyframes lc-ping{0%{transform:scale(1);opacity:.7}100%{transform:scale(2.4);opacity:0}}
  #cot-launcher .txt{text-align:left;flex:1;min-width:0}
  #cot-launcher .txt strong{display:block;font-size:21px;font-weight:800;color:#0f172a;line-height:1.25;letter-spacing:-.02em}
  #cot-launcher .txt strong em{font-style:normal;color:var(--brand)}
  #cot-launcher .txt span{display:block;font-size:14.5px;color:#64748b;margin-top:5px}
  #cot-launcher .cta{
    display:inline-flex;align-items:center;gap:9px;white-space:nowrap;flex:none;
    background:linear-gradient(135deg,var(--brand),var(--brand-dark));color:#fff;border:none;
    font-family:inherit;font-weight:700;font-size:15.5px;letter-spacing:-.01em;
    padding:15px 26px;border-radius:14px;cursor:pointer;
    box-shadow:0 8px 22px rgba(19,157,69,.38);
    transition:transform .18s ease, box-shadow .18s ease;
    animation:lc-attn 2.8s ease-in-out infinite;
  }
  #cot-launcher .cta svg{width:18px;height:18px;transition:transform .18s ease}
  #cot-launcher:hover .cta{transform:translateY(-2px);box-shadow:0 12px 30px rgba(19,157,69,.48)}
  #cot-launcher:hover .cta svg{transform:translateX(3px)}
  @keyframes lc-attn{0%,92%,100%{box-shadow:0 8px 22px rgba(19,157,69,.38)}96%{box-shadow:0 8px 22px rgba(19,157,69,.38),0 0 0 8px rgba(19,157,69,.12)}}
  @media(max-width:560px){
    #cot-launcher{padding:0 10px calc(10px + env(safe-area-inset-bottom, 0px))}
    #cot-launcher .lc-inner{gap:12px;padding:12px 14px;border-radius:16px}
    #cot-launcher .avatar{display:none}
    #cot-launcher .txt{flex:1;min-width:0}
    #cot-launcher .txt strong{font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    #cot-launcher .txt span{display:none}
    #cot-launcher .cta{padding:14px 18px;font-size:15px;min-height:48px}
    #cot-launcher .cta svg{display:inline}
  }

  #cot-panel{
    position:fixed;right:20px;bottom:20px;z-index:9999;
    width:380px;max-width:calc(100vw - 24px);height:560px;max-height:calc(100vh - 40px);
    background:#fff;border-radius:18px;box-shadow:0 18px 50px rgba(2,6,23,.22);
    display:none;flex-direction:column;overflow:hidden;animation:cotpop .28s cubic-bezier(.16,1,.3,1);
  }
  #cot-panel.open{display:flex}
  @keyframes cotpop{from{opacity:0;transform:translateY(24px) scale(.97)}to{opacity:1;transform:none}}
  #cot-panel .cot-header{background:linear-gradient(135deg,var(--brand),var(--brand-dark));
    color:#fff;padding:16px 18px;display:flex;align-items:center;gap:12px;}
  #cot-panel .cot-header .avatar{width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.2);
    display:grid;place-items:center;flex:none}
  #cot-panel .cot-header .avatar svg{width:22px;height:22px}
  #cot-panel .cot-header h3{font-size:15px;font-weight:700;line-height:1.2;margin:0}
  #cot-panel .cot-header p{font-size:12px;opacity:.85;display:flex;align-items:center;gap:5px;margin:0}
  #cot-panel .cot-header p::before{content:"";width:8px;height:8px;background:#4ade80;border-radius:50%;display:inline-block}
  #cot-panel .cot-header .close{margin-left:auto;background:none;border:none;color:#fff;font-size:24px;cursor:pointer;opacity:.8;line-height:1}
  #cot-panel .cot-header .close:hover{opacity:1}
  #cot-panel .cot-body{flex:1;overflow-y:auto;padding:20px 16px;background:#fff;display:flex;flex-direction:column;gap:14px;position:relative}
  #cot-panel .msg{max-width:80%;padding:11px 15px;font-size:14.5px;line-height:1.5;border-radius:18px;word-wrap:break-word;animation:cotfade .3s ease}
  @keyframes cotfade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
  #cot-panel .msg.user{align-self:flex-end;background:var(--user-bg);color:#fff;border-bottom-right-radius:5px;box-shadow:0 4px 12px rgba(19,157,69,.22)}
  #cot-panel .msg-row{display:flex;align-items:flex-end;gap:9px;align-self:flex-start;max-width:90%;animation:cotfade .3s ease}
  #cot-panel .ai-av{width:30px;height:30px;border-radius:50%;flex:none;
    background:linear-gradient(135deg,#22c55e,#15803d);color:#fff;
    display:grid;place-items:center;box-shadow:0 3px 8px rgba(19,157,69,.3);margin-bottom:2px;}
  #cot-panel .ai-av svg{width:17px;height:17px}
  #cot-panel .msg-row .msg.bot{background:#f6f8fa;color:var(--bot-text);border:1px solid #eef2f6;
    border-bottom-left-radius:5px;animation:none;max-width:none;}
  #cot-panel .msg-row .typing{background:#f6f8fa;border:1px solid #eef2f6;padding:13px 14px;border-radius:18px;border-bottom-left-radius:5px;display:flex;gap:4px}
  #cot-panel .typing span{width:7px;height:7px;background:#94a3b8;border-radius:50%;animation:cotblink 1.2s infinite}
  #cot-panel .typing span:nth-child(2){animation-delay:.2s}#cot-panel .typing span:nth-child(3){animation-delay:.4s}
  @keyframes cotblink{0%,60%,100%{opacity:.3}30%{opacity:1}}
  #cot-panel .cot-chips{display:flex;flex-wrap:wrap;gap:8px;align-self:flex-start;max-width:90%}
  #cot-panel .cot-chips button{background:#fff;border:1.5px solid var(--brand);color:var(--brand);
    padding:8px 14px;border-radius:999px;font-size:13px;font-weight:600;cursor:pointer;transition:.15s;font-family:inherit;}
  #cot-panel .cot-chips button:hover{background:var(--brand);color:#fff}
  #cot-panel .cot-chips button.on{background:var(--brand);color:#fff;box-shadow:0 4px 12px rgba(19,157,69,.3)}
  #cot-panel .cot-chips button.on::before{content:"✓ ";font-weight:700}
  #cot-panel .cot-continue{margin-top:12px;width:100%;background:var(--brand);color:#fff;border:none;
    padding:12px;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;}
  #cot-panel .cot-continue:hover{background:var(--brand-dark)}
  #cot-panel .cot-input{display:flex;gap:8px;padding:12px;border-top:1px solid #e2e8f0;background:#fff}
  #cot-panel .cot-input input{flex:1;border:1.5px solid #e2e8f0;border-radius:999px;padding:11px 16px;font-size:14px;font-family:inherit;outline:none}
  #cot-panel .cot-input input:focus{border-color:var(--brand)}
  #cot-panel .cot-input button{background:var(--brand);border:none;width:44px;height:44px;border-radius:50%;cursor:pointer;flex:none;display:grid;place-items:center}
  #cot-panel .cot-input button svg{width:20px;height:20px;fill:#fff}
  #cot-panel .cot-final{padding:14px 16px;border-top:1px solid #e2e8f0;background:#fff}
  #cot-panel .cot-final a{display:flex;align-items:center;justify-content:center;gap:10px;
    background:#25D366;color:#fff;text-decoration:none;font-weight:700;font-size:15px;
    padding:14px;border-radius:12px;box-shadow:0 8px 20px rgba(37,211,102,.35)}
  #cot-panel .cot-final a svg{width:22px;height:22px;fill:#fff}
  @media(max-width:600px){
    /* chat a pantalla completa REAL en móvil (100dvh evita que la barra del navegador lo corte) */
    #cot-panel{right:0;left:0;bottom:0;top:0;width:100vw;max-width:none;height:100dvh;max-height:100dvh;border-radius:0;animation:none}
    #cot-panel .cot-header{padding-top:calc(16px + env(safe-area-inset-top, 0px))}
    /* input ≥16px evita el auto-zoom de iOS al enfocar */
    #cot-panel .cot-input{padding:12px 12px calc(12px + env(safe-area-inset-bottom, 0px))}
    #cot-panel .cot-input input{font-size:16px}
    #cot-panel .cot-final{padding-bottom:calc(14px + env(safe-area-inset-bottom, 0px))}
  }
`;
  document.head.appendChild(__style);

  /* --- inyecta HTML (launcher + panel) --- */
  var __wrap = document.createElement('div');
  __wrap.innerHTML = `
<div id="cot-launcher" onclick="Cot.open()">
  <div class="lc-inner">
    <div class="avatar">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      <span class="dot"></span>
    </div>
    <div class="txt">
      <strong>¿Estás por construir una <em>cancha deportiva</em>?</strong>
      <span>Recibe una propuesta personalizada para tu proyecto.</span>
    </div>
    <button class="cta">
      Recibir propuesta
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
    </button>
  </div>
</div>

<!-- PANEL CHAT -->
<div id="cot-panel">
  <div class="cot-header">
    <div class="avatar"><svg viewBox="0 0 24 24" fill="#fff"><path d="M12 2l1.6 4.3L18 8l-4.4 1.7L12 14l-1.6-4.3L6 8l4.4-1.7z"/><circle cx="18.5" cy="16.5" r="2.2"/><circle cx="6" cy="17" r="1.5"/></svg></div>
    <div>
      <h3>Asistente de cotizaciones</h3>
      <p>Responde al instante</p>
    </div>
    <button class="close" onclick="Cot.close()">&times;</button>
  </div>
  <div class="cot-body" id="cot-body"></div>
  <div id="cot-controls"></div>
</div>
`;
  while (__wrap.firstChild) document.body.appendChild(__wrap.firstChild);

  /* --- lógica del bot (idéntica a la home) --- */
const Cot = (function(){
  // MULTI-TENANT: si el chatbot vive en otro dominio (gradasdefutbol.mx, etc.)
  // las APIs siguen corriendo en canchadefutbol7.mx. Detectamos host y usamos
  // URLs absolutas cross-origin cuando hace falta.
  const __HOST = (location.hostname || '').toLowerCase();
  const __IS_PRIMARY = /(^|\.)canchadefutbol7\./.test(__HOST);
  const __ORIGIN = __IS_PRIMARY ? '' : 'https://canchadefutbol7.mx';
  const CONFIG = {
    whatsapp: "525539887615",   // número del negocio (mismo que los CTA del sitio)
    empresa: "Sportmaster",
    domain: __HOST,             // multi-tenant: dominio donde corre el chatbot
    leadApi: __ORIGIN + "/api/lead",       // guarda el lead en D1 → Panel de Leads
    botConfigApi: __ORIGIN + "/api/bot-config"  // config dinámica del bot por (domain, URL)
  };

  // Atribución de marketing: URL de origen, campaña y CID/gclid (Google Ads)
  function atribucion(){
    try{
      const p = new URLSearchParams(location.search);
      const gclid = p.get('gclid') || p.get('gbraid') || p.get('wbraid') || p.get('cid') || '';
      const source = p.get('utm_source') || p.get('src') || '';
      const medium = p.get('utm_medium') || '';
      const camp = p.get('utm_campaign') || p.get('campaign') || '';
      const ref = document.referrer || '';
      // campaña legible: utm_campaign, o fuente/medio, o referido, o "directo"
      let campania = camp || [source, medium].filter(Boolean).join(' / ');
      if(!campania){
        try{ campania = ref ? new URL(ref).hostname.replace(/^www\./,'') : 'directo'; }
        catch(_){ campania = 'directo'; }
      }
      return { url: location.href, gclid: gclid, campania: campania.slice(0,120) };
    }catch(e){ return { url: location.href, gclid:'', campania:'directo' }; }
  }

  // session_id estable para toda la conversación (parcial → completo = misma fila)
  let SID = null;
  function sid(){ if(!SID) SID = "bot-" + Date.now() + "-" + Math.floor(Math.random()*1e6); return SID; }

  // Guarda el lead en el MISMO panel que usa tu formulario (Cloudflare D1).
  // estado "parcial" = apenas tenemos contacto · "completo" = terminó.
  // Se llama 2 veces con el mismo session_id → el endpoint ACTUALIZA, no duplica.
  // Debounced saveLead: máx 1 guardado cada 1.5 seg para no martillar la API.
  let _saveT = null, _savePending = null;
  function saveLeadDebounced(d, estado){
    _savePending = { d: Object.assign({}, d), estado };
    if (_saveT) return;
    _saveT = setTimeout(() => {
      const p = _savePending; _savePending = null; _saveT = null;
      if (p) saveLead(p.d, p.estado);
    }, 1500);
  }
  // Arma una línea legible para el panel con TODOS los pasos respondidos del bot.
  // Bot dinámico (Bancas/Porterías/etc.) → "Tipo: Bancas · Set: ... · Cancha: ..."
  // Bot genérico (Canchas) → mantiene el formato original "Tipo: ... · Accesorios: ..."
  function armarComentarios(d){
    if (BOT_CTX && BOT_CTX.botName){
      const partes = ['Tipo: ' + BOT_CTX.botName];
      const omitir = new Set(['nombre','whatsapp','ciudad']); // estos viajan en su columna propia
      const labels = { set:'Set', tipo:'Cancha', techo:'Techo', capacidad:'Capacidad',
                       timeline:'Inicio', medidas:'Medidas', accesorios:'Accesorios',
                       tiempo:'Inicio' };
      try {
        steps.forEach(s => {
          if (omitir.has(s.key)) return;
          const v = d[s.key];
          if (v && String(v).trim()) partes.push((labels[s.key] || s.key) + ': ' + String(v).trim());
        });
      } catch(e){}
      return partes.join(' · ');
    }
    return `Tipo: ${d.tipo||'-'} · Accesorios: ${d.accesorios||'-'}`;
  }
  function saveLead(d, estado){
    try{
      const a = atribucion();
      fetch(CONFIG.leadApi, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        keepalive:true,
        body: JSON.stringify({
          session_id: sid(),
          estado: estado || "completo",
          domain: CONFIG.domain,  // multi-tenant: identifica empresa por dominio
          fuente: (BOT_CTX && BOT_CTX.fuenteLabel) || "Chatbot",
          nombre: d.nombre || "",
          whatsapp: (d.whatsapp && d.whatsapp !== "No lo dejó") ? d.whatsapp : "No lo dejó",
          ciudad: d.ciudad || "",
          m2: d.medidas || d.capacidad || "",
          timeline: d.timeline || d.tiempo || "",
          url: a.url,
          gclid: a.gclid,
          campania: a.campania,
          comentarios: armarComentarios(d)
        })
      });
    }catch(e){}
  }

  // ───────────────────────────────────────────────────────────────
  // STEPS: por defecto el bot GENÉRICO de canchas. Se PUEDE sobreescribir
  // por el bot contextual de la URL (cargado desde /api/bot-config).
  // Si la carga falla -> nos quedamos con este genérico. CERO rompimiento.
  // ───────────────────────────────────────────────────────────────
  let steps = [
    { key:"tipo", bot:"¡Hola! 👋 Soy tu asesor. ¿Qué tipo de cancha estás buscando?",
      type:"chips", options:["Fútbol 7","Fútbol soccer","Fútbol americano","Fútbol rápido","Tochito","Pádel","Residencial","Otra"],
      other:"Otra", otherBot:"¡Claro! Cuéntame, ¿qué tipo de cancha necesitas?", otherPh:"Ej. pádel, multideporte, beisbol…" },
    { key:"ciudad", bot:"¿En qué ciudad o delegación se instalará la cancha?", type:"text", ph:"Ej. Cancún, Q. Roo" },
    { key:"nombre", bot:"Perfecto, ¿a nombre de quién preparo la cotización?", type:"text", ph:"Tu nombre" },
    { key:"tiempo", bot:"¿En qué tiempo quieres comenzar tu proyecto?",
      type:"chips", options:["Lo antes posible","Este año","Solo cotizando"] },
    { key:"whatsapp", bot:(d)=>`${(d.nombre||'').split(' ')[0]} ¿a qué WhatsApp te enviamos la cotización?`, type:"text", ph:"10 dígitos — o escríbeme por aquí", validate:"phone", optional:true, skip:"No lo dejó" },
    { key:"medidas", bot:"¿Conoces las medidas o m² del terreno? (si no, lo vemos juntos)", type:"text", ph:"Ej. 25 × 45 m — o escribe \"no sé\"", optional:true, skip:"No sé" },
    { key:"accesorios", bot:(d)=> d.tipo==='Residencial' ? '¡Listo! 🌿 Tu proyecto de área verde está listo para cotizar.' : '¿Quieres incluir accesorios en la cotización? Marca los que te interesen 👇',
      type:"multi", options:["Porterías","Gradas","Alumbrado","Bancas jugadores"], done:"Continuar", none:"Solo la cancha" }
  ];
  let BOT_CTX = null;        // { botName, fuenteLabel, teaserTitulo, teaserSub } si hay config dinámica
  let CTX_LOADED = false;    // bandera: ya intentamos cargar config

  // Carga config del bot según URL actual. Si recibe pasos válidos -> los usa.
  // Si NO -> deja steps genérico intacto. Cualquier error es silencioso.
  // Aplica los textos del bot contextual al launcher (botón flotante).
  // Selectores ROBUSTOS basados en la estructura real del HTML:
  //   <strong>¿Título?</strong>  → cambia con teaserTitulo
  //   <span>Subtítulo</span>     → cambia con teaserSub
  //   <button class="cta">CTA</button> → cambia con cta
  // Reintenta hasta 6 veces (cada 250ms) por si el launcher aún no se montó.
  function aplicarTeaser(){
    if (!BOT_CTX) return;
    let intentos = 0;
    const tick = () => {
      const launcher = document.getElementById('cot-launcher');
      if (!launcher){ if (intentos++ < 6) return setTimeout(tick, 250); return; }
      try {
        if (BOT_CTX.teaserTitulo){
          const t = launcher.querySelector('.txt strong, strong');
          if (t) t.innerHTML = BOT_CTX.teaserTitulo;
        }
        if (BOT_CTX.teaserSub){
          const s = launcher.querySelector('.txt span, span:not(.dot)');
          if (s) s.textContent = BOT_CTX.teaserSub;
        }
        if (BOT_CTX.cta){
          const c = launcher.querySelector('button.cta');
          if (c){
            // mantener el ícono de flecha, solo cambiar el texto principal
            const svg = c.querySelector('svg');
            c.innerHTML = '';
            c.appendChild(document.createTextNode(BOT_CTX.cta + ' '));
            if (svg) c.appendChild(svg);
          }
        }
      } catch(e){}
    };
    tick();
  }
  async function loadBotConfig(){
    if (CTX_LOADED) return;
    CTX_LOADED = true;
    try {
      const path = location.pathname.toLowerCase();
      const r = await fetch(CONFIG.botConfigApi + '?path=' + encodeURIComponent(path) + '&domain=' + encodeURIComponent(CONFIG.domain), { cache: 'no-store' });
      if (!r.ok) return;
      const d = await r.json();
      const cfg = d && d.config;
      if (!cfg || !Array.isArray(cfg.pasos) || !cfg.pasos.length) return;
      // Validar mínimo cada paso (defensivo: si llega algo raro NO sobreescribimos)
      const ok = cfg.pasos.every(p => p && typeof p.key === 'string' && typeof p.bot === 'string' && (p.type === 'chips' ? Array.isArray(p.options) : (p.type === 'text' || p.type === 'tel' || p.type === 'multi')));
      if (!ok) return;
      steps = cfg.pasos;
      BOT_CTX = { botName: cfg.botName || '', fuenteLabel: cfg.fuenteLabel || 'Chatbot', teaserTitulo: cfg.teaserTitulo || '', teaserSub: cfg.teaserSub || '', cta: cfg.cta || '' };
      aplicarTeaser();
    } catch(e){ /* silencioso: fallback al bot genérico */ }
  }

  let i = 0;
  const data = {};
  const body = () => document.getElementById('cot-body');
  const controls = () => document.getElementById('cot-controls');

  function scroll(){
    const go = ()=>{ const b = body(); b.scrollTop = b.scrollHeight; };
    go(); setTimeout(go,60); setTimeout(go,180);
  }
  function scrollQ(){
    const rows = body().querySelectorAll('.msg-row');
    const last = rows[rows.length-1];
    if(!last){ return scroll(); }
    const go = ()=>{ body().scrollTop = Math.max(0, last.offsetTop - 14); };
    go(); setTimeout(go,60); setTimeout(go,180);
  }

  const AI_AV = '<div class="ai-av"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.6 4.3L18 8l-4.4 1.7L12 14l-1.6-4.3L6 8l4.4-1.7z"/><circle cx="18.5" cy="16.5" r="2.2"/><circle cx="6" cy="17" r="1.5"/></svg></div>';

  function addMsg(text, who){
    if(who === 'bot'){
      const row = document.createElement('div');
      row.className = 'msg-row';
      row.innerHTML = AI_AV + '<div class="msg bot"></div>';
      row.querySelector('.msg').textContent = text;
      body().appendChild(row);
    } else {
      const el = document.createElement('div');
      el.className = 'msg ' + who;
      el.textContent = text;
      body().appendChild(el);
    }
    scroll();
  }

  function typing(cb){
    const row = document.createElement('div');
    row.className = 'msg-row';
    row.innerHTML = AI_AV + '<div class="typing"><span></span><span></span><span></span></div>';
    body().appendChild(row); scroll();
    setTimeout(()=>{ row.remove(); cb(); }, 750);
  }

  function ask(){
    if(i >= steps.length){ return finish(); }
    const step = steps[i];
    const text = typeof step.bot === 'function' ? step.bot(data) : step.bot;
    typing(()=>{ addMsg(text, 'bot'); render(step); });
  }

  function render(step){
    controls().innerHTML = '';
    if(step.type === 'chips'){
      const wrap = document.createElement('div');
      wrap.className = 'cot-chips'; wrap.style.padding = '0 16px 14px';
      step.options.forEach(opt=>{
        const b = document.createElement('button');
        b.textContent = opt; b.onclick = ()=> answer(opt, step);
        wrap.appendChild(b);
      });
      controls().appendChild(wrap); scrollQ();
    } else if(step.type === 'multi'){
      if(data.tipo === 'Residencial'){
        const box = document.createElement('div'); box.style.padding = '0 16px 14px';
        const b = document.createElement('button');
        b.className = 'cot-continue'; b.textContent = 'Cotizar mi área verde';
        b.onclick = ()=> answer('Área verde residencial', step);
        box.appendChild(b); controls().appendChild(box); scrollQ();
        return;
      }
      const sel = new Set();
      const box = document.createElement('div'); box.style.padding = '0 16px 14px';
      const wrap = document.createElement('div'); wrap.className = 'cot-chips';
      step.options.forEach(opt=>{
        const b = document.createElement('button');
        b.textContent = opt;
        b.onclick = ()=>{
          if(sel.has(opt)){ sel.delete(opt); b.classList.remove('on'); }
          else { sel.add(opt); b.classList.add('on'); }
          cont.textContent = sel.size ? `${step.done} (${sel.size})` : step.none;
        };
        wrap.appendChild(b);
      });
      const cont = document.createElement('button');
      cont.className = 'cot-continue'; cont.textContent = step.none;
      cont.onclick = ()=> answer(sel.size ? [...sel].join(', ') : 'Solo la cancha', step);
      box.appendChild(wrap); box.appendChild(cont);
      controls().appendChild(box); scrollQ();
    } else {
      const wrap = document.createElement('div'); wrap.className = 'cot-input';
      wrap.innerHTML = `<input type="text" placeholder="${step.ph||'Escribe…'}" />
        <button type="button"><svg viewBox="0 0 24 24"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg></button>`;
      const input = wrap.querySelector('input');
      const send  = wrap.querySelector('button');
      const go = ()=>{
        const v = input.value.trim();
        if(!v && !step.optional) return;
        if(step.validate === 'phone' && v && !/^\d{10}$/.test(v.replace(/\D/g,'').slice(-10))){ shake(input); return; }
        answer(v || (step.skip || "—"), step);
      };
      send.onclick = go;
      input.addEventListener('keydown', e=>{ if(e.key==='Enter') go(); });
      controls().appendChild(wrap); input.focus(); scrollQ();
    }
  }

  function shake(el){ el.style.borderColor='#ef4444'; el.value=''; el.placeholder='Ingresa 10 dígitos'; }

  function answer(value, step){
    data[step.key] = value;
    addMsg(value, 'user');
    controls().innerHTML = '';
    if(step.other && value === step.other){
      typing(()=>{ addMsg(step.otherBot, 'bot'); render({ key:step.key, type:"text", ph:step.otherPh }); });
      return;
    }
    // Guardamos PARCIAL en cada paso para que el panel "🤖 Bot en vivo" lo vea en tiempo real
    // y para no perder leads que abandonan a la mitad. Throttle: máx 1 guardado cada 1.5s.
    try { saveLeadDebounced(data, 'parcial'); } catch(e){}
    i++; ask();
  }

  function finish(){
    saveLead(data, 'completo');
    const nombre = (data.nombre||'').split(' ')[0] || '';
    typing(()=>{
      addMsg(`¡Listo, ${nombre}! 🙌 Ya tengo todo para tu cotización. Toca el botón verde 👇 y un asesor te la manda por WhatsApp hoy mismo.`, 'bot');
      const msg =
`Hola ${CONFIG.empresa}, quiero cotizar una cancha 🏟️
• Tipo: ${data.tipo||'-'}
• Ciudad: ${data.ciudad||'-'}
• A nombre de: ${data.nombre||'-'}
• WhatsApp: ${data.whatsapp||'-'}
• Inicio: ${data.tiempo||'-'}
• Medidas: ${data.medidas||'-'}
• Accesorios: ${data.accesorios||'-'}`;
      const url = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`;
      const f = document.createElement('div');
      f.className = 'cot-final';
      f.innerHTML = `<a href="${url}" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-8.5 15.3L2 22l4.8-1.5A10 10 0 1 0 12 2zm5.7 14.3c-.2.7-1.4 1.3-2 1.4-.5.1-1.2.1-1.9-.1-.4-.1-1-.3-1.7-.6-3-1.3-4.9-4.3-5.1-4.5-.1-.2-1.2-1.6-1.2-3s.7-2.1 1-2.4c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.1.1.3 0 .5l-.4.5-.3.3c-.2.2-.3.4-.1.7.2.3.9 1.5 2 2.4 1.3 1.2 2.4 1.5 2.7 1.7.3.1.5.1.7-.1l.9-1c.2-.3.4-.2.7-.1l2 .9c.3.1.5.2.5.4z"/></svg>
        Enviar cotización por WhatsApp</a>`;
      controls().appendChild(f); scroll();
    });
  }

  // Dispara la carga de config en cuanto el bot se monta (no esperamos clic).
  // Cuando el visitante abre el bot, lo más probable es que ya esté cargada.
  try { loadBotConfig(); } catch(e){}

  return {
    async open(){
      document.getElementById('cot-panel').classList.add('open');
      document.getElementById('cot-launcher').classList.add('lc-hidden');
      // Si aún no terminó de cargar la config, le damos hasta 1.2s antes de arrancar.
      // Si tarda más, arrancamos con el bot genérico para no congelar al usuario.
      if (!CTX_LOADED || (CONFIG.botConfigApi && !BOT_CTX && Object.keys(data).length === 0)){
        try { await Promise.race([loadBotConfig(), new Promise(r => setTimeout(r, 1200))]); } catch(e){}
      }
      if(i===0 && Object.keys(data).length===0 && !body().hasChildNodes()){
        try { saveLeadDebounced({}, 'parcial'); } catch(e){}
        ask();
      }
    },
    close(){
      document.getElementById('cot-panel').classList.remove('open');
      document.getElementById('cot-launcher').classList.remove('lc-hidden');
    }
  };
})();

/* Mostrar el launcher al hacer scroll (>600px), igual que el sticky anterior */
(function(){
  var launcher = document.getElementById('cot-launcher');
  if(!launcher) return;
  var wa = document.querySelector('.wa-float');
  var threshold = 600, last = null, ticking = false;
  function apply(visible){
    launcher.classList.toggle('lc-show', visible);
    if(wa) wa.style.bottom = visible ? '120px' : '';
  }
  function check(){
    if(ticking) return; ticking = true;
    requestAnimationFrame(function(){
      var visible = window.scrollY > threshold;
      if(visible !== last){ last = visible; apply(visible); }
      ticking = false;
    });
  }
  window.addEventListener('scroll', check, {passive:true});
  check();
})();

/* Todos los CTA de WhatsApp de la página abren el chatbot (excepto el botón final del propio chat) */
document.addEventListener('click', function(e){
  var a = e.target.closest('a[href*="wa.me"], a[href*="api.whatsapp.com"], a[href*="whatsapp.com/send"]');
  if(!a) return;
  if(a.closest('#cot-panel')) return;   // el botón final del chat sí debe ir a WhatsApp
  e.preventDefault();
  if(typeof Cot !== 'undefined') Cot.open();
}, true);

  // Expone Cot en window para que funcionen los onclick inline del launcher/close.
  window.Cot = Cot;
})();
