//===============================================
// EVENTO DE BIENVENIDA ACTUALIZADO
// Reemplaza desde la línea 130 hasta la línea 217 aproximadamente
//===============================================

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
    
    // Calcular días desde creación de cuenta
    const accountAge = Math.floor((Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24));
    
    // Crear el embed de bienvenida mejorado
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
                value: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
                inline: false
            },
            {
                name: '👤 User Information',
                value: `**Username:** ${member.user.tag}\n**ID:** \`${member.user.id}\`\n**Mention:** <@${member.id}>`,
                inline: true
            },
            {
                name: '📊 Account Details',
                value: `**Created:** <t:${Math.floor(member.user.createdTimestamp / 1000)}:R>\n**Age:** ${accountAge} days\n**Status:** ${accountAge < 7 ? '🆕 New Account' : '✅ Verified'}`,
                inline: true
            },
            {
                name: '🎯 Server Stats',
                value: `**Total Members:** ${member.guild.memberCount}\n**Your Position:** #${member.guild.memberCount}\n**Joined:** <t:${Math.floor(Date.now() / 1000)}:R>`,
                inline: true
            },
            {
                name: '\u200B',
                value: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
                inline: false
            },
            {
                name: '📚 Essential Channels',
                value: `📜 <#1436822757462773861> - **Server Rules**\n👋 <#1436822818250559578> - **Introductions**\n📢 <#1436822948609786027> - **Announcements**\n🔔 <#1436823044185264199> - **Updates**\n📋 <#1436823599867760841> - **Terms of Service**`,
                inline: false
            },
            {
                name: '🛒 Our Services',
                value: `🎫 <#1436573916154826823> - **Server Boosts Tickets**\n🤖 <#1436627760876621936> - **Custom Bots Tickets**`,
                inline: false
            },
            {
                name: '🎁 Getting Started',
                value: '```fix\n1. Read our rules and terms of service\n2. Introduce yourself in the intro channel\n3. Check out our services channels\n4. Create a ticket to make a purchase\n5. Enjoy premium Discord services!\n```',
                inline: false
            }
        )
        .setImage(config.welcome.image)
        .setFooter({ 
            text: config.welcome.footer.replace('{memberCount}', member.guild.memberCount),
            iconURL: member.guild.iconURL({ dynamic: true })
        })
        .setTimestamp();
    
    // Botones de acción
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setLabel('🚀 Server Boosts')
                .setStyle(ButtonStyle.Success)
                .setCustomId('create_ticket'),
            new ButtonBuilder()
                .setLabel('🤖 Custom Bots')
                .setStyle(ButtonStyle.Primary)
                .setCustomId('create_ticket_bot'),
            new ButtonBuilder()
                .setLabel('📞 Support')
                .setStyle(ButtonStyle.Secondary)
                .setCustomId('contact_support')
        );
    
    try {
        await welcomeChannel.send({ 
            content: `🎉 **Welcome <@${member.id}> to Inusual Boosting!** We're glad to have you here! 🌟`,
            embeds: [welcomeEmbed],
            components: [row]
        });
        console.log(`✅ Mensaje de bienvenida enviado para ${member.user.tag}`);
    } catch (error) {
        console.error('❌ Error al enviar mensaje de bienvenida:', error);
    }
});

// ==================== FIN SISTEMA DE BIENVENIDA ====================
