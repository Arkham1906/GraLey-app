// Normaliza el texto de un acuerdo para poder compararlo entre consultas:
// mayúsculas, sin acentos, sin espacios repetidos ni al inicio/final.
export function normalizarTexto(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// Clave que identifica un acuerdo. La respuesta del tribunal no trae un id,
// así que se arma con las dos fechas y el texto normalizado.
export function claveAcuerdo(acuerdo) {
  return [
    acuerdo.fecha_acuerdo ?? '',
    acuerdo.fecha_publicacion ?? '',
    normalizarTexto(acuerdo.acuerdo),
  ].join('|');
}

export function claveExpediente({ juzgado, numero, anio }) {
  return `${juzgado}|${numero}|${anio}`;
}
