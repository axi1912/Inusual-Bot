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
    
    // Crear el embed de bienvenida simplificado
    const welcomeEmbed = new EmbedBuilder()
        .setColor(config.welcome.color)
        .setAuthor({ 
            name: `${member.user.tag} just joined the server!`,
            iconURL: member.user.displayAvatarURL({ dynamic: true })
        })
        .setTitle(config.welcome.title.replace('{user}', member.user.username))
        .setDescription(config.welcome.description.replace('{user}', `<@${member.id}>`))
        .setThumbnail(member.guild.iconURL({ dynamic: true, size: 256 }))
        .addFields(
            {
                name: '\u200B',
                value: '**📚 Essential Channels**',
                inline: false
            },
            {
                name: '\u200B',
                value: `📜 <#1436822757462773861> - Rules\n📢 <#1436822948609786027> - Announcements\n📋 <#1436823599867760841> - Terms`,
                inline: false
            },
            {
                name: '\u200B',
                value: '**🛒 Our Services**',
                inline: false
            },
            {
                name: '\u200B',
                value: `🎫 <#1436573916154826823> - Server Boosts\n🤖 <#1436627760876621936> - Custom Bots`,
                inline: false
            }
        )
        .setImage(config.welcome.image)
        .setFooter({ 
            text: config.welcome.footer.replace('{memberCount}', member.guild.memberCount),
            iconURL: member.guild.iconURL({ dynamic: true })
        })
        .setTimestamp();
    
    try {
        await welcomeChannel.send({ 
            content: `🎉 **Welcome <@${member.id}> to Factory Boosts!** 🌟`,
            embeds: [welcomeEmbed]
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
        .setTitle('FACTORY BOOSTS - SERVER BOOSTS')
        .setDescription('━━━━━━━━━━━━━━━━━━━━━━━━━')
        .addFields(
            {
                name: '\n🟢 1 MONTH SERVER BOOSTS\n',
                value: '```fix\n• 6 Server Boosts  → 5$\n• 8 Server Boosts  → 7$\n• 14 Server Boosts → 11$\n```',
                inline: false
            },
            {
                name: '\n� 3 MONTH SERVER BOOSTS\n',
                value: '```fix\n• 6 Server Boosts  → 15$\n• 8 Server Boosts  → 20$\n• 14 Server Boosts → 35$\n```',
                inline: false
            },
            {
                name: '\n📋 INSTRUCTIONS\n',
                value: '» Click the **"Start Purchase"** button\n» Select the package you want\n» A staff member will assist you\n» Read the terms before proceeding',
                inline: false
            }
        )
        .setImage('https://cdn.discordapp.com/attachments/1309783318031503384/1438385544043430030/banner_factory.gif?ex=6916b06d&is=69155eed&hm=cc3d8842a292692983ed0ccf4114f3baf53681b386260983a513862de799d17e&')
        .setFooter({ text: '👑 Factory Boosts • Trusted Service' })
        .setTimestamp();

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('create_ticket')
                .setLabel('🛒 Start Purchase')
                .setStyle(ButtonStyle.Success)
        );

    await channel.send({ embeds: [embed], components: [row] });
}

// Función para crear el panel de Custom Bots
async function setupBotsPanel(channel) {
    const embed = new EmbedBuilder()
        .setColor('#00D9A3')
        .setTitle('🤖 CUSTOM DISCORD BOTS')
        .setDescription('━━━━━━━━━━━━━━━━━━━━━━━━━')
        .setThumbnail('https://cdn.discordapp.com/attachments/1309783318031503384/1438385570437922946/Factory_animated_logo.gif?ex=6916b073&is=69155ef3&hm=f1ac14dc01c64be29c1efd40ccb4c29147260e3cb476963f3e6f5b2bc96a6679&')
        .addFields(
            {
                name: '\n📋 ABOUT\n',
                value: '```fix\nProfessional Discord Bot Development\nWe create custom bots tailored to your\nserver needs! Any feature, any\nfunctionality, fully customized.\n```',
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
            },
            {
                name: '\n\n💳 PAYMENT METHODS\n',
                value: '<:807644paypal:1436584262479384707> **PayPal**\n<:binance:1436591160285073408> **Binance**',
                inline: false
            },
            {
                name: '\n\n📞 HOW TO ORDER\n',
                value: '**Create a ticket to get started!**\nClick the button below to discuss your custom bot.',
                inline: false
            }
        )
        .setFooter({ text: '🤖 Factory Development • Quality Custom Bots' });

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('create_ticket_bot')
                .setLabel('🎫 Create Ticket')
                .setStyle(ButtonStyle.Primary)
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
                .setThumbnail('https://cdn.discordapp.com/attachments/1309783318031503384/1438385570437922946/Factory_animated_logo.gif?ex=6916b073&is=69155ef3&hm=f1ac14dc01c64be29c1efd40ccb4c29147260e3cb476963f3e6f5b2bc96a6679&')
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
                    },
                    {
                        name: '\n💳 PAYMENT METHODS\n',
                        value: '<:807644paypal:1436584262479384707> **PayPal**\n<:binance:1436591160285073408> **Binance**',
                        inline: false
                    }
                )
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
                .setThumbnail('https://cdn.discordapp.com/attachments/1309783318031503384/1438385570437922946/Factory_animated_logo.gif?ex=6916b073&is=69155ef3&hm=f1ac14dc01c64be29c1efd40ccb4c29147260e3cb476963f3e6f5b2bc96a6679&')
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
                    },
                    {
                        name: '\n\n💳 PAYMENT METHODS\n',
                        value: '<:807644paypal:1436584262479384707> **PayPal**\n<:binance:1436591160285073408> **Binance**',
                        inline: false
                    },
                    {
                        name: '\n\n📞 HOW TO ORDER\n',
                        value: '**Create a ticket to get started!**\nClick the button below to open a purchase ticket.',
                        inline: false
                    }
                )
                .setFooter({ text: '🤖 Inusual Development • Quality Custom Bots' });
            
            await canal.send({ embeds: [embed] });
            return interaction.reply({ content: `✅ Mensaje de custom bots enviado a ${canal}`, ephemeral: true });
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
            if (interaction.customId === 'select_boost_package') {
                await handleBoostSelection(interaction);
            } else if (interaction.customId === 'select_bot_package') {
                await handleBotSelection(interaction);
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
async function handleTicketCreation(interaction, type = 'boost') {
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
        // Determinar la categoría según el tipo de ticket
        const categoryId = type === 'bot' 
            ? process.env.BOT_TICKET_CATEGORY_ID 
            : process.env.TICKET_CATEGORY_ID;
        
        // Crear canal de ticket
        const ticketChannel = await interaction.guild.channels.create({
            name: `purchase-${interaction.user.username}`,
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
        db.addTicket({
            id: ticketId,
            channelId: ticketChannel.id,
            userId: interaction.user.id,
            username: interaction.user.tag,
            type: type === 'bot' ? 'Custom Bot' : 'Boost',
            status: 'open',
            createdAt: new Date().toISOString()
        });

        // Embed y menú según el tipo de ticket
        let welcomeEmbed, selectMenu;
        
        if (type === 'bot') {
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

        const row1 = new ActionRowBuilder().addComponents(selectMenu);

        // Botón para cerrar ticket
        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('close_ticket')
                    .setLabel('🔒 Cerrar Ticket')
                    .setStyle(ButtonStyle.Danger)
            );

        await ticketChannel.send({ 
            content: `${interaction.user}`,
            embeds: [welcomeEmbed], 
            components: [row1, row2] 
        });

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
        .setFooter({ text: 'Tickets • Inusual Development' });

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

