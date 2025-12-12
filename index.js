require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ChannelType, REST, Routes, AttachmentBuilder } = require('discord.js');
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
        name: 'setup',
        description: 'Configurar el panel de tickets de Factory Boosts'
    },
    {
        name: 'setup-bots',
        description: 'Configurar el panel de Custom Bots'
    },
    {
        name: 'setup-nitro',
        description: 'Configurar el panel de Nitro Tokens'
    },
    {
        name: 'setup-afk',
        description: 'Configurar el panel de AFK Tool'
    },
    {
        name: 'setup-lobby',
        description: 'Configurar el panel de Bot Lobby Tool'
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
        .setDescription('**Automated game farming made easy.**\n\nSafe, undetectable, and fast rank progression.\n24/7 support included.\n\nSubscriptions: 7 days ($5) to Lifetime ($50)\nHWID Reset service also available.\n\nSelect a service below to get started.')
        .setImage('https://cdn.discordapp.com/attachments/1309783318031503384/1447989195451797646/AFK_TOOL.gif?ex=6939a086&is=69384f06&hm=42cc46c563fa61cabe48d8914edbe60123cf51832818867eb078ece099e543be&')
        .setFooter({ text: '🎮 Factory Tools • Professional AFK Service' })
        .setTimestamp();

    const row = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('afk_service_menu')
                .setPlaceholder('Select a service')
                .addOptions([
                    {
                        label: '🎮 AFK Tool',
                        description: 'Purchase AFK Tool farming service',
                        value: 'afk_tool'
                    },
                    {
                        label: '🔄 HWID Reset',
                        description: 'Reset your Hardware ID',
                        value: 'hwid_reset'
                    }
                ])
        );

    await channel.send({ embeds: [embed], components: [row] });
}

// Función para crear el panel de Bot Lobby Tool
async function setupLobbyPanel(channel) {
    const embed = new EmbedBuilder()
        .setColor('#9B59B6')
        .setTitle('Bot Lobby Tool')
        .setDescription('**Professional lobby management system for your game.**\n\nAutomated lobby creation and smart player management.\nMulti-platform support with 24/7 uptime guarantee.\n\nEnterprise-grade security and instant setup.\nDedicated priority support included.\n\nClick below to create a ticket and get started.')
        .setImage('https://cdn.discordapp.com/attachments/1309783318031503384/1448176145768910909/FACTORY_BANNER_VERDE.gif?ex=693c48e2&is=693af762&hm=f49a5cf007cfbd41a248de0f537c694abd48082be6cc2ad20784389f42e10b94&')
        .setFooter({ text: '🎯 Factory Tools • Premium Lobby Solutions' })
        .setTimestamp();

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('create_ticket_lobby')
                .setLabel('🎯 Purchase Bot Lobby Tool')
                .setStyle(ButtonStyle.Success)
        );

    await channel.send({ embeds: [embed], components: [row] });
}

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
        message.channel.name.startsWith('hwid-')
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
            if (interaction.commandName === 'setup') {
                // Verificar que sea administrador
                if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return interaction.reply({ 
                        content: '❌ Solo los administradores pueden usar este comando.', 
                        ephemeral: true 
                    });
                }
                
                // Responder INMEDIATAMENTE
                await interaction.reply({ content: '⏳ Creando panel...', ephemeral: true });
                await setupTicketPanel(interaction.channel);
                await interaction.editReply({ content: '✅ Panel de tickets creado correctamente!' });
            }
            
            if (interaction.commandName === 'setup-bots') {
                // Verificar que sea administrador
                if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return interaction.reply({ 
                        content: '❌ Solo los administradores pueden usar este comando.', 
                        ephemeral: true 
                    });
                }
                
                // Responder INMEDIATAMENTE
                await interaction.reply({ content: '⏳ Creando panel de custom bots...', ephemeral: true });
                await setupBotsPanel(interaction.channel);
                await interaction.editReply({ content: '✅ Panel de custom bots creado correctamente!' });
            }
            
            if (interaction.commandName === 'setup-nitro') {
                // Verificar que sea administrador
                if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return interaction.reply({ 
                        content: '❌ Solo los administradores pueden usar este comando.', 
                        ephemeral: true 
                    });
                }
                
                // Responder INMEDIATAMENTE
                await interaction.reply({ content: '⏳ Creando panel de nitro tokens...', ephemeral: true });
                await setupNitroPanel(interaction.channel);
                await interaction.editReply({ content: '✅ Panel de nitro tokens creado correctamente!' });
            }
            
            if (interaction.commandName === 'setup-afk') {
                // Verificar que sea administrador
                if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return interaction.reply({ 
                        content: '❌ Solo los administradores pueden usar este comando.', 
                        ephemeral: true 
                    });
                }
                
                // Responder INMEDIATAMENTE
                await interaction.reply({ content: '⏳ Creando panel de AFK Tool...', ephemeral: true });
                await setupAFKPanel(interaction.channel);
                await interaction.editReply({ content: '✅ Panel de AFK Tool creado correctamente!' });
            }
            
            if (interaction.commandName === 'setup-lobby') {
                // Verificar que sea administrador
                if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return interaction.reply({ 
                        content: '❌ Solo los administradores pueden usar este comando.', 
                        ephemeral: true 
                    });
                }
                
                // Responder INMEDIATAMENTE
                await interaction.reply({ content: '⏳ Creando panel de Bot Lobby Tool...', ephemeral: true });
                await setupLobbyPanel(interaction.channel);
                await interaction.editReply({ content: '✅ Panel de Bot Lobby Tool creado correctamente!' });
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
            if (interaction.customId === 'create_ticket') {
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
            } else if (interaction.customId === 'afk_service_menu') {
                // Handler del menú de servicios de AFK
                const selectedService = interaction.values[0];
                
                if (selectedService === 'afk_tool') {
                    await interaction.reply({ content: '⏳ Creando tu ticket de AFK Tool...', ephemeral: true });
                    await handleTicketCreation(interaction, 'afk');
                } else if (selectedService === 'hwid_reset') {
                    await interaction.reply({ content: '⏳ Creando tu ticket de HWID Reset...', ephemeral: true });
                    await handleTicketCreation(interaction, 'hwid');
                }
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
        
        if (type === 'nitro') {
            categoryId = '1438409406604644407'; // Categoría específica para tokens
            channelName = `tokens-${interaction.user.username}`; // Nombre temporal, se actualizará después
        } else if (type === 'bot') {
            categoryId = process.env.BOT_TICKET_CATEGORY_ID;
            channelName = `purchase-${interaction.user.username}`;
        } else if (type === 'afk') {
            categoryId = process.env.AFK_TICKET_CATEGORY_ID || process.env.TICKET_CATEGORY_ID;
            channelName = `afk-${interaction.user.username}`;
        } else if (type === 'hwid') {
            categoryId = process.env.AFK_TICKET_CATEGORY_ID || process.env.TICKET_CATEGORY_ID;
            channelName = `hwid-${interaction.user.username}`;
        } else if (type === 'lobby') {
            categoryId = process.env.BOT_TICKET_CATEGORY_ID || process.env.TICKET_CATEGORY_ID;
            channelName = `lobby-${interaction.user.username}`;
        } else {
            categoryId = process.env.TICKET_CATEGORY_ID;
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
                        PermissionFlagsBits.ReadMessageHistory
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
                ReadMessageHistory: true
            });
        }

        // Guardar ticket en memoria
        activeTickets.set(ticketChannel.id, {
            userId: interaction.user.id,
            createdAt: Date.now()
        });

        // Guardar en base de datos JSON
        const ticketId = Math.floor(Math.random() * 9000) + 1000;
        const ticketType = type === 'bot' ? 'Custom Bot' : type === 'nitro' ? 'Nitro Token' : type === 'afk' ? 'AFK Tool' : type === 'hwid' ? 'HWID Reset' : type === 'lobby' ? 'Bot Lobby Tool' : 'Boost';
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
            content: `✅ Tu ticket ha sido creado: ${ticketChannel}` 
        });

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

    // Notificar al staff en canal de logs (si está configurado)
    if (process.env.STAFF_LOG_CHANNEL_ID) {
        try {
            const logChannel = await interaction.guild.channels.fetch(process.env.STAFF_LOG_CHANNEL_ID);
            
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
            console.error('Error al enviar notificación al canal de logs:', error);
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

    // Notificar al staff en canal de logs
    if (process.env.STAFF_LOG_CHANNEL_ID) {
        try {
            const logChannel = await interaction.guild.channels.fetch(process.env.STAFF_LOG_CHANNEL_ID);
            
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
            console.error('Error al enviar notificación al canal de logs:', error);
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

    // Notificar al staff en canal de logs
    if (process.env.STAFF_LOG_CHANNEL_ID) {
        try {
            const logChannel = await interaction.guild.channels.fetch(process.env.STAFF_LOG_CHANNEL_ID);
            
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
            console.error('Error al enviar notificación al canal de logs:', error);
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

    // Notificar al staff en canal de logs
    if (process.env.STAFF_LOG_CHANNEL_ID) {
        try {
            const logChannel = await interaction.guild.channels.fetch(process.env.STAFF_LOG_CHANNEL_ID);
            
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
            console.error('Error al enviar notificación al canal de logs:', error);
        }
    }
}

// Cerrar ticket con botón
async function closeTicketButton(interaction) {
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
    // Verificar permisos
    const ticketData = activeTickets.get(channel.id);
    const hasPermission = member.permissions.has(PermissionFlagsBits.ManageChannels) || 
                          (ticketData && ticketData.userId === member.id);

    if (!hasPermission) {
        return channel.send('❌ No tienes permiso para cerrar este ticket.');
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

