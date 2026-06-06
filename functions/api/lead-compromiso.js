/**
 * GET /api/lead-compromiso?id=ID&t=TOKEN&min=0|15|30|60
 * Vendedor elige cuándo va a atender el lead. Vence en N min desde ahora.
 * Token = sha256("sm-result-7Kx9-2026:id").slice(0,24)  (mismo que /api/lead-resultado)
 */
const SECRET = "sm-result-7Kx9-2026";
async function sha(s){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");}
async function token(id){return (await sha(SECRET+":"+id)).slice(0,24);}
const esc=s=>String(s==null?"":s).replace(/[<>&]/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;"}[c]));
function pag(title,body){return new Response(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head><body style="margin:0;background:#eef2f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif"><div style="max-width:440px;margin:40px auto;padding:0 16px;color:#0f172a"><div style="background:#fff;border-radius:18px;box-shadow:0 12px 38px rgba(2,6,23,.12);padding:30px 26px;text-align:center">${body}</div></div></body></html>`,{headers:{"content-type":"text/html;charset=utf-8"}});}

export async function onRequestGet({request,env}){
  const url=new URL(request.url);
  const id=parseInt(url.searchParams.get("id"),10);
  const t=url.searchParams.get("t")||"";
  const min=parseInt(url.searchParams.get("min")||"0",10);
  if (!id) return pag("Error","<h2>Falta el lead.</h2>");
  if (t!==(await token(id))) return pag("No autorizado","<h2>🔒 Enlace inválido</h2>");
  if (![0,15,30,60].includes(min)) return pag("Error","<h2>Compromiso inválido.</h2>");
  let lead=null;
  try{ lead=await env.DB.prepare("SELECT nombre,ciudad,vendedor FROM leads WHERE id=?").bind(id).first(); }catch(e){}
  if (!lead) return pag("No encontrado","<h2>Lead no encontrado.</h2>");
  const compFecha = new Date(Date.now()+min*60000).toISOString().replace("T"," ").slice(0,19);
  const ts=new Date().toISOString().replace("T"," ").slice(0,16);
  const label = min===0?"AHORA":`en ${min} min`;
  const nota=`[${ts}] ⏰ Compromiso: atender ${label}`;
  try{
    const cur=await env.DB.prepare("SELECT notas_internas FROM leads WHERE id=?").bind(id).first();
    const notas=((cur&&cur.notas_internas)?cur.notas_internas+"\n":"")+nota;
    await env.DB.prepare("UPDATE leads SET compromiso_min=?, compromiso_fecha=?, notas_internas=?, tocado_por=?, tocado_fecha=datetime('now') WHERE id=?")
      .bind(min,compFecha,notas,lead.vendedor||"(desde correo)",id).run();
  }catch(e){ return pag("Error","<h2>No se pudo guardar.</h2><p>"+esc(e.message)+"</p>"); }
  const txt = min===0?"¡Perfecto! Estás atendiéndolo ahora.":`Quedaste comprometido a atenderlo en <b>${min} min</b>.`;
  return pag("Compromiso registrado",`
    <div style="font-size:46px">⏰</div>
    <h2 style="margin:10px 0 6px;color:#15803d">Compromiso registrado</h2>
    <p style="font-size:15px;margin:0 0 4px"><b>${esc(lead.nombre||"el cliente")}</b>${lead.ciudad?" · "+esc(lead.ciudad):""}</p>
    <p style="font-size:14px;color:#64748b;margin:6px 0 18px">${txt}</p>
    <p style="font-size:13px;color:#94a3b8;margin:0 0 16px">Cuando lo contactes, presiona <b>"✅ Ya lo atendí"</b> en el correo.</p>
    <a href="https://canchadefutbol7.mx/admin" style="display:inline-block;background:#0b0f14;color:#fff;text-decoration:none;padding:11px 22px;border-radius:10px;font-weight:700;font-size:14px">Ir al panel</a>`);
}
