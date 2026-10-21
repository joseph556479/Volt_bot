require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { createClient } = require('@supabase/supabase-js');
const express = require('express');
const cors = require('cors');
const path = require('path');

// إعداد السيرفر
const app = express();
app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const token = process.env.BOT_TOKEN;

if (!token || !supabaseUrl || !supabaseKey) {
  console.error("خطأ: يرجى التأكد من ضبط متغيرات البيئة في ملف .env أو إعدادات الاستضافة");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const bot = new TelegramBot(token, { polling: true });

// رابط لعبتك المنشور على Netlify
const webAppUrl = 'https://transcendent-beijinho-322c51.netlify.app';

console.log('⚡ تم تشغيل البوت والسيرفر بنجاح...');

// --- 1. كود البوت ---
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;
  const username = msg.from.username || msg.from.first_name;

  try {
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', telegramId)
      .maybeSingle();

    if (!existingUser) {
      // تم تصحيح القوس هنا بنجاح
      await supabase.from('users').insert([
        {
          telegram_id: telegramId,
          username: username,
          coins: 500, // مطابق للرصيد الافتتاحي في اللعبة
          ads_watched: 0
        },
      ]);
      console.log(`تم تسجيل لاعب جديد: ${username}`);
    }

    const options = {
      reply_markup: {
        inline_keyboard: [
          [{ text: '⚡ ابدأ التعدين الآن', web_app: { url: webAppUrl } }]
        ]
      }
    };

    bot.sendMessage(chatId, `أهلاً بك يا ${msg.from.first_name} ⚡\n\nاضغط على الزر بالأسفل لفتح اللعبة.`, options);
  } catch (error) {
    console.error('يوجد خطأ:', error.message);
    bot.sendMessage(chatId, 'حدث خطأ مؤقت.');
  }
});

// --- 2. جسر التواصل (API) للعبة ---
app.post('/api/getUser', async (req, res) => {
  const { telegram_id } = req.body;

  try {
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', telegram_id)
      .maybeSingle();

    if (user) {
      res.json({ success: true, user: user });
    } else {
      res.json({ success: false, message: 'المستخدم غير موجود' });
    }
  } catch (error) {
    res.json({ success: false, message: 'حدث خطأ في قاعدة البيانات' });
  }
});

app.get('/', (req, res) => {
  res.send('Rignite Bot Server is Running!');
});

// تشغيل السيرفر على البورت المعين من الاستضافة أو 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 السيرفر يعمل على المنفذ ${PORT}`);
});