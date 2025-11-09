// app/api/tele-bot/route.js
import { NextRequest } from 'next/server';

// Helper: kirim pesan ke Telegram
async function sendMessage(chatId, text) {
  const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (!TELEGRAM_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN missing');
  
  const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  });
}

// Helper: Redis command
async function redisCommand(command) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('Redis env vars missing');

  const res = await fetch(url, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
    body: JSON.stringify(command),
  });
  return await res.json();
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { message } = body;
    
    if (!message || !message.from?.id) {
      return new Response(null, { status: 200 });
    }

    const userId = String(message.from.id);
    const text = message.text?.trim() || '';

    // Baca state user dari Redis
    const getStored = await redisCommand(['GET', `user:${userId}`]);
    let user = getStored.result ? JSON.parse(getStored.result) : { state: 'start' };

    // Handle /start
    if (text === '/start') {
      user = { state: 'waiting_name', id: userId };
      await redisCommand(['SET', `user:${userId}`, JSON.stringify(user), 'EX', '7200']);
      await sendMessage(userId, '👋 Halo! Untuk mengajukan akses ke IOH Project, silakan kirim *nama lengkap* Anda.');
      return new Response(null, { status: 200 });
    }

    // Tunggu nama
    if (user.state === 'waiting_name') {
      user.name = text;
      user.state = 'waiting_email';
      await redisCommand(['SET', `user:${userId}`, JSON.stringify(user), 'EX', '7200']);
      await sendMessage(userId, '📧 Terima kasih! Sekarang kirim *alamat email* Anda.');
      return new Response(null, { status: 200 });
    }

    // Tunggu email
    if (user.state === 'waiting_email') {
      if (!text.includes('@') || !text.includes('.')) {
        await sendMessage(userId, '❌ Format email tidak valid. Contoh: nama@email.com');
        return new Response(null, { status: 200 });
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

      await sendMessage(process.env.ADMIN_TELEGRAM_ID, notifyAdmin);
      await sendMessage(userId, '📨 Permohonan Anda telah dikirim ke admin. Mohon tunggu konfirmasi.');
      return new Response(null, { status: 200 });
    }

    // Handle admin approval/rejection
    if (userId === process.env.ADMIN_TELEGRAM_ID) {
      if (text.startsWith('/approve_')) {
        const targetId = text.split('_')[1];
        if (targetId) {
          const targetRes = await redisCommand(['GET', `user:${targetId}`]);
          const targetUser = targetRes.result ? JSON.parse(targetRes.result) : null;
          if (targetUser && targetUser.state === 'pending_approval') {
            targetUser.state = 'approved';
            await redisCommand(['SET', `user:${targetId}`, JSON.stringify(targetUser), 'EX', '2592000']);
            
            const PROJECT_LINK = `https://ioh-batch1.vercel.app?access=${targetId}`;
            await sendMessage(targetId, `✅ *Akses Disetujui!*\n\nSilakan buka proyek Anda di sini:\n${PROJECT_LINK}`);
            await sendMessage(process.env.ADMIN_TELEGRAM_ID, `✅ User ${targetId} telah disetujui.`);
          }
        }
        return new Response(null, { status: 200 });
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
            await sendMessage(process.env.ADMIN_TELEGRAM_ID, `❌ User ${targetId} ditolak.`);
          }
        }
        return new Response(null, { status: 200 });
      }
    }

    // Default replies
    const replies = {
      start: 'Ketik /start untuk memulai pengajuan akses.',
      approved: '✅ Anda sudah disetujui! Gunakan link yang sudah dikirim.',
      rejected: '❌ Akses Anda ditolak.',
      pending_approval: '⏳ Permohonan sedang diproses.',
    };
    const msg = replies[user.state] || replies.start;
    await sendMessage(userId, msg);

    return new Response(null, { status: 200 });
  } catch (e) {
    console.error('Bot error:', e);
    return new Response('Internal Server Error', { status: 500 });
  }
}

// Opsional: endpoint GET untuk set webhook (bisa dihapus setelah set)
export async function GET() {
  const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const WEBHOOK_URL = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}/api/tele-bot`
    : 'http://localhost:3000/api/tele-bot';

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/setWebhook?url=${encodeURIComponent(WEBHOOK_URL)}`
    );
    const data = await res.json();
    return new Response(JSON.stringify(data), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}