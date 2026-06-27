-- Sistema de seguimientos para vendedores (Olga 2026-06-27)
-- Cada lead puede tener múltiples seguimientos (relación 1:N)
CREATE TABLE IF NOT EXISTS seguimientos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lead_id INTEGER NOT NULL,
  vendedor TEXT NOT NULL,
  tipo TEXT NOT NULL,                   -- llamada/whatsapp/email/reunion/visita/otro
  descripcion TEXT,
  resultado TEXT,                       -- positivo/informativo/negativo/cotizado/cerrado
  proximo_paso TEXT,
  fecha_proxima_accion TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para query rápido por lead
CREATE INDEX IF NOT EXISTS idx_seguimientos_lead ON seguimientos(lead_id);
CREATE INDEX IF NOT EXISTS idx_seguimientos_created ON seguimientos(created_at DESC);
