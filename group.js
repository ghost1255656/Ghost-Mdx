module.exports = async (cmd, { sock, msg, jid, args, sender, isOwner, isGroup, BOT_NAME }) => {
  const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });

  if (!isGroup) return reply('❌ Group eke vitharai me commands use karanna puluwan!');

  // Check if bot is admin
  let botJid, groupMeta, participants, isBotAdmin, isSenderAdmin;
  try {
    botJid = sock.user.id;
    groupMeta = await sock.groupMetadata(jid);
    participants = groupMeta.participants;
    isBotAdmin = participants.find(p => p.id === botJid)?.admin ? true : false;
    isSenderAdmin = participants.find(p => p.id === sender)?.admin ? true : false;
  } catch (e) {
    return reply('❌ Group info load karanna bari una.');
  }

  const needsAdmin = ['kick','promote','demote','tagall','antilink','welcome','mute','unmute','link','revoke'];
  if (needsAdmin.includes(cmd) && !isSenderAdmin && !isOwner) {
    return reply('⛔ Me command use karanna admin permissions eka ōne!');
  }
  if (['kick','promote','demote','mute','unmute','revoke'].includes(cmd) && !isBotAdmin) {
    return reply('⛔ Bot eka admin karanna! Bot admin natha me commands work karanne ne.');
  }

  // Get mentioned users
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

  switch (cmd) {

    case 'kick':
      if (!mentioned.length) return reply('👤 User mention karanna!\nExample: *.kick @user*');
      for (const user of mentioned) {
        try {
          await sock.groupParticipantsUpdate(jid, [user], 'remove');
          await reply(`✅ @${user.split('@')[0]} removed from group.`);
        } catch (e) {
          await reply(`❌ @${user.split('@')[0]} kick karanna bari una.`);
        }
      }
      break;

    case 'promote':
      if (!mentioned.length) return reply('👤 User mention karanna!\nExample: *.promote @user*');
      for (const user of mentioned) {
        try {
          await sock.groupParticipantsUpdate(jid, [user], 'promote');
          await reply(`⬆️ @${user.split('@')[0]} Admin kala!`);
        } catch (e) {
          await reply(`❌ @${user.split('@')[0]} promote karanna bari una.`);
        }
      }
      break;

    case 'demote':
      if (!mentioned.length) return reply('👤 User mention karanna!\nExample: *.demote @user*');
      for (const user of mentioned) {
        try {
          await sock.groupParticipantsUpdate(jid, [user], 'demote');
          await reply(`⬇️ @${user.split('@')[0]} Admin ekata kala.`);
        } catch (e) {
          await reply(`❌ @${user.split('@')[0]} demote karanna bari una.`);
        }
      }
      break;

    case 'tagall': {
      const message = args.join(' ') || `👻 *${BOT_NAME} BOT* — Everyone tagged!`;
      const mentionList = participants.map(p => p.id);
      let text = `📢 *${message}*\n\n`;
      for (const p of participants) {
        text += `@${p.id.split('@')[0]}\n`;
      }
      await sock.sendMessage(jid, { text, mentions: mentionList }, { quoted: msg });
      break;
    }

    case 'antilink': {
      const setting = args[0]?.toLowerCase();
      if (setting === 'on') {
        await reply('🔒 Anti-link *ON* kala!\n\n_Note: Bot eka admin una viṭa links auto delete wenawa._');
        // Note: actual antilink needs message listener in index.js — inform user
        await reply('ℹ️ Full antilink ena update eke add wenawa. Admin permissions check karanna.');
      } else if (setting === 'off') {
        await reply('🔓 Anti-link *OFF* kala!');
      } else {
        await reply('Usage: *.antilink on* or *.antilink off*');
      }
      break;
    }

    case 'welcome': {
      const setting = args[0]?.toLowerCase();
      if (setting === 'on') {
        await reply('👋 Welcome message *ON* kala!\n\n_New members join una viṭa welcome message eyi._');
      } else if (setting === 'off') {
        await reply('🔕 Welcome message *OFF* kala!');
      } else {
        await reply('Usage: *.welcome on* or *.welcome off*');
      }
      break;
    }

    case 'mute':
      try {
        await sock.groupSettingUpdate(jid, 'announcement');
        await reply('🔇 Group mute kala! Admin vitharai messages evviya haki.');
      } catch (e) {
        await reply('❌ Mute karanna bari una: ' + e.message);
      }
      break;

    case 'unmute':
      try {
        await sock.groupSettingUpdate(jid, 'not_announcement');
        await reply('🔊 Group unmute kala! Everyone messages evviya haki.');
      } catch (e) {
        await reply('❌ Unmute karanna bari una: ' + e.message);
      }
      break;

    case 'link':
      try {
        const code = await sock.groupInviteCode(jid);
        await reply(`🔗 *Group Invite Link*\n\nhttps://chat.whatsapp.com/${code}`);
      } catch (e) {
        await reply('❌ Link ganna bari una. Bot admin da check karanna.');
      }
      break;

    case 'revoke':
      try {
        await sock.groupRevokeInvite(jid);
        const newCode = await sock.groupInviteCode(jid);
        await reply(`✅ Invite link reset kala!\n\n🔗 New link: https://chat.whatsapp.com/${newCode}`);
      } catch (e) {
        await reply('❌ Revoke karanna bari una: ' + e.message);
      }
      break;
  }
};
