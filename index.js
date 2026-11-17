process.on("uncaughtException", (err) => {
    console.error("Caught exception:", err);
});

console.clear();
console.log('🚀 Starting 亗 𝐒𝚳𝚰𝐋𝚵 𝚳𝐃 亗 Complete Edition...');

// ==================== REQUIREMENTS ====================
const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    Browsers,
    jidDecode, 
    generateForwardMessageContent,
    generateWAMessageFromContent,
    downloadContentFromMessage,
    fetchLatestBaileysVersion,
    jidNormalizedUser,
    makeCacheableSignalKeyStore,
    getContentType,
    proto
} = require("@whiskeysockets/baileys");

const pino = require('pino');
const chalk = require('chalk');
const readline = require("readline");
const express = require('express');
const app = express();
const fs = require('fs');
const NodeCache = require('node-cache');
const FileType = require('file-type');
const { File } = require('megajs');
const path = require('path');
const os = require('os');
const moment = require('moment-timezone');
const axios = require('axios');
const { Boom } = require('@hapi/boom');
const phoneNumber = require('awesome-phonenumber');
const { exec, spawn, execSync } = require('child_process');

// ==================== LOCAL MODULES ====================
const { settings } = require('./settings');
const { smsg, getBuffer, runtime, sleep, fetchJson } = require('./start/lib/myfunction');
const { imageToWebp, videoToWebp, writeExifImg, writeExifVid } = require('./start/lib/exif');
const PluginManager = require('./start/lib/PluginManager');
const { color } = require('./start/lib/color');
const db = require('./start/Core/databaseManager');
const { handleStatusUpdate } = require('./start/smile');
const { makeInMemoryStore } = require("./start/lib/store/");

// ==================== CONFIGURATION ====================
const port = process.env.PORT || 3000;
const timezones = global.timezones || settings.timezone || "Africa/Kampala";
const msgRetryCounterCache = new NodeCache();
const sessionDir = path.join(__dirname, 'sessions');
const credsPath = path.join(sessionDir, 'creds.json');
const loginFile = path.join(sessionDir, 'login.json');
const MESSAGE_STORE_FILE = path.join(__dirname, 'message_backup.json');
const SESSION_ERROR_FILE = path.join(__dirname, 'sessionErrorCount.json');

// ==================== GLOBAL VARIABLES ====================
global.isBotConnected = false;
global.errorRetryCount = 0;
global.botname = settings.botname || "亗 𝐒𝚳𝚰𝐋𝚵 𝚳𝐃 亗";
global.themeemoji = "•";
global.wm = settings.wm || "© 亗 𝐒𝚳𝚰𝐋𝚵 𝚳𝐃 2026 亗";
global.prefix = settings.prefix || ".";
global.messageBackup = {};
global.recentCallers = new Map();
global.pluginManager = null;
global.pairingSocket = null;
global.pairingAvailable = false;
global.pairingCodeIssued = false;
global.pairingStatus = 'starting';
global.currentPairingCode = null;
global.pairingCodeGeneratedAt = 0;


// ==================== LOGGING FUNCTION ====================
function log(message, type = 'info') {
    const colors = {
        info: chalk.cyan || chalk.blue,
        success: chalk.green,
        error: chalk.red,
        warn: chalk.yellow,
        auth: chalk.magenta,
        conn: chalk.cyan,
        system: chalk.white || chalk.gray
    };
    
    const prefixes = {
        info: '📌',
        success: '✅',
        error: '❌',
        warn: '⚠️',
        auth: '🔐',
        conn: '📡',
        system: '⚙️'
    };
    
    const timestamp = moment().tz(timezones).format('HH:mm:ss');
    const colorFn = colors[type] || ((msg) => msg);
    console.log(`[${timestamp}] ${prefixes[type]} ${colorFn(message)}`);
}

// ==================== STORE SETUP ====================
const store = makeInMemoryStore({
    logger: pino().child({ level: 'silent', stream: 'store' })
});

// ==================== QUESTION HELPER ====================
const question = (text) => {
    const rl = readline.createInterface({ 
        input: process.stdin, 
        output: process.stdout 
    });
    return new Promise((resolve) => {
        rl.question(text, (ans) => {
            rl.close();
            resolve(ans);
        });
    });
}

// ==================== SESSION MANAGEMENT ====================
function sessionExists() {
    return fs.existsSync(credsPath);
}

function clearSessionFiles() {
    try {
        log('Clearing session folder...', 'warn');
        if (fs.existsSync(sessionDir)) {
            fs.rmSync(sessionDir, { recursive: true, force: true });
        }
        if (fs.existsSync(loginFile)) fs.unlinkSync(loginFile);
        if (fs.existsSync(SESSION_ERROR_FILE)) fs.unlinkSync(SESSION_ERROR_FILE);
        global.errorRetryCount = 0;
        log('Session files cleaned successfully', 'success');
    } catch (e) {
        log(`Failed to clear session: ${e.message}`, 'error');
    }
}

async function saveLoginMethod(method) {
    await fs.promises.mkdir(sessionDir, { recursive: true });
    await fs.promises.writeFile(loginFile, JSON.stringify({ method, timestamp: Date.now() }, null, 2));
}

function loadErrorCount() {
    try {
        if (fs.existsSync(SESSION_ERROR_FILE)) {
            const data = fs.readFileSync(SESSION_ERROR_FILE, 'utf-8');
            return JSON.parse(data);
        }
    } catch (error) {
        log(`Error loading error count: ${error.message}`, 'error');
    }
    return { count: 0, last_error_timestamp: 0 };
}

function saveErrorCount(data) {
    try {
        fs.writeFileSync(SESSION_ERROR_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        log(`Error saving error count: ${error.message}`, 'error');
    }
}

async function loadSessionFromId() {
    try {
        if (!settings.SESSION_ID) {
            log('No SESSION_ID provided', 'info');
            return false;
        }

        log('Loading session from SESSION_ID...', 'auth');
        
        await fs.promises.mkdir(sessionDir, { recursive: true });
        
        // Handle MEGA.nz links
        if (settings.SESSION_ID.includes('mega.nz')) {
            log('Downloading from MEGA.nz...', 'auth');
            const megaFileId = settings.SESSION_ID.split('/').pop();
            const file = File.fromURL(`https://mega.nz/file/${megaFileId}`);
            
            const data = await new Promise((resolve, reject) => {
                file.download((err, data) => {
                    if (err) reject(err);
                    else resolve(data);
                });
            });
            
            fs.writeFileSync(credsPath, data);
            log('MEGA session loaded successfully', 'success');
            return true;
        }
        
        // Handle base64 sessions
        const sessionMatch = settings.SESSION_ID.match(/(?:SMILEMD:~)?(.+)/);
        if (sessionMatch) {
            const base64Data = sessionMatch[1];
            const sessionData = Buffer.from(base64Data, 'base64');
            
            // Verify it's valid JSON
            JSON.parse(sessionData.toString());
            fs.writeFileSync(credsPath, sessionData);
            log('Base64 session loaded successfully', 'success');
            return true;
        }
        
        return false;
    } catch (error) {
        log(`Failed to load session: ${error.message}`, 'error');
        return false;
    }
}

async function handle408Error(statusCode) {
    if (statusCode !== DisconnectReason.timedOut) return false;
    
    global.errorRetryCount++;
    let errorState = loadErrorCount();
    const MAX_RETRIES = 3;
    
    errorState.count = global.errorRetryCount;
    errorState.last_error_timestamp = Date.now();
    saveErrorCount(errorState);

    log(`Connection timeout. Retry: ${global.errorRetryCount}/${MAX_RETRIES}`, 'warn');
    
    if (global.errorRetryCount >= MAX_RETRIES) {
        log('Max retries reached. Exiting...', 'error');
        global.errorRetryCount = 0;
        await sleep(5000);
        process.exit(1);
    }
    return true;
}

// ==================== MESSAGE BACKUP ====================
function loadStoredMessages() {
    try {
        if (fs.existsSync(MESSAGE_STORE_FILE)) {
            const data = fs.readFileSync(MESSAGE_STORE_FILE, 'utf-8');
            return JSON.parse(data);
        }
    } catch (error) {
        log(`Error loading message backup: ${error.message}`, 'error');
    }
    return {};
}

function saveStoredMessages(data) {
    try {
        fs.writeFileSync(MESSAGE_STORE_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        log(`Error saving message backup: ${error.message}`, 'error');
    }
}

function cleanupOldMessages() {
    let storedMessages = loadStoredMessages();
    let now = Math.floor(Date.now() / 1000);
    const maxMessageAge = 24 * 60 * 60;
    let cleanedMessages = {};
    
    for (let chatId in storedMessages) {
        let newChatMessages = {};
        for (let messageId in storedMessages[chatId]) {
            let message = storedMessages[chatId][messageId];
            if (now - message.timestamp <= maxMessageAge) {
                newChatMessages[messageId] = message;
            }
        }
        if (Object.keys(newChatMessages).length > 0) {
            cleanedMessages[chatId] = newChatMessages;
        }
    }
    saveStoredMessages(cleanedMessages);
    log('Old messages cleaned from backup', 'system');
}

// ==================== CLEANUP FUNCTIONS ====================
function cleanupJunkFiles(sock) {
    const tmpDir = path.join(__dirname, 'tmp');
    if (!fs.existsSync(tmpDir)) return;
    
    fs.readdir(tmpDir, (err, files) => {
        if (err) return;
        
        const junkFiles = files.filter(item =>
            item.endsWith(".gif") || item.endsWith(".png") || 
            item.endsWith(".mp3") || item.endsWith(".mp4") || 
            item.endsWith(".opus") || item.endsWith(".jpg") ||
            item.endsWith(".webp") || item.endsWith(".webm") || 
            item.endsWith(".zip") || item.endsWith(".pdf")
        );
        
        if (junkFiles.length > 0) {
            junkFiles.forEach(file => {
                const filePath = path.join(tmpDir, file);
                try { fs.unlinkSync(filePath); } catch (e) {}
            });
            log(`Cleaned ${junkFiles.length} junk files`, 'system');
        }
    });
}

function createRequiredFolders() {
    const folders = ['tmp', 'assets', 'database', 'sessions'];
    folders.forEach(folder => {
        const folderPath = path.join(__dirname, folder);
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
            log(`Created folder: ${folder}`, 'system');
        }
    });
}

// ==================== PLATFORM DETECTION ====================
function detectPlatform() {
    if (process.env.DYNO) return "Heroku";
    if (process.env.RENDER) return "Render";
    if (process.env.P_SERVER_UUID) return "Panel";
    if (os.platform() === "win32") return "Windows";
    if (os.platform() === "darwin") return "macOS";
    if (os.platform() === "linux") return "Linux";
    return "Unknown";
}

// ==================== PLUGIN LOADER ====================
async function loadAllPlugins() {
    try {
        const pluginManager = new PluginManager();
        const pluginsDir = path.join(__dirname, 'Plugins');
        
        if (!fs.existsSync(pluginsDir)) {
            fs.mkdirSync(pluginsDir, { recursive: true });
            log('Created plugins directory', 'system');
        }
        
        const count = pluginManager.loadPlugins(pluginsDir);
        log(`Loaded ${count} plugins`, 'success');
        global.pluginManager = pluginManager;
        return count;
    } catch (error) {
        log(`Plugin error: ${error.message}`, 'error');
        return 0;
    }
}

// ==================== WEBSITE PAIRING HANDLER ====================
// The website requests a code from this single Baileys socket. This deployment
// owns ONE WhatsApp session; it is not a multi-user hosting service.
async function handlePairing(sock) {
    global.pairingSocket = sock;
    global.pairingAvailable = false;
    global.pairingCodeIssued = false;
    global.pairingStatus = 'waiting_for_number';
    log('Pairing is ready. Open the website to enter the WhatsApp number.', 'auth');
}

async function startBot() {
    log('Initializing 亗 𝐒𝚳𝚰𝐋𝚵 𝚳𝐃 亗...', 'system');
    
    // Load error count
    global.errorRetryCount = loadErrorCount().count;
    
    // Create required folders
    createRequiredFolders();
    
    // Check for existing session or load from SESSION_ID
    let hasValidSession = sessionExists();
    
    if (!hasValidSession && settings.SESSION_ID) {
        hasValidSession = await loadSessionFromId();
    }
    
    // Load plugins
    await loadAllPlugins();
    
    // Get Baileys version
    const { version } = await fetchLatestBaileysVersion();
    
    // Setup auth
    const { state, saveCreds } = await useMultiFileAuthState('./sessions');
    
    // Create socket
    const sock = makeWASocket({
        version,
        logger: pino({ level: "silent" }),
        printQRInTerminal: false,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" })),
        },
        browser: Browsers.ubuntu('Edge'),
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: false,
        syncFullHistory: false,
        getMessage: async (key) => {
            const jid = jidNormalizedUser(key.remoteJid);
            const msg = await store.loadMessage(jid, key.id);
            return msg?.message || "";
        },
        msgRetryCounterCache
    });

    await sleep(500);

    // Bind store
    store.bind(sock.ev);
    
    // Handle authentication
    if (!hasValidSession && !sock.authState.creds.registered) {
        await handlePairing(sock);
    } else {
        log('Using existing session', 'success');
    }
    
    // ========== DECODE JID ==========
    sock.decodeJid = (jid) => {
        if (!jid) return jid;
        if (/:\d+@/gi.test(jid)) {
            const decode = jidDecode(jid) || {};
            return decode.user && decode.server && decode.user + '@' + decode.server || jid;
        }
        return jid;
    };
    
    const botNumber = sock.decodeJid(sock.user?.id) || 'default';
    
    // ========== GET PUBLIC/PRIVATE MODE ==========
    const mode = await db.get(botNumber, 'mode', 'public');
    sock.public = mode === 'public';
    
    // ========== MESSAGE HANDLER ==========
    sock.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            // Message backup
            for (const msg of chatUpdate.messages) {
                if (!msg.message) continue;
                const chatId = msg.key.remoteJid;
                const messageId = msg.key.id;
                
                if (!global.messageBackup[chatId]) {
                    global.messageBackup[chatId] = {};
                }
                
                const textMessage = msg.message?.conversation || 
                                   msg.message?.extendedTextMessage?.text || 
                                   msg.message?.imageMessage?.caption || '';
                
                if (textMessage) {
                    const savedMessage = { 
                        sender: msg.key.participant || msg.key.remoteJid, 
                        text: textMessage, 
                        timestamp: msg.messageTimestamp 
                    };
                    
                    if (!global.messageBackup[chatId][messageId]) {
                        global.messageBackup[chatId][messageId] = savedMessage;
                        saveStoredMessages(global.messageBackup);
                    }
                }
            }

            const mek = chatUpdate.messages[0];
            if (!mek.message) return;
            
            // Handle ephemeral messages
            if (Object.keys(mek.message)[0] === 'ephemeralMessage') {
                mek.message = mek.message.ephemeralMessage.message;
            }
            
            // Handle status updates
            if (mek.key?.remoteJid === 'status@broadcast') {
                await handleStatusUpdate(sock, mek);
                return;
            }
            
            // Check if should process
            if (!sock.public && !mek.key.fromMe && chatUpdate.type === 'notify') return;
            
            // Process message
            const m = smsg(sock, mek, store);
            
            // Set message properties
            m.isGroup = m.chat.endsWith('@g.us');
            m.sender = await sock.decodeJid(m.fromMe && sock.user.id || m.participant || m.key.participant || m.chat || '');
            
            if (m.isGroup) {
                m.metadata = await sock.groupMetadata(m.chat).catch(() => ({})) || {};
                const admins = [];
                
                if (m.metadata?.participants) {
                    for (const p of m.metadata.participants) {
                        if (p.admin) {
                            admins.push(p.id);
                        }
                    }
                }
                
                m.admins = admins;
                m.isAdmin = admins.includes(m.sender);
                m.isBotAdmin = admins.includes(botNumber);
                m.participant = m.key.participant || '';
            }
            
            // Call system handler
            require("./system")(sock, m, chatUpdate, store);
            
        } catch (err) {
            console.error('Message error:', err);
        }
    });
    
    // ========== CONTACTS UPDATE ==========
    sock.ev.on('contacts.update', (update) => {
        for (const contact of update) {
            const id = sock.decodeJid(contact.id);
            if (store?.contacts) {
                store.contacts[id] = { id, name: contact.notify };
            }
        }
    });
    
    // ========== CONNECTION UPDATE ==========
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            // QR is disabled, but just in case
            log('QR code received but pairing is disabled', 'warn');
        }
        
        if (connection === 'close') {
            global.isBotConnected = false;
            
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const errorMsg = lastDisconnect?.error?.message || '';
            
            log(`Connection closed: ${statusCode || errorMsg}`, 'warn');
            
            // Check for permanent logout
            if (statusCode === DisconnectReason.loggedOut || errorMsg.includes('logged out')) {
                log('Logged out! Clearing session...', 'error');
                clearSessionFiles();
                await sleep(3000);
                process.exit(1);
            }
            
            // Handle 408 timeout
            const handled = await handle408Error(statusCode);
            if (handled) return;
            
            // Reconnect
            log('Reconnecting in 5 seconds...', 'warn');
            await sleep(5000);
            startBot();
        }
        
        if (connection === 'connecting') {
            log('Connecting to WhatsApp...', 'conn');
        }
        
        if (connection === 'open') {
            log('='.repeat(50), 'success');
            log('BOT CONNECTED SUCCESSFULLY!', 'success');
            log('='.repeat(50), 'success');
            console.log('');
            log(`Bot Number: ${sock.user?.id?.split(':')[0]}`, 'info');
            log(`Bot Name: ${global.botname}`, 'info');
            log(`Mode: ${sock.public ? 'PUBLIC' : 'PRIVATE'}`, 'info');
            log(`Prefix: ${global.prefix}`, 'info');
            console.log('');
            
            // Send welcome message
            await sendWelcomeMessage(sock);
        }
    });
    
    if (!global.isBotConnected && !sock.authState.creds.registered) global.pairingAvailable = true;

    // ========== GROUP PARTICIPANTS UPDATE ==========
    sock.ev.on('group-participants.update', async (update) => {
        try {
            const botId = sock.decodeJid(sock.user.id);
            const welcomeEnabled = await db.isWelcomeEnabled(botId, update.id);
            const adminEventEnabled = await db.get(botId, 'adminevent', false);
            
            if (!welcomeEnabled && !adminEventEnabled) return;
            
            const metadata = await sock.groupMetadata(update.id).catch(() => null);
            if (!metadata) return;
            
            for (const participant of update.participants) {
                if (participant === botId) continue;
                
                const name = participant.split('@')[0];
                const pushName = await sock.getName(participant) || name;
                
                // Welcome/Goodbye
                if (welcomeEnabled) {
                    if (update.action === 'add') {
                        log(`👋 Welcome ${pushName} to ${metadata.subject}`, 'success');
                        
                        // Get profile picture
                        let ppUrl;
                        try {
                            ppUrl = await sock.profilePictureUrl(participant, 'image');
                        } catch {
                            ppUrl = 'https://i.ibb.co/RBx5SQC/avatar-group-large-v2.png';
                        }
                        
                        await sock.sendMessage(update.id, {
                            image: { url: ppUrl },
                            caption: `👋 Welcome @${name} to *${metadata.subject}*\n\nYou are member #${metadata.participants.length}`,
                            mentions: [participant]
                        });
                        
                    } else if (update.action === 'remove') {
                        log(`👋 Goodbye ${pushName} from ${metadata.subject}`, 'warn');
                        
                        await sock.sendMessage(update.id, {
                            text: `👋 Goodbye @${name} from *${metadata.subject}*\n\nRemaining: ${metadata.participants.length} members`,
                            mentions: [participant]
                        });
                    }
                }
                
                // Admin events
                if (adminEventEnabled && update.author) {
                    const author = update.author.split('@')[0];
                    
                    if (update.action === 'promote') {
                        await sock.sendMessage(update.id, {
                            text: `👑 @${author} promoted @${name} to admin`,
                            mentions: [update.author, participant]
                        });
                    }
                    
                    if (update.action === 'demote') {
                        await sock.sendMessage(update.id, {
                            text: `📉 @${author} demoted @${name} from admin`,
                            mentions: [update.author, participant]
                        });
                    }
                }
            }
        } catch (err) {
            console.error('Group event error:', err);
        }
    });
    
    // ========== CALL HANDLER ==========
    sock.ev.on('call', async (calls) => {
        try {
            const botId = sock.decodeJid(sock.user.id);
            const anticall = await db.get(botId, 'anticall', 'off');
            
            if (anticall === 'off') return;
            
            for (const call of calls) {
                const caller = call.from.split('@')[0];
                log(`📞 Call from ${caller} - Action: ${anticall}`, 'warn');
                
                // Check if caller is owner
                const owners = await db.get(botId, 'owners', []);
                const isOwner = owners.some(owner => caller.includes(owner.replace(/[^0-9]/g, '')));
                
                if (isOwner) {
                    log(`Allowing call from owner: ${caller}`, 'info');
                    continue;
                }
                
                // Rate limiting
                const now = Date.now();
                const lastWarn = global.recentCallers?.get(call.from) || 0;
                const cooldown = 30 * 1000;
                
                if (now - lastWarn < cooldown) {
                    try { await sock.rejectCall(call.id, call.from); } catch (e) {}
                    continue;
                }
                
                global.recentCallers.set(call.from, now);
                setTimeout(() => global.recentCallers.delete(call.from), cooldown);
                
                // Send warning
                const warnMsg = anticall === 'block' 
                    ? `🚫 *CALL BLOCKED*\n\nYour call to ${global.botname} has been blocked.\n\n> ${global.wm}`
                    : `🚫 *CALL REJECTED*\n\nPlease don't call the bot. Use messages instead.\n\n> ${global.wm}`;
                
                try {
                    await sock.sendMessage(call.from, { text: warnMsg });
                } catch (e) {}
                
                // Reject/Block
                try {
                    await sock.rejectCall(call.id, call.from);
                    
                    if (anticall === 'block') {
                        await sock.updateBlockStatus(call.from, 'block');
                        log(`Blocked caller: ${caller}`, 'error');
                    }
                } catch (e) {}
            }
        } catch (err) {
            console.error('Call handler error:', err);
        }
    });
    
    // ========== CREDS UPDATE ==========
    sock.ev.on('creds.update', saveCreds);
    
    // ========== UTILITY FUNCTIONS ==========
    
    // Get name
    sock.getName = async (jid, withoutContact = false) => {
        try {
            if (jid.endsWith('@g.us')) {
                const metadata = await sock.groupMetadata(jid).catch(() => null);
                return metadata?.subject || jid.split('@')[0];
            } else {
                const contact = store.contacts[jid];
                return contact?.name || contact?.notify || jid.split('@')[0];
            }
        } catch {
            return jid.split('@')[0];
        }
    };
    
    // Send text
    sock.sendText = (jid, text, quoted = '', options = {}) => {
        return sock.sendMessage(jid, { text, ...options }, { quoted });
    };
    
    // Download and save media
    sock.downloadAndSaveMediaMessage = async (message, filename, attachExtension = true) => {
        const quoted = message.msg || message;
        const mime = (message.msg || message).mimetype || '';
        const messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0];

        const stream = await downloadContentFromMessage(quoted, messageType);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        const type = await FileType.fromBuffer(buffer);
        const ext = type?.ext || 'bin';
        const trueFileName = attachExtension ? `${filename}.${ext}` : filename;
        const savePath = path.join(__dirname, 'tmp', trueFileName);

        await fs.promises.writeFile(savePath, buffer);
        return savePath;
    };
    
    // Download media as buffer
    sock.downloadMediaMessage = async (message) => {
        const mime = (message.msg || message).mimetype || '';
        const messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0];
        
        const stream = await downloadContentFromMessage(message, messageType);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        return buffer;
    };
    
    // Get file
    sock.getFile = async (path, returnAsFilename) => {
        let res, filename;
        const data = Buffer.isBuffer(path) 
            ? path 
            : /^data:.*?\/.*?;base64,/i.test(path) 
                ? Buffer.from(path.split`,`[1], 'base64') 
                : /^https?:\/\//.test(path) 
                    ? await (res = await fetch(path)).buffer() 
                    : fs.existsSync(path) 
                        ? (filename = path, fs.readFileSync(path)) 
                        : Buffer.alloc(0);

        if (!Buffer.isBuffer(data)) throw new TypeError('Result is not a buffer');
        
        const type = await FileType.fromBuffer(data) || { mime: 'application/octet-stream', ext: 'bin' };
        
        if (returnAsFilename && !filename) {
            filename = path.join(__dirname, 'tmp', Date.now() + '.' + type.ext);
            await fs.promises.writeFile(filename, data);
        }
        
        return { res, filename, ...type, data };
    };
    
    // Send file
    sock.sendFile = async (jid, filePath, filename = '', caption = '', quoted, ptt = false, options = {}) => {
        const type = await sock.getFile(filePath, true);
        const { data, filename: pathFile, mime } = type;
        
        let mtype = '';
        let mimetype = mime;
        
        if (/webp/.test(mime) || (/image/.test(mime) && options.asSticker)) mtype = 'sticker';
        else if (/image/.test(mime) || (/webp/.test(mime) && options.asImage)) mtype = 'image';
        else if (/video/.test(mime)) mtype = 'video';
        else if (/audio/.test(mime)) {
            mtype = 'audio';
            mimetype = 'audio/ogg; codecs=opus';
        } else mtype = 'document';
        
        if (options.asDocument) mtype = 'document';
        
        const message = {
            ...options,
            caption,
            ptt,
            [mtype]: { url: pathFile },
            mimetype
        };
        
        return sock.sendMessage(jid, message, { quoted, ...options });
    };
    
    // Send image as sticker
    sock.sendImageAsSticker = async (jid, path, quoted, options = {}) => {
        let buff;
        try {
            buff = Buffer.isBuffer(path)
                ? path
                : /^data:.*?\/.*?;base64,/i.test(path)
                    ? Buffer.from(path.split`,`[1], 'base64')
                    : /^https?:\/\//.test(path)
                        ? await getBuffer(path)
                        : fs.existsSync(path)
                            ? fs.readFileSync(path)
                            : Buffer.alloc(0);
        } catch (e) {
            buff = Buffer.alloc(0);
        }
        
        const buffer = await writeExifImg(buff, options);
        await sock.sendMessage(jid, { sticker: buffer }, { quoted });
        return buffer;
    };
    
    // Send video as sticker
    sock.sendVideoAsSticker = async (jid, path, quoted, options = {}) => {
        let buff;
        try {
            buff = Buffer.isBuffer(path)
                ? path
                : /^data:.*?\/.*?;base64,/i.test(path)
                    ? Buffer.from(path.split`,`[1], 'base64')
                    : /^https?:\/\//.test(path)
                        ? await getBuffer(path)
                        : fs.existsSync(path)
                            ? fs.readFileSync(path)
                            : Buffer.alloc(0);
        } catch (e) {
            buff = Buffer.alloc(0);
        }
        
        const buffer = await writeExifVid(buff, options);
        await sock.sendMessage(jid, { sticker: buffer }, { quoted });
        return buffer;
    };
    
    // Copy and forward
    sock.copyNForward = async (jid, message, forceForward = false, options = {}) => {
        let mtype = Object.keys(message.message)[0];
        let content = await generateForwardMessageContent(message, forceForward);
        let ctype = Object.keys(content)[0];
        let context = {};

        if (mtype != "conversation") {
            context = message.message[mtype].contextInfo;
        }

        content[ctype].contextInfo = {
            ...context,
            ...content[ctype].contextInfo,
        };

        const waMessage = await generateWAMessageFromContent(
            jid,
            content,
            options ? { ...content[ctype], ...options } : {}
        );

        await sock.relayMessage(jid, waMessage.message, { messageId: waMessage.key.id });
        return waMessage;
    };
    
    // ========== CLEANUP INTERVALS ==========
    setInterval(cleanupOldMessages, 60 * 60 * 1000); // 1 hour
    setInterval(() => cleanupJunkFiles(sock), 5 * 60 * 1000); // 5 minutes
    
    // Session cleanup (2 days)
    setInterval(() => {
        try {
            if (!fs.existsSync(sessionDir)) return;
            
            const files = fs.readdirSync(sessionDir);
            const now = Date.now();
            
            files.forEach(file => {
                if (file === 'creds.json') return;
                
                const filePath = path.join(sessionDir, file);
                const stats = fs.statSync(filePath);
                const age = now - stats.mtimeMs;
                
                if (age > 2 * 24 * 60 * 60 * 1000) { // 2 days
                    fs.unlinkSync(filePath);
                    log(`Removed old session file: ${file}`, 'system');
                }
            });
        } catch (e) {
            // Ignore errors
        }
    }, 12 * 60 * 60 * 1000); // 12 hours
    
    return sock;
}

// ==================== EXPRESS SERVER ====================
const dataDir = path.join(__dirname, 'data');
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

app.use(express.json({ limit: '10kb' }));
app.use(express.static(publicDir));

const pairingAttempts = new Map();

app.get('/', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
});

// Public pairing endpoint. Basic per-IP and global cooldowns below limit abuse.
app.post('/api/pair', async (req, res) => {
    try {
        if (global.isBotConnected) {
            return res.status(409).json({ error: 'This bot is already connected.' });
        }
        if (!global.pairingAvailable || !global.pairingSocket) {
            return res.status(503).json({ error: 'The pairing service is still starting. Refresh in a moment.' });
        }
        const now = Date.now();
        if (global.pairingCodeIssued && now - global.pairingCodeGeneratedAt < 60000) {
            return res.status(409).json({ error: 'A pairing code was already generated. Wait one minute before requesting another.' });
        }
        if (global.pairingCodeIssued && now - global.pairingCodeGeneratedAt >= 60000) {
            global.pairingCodeIssued = false;
            global.currentPairingCode = null;
        }

        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        const lastAttempt = pairingAttempts.get(ip) || 0;
        if (now - lastAttempt < 15000) {
            return res.status(429).json({ error: 'Please wait before trying again.' });
        }

        const number = String(req.body?.phoneNumber || '').replace(/[^0-9]/g, '');
        if (number.length < 10 || number.length > 15) {
            return res.status(400).json({ error: 'Enter a valid phone number with country code, digits only.' });
        }

        pairingAttempts.set(ip, now);
        global.pairingCodeIssued = true;
        global.pairingStatus = 'generating_code';

        const code = await global.pairingSocket.requestPairingCode(number);
        global.currentPairingCode = code;
        global.pairingCodeGeneratedAt = Date.now();
        global.pairingStatus = 'code_generated';
        await saveLoginMethod('pairing');

        const formattedCode = code.match(/.{1,4}/g)?.join(' ') || code;
        log(`Pairing code generated for number ending ${number.slice(-4)}`, 'success');
        return res.json({ code: formattedCode, status: global.pairingStatus });
    } catch (error) {
        global.pairingCodeIssued = false;
        global.pairingStatus = 'pairing_error';
        log(`Website pairing failed: ${error.message}`, 'error');
        return res.status(500).json({ error: 'Could not generate a pairing code. Please try again later.' });
    }
});

app.get('/api/status', (req, res) => {
    res.json({
        connected: Boolean(global.isBotConnected),
        status: global.isBotConnected ? 'connected' : (global.pairingStatus || 'starting'),
        bot: global.botname,
        pairingAvailable: Boolean(global.pairingAvailable && !global.isBotConnected)
    });
});

app.get('/uptime', (req, res) => {
    res.json({
        uptime: runtime(process.uptime()),
        status: 'online',
        bot: global.botname,
        connected: global.isBotConnected
    });
});

app.listen(port, () => {
    log(`Web server running on port ${port}`, 'info');
    log(`Visit http://localhost:${port} to pair or view bot status`, 'info');
});

// ==================== START BOT ====================
startBot().catch(err => {
    log(`Fatal error: ${err.message}`, 'error');
    log(err.stack, 'error');
    process.exit(1);
});

// ==================== PROCESS HANDLERS ====================
process.on('uncaughtException', (err) => {
    log(`Uncaught Exception: ${err.message}`, 'error');
    console.error(err.stack);
});

process.on('unhandledRejection', (err) => {
    log(`Unhandled Rejection: ${err.message}`, 'error');
    console.error(err.stack);
});

process.on('SIGINT', () => {
    log('Received SIGINT. Shutting down...', 'warn');
    process.exit(0);
});

process.on('SIGTERM', () => {
    log('Received SIGTERM. Shutting down...', 'warn');
    process.exit(0);
});

// ==================== FILE WATCHER ====================
const file = require.resolve(__filename);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    log('File updated. Restarting...', 'warn');
    delete require.cache[file];
    require(file);
});
