// bot.js
const fs = require('fs').promises;
const path = require('path');
const DATA_FILE = path.join(__dirname, 'pending-users.json');

const TELEGRAM_TOKEN = '8582133090:AAHKyE63l-xrDXxvB3IzVq4qccc7jzWPI58';
const ADMIN_ID = '5456134072'; // <-- Pastikan ini ID Anda dari @userinfobot

const API_URL = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

// <-- FUNGSI DIPERBARUI
// Sekarang kita memeriksa apakah pengiriman pesan berhasil
async function sendMessage(chatId, text) {
  try {
    const res = await fetch(`${API_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });

    const data = await res.json();
    
    // Ini adalah bagian penting untuk debugging
    if (!data.ok) {
      console.error(`❌ Gagal mengirim pesan ke chat ID ${chatId}.`);
      console.error(`❌ Alasan: ${data.description}`); // cth: "Bad Request: chat not found"
    }
    
    return data; // Mengembalikan respons
  } catch (err) {
    console.error(`❌ Error jaringan saat mencoba sendMessage: ${err.message}`);
  }
}

async function loadUsers() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return {};
  }
}

async function saveUsers(users) {
  await fs.writeFile(DATA_FILE, JSON.stringify(users, null, 2));
}

async function getUpdates(offset = 0) {
  const res = await fetch(`${API_URL}/getUpdates?offset=${offset + 1}&timeout=30`);
  if (!res.ok) {
      console.error("Gagal mendapatkan update, status:", res.status);
      return [];
  }
  const data = await res.json();
  return data.result || [];
}

async function runBot() {
  console.log('🤖 Bot berjalan. Data disimpan di:', DATA_FILE);
  let offset = 0;

  while (true) {
    try {
      const updates = await getUpdates(offset);
      const users = await loadUsers();

      for (const update of updates) {
        offset = update.update_id;
        const msg = update.message;
        if (!msg || !msg.text) continue;

        const userId = String(msg.from.id);
        const chatId = msg.chat.id;
        const text = msg.text.trim();
        
        // <-- DEBUGGING TAMBAHAN
        console.log(`[Pesan Diterima] Dari ${userId} (${msg.from.first_name}): ${text}`);

        if (text === '/start') {
          if (users[userId]?.state === 'pending_approval') {
            await sendMessage(chatId, '⌛ Permohonan Anda masih ditinjau admin.');
            continue;
          }
          
          users[userId] = { state: 'waiting_name' };
          await saveUsers(users);
          await sendMessage(chatId, '👋 Kirim nama lengkap Anda.');
          continue;
        }

        if (users[userId]?.state === 'waiting_name') {
          users[userId] = { state: 'waiting_email', name: text };
          await saveUsers(users);
          await sendMessage(chatId, '📧 Sekarang kirim email Anda.');
          continue;
        }

        if (users[userId]?.state === 'waiting_email') {
          if (!text.includes('@')) {
            await sendMessage(chatId, '❌ Email tidak valid. Kirim ulang email Anda.');
            continue;
          }
          users[userId] = { ...users[userId], email: text, state: 'pending_approval' };
          await saveUsers(users);

          const adminMessage = `
🔔 Permohonan Baru:
Nama: ${users[userId].name}
Email: ${text}
ID: ${userId}

Kirim balasan:
✅ /approve_${userId}
❌ /reject_${userId}
          `;
          
          console.log(`[Notifikasi Admin] Mencoba mengirim ke ADMIN_ID: ${ADMIN_ID}`);
          await sendMessage(ADMIN_ID, adminMessage); // Kirim ke admin
          await sendMessage(chatId, '📨 Permohonan Anda sudah dikirim ke admin untuk ditinjau.');
          continue;
        }

        // Admin approve
        if (userId === ADMIN_ID && text.startsWith('/approve_')) {
          // ... (sisa kode approve sama)
          const targetId = text.split('_')[1];
          if (users[targetId]?.state === 'pending_approval') {
            await sendMessage(targetId, 'Akses disetujui! Silahkan Klik link ini http://localhost:3000');
            delete users[targetId];
            await saveUsers(users);
            await sendMessage(ADMIN_ID, `Berhasil disetujui: ${targetId}`);
          } else {
            await sendMessage(ADMIN_ID, `⚠️ Gagal approve: User ${targetId} tidak ditemukan.`);
          }
          continue;
        }

        // Admin reject
        if (userId === ADMIN_ID && text.startsWith('/reject_')) {
          // ... (sisa kode reject sama)
          const targetId = text.split('_')[1];
          if (users[targetId]?.state === 'pending_approval') {
            await sendMessage(targetId, '❌ Permohonan Anda ditolak.');
            delete users[targetId];
            await saveUsers(users);
            await sendMessage(ADMIN_ID, `❌ Berhasil ditolak: ${targetId}`);
          } else {
            await sendMessage(ADMIN_ID, `⚠️ Gagal reject: User ${targetId} tidak ditemukan.`);
          }
          continue;
        }
        
        if (users[userId]?.state === 'pending_approval') {
            await sendMessage(chatId, '⌛ Permohonan Anda masih ditinjau admin. Mohon tunggu.');
            continue;
        }

        await sendMessage(chatId, 'Ketik /start untuk memulai pendaftaran.');
      }
    } catch (err) {
      console.error('❌ Error besar di loop utama:', err.message);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

runBot().catch(console.error);