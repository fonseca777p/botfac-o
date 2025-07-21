
require('dotenv').config();
/*
  ⚠️ NUNCA compartilhe seu arquivo .env publicamente.
  Caso tenha feito isso, regenere seu TOKEN imediatamente no Discord Developer Portal.
*/

const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  REST,
  Routes
} = require('discord.js');

const express = require('express');
const app = express();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel],
});

// Variáveis de ambiente
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const ROLE_ID = process.env.ROLE_ID;
const FORM_CHANNEL_ID = process.env.FORM_CHANNEL_ID;

// Evento: bot ligado
client.once('ready', async () => {
  console.log(`✅ Bot ligado como ${client.user.tag}`);

  try {
    const channel = await client.channels.fetch(FORM_CHANNEL_ID);

    if (!channel || !channel.isTextBased()) {
      console.error('❌ Canal inválido ou não é de texto.');
      return;
    }

    const button = new ButtonBuilder()
      .setCustomId('abrir_formulario')
      .setLabel('Entrar na facção')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(button);

    const msg = await channel.send({
      content: 'Clique no botão abaixo para preencher o formulário de entrada na facção:',
      components: [row]
    });

    await msg.pin();
    console.log('📌 Formulário enviado e fixado.');
  } catch (err) {
    console.error('Erro ao enviar botão inicial:', err);
  }
});

// Comando de texto: !entrar
client.on('messageCreate', async (message) => {
  if (message.content.startsWith('!entrar')) {
    const args = message.content.split(' ').slice(1);
    if (args.length < 2) {
      return message.reply('❌ Use: `!entrar NomeDaFacção IDRP`');
    }

    const [facName, idRP] = args;
    const novoNick = `[M] ${facName.toUpperCase()} | ${idRP}`;

    try {
      const botHasPerm = message.guild.members.me.permissions.has('ManageNicknames');
      const memberHasPerm = message.member.manageable;

      if (!botHasPerm || !memberHasPerm) {
        return message.reply('❌ Permissão insuficiente para alterar apelidos.');
      }

      await message.member.setNickname(novoNick);

      const role = message.guild.roles.cache.get(ROLE_ID);
      if (role) {
        await message.member.roles.add(role);
        message.reply(`✅ Você entrou na facção **${facName}** com ID **${idRP}**.`);
      } else {
        message.reply('❌ Cargo não encontrado.');
      }
    } catch (err) {
      console.error(`Erro com ${message.author.tag} (${message.author.id}):`, err);
      message.reply('❌ Ocorreu um erro ao tentar aplicar apelido ou cargo.');
    }
  }
});

// Registro de comandos
const rest = new REST({ version: '10' }).setToken(TOKEN);
const commands = [
  {
    name: 'formulario',
    description: 'Abrir botão para entrar na facção via formulário'
  },
  {
    name: 'ajuda',
    description: 'Ver instruções para entrar na facção'
  }
];

(async () => {
  try {
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
    console.log('✅ Comandos /formulario e /ajuda registrados');
  } catch (err) {
    console.error('Erro ao registrar comandos:', err);
  }
})();

// Interações
client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isChatInputCommand()) {
    // Comando /formulario
    if (interaction.commandName === 'formulario') {
      const button = new ButtonBuilder()
        .setCustomId('abrir_formulario')
        .setLabel('Entrar na facção')
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder().addComponents(button);

      await interaction.reply({
        content: 'Clique no botão para preencher o formulário:',
        components: [row],
        ephemeral: true
      });
    }

    // Comando /ajuda
    if (interaction.commandName === 'ajuda') {
      await interaction.reply({
        content: `
📋 **Instruções para entrar na facção:**
1. Use o botão no canal de formulário.
2. Ou digite: \`!entrar NomeDaFacção IDRP\`
3. O bot vai mudar seu apelido e aplicar o cargo automaticamente.
        `,
        ephemeral: true
      });
    }
  }

  // Clique no botão do formulário
  if (interaction.isButton() && interaction.customId === 'abrir_formulario') {
    const modal = new ModalBuilder()
      .setCustomId('formulario_modal')
      .setTitle('Formulário de Entrada');

    const nome = new TextInputBuilder()
      .setCustomId('nome')
      .setLabel('Seu nome na facção')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const idrp = new TextInputBuilder()
      .setCustomId('idrp')
      .setLabel('Seu ID no RP')
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(nome),
      new ActionRowBuilder().addComponents(idrp)
    );

    await interaction.showModal(modal);
  }

  // Submissão do modal
  if (interaction.isModalSubmit() && interaction.customId === 'formulario_modal') {
    const nome = interaction.fields.getTextInputValue('nome');
    const idrp = interaction.fields.getTextInputValue('idrp');
    const novoNick = `[M] ${nome.toUpperCase()} | ${idrp}`;

    try {
      const member = interaction.member;

      if (!interaction.guild.members.me.permissions.has('ManageNicknames') || !member.manageable) {
        return await interaction.reply({
          content: '❌ Permissão insuficiente para alterar apelido.',
          ephemeral: true
        });
      }

      await member.setNickname(novoNick);

      const role = interaction.guild.roles.cache.get(ROLE_ID);
      if (role) await member.roles.add(role);

      await interaction.reply({
        content: `✅ Você entrou na facção **${nome}** com ID **${idrp}**.`,
        ephemeral: true
      });
    } catch (err) {
      console.error(`Erro ao processar formulário de ${interaction.user.tag}:`, err);
      await interaction.reply({ content: '❌ Ocorreu um erro ao processar.', ephemeral: true });
    }
  }
});

// Web server (opcional)
app.get('/', (req, res) => res.send('🟢 Bot está online!'));
app.listen(3000, () => console.log('🌐 Web server rodando na porta 3000'));

// Login
client.login(TOKEN);
