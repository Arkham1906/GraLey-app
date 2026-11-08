// Cliente del Boletín Judicial del Tribunal Virtual (TSJ Nayarit).
// Reproduce lo que hace la página: abre una sesión de invitado, lee el
// encabezado Authorization que el propio boletin.js envía, y consulta el
// endpoint de búsqueda en modo histórico.

const BASE = 'https://tribunalvirtual-tsjnay.gob.mx/publico/';
const PAGINA = new URL('boletin.public.php', BASE).href;
const ENDPOINT = new URL('app/boletin.buscar.public.php', BASE).href;
const USER_AGENT = 'GraleyAlertas/0.1 (consulta de boletin judicial publico)';

function cookiesDe(respuesta) {
  const lista =
    typeof respuesta.headers.getSetCookie === 'function'
      ? respuesta.headers.getSetCookie()
      : [respuesta.headers.get('set-cookie')].filter(Boolean);
  return lista.map((c) => c.split(';')[0]).join('; ');
}

// Extrae el valor de 'Authorization' del código de boletin.js.
export function extraerAuthorization(codigoJs) {
  const m = codigoJs.match(/['"]?Authorization['"]?\s*:\s*['"]([^'"]+)['"]/);
  return m ? m[1] : null;
}

// Encuentra la URL de boletin.js dentro del HTML de la página.
export function extraerUrlScript(html) {
  const m = html.match(/<script[^>]+src=["']([^"']*boletin\.js[^"']*)["']/i);
  return m ? new URL(m[1], PAGINA).href : null;
}

export async function abrirSesion() {
  const pagina = await fetch(PAGINA, { headers: { 'User-Agent': USER_AGENT } });
  if (!pagina.ok) throw new Error(`No se pudo abrir el boletín (HTTP ${pagina.status})`);
  const cookie = cookiesDe(pagina);
  const html = await pagina.text();

  const urlScript = extraerUrlScript(html);
  if (!urlScript) throw new Error('No se encontró boletin.js en la página: puede haber cambiado.');

  const script = await fetch(urlScript, { headers: { 'User-Agent': USER_AGENT } });
  if (!script.ok) throw new Error(`No se pudo descargar boletin.js (HTTP ${script.status})`);
  const authorization = extraerAuthorization(await script.text());
  if (!authorization) throw new Error('No se encontró Authorization en boletin.js: puede haber cambiado.');

  return { cookie, authorization, urlScript };
}

export async function buscarHistorico(sesion, { juzgado, numero, anio, aniohistorico }) {
  const cuerpo = new URLSearchParams({
    exp: String(numero),
    anio: String(anio),
    juzgado: String(juzgado),
    materia: '0',
    materiasala: '0',
    fechaacuerdo: '',
    aniohistorico: String(aniohistorico),
    tipobuscador: '2',
  });

  const respuesta = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Accept: 'application/json, text/javascript, */*; q=0.01',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      Authorization: sesion.authorization,
      Cookie: sesion.cookie,
      Origin: 'https://tribunalvirtual-tsjnay.gob.mx',
      Referer: PAGINA,
      'X-Requested-With': 'XMLHttpRequest',
      'User-Agent': USER_AGENT,
    },
    body: cuerpo,
  });

  if (!respuesta.ok) throw new Error(`El boletín respondió HTTP ${respuesta.status}`);

  let datos;
  try {
    datos = await respuesta.json();
  } catch {
    throw new Error('La respuesta del boletín no es JSON válido.');
  }
  if (!datos || !Array.isArray(datos.resultados)) {
    throw new Error('La respuesta del boletín no trae la lista "resultados".');
  }
  return datos.resultados;
}
