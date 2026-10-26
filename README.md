# PCR

App del encargado político del grupo base: reuniones, órdenes del día, actas,
estudio (discusión política), militantes, aspirantes, actividades e informe
mensual. Funciona en el navegador y se instala en el celular como app.

Cada usuario conecta **su propia** base de datos de Supabase (gratis); los
datos no pasan por ningún otro servidor.

## Instalación de la base de datos

En supabase.com → tu proyecto → **SQL Editor**, corre en este orden:

1. `supabase/setup.sql` (solo en una base nueva)
2. `supabase/actualizacion_pcr.sql`

Ambos se pueden volver a correr sin perder datos.

## Cómo funciona el ciclo de reuniones

1. **Programar reunión** arma solo la orden del día: puntos fijos de la
   plantilla (Ajustes) + acuerdos y tareas que quedaron pendientes en el acta
   anterior + opción de continuar el tema de discusión.
2. Después de la reunión se **levanta el acta** (escrita en la app o subiendo
   el Word/PDF) con sus acuerdos y tareas.
3. Lo que quede pendiente aparece en la siguiente orden del día.

Orden del día, acta e informe mensual tienen botón para copiar el texto y
pegarlo en WhatsApp.

## Finanzas

La etapa de finanzas (pagos, remisiones, concentrado) se conserva como
archivo en **Ajustes → Finanzas (archivo)**.

## Desarrollo

```
npm install
npm run dev
```

Se publica sola en GitHub Pages al subir cambios a `main`.
