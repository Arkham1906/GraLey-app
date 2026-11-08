import { claveAcuerdo } from './normalizar.js';

// Cuenta cuántas veces aparece cada clave de acuerdo en la respuesta.
export function contarAcuerdos(resultados) {
  const conteo = {};
  for (const r of resultados) {
    const k = claveAcuerdo(r);
    conteo[k] = (conteo[k] ?? 0) + 1;
  }
  return conteo;
}

/**
 * Compara la respuesta actual con lo ya conocido.
 *
 * - `conocido` es el conteo guardado antes ({ clave: veces }) o `null` si el
 *   expediente nunca se había consultado (primera vez: solo se guarda la base).
 * - Devuelve los acuerdos nuevos, el conteo actualizado y un indicador
 *   `disminuyo` si la respuesta trae menos acuerdos que lo ya visto.
 *
 * El conteo guardado conserva el máximo visto por clave: si el tribunal retira
 * un acuerdo y luego reaparece, no se vuelve a avisar.
 */
export function detectarNuevos(resultados, conocido) {
  const actual = contarAcuerdos(resultados);

  if (conocido === null || conocido === undefined) {
    return { nuevos: [], conteo: actual, primeraVez: true, disminuyo: false };
  }

  const nuevos = [];
  const usados = {};
  for (const r of resultados) {
    const k = claveAcuerdo(r);
    usados[k] = (usados[k] ?? 0) + 1;
    if (usados[k] > (conocido[k] ?? 0)) nuevos.push(r);
  }

  const conteo = { ...conocido };
  for (const [k, n] of Object.entries(actual)) {
    conteo[k] = Math.max(conteo[k] ?? 0, n);
  }

  const totalConocido = Object.values(conocido).reduce((a, b) => a + b, 0);
  const totalActual = resultados.length;
  return {
    nuevos,
    conteo,
    primeraVez: false,
    disminuyo: totalActual < totalConocido,
  };
}
