# Pagos

Panel de cobros construido con Astro y Tailwind. Gestiona conceptos, pagos parciales y categorías personalizadas.

## Requisitos
- Node.js 18+
- npm o pnpm

## Instalación
```bash
npm install
```
*(se necesita conexión para descargar dependencias definidas en `package.json`).*

## Desarrollo
```bash
npm run dev
```
Abrirá la UI en modo desarrollo (http://localhost:4321 por defecto).

## Producción
```bash
npm run build
npm run preview
```

## Docker
- Construir y correr con PostgreSQL local (via docker-compose):
```bash
cp .env.example .env
docker-compose up --build
```
- La app escucha en `http://localhost:4321`.
- PostgreSQL queda en `localhost:5432` con las credenciales definidas en `.env` y un volumen `pagos_db_data`.

> Nota: ahora mismo la app es estática y no consume la base de datos. El stack ya queda preparado con contenedor de Postgres y la imagen de la app; el siguiente paso es añadir persistencia (API/ORM) y usar `DATABASE_URL`.

## Próximos pasos sugeridos
- Conectar con base de datos (ej. Supabase/Postgres) y persistir conceptos/pagos.
- Añadir autenticación para tu VPS en Dokploy.
- Sustituir `crypto.randomUUID()` si se ejecuta en entornos que no lo soporten.
- Incorporar tests de lógica de cálculos de pagos.
