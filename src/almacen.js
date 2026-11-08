import { promises as fs } from 'node:fs';
import path from 'node:path';

// Almacén local en un archivo JSON. Es solo para el prototipo: más adelante se
// reemplaza por la base de datos, conservando las mismas dos funciones.
const ARCHIVO = path.resolve('data', 'estado.json');

export async function cargarEstado() {
  try {
    return JSON.parse(await fs.readFile(ARCHIVO, 'utf8'));
  } catch (e) {
    if (e.code === 'ENOENT') return {};
    throw e;
  }
}

export async function guardarEstado(estado) {
  await fs.mkdir(path.dirname(ARCHIVO), { recursive: true });
  const temporal = `${ARCHIVO}.tmp`;
  await fs.writeFile(temporal, JSON.stringify(estado, null, 2), 'utf8');
  await fs.rename(temporal, ARCHIVO); // escritura atómica
}
