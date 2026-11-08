import { promises as fs } from 'node:fs';
import { abrirSesion, buscarHistorico } from './boletin.js';
import { detectarNuevos } from './detectar.js';
import { claveExpediente } from './normalizar.js';
import { cargarEstado, guardarEstado } from './almacen.js';

const PAUSA_MS = 3000; // pausa entre consultas para no cargar el servidor
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const archivo = process.argv[2] ?? 'expedientes.json';
  const expedientes = JSON.parse(await fs.readFile(archivo, 'utf8'));
  const aniohistorico = new Date().getFullYear();

  const estado = await cargarEstado();
  const sesion = await abrirSesion();
  console.log(`Sesión abierta. Consultando ${expedientes.length} expediente(s)...\n`);

  let errores = 0;
  for (const [i, exp] of expedientes.entries()) {
    const clave = claveExpediente(exp);
    const nombre = `${exp.numero}/${exp.anio} (juzgado ${exp.juzgado})`;
    try {
      // En enero también se revisa el año anterior, por si hubo acuerdos
      // publicados a finales de diciembre.
      const anios = new Date().getMonth() === 0 ? [aniohistorico, aniohistorico - 1] : [aniohistorico];
      let resultados = [];
      for (const a of anios) {
        resultados = resultados.concat(await buscarHistorico(sesion, { ...exp, aniohistorico: a }));
      }

      const previo = estado[clave]?.conteo ?? null;
      const r = detectarNuevos(resultados, previo);
      estado[clave] = { conteo: r.conteo, ultimaConsulta: new Date().toISOString() };

      if (r.primeraVez) {
        console.log(`${nombre}: base guardada con ${resultados.length} acuerdo(s). Sin avisos.`);
      } else if (r.nuevos.length === 0) {
        console.log(`${nombre}: sin novedades.`);
      } else {
        console.log(`${nombre}: ${r.nuevos.length} ACUERDO(S) NUEVO(S):`);
        for (const n of r.nuevos) {
          console.log(`  - [${n.fecha_acuerdo}] ${String(n.acuerdo).trim()}`);
        }
      }
      if (r.disminuyo) {
        console.warn(`  Aviso: ${nombre} trae menos acuerdos que antes. Revisar.`);
      }
    } catch (e) {
      errores++;
      console.error(`${nombre}: ERROR - ${e.message}`);
    }
    if (i < expedientes.length - 1) await dormir(PAUSA_MS);
  }

  await guardarEstado(estado);
  console.log(`\nListo. Errores: ${errores}.`);
  if (errores > 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(`Fallo general: ${e.message}`);
  process.exit(1);
});
