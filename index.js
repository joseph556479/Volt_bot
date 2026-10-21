const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

// التوكن وإعدادات Supabase
const BOT_TOKEN = '7629604169:AAGD_gXlZl2Ols9lWv9Nrm7K3s62T3eE8yA'; 
const SUPABASE_URL = 'https://biennfghsvreatzmldpt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_XtKpUAA1b1_QJEt_LfvJ_Q_7xvSmdeS'; 

const bot = new TelegramBot(BOT_TOKEN, { polling: true });
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const app = express();

app.use(cors());
app.use(express.json());

const COMMUNITY_CHAT_ID = '@Volt_mining_community';

// API للتحقق من انضمام المستخدم للقناة الرسمية
app.get('/verify-membership', async (req, res) => {
    const userId = req.query.userId;
    if (!userId) {
        return res.status(400).json({ isMember: false, error: 'User ID required' });
    }

    try {
        const chatMember = await bot.getChatMember(COMMUNITY_CHAT_ID, userId);
        const validStatuses = ['creator', 'administrator', 'member'];
        if (validStatuses.includes(chatMember.status)) {
            return res.json({ isMember: true });
        } else {
            return res.json({ isMember: false });
        }
    } catch (error) {
        console.error("خطأ أثناء التحقق من العضوية:", error);
        return res.json({ isMember: false });
    }
});

// معالج أمر /start والتحقق من الإحالة مع منح 10,000 عملة للداعي
bot.onText(/\/start(?: (.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const startParam = match[1];

    try {
        if (startParam && startParam.startsWith('ref_')) {
            const referrerId = parseInt(startParam.replace('ref_', ''));
            
            if (referrerId && referrerId !== userId) {
                const { data: existingUser } = await supabase
                    .from('users')
                    .select('telegram_id')
                    .eq('telegram_id', userId)
                    .maybeSingle();

                if (!existingUser) {
                    const { data: referrer } = await supabase
                        .from('users')
                        .select('coins')
                        .eq('telegram_id', referrerId)
                        .maybeSingle();

                    if (referrer) {
                        const newCoins = (parseFloat(referrer.coins) || 0) + 10000;
                        await supabase
                            .from('users')
                            .update({ coins: newCoins })
                            .eq('telegram_id', referrerId);

                        await supabase
                            .from('referrals')
                            .insert([{ referrer_id: referrerId, referred_id: userId, reward: 10000 }]);

                        bot.sendMessage(referrerId, `🎉 انضم صديق جديد عبر رابط الإحالة الخاص بك!\nحصلت على مكافأة قدرها 10,000 عملة 🪙.`);
                    }
                }
            }
        }
    } catch (e) {
        console.error("خطأ في معالجة الإحالة:", e);
    }

    bot.sendMessage(chatId, "أهلاً بك في بوت Volt Mining الرسمي! ⚡\nاضغط على الزر أدناه لبدء التعدين:", {
        reply_markup: {
            inline_keyboard: [[
                { text: "⚡ ابدأ التعدين الآن", web_app: { url: "https://rignite.netlify.app" } }
            ]]
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});