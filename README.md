# Gestor de Finanzas

App para llevar el control de cuotas, pagos, evidencias y remisiones —
como una libreta que simplifica todo.

Cada persona que la usa conecta **su propia base de datos** (gratis).
Tus datos son solo tuyos: nadie más tiene acceso, ni siquiera quien te
compartió la app.

---

## ¿Qué necesitas?

1. Una cuenta de **Supabase** (gratis) — ahí viven tus datos
2. El link de la app instalada
3. 15 minutos, una sola vez, para dejar todo listo

No necesitas saber programar. Solo seguir estos pasos.

---

## Parte 1 — Crea tu base de datos (una sola vez)

### 1. Crea tu cuenta en Supabase

1. Entra a **[supabase.com](https://supabase.com)** y toca **"Start your project"**
2. Regístrate con tu correo (o con GitHub, si tienes)
3. Ya dentro, toca **"New project"**
4. Ponle un nombre (ej. "Mis finanzas"), una contraseña para la base de
   datos (guárdala en algún lado seguro) y elige la región más cercana
5. Toca **"Create new project"** y espera ~2 minutos a que se prepare

### 2. Crea las tablas

Tu base de datos está vacía. Hay que crear los "cajones" donde se guarda
la info. Esto se hace **una sola vez**:

1. En el menú de la izquierda, entra a **SQL Editor**
2. Toca **"New query"**
3. Abre el archivo **`supabase/setup.sql`** (viene con la app),
   copia **todo** su contenido y pégalo en el editor
4. Toca **"Run"** (o presiona Ctrl+Enter)
5. Debe decir *"Success"* abajo. ¡Listo!

### 3. Copia tus datos de conexión

La app necesita dos datos para conectarse:

1. En el menú izquierdo, entra a **Settings** (el engrane) → **API**
2. Copia el **Project URL** (se ve como `https://xxxxx.supabase.co`)
3. Copia la clave **anon public** (una clave larguísima que empieza con `eyJ…`)

Ten estos dos datos a la mano para el siguiente paso.

---

## Parte 2 — Instala y conecta la app

### En el celular o tablet

1. Abre el link de la app en **Chrome** (Android) o **Safari** (iPhone)
2. Toca el menú del navegador → **"Agregar a pantalla de inicio"** o
   **"Instalar app"**
3. Ábrela desde su nuevo ícono
4. En la pantalla de bienvenida, toca **"Comenzar"**
5. Pega tu **Project URL** y tu clave **anon public**
6. Toca **"Conectar"** — ¡y ya está!

### En la computadora

1. Abre el link en **Chrome** o **Edge**
2. En la barra de direcciones aparece un icono de instalar (a la derecha);
   tócalo, o usa el menú → **"Instalar Gestor de Finanzas"**
3. Se abre como un programa normal
4. Conecta igual: pega tu URL y tu clave, toca **"Conectar"**

> **Nota:** conectas una vez por dispositivo. Después la app te lleva
> directo a tu información. Como los datos viven en Supabase, ves lo
> mismo en todos tus aparatos.

---

## Primeros pasos dentro de la app

1. Ve a **Ajustes** (el engrane) y crea al menos un **Grupo base**
   (ej. "GB Tamaulipas - Coahuila"). Sin esto no puedes dar de alta gente.
2. Si quieres, crea algunas **etiquetas** con color para clasificar.
3. Ve a **Militantes** y registra tu primera alta.
4. ¡Listo para trabajar!

---

## Preguntas comunes

**¿Es seguro?**
Tus datos viven en tu propia base de datos de Supabase, protegida con tu
contraseña. La app no comparte nada con nadie. La URL y clave se guardan
solo en tu dispositivo.

**¿Cuánto cuesta?**
El plan gratuito de Supabase alcanza de sobra para este uso. No necesitas
pagar nada.

**Se pausó mi proyecto de Supabase.**
En el plan gratis, si pasas más de una semana sin abrir la app, Supabase
"pausa" tu base. Solo entra a supabase.com y reactívala con un clic.

**Cambié de teléfono / borré la app.**
No pierdes nada: tus datos están en Supabase. Solo reinstala la app y
vuelve a conectar con tu URL y clave.

**¿Puedo compartirla con compañeros?**
Sí. Cada quien crea su propia cuenta de Supabase y conecta la suya. Sus
datos quedan totalmente separados de los tuyos.

---

## Para desarrolladores

Proyecto React + Vite + Supabase, instalable como PWA.

```bash
npm install      # instalar dependencias
npm run dev      # desarrollo local
npm run build    # compilar para producción
```

Estructura:

- `src/lib/` — capa de datos (conexión a Supabase, militantes, pagos, etc.)
- `src/pages/` — pantallas principales
- `src/components/` — componentes reutilizables (fichas, formularios)
- `supabase/setup.sql` — script de creación de tablas

Las credenciales de cada usuario se guardan en `localStorage`, nunca en
el repositorio. No hay datos personales incluidos en el código.

---

*Gestor de Finanzas · Software libre · v1.0*
