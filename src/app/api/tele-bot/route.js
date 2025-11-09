export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const ADMIN_ID = process.env.ADMIN_TELEGRAM_ID;
  const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
  const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!TELEGRAM_TOKEN || !ADMIN_ID || !REDIS_URL || !REDIS_TOKEN) {
    console.error('Missing env vars');
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

  const sendMessage = async (chatId, text) => {
    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
    });
  };

  const redisCommand = async (command) => {
    const response = await fetch(REDIS_URL, {
      method: 'POST',
      headers: { authorization: `Bearer ${REDIS_TOKEN}` },
      body: JSON.stringify(command),
    });
    return await response.json();
  };

  const { message } = req.body;
  if (!message || !message.from?.id) return res.status(200).end();

  const userId = String(message.from.id);
  const text = message.text?.trim() || '';

  // Baca state user
  const getStored = await redisCommand(['GET', `user:${userId}`]);
  let user = getStored.result ? JSON.parse(getStored.result) : { state: 'start' };

  try {
    if (text === '/start') {
      user = { state: 'waiting_name', id: userId };
      await redisCommand(['SET', `user:${userId}`, JSON.stringify(user), 'EX', '7200']);
      await sendMessage(userId, '👋 Halo! Untuk mengajukan akses ke IOH Project, silakan kirim *nama lengkap* Anda.');
      return res.status(200).end();
    }

    if (user.state === 'waiting_name') {
      user.name = text;
      user.state = 'waiting_email';
      await redisCommand(['SET', `user:${userId}`, JSON.stringify(user), 'EX', '7200']);
      await sendMessage(userId, '📧 Terima kasih! Sekarang kirim *alamat email* Anda.');
      return res.status(200).end();
    }

    if (user.state === 'waiting_email') {
      if (!text.includes('@') || !text.includes('.')) {
        await sendMessage(userId, '❌ Format email tidak valid. Contoh: nama@email.com');
        return res.status(200).end();
      }
      user.email = text;
      user.state = 'pending_approval';
      await redisCommand(['SET', `user:${userId}`, JSON.stringify(user), 'EX', '86400']);

      const notifyAdmin = `
🔔 *Permohonan Akses Baru*

ID User: \`${userId}\`
Nama: ${user.name}
Email: ${user.email}

Balas dengan:
✅ \`/approve_${userId}\`
❌ \`/reject_${userId}\`
      `.trim();

      await sendMessage(ADMIN_ID, notifyAdmin);
      await sendMessage(userId, '📨 Permohonan Anda telah dikirim ke admin. Mohon tunggu konfirmasi.');
      return res.status(200).end();
    }

    // Handle admin commands
    if (userId === ADMIN_ID) {
      if (text.startsWith('/approve_')) {
        const targetId = text.split('_')[1];
        if (targetId) {
          const targetRes = await redisCommand(['GET', `user:${targetId}`]);
          const targetUser = targetRes.result ? JSON.parse(targetRes.result) : null;
          if (targetUser && targetUser.state === 'pending_approval') {
            targetUser.state = 'approved';
            await redisCommand(['SET', `user:${targetId}`, JSON.stringify(targetUser), 'EX', '2592000']); // 30 hari

            // 🔗 Ganti dengan link proyekmu nanti
            const PROJECT_LINK = `https://ioh-project.vercel.app?access=${targetId}`;
            await sendMessage(targetId, `✅ *Akses Disetujui!*\n\nSilakan buka proyek Anda di sini:\n${PROJECT_LINK}`);
            await sendMessage(ADMIN_ID, `✅ User ${targetId} telah disetujui.`);
          }
        }
        return res.status(200).end();
      }

      if (text.startsWith('/reject_')) {
        const targetId = text.split('_')[1];
        if (targetId) {
          const targetRes = await redisCommand(['GET', `user:${targetId}`]);
          const targetUser = targetRes.result ? JSON.parse(targetRes.result) : null;
          if (targetUser && targetUser.state === 'pending_approval') {
            targetUser.state = 'rejected';
            await redisCommand(['SET', `user:${targetId}`, JSON.stringify(targetUser), 'EX', '86400']);
            await sendMessage(targetId, '❌ Maaf, permohonan akses Anda tidak disetujui.');
            await sendMessage(ADMIN_ID, `❌ User ${targetId} ditolak.`);
          }
        }
        return res.status(200).end();
      }
    }

    // Default replies
    const replies = {
      start: 'Ketik /start untuk memulai pengajuan akses.',
      approved: '✅ Anda sudah disetujui! Gunakan link yang sudah dikirim.',
      rejected: '❌ Akses Anda ditolak.',
      pending_approval: '⏳ Permohonan sedang diproses. Mohon tunggu.',
    };
    const msg = replies[user.state] || replies.start;
    await sendMessage(userId, msg);

  } catch (e) {
    console.error('Error:', e);
    await sendMessage(userId, '⚠️ Terjadi kesalahan. Silakan coba lagi nanti.');
  }

  return res.status(200).end();
}