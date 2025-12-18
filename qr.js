const { makeid } = require('./gen-id');
const express = require('express');
const QRCode = require('qrcode');
const fs = require('fs');
let router = express.Router();
const pino = require("pino");
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers,
    jidNormalizedUser
} = require("@whiskeysockets/baileys");
const { upload } = require('./mega');

function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
    const id = makeid();

    async function ZEPHYR_QR_PAIR() {
        const {
            state,
            saveCreds
        } = await useMultiFileAuthState('./temp/' + id);

        try {
            var items = ["Safari", "Chrome", "Firefox"];
            function selectRandomItem(array) {
                var randomIndex = Math.floor(Math.random() * array.length);
                return array[randomIndex];
            }
            var randomItem = selectRandomItem(items);

            let sock = makeWASocket({
                auth: state,
                printQRInTerminal: false,
                logger: pino({ level: "silent" }),
                browser: Browsers.macOS("Desktop"),
            });

            sock.ev.on('creds.update', saveCreds);

            sock.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect, qr } = s;

                if (qr) {
                    // إرسال QR كصورة للصفحة
                    await res.end(await QRCode.toBuffer(qr));
                }

                if (connection == "open") {
                    await delay(5000);
                    let rf = __dirname + `/temp/${id}/creds.json`;

                    function generateRandomText() {
                        const prefix = "ZEP";
                        const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
                        let randomText = prefix;
                        for (let i = prefix.length; i < 22; i++) {
                            const randomIndex = Math.floor(Math.random() * characters.length);
                            randomText += characters.charAt(randomIndex);
                        }
                        return randomText;
                    }
                    const randomText = generateRandomText();

                    try {
                        const mega_url = await upload(fs.createReadStream(rf), `${sock.user.id}.json`);
                        const string_session = mega_url.replace('https://mega.nz/file/', '');
                        let md = "zephyr~" + string_session;
                        let codeMsg = await sock.sendMessage(sock.user.id, { text: md });

                        let desc = `*مرحباً، مستخدم ZEPHYR!* 👋🏻

تم إنشاء الجلسة بنجاح!

🔐 *معرف الجلسة:* مرسل أعلاه  
⚠️ *احفظه بأمان!* لا تشاركه مع أي شخص.

——————

*© Powered by ZEPHYR*
استمتع بالبوت! ✌🏻`;

                        await sock.sendMessage(sock.user.id, {
                            text: desc,
                            contextInfo: {
                                externalAdReply: {
                                    title: "ZEPHYR CONNECTED ✅",
                                    body: "WhatsApp Bot Session Created",
                                    thumbnailUrl: "https://i.ibb.co/qM85X4Zq/37a662613404ed485683741d9889200e.jpg", // غيرها بصورة خاصة بك لو عايز
                                    sourceUrl: "", // اتركها فاضية أو حط رابطك
                                    mediaType: 1,
                                    renderLargerThumbnail: true
                                }
                            }
                        }, { quoted: codeMsg });

                    } catch (e) {
                        let errorMsg = await sock.sendMessage(sock.user.id, { text: "حدث خطأ أثناء رفع الجلسة." });

                        let desc = `*مرحباً، مستخدم ZEPHYR!* 👋🏻

تم إنشاء الجلسة بنجاح!

🔐 *معرف الجلسة:* مرسل أعلاه  
⚠️ *احفظه بأمان!* لا تشاركه مع أي شخص.

——————

*© Powered by ZEPHYR*
استمتع بالبوت! ✌🏻`;

                        await sock.sendMessage(sock.user.id, {
                            text: desc,
                            contextInfo: {
                                externalAdReply: {
                                    title: "ZEPHYR CONNECTED ✅",
                                    body: "Session Ready",
                                    thumbnailUrl: "https://i.ibb.co/qM85X4Zq/37a662613404ed485683741d9889200e.jpg",
                                    sourceUrl: "",
                                    mediaType: 1,
                                    renderLargerThumbnail: true
                                }
                            }
                        }, { quoted: errorMsg });
                    }

                    await delay(10);
                    await sock.ws.close();
                    await removeFile('./temp/' + id);
                    console.log(`👤 ${sock.user.id} Connected Successfully ✅ Restarting...`);
                    await delay(10);
                    process.exit();
                } else if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode != 401) {
                    await delay(10);
                    ZEPHYR_QR_PAIR();
                }
            });
        } catch (err) {
            console.log("Service restarted due to error");
            await removeFile('./temp/' + id);
            if (!res.headersSent) {
                await res.end(await QRCode.toBuffer("Service Unavailable")); // عرض QR بديل لو حصل خطأ
            }
        }
    }

    await ZEPHYR_QR_PAIR();
});

// إعادة تشغيل تلقائي كل 30 دقيقة (اختياري، يمكنك حذفه لو مش عايزه)
setInterval(() => {
    console.log("🌬️ Restarting ZEPHYR process...");
    process.exit();
}, 180000); // 30 دقيقة

module.exports = router;