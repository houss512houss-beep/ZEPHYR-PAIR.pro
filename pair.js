const { makeid } = require('./gen-id');
const express = require('express');
const fs = require('fs');
let router = express.Router();
const pino = require("pino");
const { default: makeWASocket, useMultiFileAuthState, delay, Browsers, makeCacheableSignalKeyStore, getAggregateVotesInPollMessage, DisconnectReason, WA_DEFAULT_EPHEMERAL, jidNormalizedUser, proto, getDevice, generateWAMessageFromContent, fetchLatestBaileysVersion, makeInMemoryStore, getContentType, generateForwardMessageContent, downloadContentFromMessage, jidDecode } = require('@whiskeysockets/baileys')

const { upload } = require('./mega');

function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
    const id = makeid();
    let num = req.query.number;

    async function ZEPHYR_PAIR_CODE() {
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
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                printQRInTerminal: false,
                generateHighQualityLinkPreview: true,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                syncFullHistory: false,
                browser: Browsers.macOS(randomItem)
            });

            if (!sock.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                const code = await sock.requestPairingCode(num);
                if (!res.headersSent) {
                    await res.send({ code });
                }
            }

            sock.ev.on('creds.update', saveCreds);

            sock.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;

                if (connection == "open") {
                    await delay(5000);
                    let data = fs.readFileSync(__dirname + `/temp/${id}/creds.json`);
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
                        let code = await sock.sendMessage(sock.user.id, { text: md });

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
                                    title: "ZEPHYR BOT",
                                    body: "WhatsApp Bot Pairing",
                                    thumbnailUrl: "https://i.ibb.co/qM85X4Zq/37a662613404ed485683741d9889200e.jpg", // غيرها بصورة خاصة بك لو عايز
                                    sourceUrl: "", // اتركها فاضية أو حط رابطك الخاص
                                    mediaType: 1,
                                    renderLargerThumbnail: true
                                }
                            }
                        }, { quoted: code });

                    } catch (e) {
                        let ddd = await sock.sendMessage(sock.user.id, { text: "حدث خطأ أثناء رفع الجلسة." });

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
                                    title: "ZEPHYR BOT",
                                    body: "WhatsApp Bot Session",
                                    thumbnailUrl: "https://i.ibb.co/qM85X4Zq/37a662613404ed485683741d9889200e.jpg",
                                    sourceUrl: "",
                                    mediaType: 1,
                                    renderLargerThumbnail: true
                                }
                            }
                        }, { quoted: ddd });
                    }

                    await delay(10);
                    await sock.ws.close();
                    await removeFile('./temp/' + id);
                    console.log(`👤 ${sock.user.id} Connected Successfully ✅ Restarting...`);
                    await delay(10);
                    process.exit();
                } else if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode != 401) {
                    await delay(10);
                    ZEPHYR_PAIR_CODE();
                }
            });
        } catch (err) {
            console.log("Service restarted due to error");
            await removeFile('./temp/' + id);
            if (!res.headersSent) {
                await res.send({ code: "❗ الخدمة غير متوفرة حالياً" });
            }
        }
    }

    return await ZEPHYR_PAIR_CODE();
});

module.exports = router;