const TelegramBot = require('node-telegram-bot-api');

// Token
const token = '8580639697:AAFPv5TYWiWFXFxaMYQWPN7JzCwMUMYkVIQ';
const bot = new TelegramBot(token, { polling: true });

// State for user inputs
const userState = {};

// Keywords
const KEYS = {
    TAXI: '🚕 Taksi kerak',
    CLIENT: '🙋‍♂️ Yo\'lovchiman',
    DRIVER: '🚖 Haydovchiman',
    MAIL: '📦 Pochta yuborish',
    CANCEL: '🚫 Bekor qilish'
};

// Start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, `Assalomu alaykum, ${msg.from.first_name}!\n\nBizning xizmatdan foydalanish uchun tanlang:`, {
        reply_markup: {
            keyboard: [
                [{ text: KEYS.CLIENT }, { text: KEYS.DRIVER }],
                [{ text: KEYS.MAIL }],
            ],
            resize_keyboard: true
        }
    });
});

// Handle Messages
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (text === KEYS.CANCEL) {
        delete userState[chatId];
        bot.sendMessage(chatId, "Bekor qilindi. Bosh menyu:", {
            reply_markup: {
                keyboard: [
                    [{ text: KEYS.CLIENT }, { text: KEYS.DRIVER }],
                    [{ text: KEYS.MAIL }],
                ],
                resize_keyboard: true
            }
        });
        return;
    }

    if (text === KEYS.CLIENT) {
        userState[chatId] = { step: 'from' };
        bot.sendMessage(chatId, "Qayerdan ketasiz? (Tuman/Shahar)", { reply_markup: { remove_keyboard: true } });
    } else if (text === KEYS.DRIVER) {
        userState[chatId] = { step: 'driver_start' };
        bot.sendMessage(chatId, "Mashinangiz modeli va rangi?", { reply_markup: { remove_keyboard: true } });
    } else if (text === KEYS.MAIL) {
        userState[chatId] = { step: 'mail_content' };
        bot.sendMessage(chatId, "Pochta nima? (Masalan: Hujjat, Sumka...)", { reply_markup: { remove_keyboard: true } });
    }

    // Process Steps
    else if (userState[chatId]) {
        const state = userState[chatId];

        if (state.step === 'from') {
            state.from = text;
            state.step = 'to';
            bot.sendMessage(chatId, "Qayerga borasiz?");
        } else if (state.step === 'to') {
            state.to = text;
            state.step = 'phone';
            bot.sendMessage(chatId, "Telefon raqamingizni yuboring:", {
                reply_markup: {
                    keyboard: [[{ text: "📱 Raqamni yuborish", request_contact: true }]],
                    resize_keyboard: true,
                    one_time_keyboard: true
                }
            });
        } else if (state.step === 'driver_start') {
            state.car = text;
            state.step = 'driver_route';
            bot.sendMessage(chatId, "Yo'nalishingiz? (Masalan: Angren -> Toshkent)");
        } else if (state.step === 'driver_route') {
            state.route = text;
            state.step = 'phone';
            bot.sendMessage(chatId, "Telefon raqamingizni yuboring:", {
                reply_markup: {
                    keyboard: [[{ text: "📱 Raqamni yuborish", request_contact: true }]],
                    resize_keyboard: true,
                    one_time_keyboard: true
                }
            });
        } else if (state.step === 'mail_content') {
            state.content = text;
            state.step = 'driver_route'; // Reuse route for simplicity or make new step
            bot.sendMessage(chatId, "Qayerdan - Qayerga?");
        }
    }
});

// Handle Contact
bot.on('contact', (msg) => {
    const chatId = msg.chat.id;
    const contact = msg.contact;

    if (userState[chatId] && userState[chatId].step === 'phone') {
        const state = userState[chatId];
        state.phone = contact.phone_number;

        let summary = "";
        if (state.car) {
            summary = `🚖 #Haydovchi\n🚗 Mashina: ${state.car}\n🛣 Yo'nalish: ${state.route}\n📞 Tel: ${state.phone}`;
        } else if (state.content) {
            summary = `📦 #Pochta\n📄 Narsa: ${state.content}\n🛣 Yo'nalish: ${state.route}\n📞 Tel: ${state.phone}`;
        } else {
            summary = `🙋‍♂️ #Yo_lovchi\n📍 Qayerdan: ${state.from}\n🏁 Qayerga: ${state.to}\n📞 Tel: ${state.phone}`;
        }

        bot.sendMessage(chatId, `✅ E'lon qabul qilindi!\n\n${summary}\n\nTez orada kanalga chiqariladi.`);

        // Forward to Admin/Channel (Placeholder ID)
        // bot.sendMessage(ADMIN_CHANNEL_ID, summary); 

        delete userState[chatId];

        // Back to Menu
        bot.sendMessage(chatId, "Yana xizmat kerakmi?", {
            reply_markup: {
                keyboard: [
                    [{ text: KEYS.CLIENT }, { text: KEYS.DRIVER }],
                    [{ text: KEYS.MAIL }],
                ],
                resize_keyboard: true
            }
        });
    }
});

console.log("Angren Taxi Bot ishladi...");
