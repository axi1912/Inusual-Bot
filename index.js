require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType, REST, Routes, AttachmentBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const path = require('path');
const config = require('./config.json');
const db = require('./Data/db-mongo');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Almacenamiento temporal de tickets activos
const activeTickets = new Map();

// Definir comandos slash
const commands = [
    {
        name: 'setup-tickets',
        description: 'Configurar el panel unificado de tickets (Soporte, Compras, Reportes)'
    },
    {
        name: 'setup-info-boosts',
        description: 'Mostrar información de Server Boosts'
    },
    {
        name: 'setup-info-bots',
        description: 'Mostrar información de Custom Bots'
    },
    {
        name: 'setup-info-nitro',
        description: 'Mostrar información de Nitro Tokens'
    },
    {
        name: 'setup-info-nitro-promo',
        description: 'Mostrar información de Nitro Promo (XBOX)'
    },
    {
        name: 'setup-info-afk',
        description: 'Mostrar información de AFK Tool'
    },
    {
        name: 'setup-info-lobby',
        description: 'Mostrar información de Bot Lobby Tool'
    },
    {
        name: 'setup-info-designs',
        description: 'Mostrar información de Discord Designs'
    },
    {
        name: 'setup-welcome',
        description: 'Configurar el sistema de bienvenida',
        options: [
            {
                name: 'canal',
                description: 'Canal donde se enviarán los mensajes de bienvenida',
                type: 7, // CHANNEL type
                required: true
            }
        ]
    },
    {
        name: 'embed',
        description: 'Crear un mensaje embed personalizado',
        options: [
            {
                name: 'canal',
                description: 'Canal donde enviar el mensaje',
                type: 7, // CHANNEL type
                required: true
            },
            {
                name: 'preset',
                description: 'Usar un diseño predefinido',
                type: 3,
                required: false,
                choices: [
                    { name: 'Precios - Factory Boosts', value: 'precios' },
                    { name: 'Custom Bots - Servicios', value: 'custombots' },
                    { name: 'FAQs - Factory Boosts', value: 'faqs' },
                    { name: 'Anuncio Simple', value: 'anuncio' }
                ]
            },
            {
                name: 'titulo',
                description: 'Título del embed',
                type: 3, // STRING type
                required: false
            },
            {
                name: 'descripcion',
                description: 'Descripción del embed',
                type: 3,
                required: false
            },
            {
                name: 'color',
                description: 'Color del embed (hex, ej: #00D9A3)',
                type: 3,
                required: false
            },
            {
                name: 'imagen',
                description: 'URL de la imagen principal',
                type: 3,
                required: false
            },
            {
                name: 'thumbnail',
                description: 'URL de la imagen pequeña (thumbnail)',
                type: 3,
                required: false
            },
            {
                name: 'footer',
                description: 'Texto del footer',
                type: 3,
                required: false
            }
        ]
    },
    {
        name: 'testwelcome',
        description: 'Probar el mensaje de bienvenida en el canal actual'
    },
    {
        name: 'send-key',
        description: 'Enviar una licencia a un usuario por DM',
        options: [
            {
                name: 'usuario',
                description: 'Usuario que recibirá la licencia',
                type: 6,
                required: true
            },
            {
                name: 'key',
                description: 'Clave de licencia',
                type: 3,
                required: true
            },
            {
                name: 'idioma',
                description: 'Idioma del mensaje',
                type: 3,
                required: false,
                choices: [
                    { name: 'Español', value: 'es' },
                    { name: 'English', value: 'en' }
                ]
            }
        ]
    }
];

client.once('ready', async () => {
    console.log(`✅ Bot conectado como ${client.user.tag}`);
    console.log(`🚀 Bot listo para gestionar tickets de Factory Boosts`);
    
    // Conectar a MongoDB
    await db.connectDB();
    await db.initStats();
    
    // Establecer estado de actividad
    client.user.setPresence({
        activities: [{ name: 'Boosting Services', type: 0 }], // Type 0 = PLAYING
        status: 'dnd' // Do Not Disturb (rojo)
    });
    
    // Registrar comandos slash
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    
    try {
        console.log('📝 Registrando comandos slash...');
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands }
        );
        console.log('✅ Comandos slash registrados correctamente');
    } catch (error) {
        console.error('❌ Error al registrar comandos:', error);
    }
});

// ==================== SISTEMA DE BIENVENIDA ====================

// ==================== SISTEMA DE BIENVENIDA SIMPLIFICADO ====================

// Evento cuando un nuevo miembro se une al servidor
client.on('guildMemberAdd', async (member) => {
    if (!config.welcome.enabled) return;
    
    // Verificar si hay un canal configurado
    if (!config.welcome.channelId) {
        console.log('⚠️ Canal de bienvenida no configurado');
        return;
    }
    
    const welcomeChannel = member.guild.channels.cache.get(config.welcome.channelId);
    if (!welcomeChannel) {
        console.log('❌ No se encontró el canal de bienvenida');
        return;
    }
    
    // Crear el embed de bienvenida
    const welcomeEmbed = new EmbedBuilder()
        .setColor(config.welcome.color)
        .setTitle(config.welcome.title)
        .setDescription(`Hey ${member.user}\n${config.welcome.description}`)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setImage(config.welcome.image)
        .setFooter({ text: config.welcome.footer });
    
    // Crear botón para la página web
    const components = [];
    if (config.welcome.websiteButton && config.welcome.websiteUrl) {
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('🌐 Website')
                    .setURL(config.welcome.websiteUrl)
                    .setStyle(ButtonStyle.Link)
            );
        components.push(row);
    }
    
    try {
        await welcomeChannel.send({ 
            embeds: [welcomeEmbed],
            components: components
        });
        console.log(`✅ Mensaje de bienvenida enviado para ${member.user.tag}`);
    } catch (error) {
        console.error('❌ Error al enviar mensaje de bienvenida:', error);
    }
});

// ==================== FIN SISTEMA DE BIENVENIDA ====================

// Función para crear el panel de tickets
async function setupTicketPanel(channel) {
    const embed = new EmbedBuilder()
        .setColor('#00D9A3')
        .setTitle('Server Boosts')
        .setDescription('**Boost your Discord server with our reliable service.**\n\nChoose from 1 Month or 3 Month durations.\nPackages available: 6, 8, or 14 boosts.\n\nPrices starting at $5 for 1 month.\nSelect your package below to create a ticket.')
        .setImage('https://cdn.discordapp.com/attachments/1309783318031503384/1447815600905916538/NITRO_BOOSTS.gif?ex=6938feda&is=6937ad5a&hm=b800e00ab3b7326b1209675bce9b5abdc5f7ca3a1304dc56d6e0911ae3ae72e8&')
        .setFooter({ text: '👑 Factory Boosts • Trusted Service' })
        .setTimestamp();

    const row = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('boost_panel_menu')
                .setPlaceholder('Select a Server Boost package')
                .addOptions(
                    config.boostOptions.map(option => ({
                        label: option.label,
                        description: option.description,
                        value: option.value
                    }))
                )
        );

    await channel.send({ embeds: [embed], components: [row] });
}

// Función para crear el panel de Custom Bots
async function setupBotsPanel(channel) {
    const embed = new EmbedBuilder()
        .setColor('#00D9A3')
        .setTitle('Custom Discord Bots')
        .setDescription('**Professional bot development tailored to your needs.**\n\nWe create custom bots with any features you want.\nFrom simple moderation to complex systems.\n\nPrices start at $15 for basic bots.\nSelect the type that fits your project below.')
        .setImage('https://cdn.discordapp.com/attachments/1309783318031503384/1447815599957872793/CUSTOM_BOTS.gif?ex=6938feda&is=6937ad5a&hm=2e541bad78f18481c616c26b07bc4c22c74c424ff9670d342390f80c7661bcf8&')
        .setFooter({ text: '🤖 Factory Development • Quality Custom Bots' });

    const row = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('bot_panel_menu')
                .setPlaceholder('Select bot type')
                .addOptions(
                    config.botOptions.map(option => ({
                        label: option.label,
                        description: option.description,
                        value: option.value
                    }))
                )
        );

    await channel.send({ embeds: [embed], components: [row] });
}

// Función para crear el panel de Nitro Tokens
async function setupNitroPanel(channel) {
    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('Discord Nitro Tokens')
        .setDescription('**Get Discord Nitro at affordable prices.**\n\nReceive your token instantly after payment.\nWorks with any Discord account.\n\n1 Month - $1.50\n3 Months - $4.00\n\nSelect your duration below to get started.')
        .setImage('https://cdn.discordapp.com/attachments/1309783318031503384/1447815600461316106/NITRO_TOKENS.gif?ex=6938feda&is=6937ad5a&hm=17ca989428bcd27ad6b735f7cad7e8b686fbb691ae62c07fa7410f1a4c62feb8&')
        .setFooter({ text: '💎 Factory Boosts • Instant Delivery' })
        .setTimestamp();

    const row = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('nitro_panel_menu')
                .setPlaceholder('Select Nitro duration')
                .addOptions(
                    config.nitroOptions.map(option => ({
                        label: option.label,
                        description: option.description,
                        value: option.value
                    }))
                )
        );

    await channel.send({ embeds: [embed], components: [row] });
}

// Función para crear el panel de AFK Tool
async function setupAFKPanel(channel) {
    const embed = new EmbedBuilder()
        .setColor('#00D9A3')
        .setTitle('AFK Tool - Game Farming')
        .setDescription('**Automated game farming made easy.**\n\nSafe, undetectable, and fast rank progression.\n24/7 support included.\n\nSubscriptions: 7 days ($5) to Lifetime ($50)\n\nClick below to create a ticket and get started.')
        .setFooter({ text: '🎮 Factory Tools • Professional AFK Service' })
        .setTimestamp();

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('create_ticket_afk')
                .setLabel('🎮 AFK Tool')
                .setStyle(ButtonStyle.Secondary)
        );

    await channel.send({ embeds: [embed], components: [row] });
}

// Función para crear el panel de HWID Reset
async function setupHWIDPanel(channel) {
    const embed = new EmbedBuilder()
        .setColor('#E74C3C')
        .setTitle('🔄 HWID Reset Service')
        .setDescription('**Reset your Hardware ID instantly.**\n\nCompatible with AFK Tool and Bot Lobby Tool.\nQuick and secure HWID reset process.\n\nService available 24/7 with immediate processing.\nSupport for multiple tools and platforms.\n\nClick below to create a ticket and request a reset.')
        .setFooter({ text: '🔄 Factory Tools • HWID Reset Service' })
        .setTimestamp();

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('create_ticket_hwid')
                .setLabel('🔄 HWID Reset')
                .setStyle(ButtonStyle.Secondary)
        );

    await channel.send({ embeds: [embed], components: [row] });
}

// Función para crear el panel de Discord Designs
async function setupDesignsPanel(channel) {
    const embed = new EmbedBuilder()
        .setColor('#F1C40F')
        .setTitle('🎨 Discord Designs Service')
        .setDescription('**Professional Discord server designs.**\n\nCustom banners, icons, and complete server themes.\nProfessional emojis and stickers design.\n\nFast delivery with unlimited revisions.\nUnique designs tailored to your brand.\n\nClick below to create a ticket and request a design.')
        .setFooter({ text: '🎨 Factory Discord Designs' })
        .setTimestamp();

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('create_ticket_designs')
                .setLabel('🎨 Discord Designs')
                .setStyle(ButtonStyle.Secondary)
        );

    await channel.send({ embeds: [embed], components: [row] });
}

// Función para crear el panel de Bot Lobby Tool
async function setupLobbyPanel(channel) {
    const embed = new EmbedBuilder()
        .setColor('#9B59B6')
        .setTitle('Bot Lobby Tool')
        .setDescription('**Professional lobby management system for your game.**\n\nAutomated lobby creation and smart player management.\nMulti-platform support with 24/7 uptime guarantee.\n\nEnterprise-grade security and instant setup.\nDedicated priority support included.\n\nClick below to create a ticket and get started.')
        .setFooter({ text: '🎯 Factory Tools • Premium Lobby Solutions' })
        .setTimestamp();

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('create_ticket_lobby')
                .setLabel('🎯 Bot Lobby Tool')
                .setStyle(ButtonStyle.Secondary)
        );

    await channel.send({ embeds: [embed], components: [row] });
}

// Función para crear el panel de Nitro Promo (XBOX)
async function setupNitroPromoPanel(channel) {
    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('💎 3 Months Discord NITRO Promo (XBOX)')
        .setDescription('**Get 3 months of Discord Nitro through Xbox Game Pass promotion.**\n\n🎮 **What you need:**\n• A Discord account that has **NEVER** had Nitro before\n• Xbox Game Pass Ultimate subscription\n\n⚠️ **Important Requirements:**\n• Account must be completely new to Nitro\n• Cannot have used any Nitro trial previously\n• No expired Nitro subscriptions on the account\n\n✅ **What you get:**\n• Full Discord Nitro for 3 months\n• All premium features included\n• Instant activation\n\n💰 **Price: $3**\n\nClick below to create a ticket and claim your promo.')
        .setFooter({ text: '💎 Factory Boosts • Premium Nitro Service' })
        .setTimestamp();

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('create_ticket_nitro_promo')
                .setLabel('💎 Nitro Promo (XBOX)')
                .setStyle(ButtonStyle.Primary)
        );

    await channel.send({ embeds: [embed], components: [row] });
}

// ==================== NUEVO SISTEMA UNIFICADO DE TICKETS ====================

// Función para crear el panel unificado de tickets
async function setupUnifiedTicketPanel(channel) {
    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('🎫 Ticket Support - Factory Boosts')
        .setDescription('If you have any questions, general inquiries, need to report someone, or wish to make a purchase, please don\'t hesitate to open a ticket. We are here to help you and ensure your experience is as smooth and satisfactory as possible. Your satisfaction is our priority, and our team will be happy to assist you as soon as possible.')
        .setThumbnail(channel.guild.iconURL({ dynamic: true }))
        .setFooter({ text: '🎫 Factory Boosts • Ticket System' })
        .setTimestamp();

    const row1 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_asistencia')
                .setLabel('🎫 General Support')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('ticket_compra')
                .setLabel('💰 Purchase Product')
                .setStyle(ButtonStyle.Success)
        );

    const row2 = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_reporte')
                .setLabel('⚠️ Report Issue')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('ticket_hwid')
                .setLabel('🔄 HWID Reset')
                .setStyle(ButtonStyle.Primary)
        );

    await channel.send({ embeds: [embed], components: [row1, row2] });
}

// Funciones para crear embeds informativos (sin botones)
async function setupBoostInfoPanel(channel) {
    const embed = new EmbedBuilder()
        .setColor('#00D9A3')
        .setTitle('Server Boosts')
        .setDescription('**Boost your Discord server with our reliable service.**\n\nChoose from 1 Month or 3 Month durations.\nPackages available: 6, 8, or 14 boosts.\n\nPrices starting at $5 for 1 month.')
        .setImage('https://cdn.discordapp.com/attachments/1309783318031503384/1447815600905916538/NITRO_BOOSTS.gif?ex=6938feda&is=6937ad5a&hm=b800e00ab3b7326b1209675bce9b5abdc5f7ca3a1304dc56d6e0911ae3ae72e8&')
        .setFooter({ text: '👑 Factory Boosts • Trusted Service' })
        .setTimestamp();
    await channel.send({ embeds: [embed] });
}

async function setupBotsInfoPanel(channel) {
    const embed = new EmbedBuilder()
        .setColor('#00D9A3')
        .setTitle('Custom Discord Bots')
        .setDescription('**Professional bot development tailored to your needs.**\n\nWe create custom bots with any features you want.\nFrom simple moderation to complex systems.\n\nPrices start at $15 for basic bots.')
        .setImage('https://cdn.discordapp.com/attachments/1309783318031503384/1447815599957872793/CUSTOM_BOTS.gif?ex=6938feda&is=6937ad5a&hm=2e541bad78f18481c616c26b07bc4c22c74c424ff9670d342390f80c7661bcf8&')
        .setFooter({ text: '🤖 Factory Development • Quality Custom Bots' })
        .setTimestamp();
    await channel.send({ embeds: [embed] });
}

async function setupNitroInfoPanel(channel) {
    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('Discord Nitro Tokens')
        .setDescription('**Get Discord Nitro at affordable prices.**\n\nReceive your token instantly after payment.\nWorks with any Discord account.\n\n1 Month - $1.50\n3 Months - $4.00')
        .setImage('https://cdn.discordapp.com/attachments/1309783318031503384/1447815600461316106/NITRO_TOKENS.gif?ex=6938feda&is=6937ad5a&hm=17ca989428bcd27ad6b735f7cad7e8b686fbb691ae62c07fa7410f1a4c62feb8&')
        .setFooter({ text: '💎 Factory Boosts • Instant Delivery' })
        .setTimestamp();
    await channel.send({ embeds: [embed] });
}

async function setupNitroPromoInfoPanel(channel) {
    const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('💎 3 Months Discord NITRO Promo (XBOX)')
        .setDescription('**Get 3 months of Discord Nitro through Xbox Game Pass promotion.**\n\n🎮 **What you need:**\n• A Discord account that has **NEVER** had Nitro before\n• Xbox Game Pass Ultimate subscription\n\n⚠️ **Important Requirements:**\n• Account must be completely new to Nitro\n• Cannot have used any Nitro trial previously\n• No expired Nitro subscriptions on the account\n\n✅ **What you get:**\n• Full Discord Nitro for 3 months\n• All premium features included\n• Instant activation\n\n💰 **Price: $3**')
        .setFooter({ text: '💎 Factory Boosts • Premium Nitro Service' })
        .setTimestamp();
    await channel.send({ embeds: [embed] });
}

async function setupAFKInfoPanel(channel) {
    const embed = new EmbedBuilder()
        .setColor('#00D9A3')
        .setTitle('AFK Tool - Game Farming')
        .setDescription('**Automated game farming made easy.**\n\nSafe, undetectable, and fast rank progression.\n24/7 support included.\n\nSubscriptions: 7 days ($5) to Lifetime ($50)')
        .setFooter({ text: '🎮 Factory Tools • Professional AFK Service' })
        .setTimestamp();
    await channel.send({ embeds: [embed] });
}

async function setupLobbyInfoPanel(channel) {
    const embed = new EmbedBuilder()
        .setColor('#9B59B6')
        .setTitle('Bot Lobby Tool')
        .setDescription('**Professional lobby management system for your game.**\n\nAutomated lobby creation and smart player management.\nMulti-platform support with 24/7 uptime guarantee.\n\nEnterprise-grade security and instant setup.\nDedicated priority support included.')
        .setFooter({ text: '🎯 Factory Tools • Premium Lobby Solutions' })
        .setTimestamp();
    await channel.send({ embeds: [embed] });
}

async function setupDesignsInfoPanel(channel) {
    const embed = new EmbedBuilder()
        .setColor('#F1C40F')
        .setTitle('🎨 Discord Designs Service')
        .setDescription('**Professional Discord server designs.**\n\nCustom banners, icons, and complete server themes.\nProfessional emojis and stickers design.\n\nFast delivery with unlimited revisions.\nUnique designs tailored to your brand.')
        .setFooter({ text: '🎨 Factory Discord Designs' })
        .setTimestamp();
    await channel.send({ embeds: [embed] });
}

// ==================== FIN EMBEDS INFORMATIVOS ====================

// Función para crear embeds personalizados
async function handleEmbedCommand(interaction) {
    try {
        const canal = interaction.options.getChannel('canal');
        const preset = interaction.options.getString('preset');
        
        // Si se seleccionó un preset
        if (preset === 'precios') {
            const embed = new EmbedBuilder()
                .setColor('#00D9A3')
                .setTitle('FACTORY BOOSTS - SERVER BOOSTS')
                .setDescription('━━━━━━━━━━━━━━━━━━━━━━━━━')
                .addFields(
                    {
                        name: '\n🟢 1 MONTH SERVER BOOSTS\n',
                        value: '```fix\n• 6 Server Boosts  → 5$\n• 8 Server Boosts  → 7$\n• 14 Server Boosts → 11$\n```',
                        inline: false
                    },
                    {
                        name: '\n🔵 3 MONTH SERVER BOOSTS\n',
                        value: '```fix\n• 6 Server Boosts  → 15$\n• 8 Server Boosts  → 20$\n• 14 Server Boosts → 35$\n```',
                        inline: false
                    }
                )
                .setImage('https://cdn.discordapp.com/attachments/1309783318031503384/1447815600905916538/NITRO_BOOSTS.gif?ex=6938feda&is=6937ad5a&hm=b800e00ab3b7326b1209675bce9b5abdc5f7ca3a1304dc56d6e0911ae3ae72e8&')
                .setFooter({ text: '👑 Factory Boosts • Trusted Service' });
            
            await canal.send({ embeds: [embed] });
            return interaction.reply({ content: `✅ Mensaje de precios enviado a ${canal}`, ephemeral: true });
        }
        
        // Preset de Custom Bots
        if (preset === 'custombots') {
            const embed = new EmbedBuilder()
                .setColor('#00D9A3')
                .setTitle('🤖 CUSTOM DISCORD BOTS')
                .setDescription('━━━━━━━━━━━━━━━━━━━━━━━━━')
                .addFields(
                    {
                        name: '\n📋 ABOUT\n',
                        value: '```\nProfessional Discord Bot Development\nWe create custom bots tailored to your\nserver needs! Any feature, any\nfunctionality, fully customized.\n```',
                        inline: false
                    },
                    {
                        name: '\n💰 PRICING\n',
                        value: '```fix\n• Basic Bot      → Starting at 15$\n• Advanced Bot   → Starting at 30$\n• Premium Bot    → Starting at 50$\n• Custom Quote   → Contact us\n```',
                        inline: false
                    },
                    {
                        name: '\n\n📦 WHAT\'S INCLUDED\n',
                        value: '```fix\n• Basic    → Simple commands & moderation\n• Advanced → Multiple systems & economy\n• Premium  → Full customization & features\n• Custom   → Unique & complex projects\n```',
                        inline: false
                    }
                )
                .setImage('https://cdn.discordapp.com/attachments/1309783318031503384/1447815599957872793/CUSTOM_BOTS.gif?ex=6938feda&is=6937ad5a&hm=2e541bad78f18481c616c26b07bc4c22c74c424ff9670d342390f80c7661bcf8&')
                .setFooter({ text: '🤖 Factory Development • Quality Custom Bots' });
            
            await canal.send({ embeds: [embed] });
            return interaction.reply({ content: `✅ Mensaje de custom bots enviado a ${canal}`, ephemeral: true });
        }
        
        // Preset de FAQs
        if (preset === 'faqs') {
            const embed = new EmbedBuilder()
                .setColor('#00D9A3')
                .setTitle('❓ FREQUENTLY ASKED QUESTIONS')
                .setDescription('**Everything you need to know about Factory Boosts**\n\u200B')
                .addFields(
                    {
                        name: '\n🚀 What are Server Boosts?\n',
                        value: 'Server Boosts unlock premium features for your Discord server:\n```\n• Better audio quality\n• Custom server banner\n• More emoji slots\n• Increased upload limit\n```',
                        inline: false
                    },
                    {
                        name: '\n⏱️ How long do boosts last?\n',
                        value: 'We offer boosts in **1 month** and **3 months** duration.\nThe boost timer starts immediately after activation.\n\u200B',
                        inline: false
                    },
                    {
                        name: '\n💳 What payment methods do you accept?\n',
                        value: 'We accept **PayPal** and **Binance** (crypto).\nAll payments are secure and processed instantly.\n\u200B',
                        inline: false
                    },
                    {
                        name: '\n📦 How do I receive my boosts?\n',
                        value: '**After payment confirmation:**\n```\n1. You provide your server invite\n2. Our team activates the boosts\n3. Delivery time: 5-15 minutes\n```',
                        inline: false
                    },
                    {
                        name: '\n🔒 Are the boosts safe?\n',
                        value: 'Yes! All our boosts are **100% legitimate** and comply with Discord Terms of Service.\nYour server is completely safe.\n\u200B',
                        inline: false
                    },
                    {
                        name: '\n🔄 What if a boost drops?\n',
                        value: 'If any boost drops during the purchased period, we will **replace it for free** within 24 hours.\nWe guarantee full coverage.\n\u200B',
                        inline: false
                    },
                    {
                        name: '\n💬 How do I place an order?\n',
                        value: 'Simply click the **"Start Purchase"** button in our tickets channel, select your package, and our staff will assist you immediately.\n\u200B',
                        inline: false
                    },
                    {
                        name: '\n🎫 Need more help?\n',
                        value: 'Create a ticket and our support team will answer all your questions!',
                        inline: false
                    }
                )
                .setFooter({ text: '👑 Factory Boosts • Your Trusted Boosting Service' })
                .setTimestamp();
            
            await canal.send({ embeds: [embed] });
            return interaction.reply({ content: `✅ Mensaje de FAQs enviado a ${canal}`, ephemeral: true });
        }
        
        // Embed personalizado normal
        const titulo = interaction.options.getString('titulo');
        const descripcion = interaction.options.getString('descripcion');
        const color = interaction.options.getString('color') || '#00D9A3';
        const imagen = interaction.options.getString('imagen');
        const thumbnail = interaction.options.getString('thumbnail');
        const footer = interaction.options.getString('footer') || 'Factory Boosts';

        if (!titulo && !descripcion) {
            return interaction.reply({ 
                content: '❌ Debes proporcionar al menos un título o descripción, o usar un preset.', 
                ephemeral: true 
            });
        }

        // Crear el embed
        const embed = new EmbedBuilder()
            .setColor(color)
            .setFooter({ text: footer })
            .setTimestamp();
        
        if (titulo) embed.setTitle(titulo);
        if (descripcion) embed.setDescription(descripcion);

        // Agregar imagen si se proporcionó
        if (imagen) {
            embed.setImage(imagen);
        }

        // Agregar thumbnail si se proporcionó
        if (thumbnail) {
            embed.setThumbnail(thumbnail);
        }

        // Enviar el embed al canal especificado
        await canal.send({ embeds: [embed] });

        // Confirmar al usuario
        await interaction.reply({ 
            content: `✅ Mensaje embed enviado a ${canal}`, 
            ephemeral: true 
        });

    } catch (error) {
        console.error('Error al crear embed:', error);
        await interaction.reply({ 
            content: '❌ Hubo un error al crear el embed. Verifica que las URLs de imágenes sean válidas.', 
            ephemeral: true 
        });
    }
}

// ==================== DETECTOR DE "HUMAN" EN TICKETS ====================
client.on('messageCreate', async (message) => {
    // Ignorar mensajes del bot
    if (message.author.bot) return;
    
    // Verificar si el mensaje es en un canal de ticket
    const isTicketChannel = message.channel.name && (
        message.channel.name.startsWith('purchase-') || 
        message.channel.name.startsWith('tokens-') ||
        message.channel.name.startsWith('afk-') ||
        message.channel.name.startsWith('hwid-') ||
        message.channel.name.startsWith('lobby-') ||
        message.channel.name.startsWith('soporte-') ||
        message.channel.name.startsWith('reporte-') ||
        message.channel.name.startsWith('designs-') ||
        message.channel.name.startsWith('nitro-promo-') ||
        message.channel.name.startsWith('ticket-')
    );
    
    if (!isTicketChannel) return;
    
    // Detectar si el usuario escribe "human"
    if (message.content.toLowerCase().trim() === 'human') {
        // Obtener los roles de staff específicos
        const staffRole1 = message.guild.roles.cache.get(process.env.STAFF_ROLE_ID_1);
        const staffRole2 = message.guild.roles.cache.get(process.env.STAFF_ROLE_ID_2);
        
        // Crear menciones de los roles
        const mentions = [];
        if (staffRole1) mentions.push(`${staffRole1}`);
        if (staffRole2) mentions.push(`${staffRole2}`);
        const mentionText = mentions.length > 0 ? mentions.join(' ') : '@Staff';
        
        const notificationEmbed = new EmbedBuilder()
            .setColor('#FF6B6B')
            .setAuthor({ 
                name: 'Human Support Requested', 
                iconURL: message.author.displayAvatarURL() 
            })
            .setDescription(`🚨 **${message.author} has requested human support.**\n\n${mentionText} - Please assist this customer.`)
            .setFooter({ text: '⚡ Priority Support Request' })
            .setTimestamp();
        
        await message.channel.send({ 
            content: mentionText,
            embeds: [notificationEmbed] 
        });
        
        // Confirmar al usuario
        await message.reply('✅ **A staff member has been notified and will assist you shortly!**');
    }
});

// Manejo ÚNICO de todas las interacciones
client.on('interactionCreate', async (interaction) => {
    try {
        // Prevenir procesamiento duplicado
        if (interaction.replied || interaction.deferred) {
            console.log('⚠️ Interacción ya procesada, ignorando...');
            return;
        }

        // Comandos slash
        if (interaction.isChatInputCommand()) {
            if (interaction.commandName === 'setup-tickets') {
                // Verificar que sea administrador
                if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return interaction.reply({ 
                        content: '❌ Solo los administradores pueden usar este comando.', 
                        ephemeral: true 
                    });
                }
                
                // Responder INMEDIATAMENTE
                await interaction.reply({ content: '⏳ Creando panel unificado de tickets...', ephemeral: true });
                await setupUnifiedTicketPanel(interaction.channel);
                await interaction.editReply({ content: '✅ Panel unificado de tickets creado correctamente!' });
            }
            
            if (interaction.commandName === 'setup-info-boosts') {
                // Verificar que sea administrador
                if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return interaction.reply({ 
                        content: '❌ Solo los administradores pueden usar este comando.', 
                        ephemeral: true 
                    });
                }
                
                // Responder INMEDIATAMENTE
                await interaction.reply({ content: '⏳ Mostrando información de Server Boosts...', ephemeral: true });
                await setupBoostInfoPanel(interaction.channel);
                await interaction.editReply({ content: '✅ Información de Server Boosts publicada!' });
            }
            
            if (interaction.commandName === 'setup-info-bots') {
                // Verificar que sea administrador
                if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return interaction.reply({ 
                        content: '❌ Solo los administradores pueden usar este comando.', 
                        ephemeral: true 
                    });
                }
                
                // Responder INMEDIATAMENTE
                await interaction.reply({ content: '⏳ Mostrando información de Custom Bots...', ephemeral: true });
                await setupBotsInfoPanel(interaction.channel);
                await interaction.editReply({ content: '✅ Información de Custom Bots publicada!' });
            }
            
            if (interaction.commandName === 'setup-info-nitro') {
                // Verificar que sea administrador
                if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return interaction.reply({ 
                        content: '❌ Solo los administradores pueden usar este comando.', 
                        ephemeral: true 
                    });
                }
                
                // Responder INMEDIATAMENTE
                await interaction.reply({ content: '⏳ Mostrando información de Nitro Tokens...', ephemeral: true });
                await setupNitroInfoPanel(interaction.channel);
                await interaction.editReply({ content: '✅ Información de Nitro Tokens publicada!' });
            }
            
            if (interaction.commandName === 'setup-info-nitro-promo') {
                // Verificar que sea administrador
                if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return interaction.reply({ 
                        content: '❌ Solo los administradores pueden usar este comando.', 
                        ephemeral: true 
                    });
                }
                
                // Responder INMEDIATAMENTE
                await interaction.reply({ content: '⏳ Mostrando información de Nitro Promo...', ephemeral: true });
                await setupNitroPromoInfoPanel(interaction.channel);
                await interaction.editReply({ content: '✅ Información de Nitro Promo publicada!' });
            }
            
            if (interaction.commandName === 'setup-info-afk') {
                // Verificar que sea administrador
                if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return interaction.reply({ 
                        content: '❌ Solo los administradores pueden usar este comando.', 
                        ephemeral: true 
                    });
                }
                
                // Responder INMEDIATAMENTE
                await interaction.reply({ content: '⏳ Mostrando información de AFK Tool...', ephemeral: true });
                await setupAFKInfoPanel(interaction.channel);
                await interaction.editReply({ content: '✅ Información de AFK Tool publicada!' });
            }
            
            if (interaction.commandName === 'setup-info-lobby') {
                // Verificar que sea administrador
                if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return interaction.reply({ 
                        content: '❌ Solo los administradores pueden usar este comando.', 
                        ephemeral: true 
                    });
                }
                
                // Responder INMEDIATAMENTE
                await interaction.reply({ content: '⏳ Mostrando información de Bot Lobby Tool...', ephemeral: true });
                await setupLobbyInfoPanel(interaction.channel);
                await interaction.editReply({ content: '✅ Información de Bot Lobby Tool publicada!' });
            }
            
            if (interaction.commandName === 'setup-info-designs') {
                // Verificar que sea administrador
                if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return interaction.reply({ 
                        content: '❌ Solo los administradores pueden usar este comando.', 
                        ephemeral: true 
                    });
                }
                
                // Responder INMEDIATAMENTE
                await interaction.reply({ content: '⏳ Mostrando información de Discord Designs...', ephemeral: true });
                await setupDesignsInfoPanel(interaction.channel);
                await interaction.editReply({ content: '✅ Información de Discord Designs publicada!' });
            }
            
            if (interaction.commandName === 'send-key') {
                // Verificar que sea administrador
                if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return interaction.reply({ 
                        content: '❌ Solo los administradores pueden usar este comando.', 
                        ephemeral: true 
                    });
                }
                
                const usuario = interaction.options.getUser('usuario');
                const key = interaction.options.getString('key');
                const idioma = interaction.options.getString('idioma') || 'es'; // Español por defecto
                
                // Responder inmediatamente
                await interaction.reply({ content: '⏳ Enviando licencia...', ephemeral: true });
                
                try {
                    let licenseEmbed;
                    
                    if (idioma === 'en') {
                        // Versión en inglés
                        licenseEmbed = new EmbedBuilder()
                            .setColor('#00D9A3')
                            .setTitle('🎉 Your Factory Boosts License!')
                            .setDescription('═══════════════════════════════════════════\n    **FACTORY BOOSTS - LICENSE KEY**\n═══════════════════════════════════════════\n\n✅ Thank you for your purchase\n\n🔑 **Your License:**\n```' + key + '```\n\n📋 **INSTRUCTIONS:**\n\n1. Run the installer\n2. Enter your license key\n3. Click "Activate"\n\n⚠️ **IMPORTANT:**\n• License is tied to your PC (HWID)\n• To change PC, request HWID reset\n\n📞 **SUPPORT:**\n• Discord: https://discord.gg/factoryboosts\n• Web: https://factoryboosts.covm\n• Available 24/7\n\n═══════════════════════════════════════════')
                            .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
                            .setFooter({ text: 'Factory Boosts - Licensing System' })
                            .setTimestamp();
                    } else {
                        // Versión en español
                        licenseEmbed = new EmbedBuilder()
                            .setColor('#00D9A3')
                            .setTitle('🎉 ¡Tu Licencia de Factory Boosts!')
                            .setDescription('═══════════════════════════════════════════\n    **FACTORY BOOSTS - CLAVE DE LICENCIA**\n═══════════════════════════════════════════\n\n✅ Gracias por tu compra\n\n🔑 **Tu Licencia:**\n```' + key + '```\n\n📋 **INSTRUCCIONES:**\n\n1. Ejecuta el instalador\n2. Ingresa tu clave de licencia\n3. Haz clic en "Activar"\n\n⚠️ **IMPORTANTE:**\n• La licencia está vinculada a tu PC (HWID)\n• Para cambiar de PC, solicita reset de HWID\n\n📞 **SOPORTE:**\n• Discord: https://discord.gg/factoryboosts\n• Web: https://factoryboosts.com\n• Disponible 24/7\n\n═══════════════════════════════════════════')
                            .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
                            .setFooter({ text: 'Factory Boosts - Sistema de Licencias' })
                            .setTimestamp();
                    }
                    
                    // Enviar DM al usuario
                    await usuario.send({ embeds: [licenseEmbed] });
                    
                    // Confirmar al admin
                    await interaction.editReply({ 
                        content: `✅ Licencia enviada correctamente a ${usuario.tag} (${idioma === 'en' ? 'English' : 'Español'})` 
                    });
                    
                } catch (error) {
                    console.error('Error al enviar licencia:', error);
                    await interaction.editReply({ 
                        content: `❌ No se pudo enviar el DM a ${usuario.tag}. Verifica que tenga los DMs abiertos.` 
                    });
                }
            }
            
            if (interaction.commandName === 'setup-welcome') {
                // Verificar que sea administrador
                if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return interaction.reply({ 
                        content: '❌ Solo los administradores pueden usar este comando.', 
                        ephemeral: true 
                    });
                }
                
                const canal = interaction.options.getChannel('canal');
                
                // Actualizar el config
                config.welcome.channelId = canal.id;
                
                // Guardar la configuración (aquí podrías guardar en un archivo JSON o base de datos)
                const fs = require('fs');
                fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
                
                // Crear un embed de preview
                const previewEmbed = new EmbedBuilder()
                    .setColor(config.welcome.color)
                    .setTitle('✅ Welcome System Configured')
                    .setDescription(`The welcome channel has been set to ${canal}\n\n**Message Preview:**`)
                    .addFields(
                        { name: '🎨 Color', value: config.welcome.color, inline: true },
                        { name: '📝 Status', value: 'Enabled ✅', inline: true },
                        { name: '📍 Channel', value: `${canal}`, inline: true }
                    )
                    .setFooter({ text: 'New members will receive this welcome message' })
                    .setTimestamp();
                
                await interaction.reply({ embeds: [previewEmbed], ephemeral: true });
            }
            
            if (interaction.commandName === 'embed') {
                // Verificar que sea administrador
                if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return interaction.reply({ 
                        content: '❌ Solo los administradores pueden usar este comando.', 
                        ephemeral: true 
                    });
                }
                
                await handleEmbedCommand(interaction);
            }

            if (interaction.commandName === 'testwelcome') {
                // Verificar que sea administrador
                if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return interaction.reply({ 
                        content: '❌ Solo los administradores pueden usar este comando.', 
                        ephemeral: true 
                    });
                }
                
                // Crear el embed de bienvenida de prueba
                const welcomeEmbed = new EmbedBuilder()
                    .setColor(config.welcome.color)
                    .setTitle(config.welcome.title)
                    .setDescription(`Hey ${interaction.user}\n${config.welcome.description}`)
                    .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true, size: 256 }))
                    .setImage(config.welcome.image)
                    .setFooter({ text: config.welcome.footer });
                
                // Crear botón para la página web
                const components = [];
                if (config.welcome.websiteButton && config.welcome.websiteUrl) {
                    const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setLabel('🌐 Website')
                                .setURL(config.welcome.websiteUrl)
                                .setStyle(ButtonStyle.Link)
                        );
                    components.push(row);
                }
                
                await interaction.reply({ 
                    embeds: [welcomeEmbed],
                    components: components
                });
            }
            return;
        }

        // Botones
        if (interaction.isButton()) {
            // Nuevos botones del panel unificado
            if (interaction.customId === 'ticket_asistencia') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_asistencia')
                    .setTitle('🎫 General Support');

                const asuntoInput = new TextInputBuilder()
                    .setCustomId('asunto_consulta')
                    .setLabel('Subject of your inquiry')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Ex: Question about boosts')
                    .setRequired(true)
                    .setMaxLength(100);

                const descripcionInput = new TextInputBuilder()
                    .setCustomId('descripcion_consulta')
                    .setLabel('Detailed description')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('Describe your question or inquiry here...')
                    .setRequired(true)
                    .setMaxLength(1000);

                const firstRow = new ActionRowBuilder().addComponents(asuntoInput);
                const secondRow = new ActionRowBuilder().addComponents(descripcionInput);

                modal.addComponents(firstRow, secondRow);
                await interaction.showModal(modal);
            } else if (interaction.customId === 'ticket_compra') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_compra')
                    .setTitle('💰 Purchase Product');

                const productoInput = new TextInputBuilder()
                    .setCustomId('producto_compra')
                    .setLabel('What product do you want to purchase?')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Ex: Server Boosts, Custom Bot, Nitro, AFK Tool, etc.')
                    .setRequired(true)
                    .setMaxLength(100);

                const detallesInput = new TextInputBuilder()
                    .setCustomId('detalles_compra')
                    .setLabel('Additional details')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('Specify the package or features you need...')
                    .setRequired(true)
                    .setMaxLength(1000);

                const firstRow = new ActionRowBuilder().addComponents(productoInput);
                const secondRow = new ActionRowBuilder().addComponents(detallesInput);

                modal.addComponents(firstRow, secondRow);
                await interaction.showModal(modal);
            } else if (interaction.customId === 'ticket_reporte') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_reporte')
                    .setTitle('⚠️ Report Issue');

                const tipoInput = new TextInputBuilder()
                    .setCustomId('tipo_problema')
                    .setLabel('Type of issue')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Ex: License error, technical problem, bug, etc.')
                    .setRequired(true)
                    .setMaxLength(100);

                const descripcionInput = new TextInputBuilder()
                    .setCustomId('descripcion_problema')
                    .setLabel('Issue description')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('Describe the problem in detail...')
                    .setRequired(true)
                    .setMaxLength(1000);

                const pasosInput = new TextInputBuilder()
                    .setCustomId('pasos_problema')
                    .setLabel('How to reproduce the issue? (Optional)')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('Steps to reproduce the error...')
                    .setRequired(false)
                    .setMaxLength(500);

                const firstRow = new ActionRowBuilder().addComponents(tipoInput);
                const secondRow = new ActionRowBuilder().addComponents(descripcionInput);
                const thirdRow = new ActionRowBuilder().addComponents(pasosInput);

                modal.addComponents(firstRow, secondRow, thirdRow);
                await interaction.showModal(modal);
            } else if (interaction.customId === 'ticket_hwid') {
                const modal = new ModalBuilder()
                    .setCustomId('modal_hwid')
                    .setTitle('🔄 HWID Reset');

                const productoInput = new TextInputBuilder()
                    .setCustomId('producto_hwid')
                    .setLabel('Product')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Ex: AFK Tool, Bot Lobby Tool, etc.')
                    .setRequired(true)
                    .setMaxLength(100);

                const hwidInput = new TextInputBuilder()
                    .setCustomId('hwid_actual')
                    .setLabel('Your current HWID (if you have it)')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Current HWID linked to your license')
                    .setRequired(false)
                    .setMaxLength(200);

                const razonInput = new TextInputBuilder()
                    .setCustomId('razon_hwid')
                    .setLabel('Reason for reset')
                    .setStyle(TextInputStyle.Paragraph)
                    .setPlaceholder('Ex: Changed PC, formatted, etc.')
                    .setRequired(true)
                    .setMaxLength(500);

                const firstRow = new ActionRowBuilder().addComponents(productoInput);
                const secondRow = new ActionRowBuilder().addComponents(hwidInput);
                const thirdRow = new ActionRowBuilder().addComponents(razonInput);

                modal.addComponents(firstRow, secondRow, thirdRow);
                await interaction.showModal(modal);
            }
            // Botones antiguos (mantener compatibilidad)
            else if (interaction.customId === 'create_ticket') {
                // Responder INMEDIATAMENTE
                await interaction.reply({ content: '⏳ Creando tu ticket...', ephemeral: true });
                await handleTicketCreation(interaction, 'boost');
            } else if (interaction.customId === 'create_ticket_bot') {
                // Responder INMEDIATAMENTE
                await interaction.reply({ content: '⏳ Creando tu ticket...', ephemeral: true });
                await handleTicketCreation(interaction, 'bot');
            } else if (interaction.customId === 'create_ticket_nitro') {
                // Responder INMEDIATAMENTE
                await interaction.reply({ content: '⏳ Creando tu ticket...', ephemeral: true });
                await handleTicketCreation(interaction, 'nitro');
            } else if (interaction.customId === 'create_ticket_afk') {
                // Responder INMEDIATAMENTE
                await interaction.reply({ content: '⏳ Creando tu ticket...', ephemeral: true });
                await handleTicketCreation(interaction, 'afk');
            } else if (interaction.customId === 'create_ticket_lobby') {
                // Responder INMEDIATAMENTE
                await interaction.reply({ content: '⏳ Creando tu ticket de Bot Lobby Tool...', ephemeral: true });
                await handleTicketCreation(interaction, 'lobby');
            } else if (interaction.customId === 'create_ticket_hwid') {
                // Responder INMEDIATAMENTE
                await interaction.reply({ content: '⏳ Creando tu ticket de HWID Reset...', ephemeral: true });
                await handleTicketCreation(interaction, 'hwid');
            } else if (interaction.customId === 'create_ticket_designs') {
                // Responder INMEDIATAMENTE
                await interaction.reply({ content: '⏳ Creando tu ticket de Discord Designs...', ephemeral: true });
                await handleTicketCreation(interaction, 'designs');
            } else if (interaction.customId === 'create_ticket_nitro_promo') {
                // Responder INMEDIATAMENTE
                await interaction.reply({ content: '⏳ Creando tu ticket de Nitro Promo...', ephemeral: true });
                await handleTicketCreation(interaction, 'nitro_promo');
            } else if (interaction.customId === 'close_ticket') {
                await closeTicketButton(interaction);
            } else if (interaction.customId === 'close_confirm') {
                await confirmCloseTicket(interaction);
            } else if (interaction.customId === 'close_cancel') {
                await interaction.update({ content: '❌ Cierre de ticket cancelado.', components: [] });
            } else if (interaction.customId === 'read_rules') {
                // Botón de leer reglas del mensaje de bienvenida
                await interaction.reply({ 
                    content: '📖 Por favor revisa el canal de reglas para conocer las normas del servidor.', 
                    ephemeral: true 
                });
            } else if (interaction.customId === 'view_services') {
                // Botón de ver servicios del mensaje de bienvenida
                const servicesEmbed = new EmbedBuilder()
                    .setColor('#00D9A3')
                    .setTitle('💎 Nuestros Servicios')
                    .setDescription('━━━━━━━━━━━━━━━━━━━━━━━━━')
                    .addFields(
                        {
                            name: '🚀 Server Boosts',
                            value: '```\n• 6 Boosts (1 mes)  → 5$\n• 8 Boosts (1 mes)  → 7$\n• 14 Boosts (1 mes) → 11$\n• 6 Boosts (3 meses) → 15$\n• 8 Boosts (3 meses) → 20$\n• 14 Boosts (3 meses) → 35$\n```',
                            inline: false
                        },
                        {
                            name: '🤖 Custom Bots',
                            value: '```\n• Basic Bot    → Desde 15$\n• Advanced Bot → Desde 30$\n• Premium Bot  → Desde 50$\n```',
                            inline: false
                        }
                    )
                    .setFooter({ text: '🎫 Crea un ticket para más información' })
                    .setTimestamp();
                
                await interaction.reply({ embeds: [servicesEmbed], ephemeral: true });
            } else if (interaction.customId === 'contact_support') {
                // Botón de contactar soporte del mensaje de bienvenida
                const supportEmbed = new EmbedBuilder()
                    .setColor('#00D9A3')
                    .setTitle('📞 Contact Support')
                    .setDescription('Need help? Our support team is here for you!')
                    .addFields(
                        {
                            name: '🎫 Create a Ticket',
                            value: 'Click one of the buttons below to open a ticket:\n• 🚀 **Server Boosts** - For boost purchases\n• 🤖 **Custom Bots** - For bot development',
                            inline: false
                        },
                        {
                            name: '⚡ Response Time',
                            value: '```\nAverage: 5-10 minutes\nSupport Hours: 24/7\n```',
                            inline: false
                        }
                    )
                    .setFooter({ text: '💎 Factory Boosts • Premium Support' })
                    .setTimestamp();
                
                await interaction.reply({ embeds: [supportEmbed], ephemeral: true });
            }
            return;
        }

        // Menús desplegables
        if (interaction.isStringSelectMenu()) {
            // Menús de los PANELES (crean tickets directamente)
            if (interaction.customId === 'boost_panel_menu') {
                await interaction.reply({ content: '⏳ Creando tu ticket...', ephemeral: true });
                await handleTicketCreation(interaction, 'boost', interaction.values[0]);
            } else if (interaction.customId === 'bot_panel_menu') {
                await interaction.reply({ content: '⏳ Creando tu ticket...', ephemeral: true });
                await handleTicketCreation(interaction, 'bot', interaction.values[0]);
            } else if (interaction.customId === 'nitro_panel_menu') {
                await interaction.reply({ content: '⏳ Creando tu ticket...', ephemeral: true });
                await handleTicketCreation(interaction, 'nitro', interaction.values[0]);
            }
            // Menús DENTRO de los tickets (selección de paquetes)
            else if (interaction.customId === 'select_boost_package') {
                await handleBoostSelection(interaction);
            } else if (interaction.customId === 'select_bot_package') {
                await handleBotSelection(interaction);
            } else if (interaction.customId === 'select_nitro_package') {
                await handleNitroSelection(interaction);
            } else if (interaction.customId === 'select_afk_package') {
                await handleAFKSelection(interaction);
            }
            return;
        }

        // Handlers para modals (formularios)
        if (interaction.isModalSubmit()) {
            if (interaction.customId === 'modal_asistencia') {
                const asunto = interaction.fields.getTextInputValue('asunto_consulta');
                const descripcion = interaction.fields.getTextInputValue('descripcion_consulta');
                
                await interaction.reply({ content: '⏳ Creating your support ticket...', ephemeral: true });
                await handleTicketCreationFromModal(interaction, 'asistencia', { asunto, descripcion });
            } else if (interaction.customId === 'modal_compra') {
                const producto = interaction.fields.getTextInputValue('producto_compra');
                const detalles = interaction.fields.getTextInputValue('detalles_compra');
                
                await interaction.reply({ content: '⏳ Creating your purchase ticket...', ephemeral: true });
                await handleTicketCreationFromModal(interaction, 'compra', { producto, detalles });
            } else if (interaction.customId === 'modal_reporte') {
                const tipo = interaction.fields.getTextInputValue('tipo_problema');
                const descripcion = interaction.fields.getTextInputValue('descripcion_problema');
                const pasos = interaction.fields.getTextInputValue('pasos_problema') || 'Not specified';
                
                await interaction.reply({ content: '⏳ Creating your report ticket...', ephemeral: true });
                await handleTicketCreationFromModal(interaction, 'reporte', { tipo, descripcion, pasos });
            } else if (interaction.customId === 'modal_hwid') {
                const producto = interaction.fields.getTextInputValue('producto_hwid');
                const hwid = interaction.fields.getTextInputValue('hwid_actual') || 'Not provided';
                const razon = interaction.fields.getTextInputValue('razon_hwid');
                
                await interaction.reply({ content: '⏳ Creating your HWID Reset ticket...', ephemeral: true });
                await handleTicketCreationFromModal(interaction, 'hwid_reset', { producto, hwid, razon });
            }
            return;
        }
    } catch (error) {
        console.error('Error en interacción:', error);
        try {
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: '❌ Ocurrió un error al procesar tu solicitud.', ephemeral: true });
            } else if (interaction.deferred) {
                await interaction.editReply({ content: '❌ Ocurrió un error al procesar tu solicitud.' });
            }
        } catch (err) {
            console.error('Error al responder error:', err);
        }
    }
});

// Crear ticket
async function handleTicketCreation(interaction, type = 'boost', selectedPackage = null) {
    // Verificar si el usuario ya tiene un ticket abierto
    const existingTicket = interaction.guild.channels.cache.find(
        ch => ch.name === `purchase-${interaction.user.username.toLowerCase()}` && ch.type === ChannelType.GuildText
    );

    if (existingTicket) {
        return interaction.editReply({ 
            content: `❌ Ya tienes un ticket abierto: ${existingTicket}`
        });
    }

    try {
        // Determinar la categoría y nombre según el tipo de ticket
        let categoryId;
        let channelName;
        
        if (type === 'hwid') {
            categoryId = '1449485462967423136'; // Categoría específica para HWID Reset
            channelName = `hwid-${interaction.user.username}`;
        } else if (type === 'nitro') {
            categoryId = '1447619352781389954'; // Categoría general
            channelName = `tokens-${interaction.user.username}`;
        } else if (type === 'bot') {
            categoryId = '1447619352781389954'; // Categoría general
            channelName = `purchase-${interaction.user.username}`;
        } else if (type === 'afk') {
            categoryId = '1447619352781389954'; // Categoría general
            channelName = `afk-${interaction.user.username}`;
        } else if (type === 'lobby') {
            categoryId = '1447619352781389954'; // Categoría general
            channelName = `lobby-${interaction.user.username}`;
        } else if (type === 'designs') {
            categoryId = '1447619352781389954'; // Categoría general
            channelName = `designs-${interaction.user.username}`;
        } else if (type === 'nitro_promo') {
            categoryId = '1447619352781389954'; // Categoría general
            channelName = `nitro-promo-${interaction.user.username}`;
        } else {
            categoryId = '1447619352781389954'; // Categoría general
            channelName = `purchase-${interaction.user.username}`;
        }
        
        // Crear canal de ticket
        const ticketChannel = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: categoryId || null,
            permissionOverwrites: [
                {
                    id: interaction.guild.id,
                    deny: [PermissionFlagsBits.ViewChannel]
                },
                {
                    id: interaction.user.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.AttachFiles
                    ]
                },
                {
                    id: client.user.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ManageChannels
                    ]
                }
            ]
        });

        // Dar permisos a todos los miembros con permisos de Administrador
        const adminMembers = interaction.guild.members.cache.filter(member => 
            member.permissions.has(PermissionFlagsBits.Administrator)
        );
        
        for (const [memberId, member] of adminMembers) {
            await ticketChannel.permissionOverwrites.create(memberId, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true,
                AttachFiles: true
            });
        }

        // Guardar ticket en memoria
        activeTickets.set(ticketChannel.id, {
            userId: interaction.user.id,
            createdAt: Date.now()
        });

        // Guardar en base de datos JSON
        const ticketId = Math.floor(Math.random() * 9000) + 1000;
        const ticketType = type === 'bot' ? 'Custom Bot' : type === 'nitro' ? 'Nitro Token' : type === 'afk' ? 'AFK Tool' : type === 'hwid' ? 'HWID Reset' : type === 'lobby' ? 'Bot Lobby Tool' : type === 'designs' ? 'Discord Designs' : 'Boost';
        db.addTicket({
            id: ticketId,
            channelId: ticketChannel.id,
            userId: interaction.user.id,
            username: interaction.user.tag,
            type: ticketType,
            status: 'open',
            createdAt: new Date().toISOString()
        });

        // Embed y menú según el tipo de ticket
        let welcomeEmbed, selectMenu;
        
        // Si ya se seleccionó un paquete desde el panel, mostrar info directamente
        if (selectedPackage) {
            let packageInfo;
            let packageTitle;
            let packageColor;
            
            if (type === 'nitro') {
                packageInfo = config.nitroOptions.find(opt => opt.value === selectedPackage);
                packageTitle = '🎫 Ticket Created - Nitro Token';
                packageColor = '#5865F2';
            } else if (type === 'bot') {
                packageInfo = config.botOptions.find(opt => opt.value === selectedPackage);
                packageTitle = '🎫 Ticket Created - Custom Bot';
                packageColor = '#00D9A3';
            } else if (type === 'afk') {
                packageInfo = config.afkOptions.find(opt => opt.value === selectedPackage);
                packageTitle = '🎫 Ticket Created - AFK Tool';
                packageColor = '#00D9A3';
            } else {
                packageInfo = config.boostOptions.find(opt => opt.value === selectedPackage);
                packageTitle = '🎫 Ticket Created - Factory Boosts';
                packageColor = '#00D9A3';
            }
            
            welcomeEmbed = new EmbedBuilder()
                .setColor(packageColor)
                .setTitle(packageTitle)
                .setDescription(`Hello ${interaction.user}! Thank you for creating a ticket.\n\n**Selected Package:** ${packageInfo?.label || selectedPackage}\n${packageInfo?.description || ''}\n\n**Price:** ${packageInfo?.price || 'Contact staff'}\n\nA staff member will assist you shortly with your purchase.`)
                .setTimestamp();
            
            selectMenu = null; // No menu needed, package already selected
        } else {
            // Lógica original: mostrar menú de selección dentro del ticket
            if (type === 'nitro') {
                welcomeEmbed = new EmbedBuilder()
                    .setColor('#5865F2')
                    .setTitle('🎫 Ticket Created - Nitro Token')
                    .setDescription(`Hello ${interaction.user}! Thank you for creating a ticket.\n\n**Please select the Nitro duration you want:**`)
                    .setTimestamp();

                selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('select_nitro_package')
                    .setPlaceholder('Select Nitro duration')
                    .addOptions(
                        config.nitroOptions.map(option => ({
                            label: option.label,
                            description: option.description,
                            value: option.value
                        }))
                    );
            } else if (type === 'bot') {
                welcomeEmbed = new EmbedBuilder()
                    .setColor('#00D9A3')
                    .setTitle('🎫 Ticket Created - Custom Bot')
                    .setDescription(`Hello ${interaction.user}! Thank you for creating a ticket.\n\n**Please select the type of bot you want:**`)
                    .setTimestamp();

                selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('select_bot_package')
                    .setPlaceholder('Select bot type')
                    .addOptions(
                        config.botOptions.map(option => ({
                            label: option.label,
                            description: option.description,
                            value: option.value
                        }))
                    );
            } else if (type === 'afk') {
                welcomeEmbed = new EmbedBuilder()
                    .setColor('#00D9A3')
                    .setTitle('🎫 Ticket Created - AFK Tool')
                    .setDescription(`Hello ${interaction.user}! Thank you for creating a ticket.\n\n**Please select the AFK farming package you want:**`)
                    .setTimestamp();

                selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('select_afk_package')
                    .setPlaceholder('Select farming package')
                    .addOptions(
                        config.afkOptions.map(option => ({
                            label: option.label,
                            description: option.description,
                            value: option.value
                        }))
                    );
            } else if (type === 'hwid') {
                welcomeEmbed = new EmbedBuilder()
                    .setColor('#00D9A3')
                    .setTitle('🎫 Ticket Created - HWID Reset')
                    .setDescription(`Hello ${interaction.user}! Thank you for creating a ticket.\n\n**HWID Reset Service**\n\nPlease wait for a staff member to assist you with the reset process.`)
                    .addFields(
                        {
                            name: '📋 What you need to provide:',
                            value: '• Your current HWID\n• Payment confirmation\n• Discord username linked to the tool',
                            inline: false
                        },
                        {
                            name: '⏱️ Processing Time:',
                            value: 'Usually completed within 5-15 minutes',
                            inline: false
                        }
                    )
                    .setTimestamp();
            } else if (type === 'nitro_promo') {
                welcomeEmbed = new EmbedBuilder()
                    .setColor('#5865F2')
                    .setTitle('🎫 Ticket Created - Nitro Promo (XBOX)')
                    .setDescription(`Hello ${interaction.user}! Thank you for creating a ticket.\n\n**3 Months Discord Nitro Promo**\n\nBefore we proceed, please confirm:`)
                    .addFields(
                        {
                            name: '⚠️ Account Requirements:',
                            value: '✓ Your Discord account has **NEVER** had Nitro before\n✓ No previous Nitro trials used\n✓ No expired Nitro subscriptions\n✓ Account must be eligible for new promotions',
                            inline: false
                        },
                        {
                            name: '📋 What you\'ll receive:',
                            value: '• 3 Months of Discord Nitro\n• All premium features\n• Instant activation after payment',
                            inline: false
                        },
                        {
                            name: '💡 Next Steps:',
                            value: 'A staff member will verify your account eligibility and provide payment details.',
                            inline: false
                        }
                    )
                    .setFooter({ text: '💎 Factory Boosts • Nitro Promo Service' })
                    .setTimestamp();

                selectMenu = null; // No hay menú para HWID reset
            } else if (type === 'lobby') {
                welcomeEmbed = new EmbedBuilder()
                    .setColor('#9B59B6')
                    .setTitle('🎫 Ticket Created - Bot Lobby Tool')
                    .setDescription(`Hello ${interaction.user}! Thank you for your interest in our **Bot Lobby Tool**.\n\n✨ **Premium Lobby Management System**\n\nA staff member will assist you shortly with the setup and payment details.`)
                    .addFields(
                        {
                            name: '📋 What to expect:',
                            value: '• Detailed product information\n• Custom configuration options\n• Payment instructions\n• Instant setup after payment\n• Dedicated support',
                            inline: false
                        },
                        {
                            name: '⚡ Next Steps:',
                            value: 'Our team will provide you with all the information and guide you through the process.',
                            inline: false
                        }
                    )
                    .setTimestamp();

                selectMenu = null; // No hay menú para Bot Lobby Tool
            } else if (type === 'designs') {
                welcomeEmbed = new EmbedBuilder()
                    .setColor('#F1C40F')
                    .setTitle('🎫 Ticket Created - Discord Designs')
                    .setDescription(`Hello ${interaction.user}! Thank you for your interest in our **Discord Designs** service.\n\n🎨 **Professional Design Services**\n\nA staff member will assist you shortly with your design request.`)
                    .addFields(
                        {
                            name: '📋 What we offer:',
                            value: '• Custom server banners & icons\n• Professional emojis & stickers\n• Complete server themes\n• Logo design\n• Unique designs tailored to your brand',
                            inline: false
                        },
                        {
                            name: '⚡ What to provide:',
                            value: '• Your design concept or idea\n• Brand colors/theme preferences\n• Reference images (if any)\n• Specific requirements',
                            inline: false
                        },
                        {
                            name: '🎯 Delivery:',
                            value: 'Fast delivery with unlimited revisions until you\'re satisfied!',
                            inline: false
                        }
                    )
                    .setTimestamp();

                selectMenu = null; // No hay menú para Discord Designs
            } else {
                welcomeEmbed = new EmbedBuilder()
                    .setColor('#00D9A3')
                    .setTitle('🎫 Ticket Created - Factory Boosts')
                    .setDescription(`Hello ${interaction.user}! Thank you for creating a ticket.\n\n**Please select the boost package you want to purchase:**`)
                    .setTimestamp();

                selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('select_boost_package')
                    .setPlaceholder('Select a Server Boost package')
                    .addOptions(
                        config.boostOptions.map(option => ({
                            label: option.label,
                            description: option.description,
                            value: option.value
                        }))
                    );
            }
        }

        // Crear componentes solo si hay selectMenu
        const components = [];
        
        if (selectMenu) {
            const row1 = new ActionRowBuilder().addComponents(selectMenu);
            components.push(row1);
        }

        // Botón para cerrar ticket
        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('🔒 Cerrar Ticket')
                    .setStyle(ButtonStyle.Danger)
            );
        
        components.push(row2);

        await ticketChannel.send({ 
            content: `${interaction.user}`,
            embeds: [welcomeEmbed], 
            components: components
        });

        // Mensaje automático del bot agente
        const botAgentEmbed = new EmbedBuilder()
            .setColor('#00D9A3')
            .setAuthor({ 
                name: 'Factory Bot Assistant', 
                iconURL: client.user.displayAvatarURL() 
            })
            .setDescription('👋 **Hello! Thank you for opening a ticket.**\n\nI\'m here to help you get started. Our team will assist you shortly.\n\n💡 **Need immediate human support?**\nSimply type `human` and a staff member will be notified right away.')
            .setFooter({ text: '🤖 Automated Assistant • Factory Boosts' })
            .setTimestamp();

        await ticketChannel.send({ embeds: [botAgentEmbed] });

        await interaction.editReply({ 
            content: `✅ Your ticket has been created: ${ticketChannel}` 
        });

        // Enviar notificación al canal de logs cuando se crea el ticket
        if (process.env.STAFF_LOG_CHANNEL_ID) {
            try {
                const logChannel = await interaction.guild.channels.fetch(process.env.STAFF_LOG_CHANNEL_ID);
                
                const ticketTypeNames = {
                    'boost': 'Factory Boosts',
                    'bot': 'Custom Bots',
                    'nitro': 'Nitro Tokens',
                    'afk': 'AFK Tool',
                    'lobby': 'Bot Lobby Tool',
                    'hwid': 'HWID Reset',
                    'nitro_promo': 'Nitro Promo (XBOX)',
                    'designs': 'Discord Designs'
                };

                const logEmbed = new EmbedBuilder()
                    .setColor(config.colors.primary)
                    .setTitle('🎫 Nuevo Ticket Creado')
                    .setDescription(`Un usuario ha abierto un nuevo ticket`)
                    .addFields(
                        { name: '👤 Usuario', value: `${interaction.user} (${interaction.user.tag})`, inline: true },
                        { name: '📋 Tipo', value: ticketTypeNames[type] || type, inline: true },
                        { name: '🎫 Canal', value: `${ticketChannel}`, inline: false },
                        { name: '🆔 Ticket ID', value: `#${ticketId}`, inline: true }
                    )
                    .setThumbnail(interaction.user.displayAvatarURL())
                    .setFooter({ text: `User ID: ${interaction.user.id}` })
                    .setTimestamp();

                await logChannel.send({ embeds: [logEmbed] });
            } catch (error) {
                console.error('Error al enviar notificación al canal de logs:', error);
            }
        }

    } catch (error) {
        console.error('Error al crear ticket:', error);
        try {
            await interaction.editReply({ 
                content: '❌ Hubo un error al crear tu ticket. Por favor contacta a un administrador.' 
            });
        } catch (e) {
            console.error('No se pudo editar la respuesta:', e);
        }
    }
}

// Función para crear tickets desde modals (formularios)
async function handleTicketCreationFromModal(interaction, type, formData) {
    // Verificar si el usuario ya tiene un ticket abierto
    const existingTicket = interaction.guild.channels.cache.find(
        ch => (ch.name.includes(interaction.user.username.toLowerCase()) && 
              (ch.name.startsWith('ticket-') || ch.name.startsWith('purchase-') || 
               ch.name.startsWith('soporte-') || ch.name.startsWith('reporte-') || 
               ch.name.startsWith('hwid-'))) && 
            ch.type === ChannelType.GuildText
    );

    if (existingTicket) {
        return interaction.editReply({ 
            content: `❌ Ya tienes un ticket abierto: ${existingTicket}`
        });
    }

    try {
        let categoryId;
        let channelName;
        let ticketType;
        
        // Determinar el nombre y tipo según el tipo de ticket
        if (type === 'asistencia') {
            categoryId = '1436646285959757844'; // Categoría de Support
            channelName = `soporte-${interaction.user.username}`;
            ticketType = 'Asistencia General';
        } else if (type === 'compra') {
            categoryId = '1447619352781389954'; // Categoría general
            channelName = `purchase-${interaction.user.username}`;
            ticketType = 'Compra de Producto';
        } else if (type === 'reporte') {
            categoryId = '1447619352781389954'; // Categoría general
            channelName = `reporte-${interaction.user.username}`;
            ticketType = 'Reporte de Problema';
        } else if (type === 'hwid_reset') {
            categoryId = '1447619352781389954'; // Categoría general
            channelName = `hwid-${interaction.user.username}`;
            ticketType = 'HWID Reset';
        } else {
            categoryId = '1447619352781389954'; // Categoría general
            channelName = `ticket-${interaction.user.username}`;
            ticketType = 'Ticket General';
        }
        
        // Crear canal de ticket
        const ticketChannel = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: categoryId || null,
            permissionOverwrites: [
                {
                    id: interaction.guild.id,
                    deny: [PermissionFlagsBits.ViewChannel]
                },
                {
                    id: interaction.user.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.AttachFiles
                    ]
                },
                {
                    id: client.user.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ManageChannels
                    ]
                }
            ]
        });

        // Dar permisos a todos los miembros con permisos de Administrador
        const adminMembers = interaction.guild.members.cache.filter(member => 
            member.permissions.has(PermissionFlagsBits.Administrator)
        );
        
        for (const [memberId, member] of adminMembers) {
            await ticketChannel.permissionOverwrites.create(memberId, {
                ViewChannel: true,
                SendMessages: true,
                ReadMessageHistory: true,
                AttachFiles: true
            });
        }

        // Guardar ticket en memoria
        activeTickets.set(ticketChannel.id, {
            userId: interaction.user.id,
            createdAt: Date.now()
        });

        // Guardar en base de datos
        const ticketId = Math.floor(Math.random() * 9000) + 1000;
        db.addTicket({
            id: ticketId,
            channelId: ticketChannel.id,
            userId: interaction.user.id,
            username: interaction.user.tag,
            type: ticketType,
            status: 'open',
            createdAt: new Date().toISOString()
        });

        // Crear embed según el tipo de ticket
        let welcomeEmbed;
        let descripcionFields = [];
        
        if (type === 'asistencia') {
            descripcionFields = [
                { name: '📋 Subject', value: formData.asunto, inline: false },
                { name: '💬 Description', value: formData.descripcion, inline: false }
            ];
            welcomeEmbed = new EmbedBuilder()
                .setColor('#00D9A3')
                .setTitle('🎫 General Support Ticket')
                .setDescription(`Hello ${interaction.user}! Your ticket has been created.\n\n**Ticket Information:**`)
                .addFields(descripcionFields)
                .setFooter({ text: 'A staff member will assist you soon' })
                .setTimestamp();
        } else if (type === 'compra') {
            descripcionFields = [
                { name: '🛒 Product', value: formData.producto, inline: false },
                { name: '📝 Details', value: formData.detalles, inline: false }
            ];
            welcomeEmbed = new EmbedBuilder()
                .setColor('#00D9A3')
                .setTitle('💰 Purchase Ticket')
                .setDescription(`Hello ${interaction.user}! Your purchase ticket has been created.\n\n**Order Information:**`)
                .addFields(descripcionFields)
                .setFooter({ text: 'Staff will process your purchase soon' })
                .setTimestamp();
        } else if (type === 'reporte') {
            descripcionFields = [
                { name: '⚠️ Issue Type', value: formData.tipo, inline: false },
                { name: '📋 Description', value: formData.descripcion, inline: false },
                { name: '🔧 Steps to Reproduce', value: formData.pasos, inline: false }
            ];
            welcomeEmbed = new EmbedBuilder()
                .setColor('#E74C3C')
                .setTitle('⚠️ Issue Report')
                .setDescription(`Hello ${interaction.user}! Your report has been received.\n\n**Issue Details:**`)
                .addFields(descripcionFields)
                .setFooter({ text: 'We will investigate the issue' })
                .setTimestamp();
        } else if (type === 'hwid_reset') {
            descripcionFields = [
                { name: '🎮 Product', value: formData.producto, inline: false },
                { name: '🔑 Current HWID', value: formData.hwid, inline: false },
                { name: '📝 Reason', value: formData.razon, inline: false }
            ];
            welcomeEmbed = new EmbedBuilder()
                .setColor('#00D9A3')
                .setTitle('🔄 HWID Reset Ticket')
                .setDescription(`Hello ${interaction.user}! Your HWID Reset request has been created.\n\n**Information:**`)
                .addFields(descripcionFields)
                .setFooter({ text: 'We will process your reset soon' })
                .setTimestamp();
        }

        // Botón para cerrar ticket
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('🔒 Cerrar Ticket')
                    .setStyle(ButtonStyle.Danger)
            );

        await ticketChannel.send({ 
            content: `${interaction.user}`,
            embeds: [welcomeEmbed], 
            components: [row]
        });

        // Mensaje automático del bot agente
        const botAgentEmbed = new EmbedBuilder()
            .setColor('#00D9A3')
            .setAuthor({ 
                name: 'Factory Bot Assistant', 
                iconURL: client.user.displayAvatarURL() 
            })
            .setDescription('👋 **Hello! Thank you for opening a ticket.**\n\nI\'ve received your information. Our team will assist you shortly.\n\n💡 **Need immediate human support?**\nSimply type `human` and a staff member will be notified right away.')
            .setFooter({ text: '🤖 Automated Assistant • Factory Boosts' })
            .setTimestamp();

        await ticketChannel.send({ embeds: [botAgentEmbed] });

        await interaction.editReply({ 
            content: `✅ Your ticket has been created: ${ticketChannel}` 
        });

        // Enviar notificación al canal de logs
        if (process.env.STAFF_LOG_CHANNEL_ID) {
            try {
                const logChannel = await interaction.guild.channels.fetch(process.env.STAFF_LOG_CHANNEL_ID);
                
                const logEmbed = new EmbedBuilder()
                    .setColor(config.colors.primary)
                    .setTitle('🎫 Nuevo Ticket Creado')
                    .setDescription(`Un usuario ha abierto un nuevo ticket`)
                    .addFields(
                        { name: '👤 Usuario', value: `${interaction.user} (${interaction.user.tag})`, inline: true },
                        { name: '📋 Tipo', value: ticketType, inline: true },
                        { name: '🎫 Canal', value: `${ticketChannel}`, inline: false },
                        { name: '🆔 Ticket ID', value: `#${ticketId}`, inline: true }
                    )
                    .setThumbnail(interaction.user.displayAvatarURL())
                    .setFooter({ text: `User ID: ${interaction.user.id}` })
                    .setTimestamp();

                await logChannel.send({ embeds: [logEmbed] });
            } catch (error) {
                console.error('Error al enviar notificación al canal de logs:', error);
            }
        }

    } catch (error) {
        console.error('Error al crear ticket desde modal:', error);
        try {
            await interaction.editReply({ 
                content: '❌ Hubo un error al crear tu ticket. Por favor contacta a un administrador.' 
            });
        } catch (e) {
            console.error('No se pudo editar la respuesta:', e);
        }
    }
}

// Manejar selección de paquete
async function handleBoostSelection(interaction) {
    const selectedOption = config.boostOptions.find(opt => opt.value === interaction.values[0]);
    
    if (!selectedOption) {
        return interaction.reply({ content: '❌ Opción no válida.', ephemeral: true });
    }

    // Buscar ticket en DB por channelId y actualizar detalles
    const ticket = db.getTicketByChannelId(interaction.channel.id);
    if (ticket) {
        db.updateTicketDetails(ticket.id, {
            package: selectedOption.label,
            price: selectedOption.price,
            quantity: selectedOption.quantity,
            duration: selectedOption.duration
        });
    }

    // Generar ID único del ticket (usar el del DB si existe)
    const ticketId = ticket ? ticket.id : Math.floor(Math.random() * 9000) + 1000;
    
    // Embed de información del ticket (estilo marco gris)
    const ticketInfoEmbed = new EmbedBuilder()
        .setColor('#00D9A3')
        .setDescription(`🎫 **Ticket ID:** \`${ticketId}\`\n👤 **Ticket Owner:** \`${interaction.user.tag}\`\n⚠️ **Reminder:** \`Do not ping staff repeatedly\``)
        .setFooter({ text: 'Tickets • Factory Boosts' });

    // Embed del paquete seleccionado
    const packageEmbed = new EmbedBuilder()
        .setColor('#00D9A3')
        .setTitle('✅ Package Selected')
        .setDescription(`**${selectedOption.label}**\n\n💰 **Price:** ${selectedOption.price}\n📦 **Quantity:** ${selectedOption.quantity} boosts\n⏰ **Duration:** ${selectedOption.duration}\n\n📝 A staff member will process your order soon.`)
        .setTimestamp();

    // Responder a la interacción
    await interaction.reply({ embeds: [ticketInfoEmbed, packageEmbed] });

    // Notificar al staff en canal de logs de purchase (si está configurado)
    if (process.env.PURCHASE_LOG_CHANNEL_ID) {
        try {
            const logChannel = await interaction.guild.channels.fetch(process.env.PURCHASE_LOG_CHANNEL_ID);
            
            const staffNotification = new EmbedBuilder()
                .setColor(config.colors.warning)
                .setTitle('🔔 New Boost Request')
                .setDescription(`A customer has requested a boost package`)
                .addFields(
                    { name: '👤 User', value: `${interaction.user} (${interaction.user.tag})`, inline: true },
                    { name: '📦 Package', value: selectedOption.label, inline: true },
                    { name: '💰 Price', value: selectedOption.price, inline: true },
                    { name: '⏰ Duration', value: selectedOption.duration, inline: true },
                    { name: '🎫 Ticket Channel', value: `${interaction.channel}`, inline: false }
                )
                .setThumbnail(interaction.user.displayAvatarURL())
                .setFooter({ text: `User ID: ${interaction.user.id}` })
                .setTimestamp();

            await logChannel.send({ embeds: [staffNotification] });
        } catch (error) {
            console.error('Error al enviar notificación al canal de logs de purchase:', error);
        }
    }
}

// Manejar selección de bot
async function handleBotSelection(interaction) {
    const selectedOption = config.botOptions.find(opt => opt.value === interaction.values[0]);
    
    if (!selectedOption) {
        return interaction.reply({ content: '❌ Opción no válida.', ephemeral: true });
    }

    // Buscar ticket en DB por channelId y actualizar detalles
    const ticket = db.getTicketByChannelId(interaction.channel.id);
    if (ticket) {
        db.updateTicketDetails(ticket.id, {
            botType: selectedOption.type,
            price: selectedOption.price,
            description: 'Custom bot development'
        });
    }

    // Generar ID único del ticket (usar el del DB si existe)
    const ticketId = ticket ? ticket.id : Math.floor(Math.random() * 9000) + 1000;
    
    // Embed de información del ticket
    const ticketInfoEmbed = new EmbedBuilder()
        .setColor('#00D9A3')
        .setDescription(`🎫 **Ticket ID:** \`${ticketId}\`\n👤 **Ticket Owner:** \`${interaction.user.tag}\`\n⚠️ **Reminder:** \`Do not ping staff repeatedly\``)
        .setFooter({ text: 'Tickets • Factory Development' });

    // Embed del bot seleccionado
    const botEmbed = new EmbedBuilder()
        .setColor('#00D9A3')
        .setTitle('✅ Bot Type Selected')
        .setDescription(`**${selectedOption.type}**\n\n💰 **Price:** ${selectedOption.price}\n\n📝 A staff member will contact you soon to discuss your custom bot details.\n\n**Next Steps:**\n• Describe what features you need\n• Share any references or examples\n• Wait for final quote`)
        .setTimestamp();

    // Responder a la interacción
    await interaction.reply({ embeds: [ticketInfoEmbed, botEmbed] });

    // Notificar al staff en canal de logs de purchase
    if (process.env.PURCHASE_LOG_CHANNEL_ID) {
        try {
            const logChannel = await interaction.guild.channels.fetch(process.env.PURCHASE_LOG_CHANNEL_ID);
            
            const staffNotification = new EmbedBuilder()
                .setColor(config.colors.warning)
                .setTitle('🤖 New Custom Bot Request')
                .setDescription(`A customer has requested a custom bot`)
                .addFields(
                    { name: '👤 User', value: `${interaction.user} (${interaction.user.tag})`, inline: true },
                    { name: '🤖 Type', value: selectedOption.type, inline: true },
                    { name: '💰 Price', value: selectedOption.price, inline: true },
                    { name: '🎫 Ticket Channel', value: `${interaction.channel}`, inline: false }
                )
                .setThumbnail(interaction.user.displayAvatarURL())
                .setFooter({ text: `User ID: ${interaction.user.id}` })
                .setTimestamp();

            await logChannel.send({ embeds: [staffNotification] });
        } catch (error) {
            console.error('Error al enviar notificación al canal de logs de purchase:', error);
        }
    }
}

// Manejar selección de nitro
async function handleNitroSelection(interaction) {
    const selectedOption = config.nitroOptions.find(opt => opt.value === interaction.values[0]);
    
    if (!selectedOption) {
        return interaction.reply({ content: '❌ Opción no válida.', ephemeral: true });
    }

    // Cambiar el nombre del canal según la duración seleccionada
    const duration = selectedOption.value === 'nitro_1month' ? '1' : '3';
    const newChannelName = `tokens${duration}-${interaction.user.username}`;
    
    try {
        await interaction.channel.setName(newChannelName);
    } catch (error) {
        console.error('Error al renombrar canal:', error);
    }

    // Buscar ticket en DB por channelId y actualizar detalles
    const ticket = db.getTicketByChannelId(interaction.channel.id);
    if (ticket) {
        db.updateTicketDetails(ticket.id, {
            package: selectedOption.label,
            price: selectedOption.price,
            duration: selectedOption.duration
        });
    }

    // Generar ID único del ticket (usar el del DB si existe)
    const ticketId = ticket ? ticket.id : Math.floor(Math.random() * 9000) + 1000;
    
    // Embed de información del ticket
    const ticketInfoEmbed = new EmbedBuilder()
        .setColor('#5865F2')
        .setDescription(`🎫 **Ticket ID:** \`${ticketId}\`\n👤 **Ticket Owner:** \`${interaction.user.tag}\`\n⚠️ **Reminder:** \`Do not ping staff repeatedly\``)
        .setFooter({ text: 'Tickets • Factory Boosts' });

    // Embed del nitro seleccionado
    const nitroEmbed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('✅ Nitro Package Selected')
        .setDescription(`**${selectedOption.label}**\n\n💰 **Price:** ${selectedOption.price}\n⏰ **Duration:** ${selectedOption.duration}\n\n📝 A staff member will send you the Nitro Token shortly.\n\n**After Payment:**\n• Receive your Nitro Token\n• Check it in your tool\n• They are ready to use!`)
        .setTimestamp();

    // Responder a la interacción
    await interaction.reply({ embeds: [ticketInfoEmbed, nitroEmbed] });

    // Notificar al staff en canal de logs de purchase
    if (process.env.PURCHASE_LOG_CHANNEL_ID) {
        try {
            const logChannel = await interaction.guild.channels.fetch(process.env.PURCHASE_LOG_CHANNEL_ID);
            
            const staffNotification = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('💎 New Nitro Token Request')
                .setDescription(`A customer has requested a Nitro Token`)
                .addFields(
                    { name: '👤 User', value: `${interaction.user} (${interaction.user.tag})`, inline: true },
                    { name: '💎 Package', value: selectedOption.label, inline: true },
                    { name: '💰 Price', value: selectedOption.price, inline: true },
                    { name: '⏰ Duration', value: selectedOption.duration, inline: true },
                    { name: '🎫 Ticket Channel', value: `${interaction.channel}`, inline: false }
                )
                .setThumbnail(interaction.user.displayAvatarURL())
                .setFooter({ text: `User ID: ${interaction.user.id}` })
                .setTimestamp();

            await logChannel.send({ embeds: [staffNotification] });
        } catch (error) {
            console.error('Error al enviar notificación al canal de logs de purchase:', error);
        }
    }
}

// Manejar selección de AFK package
async function handleAFKSelection(interaction) {
    const selectedOption = config.afkOptions.find(opt => opt.value === interaction.values[0]);
    
    if (!selectedOption) {
        return interaction.reply({ content: '❌ Opción no válida.', ephemeral: true });
    }

    // Buscar ticket en DB por channelId y actualizar detalles
    const ticket = db.getTicketByChannelId(interaction.channel.id);
    if (ticket) {
        db.updateTicketDetails(ticket.id, {
            package: selectedOption.label,
            price: selectedOption.price,
            quantity: selectedOption.quantity || null,
            duration: selectedOption.duration || null
        });
    }

    // Generar ID único del ticket (usar el del DB si existe)
    const ticketId = ticket ? ticket.id : Math.floor(Math.random() * 9000) + 1000;
    
    // Embed de información del ticket
    const ticketInfoEmbed = new EmbedBuilder()
        .setColor('#00D9A3')
        .setDescription(`🎫 **Ticket ID:** \`${ticketId}\`\n👤 **Ticket Owner:** \`${interaction.user.tag}\`\n⚠️ **Reminder:** \`Do not ping staff repeatedly\``)
        .setFooter({ text: 'Tickets • Factory Tools' });

    // Embed del paquete seleccionado
    const afkEmbed = new EmbedBuilder()
        .setColor('#00D9A3')
        .setTitle('✅ AFK Package Selected')
        .setDescription(`**${selectedOption.label}**\n\n💰 **Price:** ${selectedOption.price}\n${selectedOption.quantity ? `📦 **Quantity:** ${selectedOption.quantity} matches` : `⏰ **Duration:** ${selectedOption.duration}`}\n\n📝 A staff member will set up your AFK farming service.\n\n**What happens next:**\n• Provide your game account details\n• Staff configures the tool\n• Automated farming begins\n• Track progress in real-time`)
        .setTimestamp();

    // Responder a la interacción
    await interaction.reply({ embeds: [ticketInfoEmbed, afkEmbed] });

    // Notificar al staff en canal de logs de purchase
    if (process.env.PURCHASE_LOG_CHANNEL_ID) {
        try {
            const logChannel = await interaction.guild.channels.fetch(process.env.PURCHASE_LOG_CHANNEL_ID);
            
            const staffNotification = new EmbedBuilder()
                .setColor(config.colors.warning)
                .setTitle('🎮 New AFK Tool Request')
                .setDescription(`A customer has requested AFK farming service`)
                .addFields(
                    { name: '👤 User', value: `${interaction.user} (${interaction.user.tag})`, inline: true },
                    { name: '📦 Package', value: selectedOption.label, inline: true },
                    { name: '💰 Price', value: selectedOption.price, inline: true },
                    { name: '🎫 Ticket Channel', value: `${interaction.channel}`, inline: false }
                )
                .setThumbnail(interaction.user.displayAvatarURL())
                .setFooter({ text: `User ID: ${interaction.user.id}` })
                .setTimestamp();

            await logChannel.send({ embeds: [staffNotification] });
        } catch (error) {
            console.error('Error al enviar notificación al canal de logs de purchase:', error);
        }
    }
}

// Cerrar ticket con botón
async function closeTicketButton(interaction) {
    // Verificar que solo los administradores puedan cerrar tickets
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({
            content: '❌ Solo los administradores pueden cerrar tickets.',
            ephemeral: true
        });
    }

    const confirmEmbed = new EmbedBuilder()
        .setColor(config.colors.warning)
        .setTitle('⚠️ Confirmar Cierre de Ticket')
        .setDescription('¿Estás seguro de que deseas cerrar este ticket?\n\nEsta acción no se puede deshacer.');

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('close_confirm')
                .setLabel('✅ Sí, cerrar')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('close_cancel')
                .setLabel('❌ Cancelar')
                .setStyle(ButtonStyle.Secondary)
        );

    await interaction.reply({ embeds: [confirmEmbed], components: [row], ephemeral: true });
}

// Confirmar cierre de ticket
async function confirmCloseTicket(interaction) {
    // Verificar que solo los administradores puedan cerrar tickets
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.update({
            content: '❌ Solo los administradores pueden cerrar tickets.',
            embeds: [],
            components: []
        });
    }

    await interaction.update({ content: '🔒 Cerrando ticket...', embeds: [], components: [] });

    const channel = interaction.channel;
    
    const closingEmbed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('🔒 Ticket Cerrado')
        .setDescription(`Ticket cerrado por ${interaction.user}\n\nEste canal será eliminado en 5 segundos.`)
        .setTimestamp();

    await channel.send({ embeds: [closingEmbed] });

    activeTickets.delete(channel.id);

    // Marcar ticket como cerrado en base de datos
    const allData = await db.readData();
    const ticket = allData.tickets.find(t => t.channelId === channel.id);
    if (ticket) {
        db.closeTicket(ticket.id);
    }

    setTimeout(async () => {
        try {
            await channel.delete();
        } catch (error) {
            console.error('Error al eliminar canal:', error);
        }
    }, 5000);
}

// Cerrar ticket con comando
async function closeTicket(channel, member) {
    // Verificar que solo los administradores puedan cerrar tickets
    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
        return channel.send('❌ Solo los administradores pueden cerrar tickets.');
    }

    const closingEmbed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('🔒 Ticket Cerrado')
        .setDescription(`Ticket cerrado por ${member.user}\n\nEste canal será eliminado en 5 segundos.`)
        .setTimestamp();

    await channel.send({ embeds: [closingEmbed] });

    activeTickets.delete(channel.id);

    setTimeout(async () => {
        try {
            await channel.delete();
        } catch (error) {
            console.error('Error al eliminar canal:', error);
        }
    }, 5000);
}

// Manejo de errores
client.on('error', error => {
    console.error('Error del cliente de Discord:', error);
});

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

// Iniciar el bot
client.login(process.env.DISCORD_TOKEN);

