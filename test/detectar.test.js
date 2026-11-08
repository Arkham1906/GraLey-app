import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizarTexto, claveAcuerdo } from '../src/normalizar.js';
import { detectarNuevos, contarAcuerdos } from '../src/detectar.js';
import { extraerAuthorization, extraerUrlScript } from '../src/boletin.js';

// Registros tomados de la respuesta real del expediente 862/2017 (Segundo Familiar).
const base = (fa, texto) => ({
  expediente: '862/2017',
  tipo: 'DEMANDA',
  materia: 'FAMILIAR',
  juzgado: 'SEGUNDO FAMILIAR',
  fecha_acuerdo: fa,
  acuerdo: texto,
  fecha_publicacion: fa,
});

const historial = [
  base('2026-08-11', 'SE GIRA OFICIO A REGISTRO CIVIL PARA ANOTACIONES DE LEY'),
  base('2026-08-11', 'SE GIRA OFICIO'),
  base('2026-08-20', 'SE CELEBRA AUDIENCIA'),
  base('2026-08-21', 'SE CELEBRA AUDIENCIA'),
  base('2026-10-20', 'SE DICTA SENTENCIA INTERLOCUTORIA'),
];

test('normalizarTexto quita acentos, espacios y mayúsculas', () => {
  assert.equal(normalizarTexto('  se recibe informe vía   correo '), 'SE RECIBE INFORME VIA CORREO');
});

test('la clave ignora diferencias de acentos y espacios al final', () => {
  const a = base('2026-01-09', 'SE RECIBE INFORME VÍA CORREO ELECTRÓNICO ');
  const b = base('2026-01-09', 'SE RECIBE INFORME VIA CORREO ELECTRONICO');
  assert.equal(claveAcuerdo(a), claveAcuerdo(b));
});

test('primera consulta: guarda la base y no avisa', () => {
  const r = detectarNuevos(historial, null);
  assert.equal(r.primeraVez, true);
  assert.equal(r.nuevos.length, 0);
  assert.equal(Object.values(r.conteo).reduce((x, y) => x + y, 0), 5);
});

test('misma respuesta: sin novedades', () => {
  const conocido = contarAcuerdos(historial);
  const r = detectarNuevos(historial, conocido);
  assert.equal(r.nuevos.length, 0);
  assert.equal(r.disminuyo, false);
});

test('un acuerdo nuevo se detecta', () => {
  const conocido = contarAcuerdos(historial);
  const nuevo = base('2026-11-04', 'INTERPONE RECURSO DE APELACION, SE ORDENA CORRER TRASLADO');
  const r = detectarNuevos([...historial, nuevo], conocido);
  assert.equal(r.nuevos.length, 1);
  assert.equal(r.nuevos[0].fecha_acuerdo, '2026-11-04');
});

test('el mismo texto en otra fecha cuenta como acuerdo nuevo', () => {
  const conocido = contarAcuerdos(historial);
  const r = detectarNuevos([...historial, base('2026-09-29', 'SE CELEBRA AUDIENCIA')], conocido);
  assert.equal(r.nuevos.length, 1);
});

test('dos acuerdos idénticos el mismo día: el segundo se detecta', () => {
  const uno = base('2026-11-05', 'AGREGUESE');
  const conocido = contarAcuerdos([...historial, uno]);
  const r = detectarNuevos([...historial, uno, { ...uno }], conocido);
  assert.equal(r.nuevos.length, 1);
});

test('si un acuerdo desaparece y reaparece no se vuelve a avisar', () => {
  const conocido = contarAcuerdos(historial);
  const sinUno = historial.slice(1);
  const r1 = detectarNuevos(sinUno, conocido);
  assert.equal(r1.disminuyo, true);
  assert.equal(r1.nuevos.length, 0);
  const r2 = detectarNuevos(historial, r1.conteo);
  assert.equal(r2.nuevos.length, 0);
});

test('extrae Authorization de un código como el de boletin.js', () => {
  const js = `$.ajax({ url: 'app/x.php', headers: {\n 'Authorization': 'TOKEN_DE_PRUEBA_123'\n } });`;
  assert.equal(extraerAuthorization(js), 'TOKEN_DE_PRUEBA_123');
  assert.equal(extraerAuthorization('sin nada'), null);
});

test('encuentra la URL de boletin.js en el HTML', () => {
  const html = '<script src="assets/js/boletin.js?v=1.0.6"></script>';
  assert.equal(
    extraerUrlScript(html),
    'https://tribunalvirtual-tsjnay.gob.mx/publico/assets/js/boletin.js?v=1.0.6',
  );
  assert.equal(extraerUrlScript('<html></html>'), null);
});
