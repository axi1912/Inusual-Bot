# 🤖 Inusual Boosting - Bot de Sistema de Tickets

Bot de Discord para gestionar tickets de compra de Server Boosts con menú desplegable interactivo.

## 📋 Características

- ✅ Sistema de tickets automatizado
- 🎯 Menú desplegable con opciones de paquetes de boosts
- 💳 Soporte para pagos PayPal y Crypto
- 🔒 Sistema de cierre de tickets con confirmación
- 👥 Gestión de permisos para staff y usuarios
- 🇪🇸 Completamente en español

## 🛠️ Paquetes Disponibles

### 💳 Pagos PayPal (3 Meses)
- 💥 14 Server Boosts - 12.00$
- 💥 30 Server Boosts - 19.00$

### 🔐 Pagos Crypto (3 Meses)
- 💥 14 Server Boosts - 10.00$
- 💥 30 Server Boosts - 16.50$

## 🚀 Instalación

### 1. Instalar Node.js
Descarga e instala Node.js desde [nodejs.org](https://nodejs.org/) (versión 16.9.0 o superior)

### 2. Instalar Dependencias
```powershell
npm install
```

### 3. Configurar Variables de Entorno
Copia el archivo `.env.example` y renómbralo a `.env`:
```powershell
Copy-Item .env.example .env
```

Edita el archivo `.env` y completa la información:
```env
DISCORD_TOKEN=tu_token_del_bot
CLIENT_ID=tu_client_id
GUILD_ID=id_de_tu_servidor
TICKET_CHANNEL_ID=id_del_canal_para_panel
TICKET_CATEGORY_ID=id_de_categoria_para_tickets
STAFF_ROLE_ID=id_del_rol_de_staff
```

## 🔧 Configuración en Discord Developer Portal

### Paso 1: Crear la Aplicación
1. Ve a [Discord Developer Portal](https://discord.com/developers/applications)
2. Haz clic en **"New Application"**
3. Dale un nombre: **"Inusual Boosting"**
4. Acepta los términos y haz clic en **"Create"**

### Paso 2: Configurar el Bot
1. En el menú lateral, ve a **"Bot"**
2. Haz clic en **"Add Bot"** y confirma
3. En **"TOKEN"**, haz clic en **"Reset Token"** y copia el token
4. Pega este token en tu archivo `.env` en `DISCORD_TOKEN`

### Paso 3: Configurar Permisos del Bot
En la sección **"Privileged Gateway Intents"**, activa:
- ✅ **PRESENCE INTENT**
- ✅ **SERVER MEMBERS INTENT**
- ✅ **MESSAGE CONTENT INTENT**

### Paso 4: Configurar OAuth2
1. Ve a **"OAuth2"** > **"General"**
2. Copia el **"CLIENT ID"** y pégalo en tu `.env`
3. Ve a **"OAuth2"** > **"URL Generator"**
4. En **SCOPES**, selecciona:
   - ✅ `bot`
   - ✅ `applications.commands`
5. En **BOT PERMISSIONS**, selecciona:
   - ✅ Read Messages/View Channels
   - ✅ Send Messages
   - ✅ Manage Messages
   - ✅ Embed Links
   - ✅ Attach Files
   - ✅ Read Message History
   - ✅ Add Reactions
   - ✅ Manage Channels
   - ✅ Manage Roles

### Paso 5: Invitar el Bot a tu Servidor
1. Copia la URL generada en el URL Generator
2. Pégala en tu navegador
3. Selecciona tu servidor
4. Autoriza los permisos
5. Completa el CAPTCHA

## 📝 Obtener IDs de Discord

### Para obtener IDs necesitas activar el Modo Desarrollador:
1. Abre Discord
2. Ve a **Configuración de Usuario** ⚙️
3. Ve a **Avanzado**
4. Activa **"Modo de Desarrollador"**

### Obtener IDs:
- **GUILD_ID**: Click derecho en tu servidor > Copiar ID
- **TICKET_CHANNEL_ID**: Click derecho en el canal donde quieres el panel > Copiar ID
- **TICKET_CATEGORY_ID**: Click derecho en una categoría > Copiar ID
- **STAFF_ROLE_ID**: Click derecho en el rol de staff > Copiar ID

## ▶️ Iniciar el Bot

```powershell
npm start
```

Si ves el mensaje `✅ Bot conectado como [nombre del bot]`, ¡está funcionando!

## 🎮 Uso del Bot

### Configurar el Panel de Tickets
En el canal donde quieres el panel, escribe:
```
!setup
```
*Solo administradores pueden usar este comando*

### Crear un Ticket
Los usuarios hacen clic en el botón **"🎫 Crear Ticket"** del panel

### Seleccionar Paquete
En el ticket, el usuario selecciona su paquete del menú desplegable

### Cerrar un Ticket
- Usar el comando: `!cerrar`
- O hacer clic en el botón **"🔒 Cerrar Ticket"**

## 📁 Estructura del Proyecto

```
Inusual BOT/
├── index.js           # Archivo principal del bot
├── config.json        # Configuración de paquetes y colores
├── package.json       # Dependencias del proyecto
├── .env              # Variables de entorno (crear desde .env.example)
├── .env.example      # Plantilla de variables de entorno
├── .gitignore        # Archivos a ignorar en git
└── README.md         # Este archivo
```

## 🎨 Personalización

### Cambiar Colores
Edita el archivo `config.json`:
```json
"colors": {
  "primary": "#E74C3C",
  "success": "#2ECC71",
  "info": "#3498DB",
  "warning": "#F39C12"
}
```

### Modificar Paquetes
Edita las opciones en `config.json` en la sección `boostOptions`

### Agregar Logo
En `index.js`, línea 53, reemplaza:
```javascript
.setThumbnail('https://i.imgur.com/your-logo.png')
```

## ⚠️ Solución de Problemas

### El bot no se conecta
- Verifica que el token en `.env` sea correcto
- Asegúrate de que los intents estén activados en Discord Developer Portal

### Los tickets no se crean
- Verifica que `TICKET_CATEGORY_ID` sea correcto
- Asegura que el bot tenga permisos para crear canales

### El rol de staff no puede ver los tickets
- Verifica que `STAFF_ROLE_ID` sea correcto
- Asegura que el bot tenga permisos para gestionar roles

## 📞 Soporte

Para ayuda adicional, contacta con el equipo de DevourServices.

## 📄 Licencia

MIT License - Libre para uso personal y comercial.

---

**Powered by DevourServices** 🔴
