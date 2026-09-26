# DOCUMENTO DE ESPECIFICACIONES

# NEXO RADIO --- V1

**Proyecto:** NEXO RADIO\
**Versión:** 1.0\
**Tipo:** Plataforma web de radio online en vivo\
**Nombre público:** NEXO RADIO\
**Panel privado:** NEXO STUDIO

------------------------------------------------------------------------

# 1. DESCRIPCIÓN GENERAL

NEXO RADIO es una plataforma web de radio online que permite a un
administrador/locutor reproducir música desde NEXO Studio y transmitirla
en tiempo real a todas las personas conectadas a NEXO Radio.

La primera versión debe ser deliberadamente sencilla.

El concepto principal es:

**El locutor reproduce música → los oyentes escuchan la misma
transmisión → el locutor activa el micrófono → la música baja
automáticamente → el locutor habla → desactiva el micrófono → la música
recupera su volumen.**

NEXO debe comportarse como una radio tradicional transmitida por
Internet y no como una plataforma de streaming individual tipo Spotify.

Todos los oyentes deben escuchar aproximadamente el mismo punto de la
transmisión.

------------------------------------------------------------------------

# 2. OBJETIVO DE LA V1

Construir una primera versión funcional que permita:

1.  Iniciar sesión en NEXO Studio.
2.  Subir archivos de música.
3.  Administrar una biblioteca musical.
4.  Crear playlists.
5.  Preparar una cola de reproducción.
6.  Reproducir música desde Studio.
7.  Transmitir esa música a Internet.
8.  Permitir que múltiples oyentes escuchen simultáneamente.
9.  Activar el micrófono del locutor.
10. Reducir automáticamente el volumen de la música mientras habla.
11. Recuperar automáticamente el volumen cuando termina de hablar.
12. Mostrar al público qué canción está sonando.
13. Permitir solicitudes de canciones y dedicatorias.

La prioridad absoluta de esta versión es:

**TRANSMISIÓN + MÚSICA + MICRÓFONO.**

------------------------------------------------------------------------

# 3. IDENTIDAD VISUAL

NEXO debe transmitir una imagen premium, moderna, minimalista,
tecnológica, elegante, musical y nocturna.

La identidad visual utiliza principalmente negro, carbón, gris oscuro,
dorado, ámbar y blanco para textos principales.

Utilizar iluminación cálida, degradados oscuros, transparencias,
glassmorphism moderado, bordes suaves y elementos relacionados con ondas
de audio.

Evitar interfaces excesivamente saturadas.

------------------------------------------------------------------------

# 4. ESTRUCTURA GENERAL

La aplicación tendrá dos grandes áreas.

## 4.1 NEXO RADIO

Interfaz pública para los oyentes.

Ruta sugerida: `/`

No requiere autenticación.

## 4.2 NEXO STUDIO

Panel privado utilizado por el administrador/locutor.

Ruta sugerida: `/studio`

Requiere autenticación.

En la V1 existirá un único tipo de usuario administrativo. No
implementar todavía múltiples locutores ni sistema complejo de roles.

------------------------------------------------------------------------

# 5. NEXO RADIO --- EXPERIENCIA PÚBLICA

La página pública debe estar optimizada para Desktop, Tablet y Mobile.

Debe seguir principalmente estas referencias visuales:

-   `01_nexo_radio_inicio_desktop.png`
-   `02_nexo_radio_inicio_mobile.png`

Estas imágenes son referencias visuales principales para la V1.

------------------------------------------------------------------------

# 6. REPRODUCTOR PÚBLICO

El reproductor es el elemento principal de NEXO RADIO.

Debe mostrar:

-   Portada de la canción actual.
-   Nombre de la canción.
-   Artista.
-   Estado de transmisión.
-   Indicador EN VIVO.
-   Botón Play/Pause local.
-   Control de volumen.
-   Estado de conexión.

El oyente NO puede cambiar canción, retroceder canción, adelantar
canción, elegir qué canción escuchar ni moverse dentro de la canción.

NEXO es una radio lineal. Si un usuario entra cuando una canción lleva 2
minutos reproduciéndose, debe escuchar desde aproximadamente ese mismo
punto de la transmisión.

------------------------------------------------------------------------

# 7. BOTÓN "ESCUCHAR EN VIVO"

Debido a las restricciones de reproducción automática de los
navegadores, el usuario debe poder iniciar la reproducción mediante una
interacción explícita.

Al pulsar **ESCUCHAR EN VIVO**:

1.  Se conecta al stream.
2.  Comienza la reproducción.
3.  Se muestra el estado EN VIVO.
4.  Se actualiza la información de la canción actual.

------------------------------------------------------------------------

# 8. SOLICITAR CANCIÓN

El público podrá enviar una solicitud sencilla.

Campos:

-   Nombre o nickname.
-   Canción solicitada.
-   Artista.
-   Dedicatoria opcional.

No requiere crear una cuenta.

La solicitud debe almacenarse y aparecer dentro de NEXO Studio.

Enviar una solicitud NO garantiza que la canción vaya a reproducirse. La
decisión siempre pertenece al administrador/locutor.

------------------------------------------------------------------------

# 9. NEXO STUDIO

NEXO Studio será el centro de control privado de la radio.

Referencias:

-   `03_nexo_studio_dashboard_desktop.png`
-   `04_nexo_studio_en_vivo_desktop.png`

NEXO Studio será prioritariamente desktop-first. Puede ser responsive,
pero la operación profesional de la transmisión debe optimizarse para
computador.

------------------------------------------------------------------------

# 10. LOGIN

Referencia visual:

`11_nexo_studio_login_desktop.png`

El administrador debe autenticarse antes de acceder a Studio.

Utilizar **Supabase Auth**.

La V1 necesita email, contraseña, iniciar sesión, cerrar sesión y
persistencia segura de sesión.

------------------------------------------------------------------------

# 11. DASHBOARD

Referencia:

`03_nexo_studio_dashboard_desktop.png`

Puede incluir:

-   Estado de transmisión.
-   Canción actual.
-   Estado del micrófono.
-   Oyentes conectados.
-   Acceso rápido a cabina.
-   Acceso a biblioteca.
-   Acceso a playlists.
-   Solicitudes recientes.

No convertir el dashboard en un panel analítico complejo.

------------------------------------------------------------------------

# 12. CABINA / EN VIVO

Referencia:

`04_nexo_studio_en_vivo_desktop.png`

Debe permitir controlar:

### Música

-   Play.
-   Pause.
-   Canción anterior.
-   Canción siguiente.
-   Cola de reproducción.
-   Tiempo transcurrido.
-   Duración.
-   Volumen de música.

### Micrófono

Debe existir un control claramente visible para activar/desactivar el
micrófono:

**ENTRAR AL AIRE** / **SALIR DEL AIRE**

------------------------------------------------------------------------

# 13. COMPORTAMIENTO DEL MICRÓFONO

Cuando el micrófono esté apagado:

`Música = volumen normal`

Cuando el administrador active el micrófono:

`Música ↓`\
`Micrófono ↑`

La música NO debe detenerse. Debe reducir automáticamente su volumen.

Valor inicial recomendado: **25 % -- 30 %**.

Cuando el administrador desactive el micrófono, la música debe recuperar
progresivamente su volumen normal. La transición debe ser suave.

------------------------------------------------------------------------

# 14. DUCKING

Implementar audio ducking.

Conceptualmente:

`MÚSICA + MICRÓFONO → MASTER`

El MASTER es la señal enviada al sistema de streaming.

Transición recomendada al activar micrófono: **300--600 ms**.

Recuperación recomendada: **500--1000 ms**.

Los valores pueden ajustarse durante pruebas.

------------------------------------------------------------------------

# 15. MONITOREO DE AUDIO

Studio debe mostrar controles o medidores separados para:

-   MIC
-   MÚSICA
-   MASTER

También debe existir un indicador de estado de transmisión, por ejemplo:

**● TRANSMISIÓN ACTIVA**

------------------------------------------------------------------------

# 16. BIBLIOTECA MUSICAL

Referencia:

`05_nexo_studio_biblioteca_desktop.png`

Debe permitir:

-   Ver canciones.
-   Buscar canciones.
-   Filtrar.
-   Reproducir.
-   Añadir a cola.
-   Añadir a playlist.
-   Editar metadata básica.
-   Eliminar canción.

Información sugerida:

-   Portada.
-   Título.
-   Artista.
-   Álbum opcional.
-   Género opcional.
-   Duración.
-   Fecha de carga.

------------------------------------------------------------------------

# 17. SUBIR MÚSICA

Referencia:

`06_nexo_studio_subir_musica_desktop.png`

Permitir cargar archivos de audio desde el computador.

Formatos iniciales recomendados:

-   MP3.
-   AAC/M4A cuando sea técnicamente compatible.

Almacenar archivo, nombre, artista, duración, portada cuando exista y
metadata disponible.

Si una canción no posee portada, utilizar:

`cover_default.webp`

------------------------------------------------------------------------

# 18. PLAYLISTS

Referencia:

`07_nexo_studio_playlists_desktop.png`

El administrador podrá crear, renombrar y eliminar playlists; añadir y
quitar canciones; cambiar su orden y reproducirlas.

NO implementar todavía programación automática por horario.

------------------------------------------------------------------------

# 19. COLA DE REPRODUCCIÓN

Studio debe tener una cola temporal con:

-   Sonando ahora.
-   A continuación.

El administrador podrá añadir canciones, eliminarlas de cola, cambiar el
orden, saltar canción y seleccionar una canción para reproducir.

La canción que realmente esté sonando debe sincronizarse con la interfaz
pública.

------------------------------------------------------------------------

# 20. SOLICITUDES Y DEDICATORIAS

Studio debe incluir una sección sencilla para recibir solicitudes del
público.

Cada solicitud puede mostrar:

-   Nombre/nickname.
-   Canción.
-   Artista.
-   Dedicatoria.
-   Hora de solicitud.

Acciones:

-   Marcar como vista.
-   Descartar.
-   Buscar canción en biblioteca.
-   Añadir canción a cola cuando esté disponible.

No implementar automatización compleja.

------------------------------------------------------------------------

# 21. TRANSMISIÓN

Arquitectura conceptual:

`NEXO STUDIO → MEZCLA DE AUDIO → ENCODER / SOURCE BRIDGE → SERVIDOR DE STREAMING → NEXO RADIO → OYENTES`

Todos los oyentes reciben la misma transmisión.

------------------------------------------------------------------------

# 22. SERVIDOR DE STREAMING

Tecnología recomendada:

**Icecast**

Icecast será responsable de distribuir la transmisión a los oyentes.

La aplicación web NO debe intentar utilizar Vercel o Supabase como
sustituto del servidor de streaming de audio.

------------------------------------------------------------------------

# 23. SOURCE / ENCODER BRIDGE

Este componente es crítico.

La mezcla generada por NEXO Studio debe convertirse a un formato
adecuado y enviarse al servidor Icecast mediante una fuente compatible.

No asumir que el navegador puede enviar directamente cualquier
MediaStream a Icecast sin procesamiento adicional.

Flujo:

`Browser audio mix → encoding / source bridge → Icecast mount`

Este componente puede requerir un pequeño servicio backend dedicado o
tecnología source/encoder compatible.

Priorizar estabilidad, latencia razonable, compatibilidad, recuperación
de conexión y facilidad de despliegue.

------------------------------------------------------------------------

# 24. WEB AUDIO API

La mezcla local dentro de NEXO Studio debe utilizar **Web Audio API**.

Controlará:

-   Fuente musical.
-   Entrada del micrófono.
-   Gain música.
-   Gain micrófono.
-   Ducking.
-   Master output.

Arquitectura conceptual:

`Música → Gain música ┐`\
`├→ MASTER → encoder → stream`\
`Micrófono → Gain mic ┘`

------------------------------------------------------------------------

# 25. SUPABASE

Utilizar Supabase para:

### Authentication

Login de NEXO Studio.

### PostgreSQL

Guardar canciones, metadata, playlists, canciones de playlist, cola
cuando sea necesario, estado de transmisión, canción actual, solicitudes
y configuración básica.

### Storage

Guardar música y portadas.

### Realtime

Sincronizar canción actual, estado de transmisión, solicitudes nuevas y
datos necesarios para actualizar la interfaz pública.

------------------------------------------------------------------------

# 26. FRONTEND

Tecnología recomendada:

**Next.js**

La misma aplicación puede contener:

-   Público: `/`
-   Studio: `/studio` y rutas internas.

------------------------------------------------------------------------

# 27. HOSTING WEB

Tecnología recomendada:

**Vercel**

Vercel alojará frontend, interfaz pública, NEXO Studio y funciones web
compatibles.

Vercel NO debe utilizarse como servidor principal de streaming continuo
de radio.

------------------------------------------------------------------------

# 28. ESTADO DE CANCIÓN ACTUAL

Cuando Studio cambie de canción:

1.  Se actualiza la canción actual.
2.  Se actualiza Supabase.
3.  Supabase Realtime informa a NEXO Radio.
4.  La interfaz pública cambia título, artista y portada.

La metadata visual debe estar sincronizada con la transmisión tanto como
razonablemente sea posible.

------------------------------------------------------------------------

# 29. CONTADOR DE OYENTES

La interfaz puede mostrar:

**X oyentes conectados**

No necesitamos analítica avanzada en esta versión.

El contador puede obtenerse del sistema de streaming o mediante un
mecanismo ligero de presencia/conexiones.

------------------------------------------------------------------------

# 30. ASSETS OFICIALES

Utilizar exactamente:

-   `logo_nexo_radio.png` --- logo principal.
-   `isotipo_nexo.png` --- símbolo compacto.
-   `favicon_nexo.png` --- favicon.
-   `bg_nexo_radio.webp` --- fondo de la página pública.
-   `cover_default.webp` --- portada cuando una canción no tenga
    carátula.
-   `bg_nexo_studio.webp` --- fondo para Studio.

No añadir textos directamente sobre las imágenes de fondo originales.

------------------------------------------------------------------------

# 31. REFERENCIAS VISUALES V1

Referencias prioritarias:

-   `01_nexo_radio_inicio_desktop.png`
-   `02_nexo_radio_inicio_mobile.png`
-   `03_nexo_studio_dashboard_desktop.png`
-   `04_nexo_studio_en_vivo_desktop.png`
-   `05_nexo_studio_biblioteca_desktop.png`
-   `06_nexo_studio_subir_musica_desktop.png`
-   `07_nexo_studio_playlists_desktop.png`
-   `11_nexo_studio_login_desktop.png`

Estas referencias definen estilo, jerarquía, distribución, proporciones,
paleta, componentes y experiencia visual.

Los textos, nombres de canciones, artistas, fechas y cantidades visibles
en los mockups NO son datos reales.

------------------------------------------------------------------------

# 32. REFERENCIAS FUTURAS

Mantener únicamente como referencia de evolución:

-   `08_nexo_studio_programacion_desktop.png`
-   `09_nexo_studio_reportes_desktop.png`
-   `10_nexo_studio_configuracion_desktop.png`
-   `12_nexo_radio_programacion_desktop.png`
-   `13_nexo_radio_programacion_mobile.png`
-   `14_nexo_radio_chat_mobile.png`
-   `15_nexo_radio_locutor_en_vivo_desktop.png`
-   `16_nexo_radio_locutor_en_vivo_mobile.png`
-   `17_nexo_radio_menu_mobile.png`

**NO IMPLEMENTAR estas funcionalidades únicamente porque aparezcan en
estas imágenes.**

------------------------------------------------------------------------

# 33. RESPONSIVE

## NEXO RADIO

Debe ser completamente responsive, con prioridad Mobile y Desktop.

## NEXO STUDIO

Prioridad Desktop.

Debe funcionar correctamente en resoluciones habituales de laptop y
escritorio.

No es necesario crear una experiencia completa de operación profesional
desde teléfono en esta V1.

------------------------------------------------------------------------

# 34. EXPERIENCIA DE USUARIO

La interfaz debe sentirse rápida, elegante, clara, profesional y fácil
de entender.

Evitar menús innecesarios, animaciones excesivas, dashboards saturados,
configuraciones técnicas expuestas, formularios demasiado largos y
elementos sin función en la V1.

------------------------------------------------------------------------

# 35. MANEJO DE ERRORES

Informar claramente:

-   Micrófono sin permisos.
-   Micrófono no encontrado.
-   Archivo incompatible.
-   Error al subir canción.
-   Pérdida de conexión con streaming.
-   Stream no disponible.
-   Error de autenticación.

Nunca dejar al usuario sin saber qué ocurrió.

------------------------------------------------------------------------

# 36. PERMISOS DEL MICRÓFONO

Antes de transmitir voz:

1.  Solicitar permiso del navegador.
2.  Detectar dispositivo.
3.  Mostrar señal.
4.  Permitir activar transmisión.

Si el navegador bloquea el micrófono, mostrar instrucciones claras.

------------------------------------------------------------------------

# 37. SEGURIDAD

La interfaz pública nunca debe tener acceso administrativo.

Las operaciones privadas deben validar autenticación.

Configurar correctamente:

-   Supabase Auth.
-   Row Level Security.
-   Storage policies.
-   Variables de entorno.
-   Credenciales del servidor de streaming.

Nunca exponer claves administrativas en frontend.

------------------------------------------------------------------------

# 38. FUERA DEL ALCANCE --- NEXO V1

NO implementar en esta versión:

-   AutoDJ 24/7.
-   Programación automática por horarios.
-   Múltiples locutores.
-   Roles complejos.
-   Programas pregrabados.
-   Grabación de transmisiones.
-   Historial completo de programas.
-   Comerciales automáticos.
-   Jingles automáticos.
-   Sistema avanzado de publicidad.
-   Chat público.
-   Moderación de chat.
-   Notificaciones push.
-   WhatsApp automático.
-   Emails automáticos.
-   Aplicación nativa Android.
-   Aplicación nativa iOS.
-   Reportes avanzados.
-   Dashboard analítico complejo.
-   Reglas de contenido explícito.
-   Programación automática de playlists.
-   Sistema avanzado de permisos.
-   Monetización.
-   Suscripciones.
-   CRM de anunciantes.

Estas funcionalidades podrán evaluarse para versiones posteriores.

------------------------------------------------------------------------

# 39. PRIORIDAD DE DESARROLLO

### FASE 1 --- Base

Next.js, Supabase, autenticación, estructura visual y rutas.

### FASE 2 --- Biblioteca

Storage, subida de música, metadata, biblioteca y portadas.

### FASE 3 --- Reproductor Studio

Cola, Play/Pause, Next, Previous, volumen y playlists.

### FASE 4 --- Micrófono

Permisos, entrada de audio, Web Audio API, mezcla y ducking.

### FASE 5 --- Streaming

Source/encoder bridge, Icecast, stream, reconexión y pruebas con
múltiples oyentes.

### FASE 6 --- NEXO Radio

Reproductor público, metadata, estado EN VIVO, portada y responsive.

### FASE 7 --- Interacción

Solicitudes, dedicatorias y oyentes conectados.

### FASE 8 --- QA

Probar Chrome, Edge, Safari, Android, iPhone, Desktop, Mobile y
diferentes velocidades de Internet.

------------------------------------------------------------------------

# 40. CRITERIO PRINCIPAL DE ÉXITO

La V1 se considerará funcional cuando:

1.  Administrador inicia sesión.
2.  Abre NEXO Studio.
3.  Selecciona música.
4.  Inicia reproducción.
5.  Abre NEXO Radio desde otro dispositivo.
6.  Pulsa "Escuchar en vivo".
7.  Escucha la misma transmisión.
8.  El administrador activa el micrófono.
9.  La música baja automáticamente.
10. La voz se escucha sobre la música.
11. El administrador desactiva el micrófono.
12. La música recupera su volumen.
13. Cambia la canción.
14. Todos los oyentes continúan escuchando la misma transmisión.
15. La interfaz pública actualiza correctamente la canción actual.

Si este flujo funciona de forma estable, el núcleo de NEXO RADIO V1 está
terminado.

------------------------------------------------------------------------

# 41. PRINCIPIO DEL PROYECTO

No agregar complejidad que no sea necesaria para cumplir el objetivo de
la V1.

Antes de desarrollar una función adicional, evaluar:

**¿Es necesaria para que el administrador pueda poner música,
transmitirla y hablar con sus oyentes?**

Si la respuesta es no, debe considerarse para una versión posterior.

------------------------------------------------------------------------

# 42. RESULTADO ESPERADO

NEXO RADIO V1 debe convertirse en una radio online sencilla, elegante y
funcional donde:

**El administrador controla la música.**

**Los oyentes escuchan una transmisión común.**

**El administrador puede entrar al aire mediante su micrófono.**

**La música baja automáticamente mientras habla.**

**Al terminar de hablar, la música continúa normalmente.**

Todo el sistema debe construirse alrededor de esta experiencia
principal.
