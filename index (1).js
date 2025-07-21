// 📦 Imports
const { Client, GatewayIntentBits, Partials, Events, Collection, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, EmbedBuilder } = require('discord.js');
const express = require('express');
const app = express();
require('dotenv').config();

// 🌐 Web Server (anti-sleep Render)
app.get('/', (req, res) => res.send('Bot rodando'));
app.listen(3000, () => console.log('🌐 Web server rodando na porta 3000'));

// 🤖 Bot setup
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

const TOKEN = process.env.TOKEN;

client.once(Events.ClientReady, async () => {
  console.log(`✅ Bot ligado como ${client.user.tag}`);

  // 📝 Registrar comandos
  const commands = [
    {
      name: 'formulario',
      description: 'Envia o formulário de registro da facção'
    },
    {
      name: 'ajuda',
      description: 'Mostra os comandos disponíveis'
    }
  ];

  try {
    await client.application.commands.set(commands);
    console.log('✅ Comandos /formulario e /ajuda registrados');
  } catch (error) {
    console.error('Erro ao registrar comandos:', error);
  }
});

client.on(Events.InteractionCreate, async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      const { commandName } = interaction;

      if (commandName === 'formulario') {
        const embed = new EmbedBuilder()
          .setTitle('Formulário de Entrada')
          .setDescription('Clique no botão abaixo para preencher o formulário de entrada na facção.')
          .setColor(0xff0000);

        const button = new ButtonBuilder()
          .setCustomId('abrir_formulario')
          .setLabel('Entrar na facção')
          .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(button);

        await interaction.reply({ embeds: [embed], components: [row] });
      } else if (commandName === 'ajuda') {
        await interaction.reply({
          content: '📜 Comandos disponíveis:\n`/formulario` - Envia o formulário\n`/ajuda` - Mostra esta mensagem.',
          ephemeral: true
        });
      }
    } else if (interaction.isButton()) {
      if (interaction.customId === 'abrir_formulario') {
        const modal = new ModalBuilder()
          .setCustomId('formulario_modal')
          .setTitle('Formulário de Entrada');

        const nomeInput = new TextInputBuilder()
          .setCustomId('nome_input')
          .setLabel('Qual seu nome?')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const idInput = new TextInputBuilder()
          .setCustomId('id_input')
          .setLabel('Qual seu ID?')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const row1 = new ActionRowBuilder().addComponents(nomeInput);
        const row2 = new ActionRowBuilder().addComponents(idInput);

        modal.addComponents(row1, row2);

        await interaction.showModal(modal);
      }
    } else if (interaction.isModalSubmit()) {
      if (interaction.customId === 'formulario_modal') {
        const nome = interaction.fields.getTextInputValue('nome_input');
        const id = interaction.fields.getTextInputValue('id_input');

        const embed = new EmbedBuilder()
          .setTitle('📨 Novo Formulário Recebido')
          .addFields(
            { name: 'Nome', value: nome },
            { name: 'ID', value: id }
          )
          .setColor(0x00ff00)
          .setTimestamp();

        const canal = interaction.guild.channels.cache.find(c => c.name === '📩formulários' && c.isTextBased());

        if (canal) {
          const msg = await canal.send({ embeds: [embed] });
          await msg.pin();
          await interaction.reply({ content: '✅ Formulário enviado com sucesso!', ephemeral: true });
          console.log('📌 Formulário enviado e fixado.');
        } else {
          await interaction.reply({ content: '❌ Canal de formulário não encontrado.', ephemeral: true });
        }
      }
    }
  } catch (error) {
    console.error('❌ Erro ao processar interação:', error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: '❌ Ocorreu um erro.', ephemeral: true });
    } else {
      await interaction.reply({ content: '❌ Ocorreu um erro.', ephemeral: true });
    }
  }
});

// 🛡️ Proteções contra quedas
client.on('error', console.error);
client.on('shardError', console.error);
process.on('unhandledRejection', console.error);
process.on('uncaughtException', console.error);

// 🚀 Login
try {
  client.login(TOKEN);
} catch (error) {
  console.error('Erro ao logar o bot:', error);
}
