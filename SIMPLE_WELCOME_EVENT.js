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
                name: '📚 Essential Channels',
                value: `📜 <#1436822757462773861> - Server Rules\n📢 <#1436822948609786027> - Announcements\n📋 <#1436823599867760841> - Terms of Service`,
                inline: false
            },
            {
                name: '🛒 Our Services',
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
            content: `🎉 **Welcome <@${member.id}> to Inusual Boosting!** 🌟`,
            embeds: [welcomeEmbed]
        });
        console.log(`✅ Mensaje de bienvenida enviado para ${member.user.tag}`);
    } catch (error) {
        console.error('❌ Error al enviar mensaje de bienvenida:', error);
    }
});

// ==================== FIN SISTEMA DE BIENVENIDA ====================
