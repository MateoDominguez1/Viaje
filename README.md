# I nostri viaggi

App para organizar viajes en pareja: viajes con fechas y presupuesto, alojamientos, lugares e itinerario día por día. La interfaz está en italiano.

- `index.html`: la app completa (HTML, CSS y JS en un solo archivo, sin dependencias).
- `api/trips.js`: función serverless de Vercel que guarda los viajes en Redis (Upstash) para que los dos vean los mismos datos.

Sin la API configurada, la app funciona igual pero guarda solo en el navegador de cada uno.

## Deploy en Vercel

1. En Vercel: **Add New → Project** e importá este repo. No hace falta configurar nada de build: es un sitio estático con una carpeta `api/`.
2. En el proyecto: **Storage → Create Database → Upstash (Redis)** y conectalo al proyecto. Eso agrega solas las variables `KV_REST_API_URL` y `KV_REST_API_TOKEN` (también sirven `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`).
3. En **Settings → Environment Variables** agregá `APP_PASSWORD` con una contraseña que elijan entre los dos.
4. Hacé **Redeploy** para que tome las variables.

Al abrir la app, pide la contraseña una vez por dispositivo. Arriba, debajo del título, se ve el estado: *Sincronizzato* cuando está guardando en la nube.

## Cómo se guardan los datos

- Cada viaje es un campo del hash `viaggi:trips` en Redis. Si cada uno edita un viaje distinto al mismo tiempo, no se pisan. Si los dos editan el mismo viaje a la vez, gana el último en guardar.
- La app vuelve a leer los datos cada 20 segundos y cada vez que volvés a la pestaña.
- Si se corta la conexión, los cambios quedan en el navegador y se reenvían en la próxima sincronización.
- Los viajes cargados antes de configurar la API se suben solos la primera vez que la app se conecta, si la nube está vacía.

## Probar en local

```bash
npx vercel dev
```

Abrir `index.html` directo desde el disco también funciona, pero solo con guardado local.
