let broadcast = null;
function setBroadcast(fn) { broadcast = fn; }

async function setupHandlers() {
  const tgClient = require('./client');
  const plugramRuntime = require('../plugram/runtime');
  const { Api } = require('telegram');
  const client = tgClient.getClient();
  if (!client) return;

  client.addEventHandler(async (event) => {
    try {
      if (event.className === 'UpdateNewMessage' || event.className === 'UpdateNewChannelMessage') {
        const msg = event.message;
        let text = msg.message || '';
        let dialogId = '';
        if (msg.peerId?.className === 'PeerUser') dialogId = String(msg.peerId.userId);
        else if (msg.peerId?.className === 'PeerChat') dialogId = String(msg.peerId.chatId);
        else if (msg.peerId?.className === 'PeerChannel') dialogId = String(msg.peerId.channelId);

        const messageData = {
          id: msg.id, dialogId, fromId: String(msg.senderId || ''), text,
          date: msg.date, out: msg.out || false, mediaType: null, mediaData: null,
          replyTo: msg.replyTo?.replyToMsgId || null,
          isPrivate: msg.peerId?.className === 'PeerUser',
          isGroup: msg.peerId?.className === 'PeerChat',
          isChannel: msg.peerId?.className === 'PeerChannel',
        };
        if (broadcast) broadcast('new_message', messageData);
        await plugramRuntime.runHook('onMessage', messageData);
        if (text.startsWith('/')) {
          const parts = text.split(' ');
          await plugramRuntime.runCommand(parts[0].substring(1).toLowerCase(), parts.slice(1), messageData);
        }
      }
    } catch (e) { console.error('[Handler] Msg:', e.message); }
  });

  client.addEventHandler(async (event) => {
    try {
      if (event.className === 'UpdateUserStatus' && broadcast) {
        broadcast('user_status', {
          userId: String(event.userId),
          online: event.status?.className === 'UserStatusOnline',
          lastSeen: event.status?.wasOnline || null,
        });
      }
    } catch (e) { console.error('[Handler] Status:', e.message); }
  });

  client.addEventHandler(async (event) => {
    try {
      if (event.className === 'UpdateUserTyping' && broadcast) {
        broadcast('typing', {
          userId: String(event.userId),
          chatId: String(event.chatId || event.userId || ''),
          action: event.action?.className || 'typing',
        });
      }
    } catch (e) { console.error('[Handler] Typing:', e.message); }
  });

  client.addEventHandler(async (event) => {
    try {
      if (event.className === 'UpdateMessageID' && broadcast) {
        broadcast('message_id', { oldId: event.id, newId: event.randomId });
      }
    } catch (e) { console.error('[Handler] MsgID:', e.message); }
  });
}

module.exports = { setupHandlers, setBroadcast };
