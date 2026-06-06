/**
 * GET /api/lead-atendido?id=ID&t=TOKEN
 * Vendedor marca "Ya lo atendí" → status="Contactado", atendido_fecha=ahora.
 * Token = sha256("sm-result-7Kx9-2026:id").slice(0,24)
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
  if (!id) return pag("Error","<h2>Falta el lead.</h2>");
  if (t!==(await token(id))) return pag("No autorizado","<h2>🔒 Enlace inválido</h2>");
  let lead=null;
  try{ lead=await env.DB.prepare("SELECT nombre,ciudad,vendedor,status_proyecto FROM leads WHERE id=?").bind(id).first(); }catch(e){}
  if (!lead) return pag("No encontrado","<h2>Lead no encontrado.</h2>");
  const ts=new Date().toISOString().replace("T"," ").slice(0,16);
  const nota=`[${ts}] ✅ Vendedor marcó "Ya lo atendí"`;
  // No retrocedemos status si ya está más avanzado (Cotizado/Negociación/Ganado/Perdido)
  const yaAvanzado=["Cotizado","Negociación","Ganado","Perdido"].includes(lead.status_proyecto||"");
  const nuevoStatus = yaAvanzado ? lead.status_proyecto : "Contactado";
  try{
    const cur=await env.DB.prepare("SELECT notas_internas FROM leads WHERE id=?").bind(id).first();
    const notas=((cur&&cur.notas_internas)?cur.notas_internas+"\n":"")+nota;
    await env.DB.prepare(
      "UPDATE leads SET status_proyecto=?, atendido_fecha=datetime('now'), notas_internas=?, tocado_por=?, tocado_fecha=datetime('now'), ultimo_contacto_quien='vendedor', ultimo_contacto_fecha=datetime('now') WHERE id=?"
    ).bind(nuevoStatus,notas,lead.vendedor||"(desde correo)",id).run();
  }catch(e){ return pag("Error","<h2>No se pudo guardar.</h2><p>"+esc(e.message)+"</p>"); }
  // Botones "¿Cómo te fue?" para que registre el resultado de un clic
  const tok=t;
  const url2=(r)=>`https://canchadefutbol7.mx/api/lead-resultado?id=${id}&t=${tok}&r=${r}`;
  const btn=(href,bg,color,txt)=>`<a href="${href}" style="display:inline-block;background:${bg};color:${color};text-decoration:none;font-weight:700;font-size:13px;padding:10px 14px;border-radius:9px;margin:5px 5px 0 0">${txt}</a>`;
  return pag("Atendido",`
    <div style="font-size:46px">✅</div>
    <h2 style="margin:10px 0 6px;color:#15803d">Marcaste como atendido</h2>
    <p style="font-size:15px;margin:0 0 4px"><b>${esc(lead.nombre||"el cliente")}</b>${lead.ciudad?" · "+esc(lead.ciudad):""}</p>
    <p style="font-size:13.5px;color:#64748b;margin:0 0 18px">Queda en "Contactado". ¿Cómo te fue con él?</p>
    <div>${btn(url2("interested"),"#dcfce7","#15803d","🟢 Interesado")}${btn(url2("scheduled"),"#dbeafe","#1d4ed8","📅 Agendé")}${btn(url2("noresp"),"#fef3c7","#b45309","⏰ Sin respuesta")}${btn(url2("notinterested"),"#fee2e2","#b91c1c","❌ No interesa")}</div>
    <p style="font-size:12px;color:#94a3b8;margin:18px 0 0">o entra al <a href="https://canchadefutbol7.mx/admin" style="color:#94a3b8">panel</a></p>`);
}
