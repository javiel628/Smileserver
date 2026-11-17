const { runtime,
formatSize,
getBuffer
 } = require('../start/lib/myfunction');
 const moment = require('moment-timezone');
 const os = require('os');
 const fs = require('fs');
 const { performance } = require("perf_hooks");
const fetch = require('node-fetch');
const axios = require('axios');
const checkDiskSpace = require('check-disk-space').default;

// Function to check bandwidth (simplified version)
async function checkBandwidth() {
    return {
        download: formatSize(0), // You can implement actual bandwidth tracking
        upload: formatSize(0)    // You can implement actual bandwidth tracking
    };
}

module.exports = [

{
        command: ['ping', 'p'],
        operate: async ({ m, supreme, botNumber }) => {
            const startTime = performance.now();

            try {
                const sentMessage = await supreme.sendMessage(m.chat, {
                    text: "🔸Pong!",
                    contextInfo: { quotedMessage: m.message }
                });
                
                const endTime = performance.now();
                const latency = `${(endTime - startTime).toFixed(2)} ms`;
                
                await supreme.sendMessage(m.chat, {
                    text: `*🏓 ${global.botname} Speed:* ${latency}`,
                    edit: sentMessage.key, 
                    contextInfo: { quotedMessage: m.message }
                });

            } catch (error) {
                console.error('Error sending ping message:', error);
                await supreme.sendMessage(m.chat, {
                    text: 'An error occurred while trying to ping.',
                    contextInfo: { quotedMessage: m.message }
                });
            }
        }
    },
    {
        command: ['alive'],
        operate: async ({ supreme, m, reply, botNumber }) => {
            const botUptime = runtime(process.uptime());
            
            // Array of image URLs
            const imageUrls = [
                './start/lib/Media/Images/Vesper1.jpg',
                './start/lib/Media/Images/Vesper2.jpg',
                './start/lib/Media/Images/Vesper3.jpg',
                './start/lib/Media/Images/Vesper4.jpg'
                
            ];
            
           const audioUrls = [
    './start/lib/Media/JexAudio1.mp3',
    './start/lib/Media/JexAudio2.mp3',
    './start/lib/Media/JexAudio3.mp3',
    './start/lib/Media/JexAudio4.mp3',
    './start/lib/Media/JexAudio5.mp3',
    './start/lib/Media/JexAudio6.mp3',
    './start/lib/Media/JexAudio7.mp3'
];
            
            // Randomly select an image URL
            const randomImageUrl = imageUrls[Math.floor(Math.random() * imageUrls.length)];
            
            // Randomly select an audio URL
            const randomAudioUrl = audioUrls[Math.floor(Math.random() * audioUrls.length)];
            
            // Send the randomly selected image with caption
            await supreme.sendMessage(
                m.chat, 
                { 
                    image: { url: randomImageUrl },
                    caption: `*🌹Hi. I am 👑 ${global.botname}, a friendly advanced WhatsApp bot.  Don't worry, I'm still Alive☺🚀*\n\n*⏰ Uptime: ${botUptime}*`
                },
                { quoted: m }
            );
            
            // Send the randomly selected audio as PTT
            await supreme.sendMessage(
                m.chat,
                {
                    audio: { url: randomAudioUrl },
                    mp3: true,
                    mimetype: 'audio/mp4'
                },
                { quoted: m }
            );
        }
    },
    {
        command: ['bothosting', 'deploy', 'hosting', 'deploybot'],
        operate: async ({ supreme, m, reply, from }) => {
            try {
                const message = `
*STEPS ON HOW TO DEPLOY A WHATSAPP BOT*

                `.trim();

                await supreme.sendMessage(from, {
                    image: { url: 'https://files.catbox.moe/xd8cvb.jpg' },
                    caption: message,
                    contextInfo: {
                        mentionedJid: [m.sender],
                        forwardingScore: 999,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '120363407133888525@newsletter',
                            newsletterName: '亗 𝐒𝚳𝚰𝐋𝚵 𝚳𝐃 亗',
                            serverMessageId: 143
                        }
                    }
                }, { quoted: m });

            } catch (e) {
                console.error("Support Cmd Error:", e);
                reply(`⚠️ An error occurred:\n${e.message}`);
            }
        }
    },
    {
        command: ['uptime', 'up'],
        operate: async ({ supreme, m, reply, botNumber }) => {
            const startTime = performance.now();

            try {
                const sentMessage = await supreme.sendMessage(m.chat, {
                    text: "⚡ Testing connection...",
                    contextInfo: { quotedMessage: m.message }
                });
                
                const endTime = performance.now();
                const ping = `${(endTime - startTime).toFixed(2)}`;
                
                // Get uptime
                const uptime = process.uptime();
                const uptimeFormatted = runtime(uptime); // Using your existing runtime function
                
                // Get bot name from settings
                const botname = `${global.botname}`;
                
                // Get version from global or use default
                const version = global.versions || '1.4.0';
                
                // Formatted response
                const botInfo = `
╭──❍ 💫 ${botname} ❍─
┊ 🚀 ᴘɪɴɢ    : ${ping} ms
┊ ⏱  ᴜᴘᴛɪᴍᴇ  : ${uptimeFormatted}
┊ 🔖 ᴠᴇʀsɪᴏɴ  : ${version}
╰━━━━━━━━━`;
                
                await supreme.sendMessage(m.chat, {
                    text: botInfo,
                    edit: sentMessage.key,
                    contextInfo: { quotedMessage: m.message }
                });

            } catch (error) {
                await supreme.sendMessage(m.chat, {
                    text: '❌ An error occurred while testing connection.',
                    contextInfo: { quotedMessage: m.message }
                });
            }
        }
    },
        {
        command: ['botinfo', 'info', 'about'],
        operate: async ({ supreme, m, reply, botNumber }) => {
            const botname = `${global.botname}`;
            const ownername = " 𝐒𝚳𝚰𝐋𝚵 𝚳𝚯𝐃𝐙";
            
            const botInfo = `
╭─ ⌬ Bot Info
│ • Name     : ${botname}
│ • Owner    : ${ownername}
│ • Version  : ${global.versions || '1.4.0'}
│ • ᴄᴍᴅs    : 100+
│ • Developer:  𝐒𝚳𝚰𝐋𝚵 𝚳𝚯𝐃𝐙
│ • Runtime  : ${runtime(process.uptime())}
╰─────────────`;

            const imageUrl = [
                './start/lib/Media/Images/Vesper1.jpg',
                './start/lib/Media/Images/Vesper2.jpg',
                './start/lib/Media/Images/Vesper3.jpg',
                './start/lib/Media/Images/Vesper4.jpg'
                
            ];
            
           const audioUrls = [
    './start/lib/Media/JexAudio1.mp3',
    './start/lib/Media/JexAudio2.mp3',
    './start/lib/Media/JexAudio3.mp3',
    './start/lib/Media/JexAudio4.mp3',
    './start/lib/Media/JexAudio5.mp3',
    './start/lib/Media/JexAudio6.mp3',
    './start/lib/Media/JexAudio7.mp3'
];
            
            // Randomly select an audio URL
            const randomAudioUrl = audioUrls[Math.floor(Math.random() * audioUrls.length)];
            
            // Send the image with caption
            await supreme.sendMessage(
                m.chat, 
                { 
                    image: { url: imageUrl },
                    caption: `*🌹Hi. I am 👑 ${global.botname}, a friendly WhatsApp bot.*${botInfo}`
                },
                { quoted: m }
            );
            
            // Send the randomly selected audio as PTT
            await supreme.sendMessage(
                m.chat,
                {
                    audio: { url: randomAudioUrl },
                    mp3: true,
                    mimetype: 'audio/mp4'
                },
                { quoted: m }
            );
        }
    },
    {
        command: ['botstatus', 'systeminfo'],
        operate: async ({ supreme, m, reply }) => {
            const used = process.memoryUsage();
            const ramUsage = `${formatSize(used.heapUsed)} / ${formatSize(os.totalmem())}`;
            const freeRam = formatSize(os.freemem());
            
            // Properly await checkDiskSpace
            const disk = await checkDiskSpace(process.cwd()); 
            
            const latencyStart = performance.now();
            await reply("⏳ *Calculating ping...*");
            const latencyEnd = performance.now();
            const ping = `${(latencyEnd - latencyStart).toFixed(2)} ms`;

            const { download, upload } = await checkBandwidth();
            const uptime = runtime(process.uptime());

            const response = `
* BOT STATUS *

*Ping:* ${ping}
*Uptime:* ${uptime}
*RAM Usage:* ${ramUsage}
*Free RAM:* ${freeRam}
*Disk Usage:* ${formatSize(disk.size - disk.free)} / ${formatSize(disk.size)}
*Free Disk:* ${formatSize(disk.free)}
*Platform:* ${os.platform()}
*NodeJS Version:* ${process.version}
*CPU Model:* ${os.cpus()[0].model}
*Downloaded:* ${download}
*Uploaded:* ${upload}
`;
            await supreme.sendMessage(m.chat, { text: response.trim() }, { quoted: m });
        }
    },
    {
        command: ['repo', 'source', 'sourcecode', 'repository'],
        operate: async ({ supreme, m, reply }) => {
            try {
                // GitHub repository details
                const repoOwner = " 𝐒𝚳𝚰𝐋𝚵 𝚳𝚯𝐃𝐙";
                const repoName = "亗 𝐒𝚳𝚰𝐋𝚵 𝚳𝐃 亗";
                const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}`;
                
                // Fetch repository data with error handling
                const { data } = await axios.get(apiUrl, {
                    timeout: 5000, // 5 second timeout
                    headers: {
                        'User-Agent': 'javelin Bot' // GitHub requires user-agent
                    }
                }).catch(err => {
                    console.error('GitHub API Error:', err);
                    throw new Error('Failed to connect to GitHub API');
                });

                // Validate response data
                if (!data || typeof data !== 'object') {
                    throw new Error('Invalid GitHub API response');
                }

                // Format repository information
                const repoInfo = `
*BOT REPOSITORY*

*Name:* ${String(data.name || repoName).padEnd(20)}
*Stars:* ${String(data.stargazers_count || 0).padEnd(20)}
*Forks:* ${String(data.forks_count || 0).padEnd(21)}
*Watchers:* ${String(data.watchers_count || 0).padEnd(18)}
*Language:* ${String(data.language || 'Not specified').padEnd(16)}
*License:* ${String(data.license?.name || 'None').padEnd(19)}
*GitHub Link:* 
https://github.com/${repoOwner}/${repoName}

*Session Id:* https://vinic-xmd-pairing-site-dsf-crew-devs.onrender.com/
────────────────────────────────
@${m.sender.split("@")[0]}👋, Don't forget to star and fork my repository!`;

               const thumbnailBuffer = fs.readFileSync('./start/lib/Media/Images/Vesper3.jpg');
                
                // Send the response with thumbnail
                await supreme.sendMessage(
                    m.chat,
                    {
                        text: repoInfo.trim(),
                        contextInfo: {
                            mentionedJid: [m.sender],
                            externalAdReply: {
                                title: "亗 𝐒𝚳𝚰𝐋𝚵 𝚳𝐃 亗 repository",
                                body: `⭐ Star the repo to support development!`,
                                thumbnail: thumbnailBuffer,
                                mediaType: 1,
                                sourceUrl: `https://github.com/${repoOwner}/${repoName}`
                            }
                        }
                    },
                    { quoted: m }
                );

            } catch (error) {
                console.error('Repo command error:', error);
                
                // Fallback response when GitHub API fails
                const fallbackInfo = `
*BOT REPOSITORY*

*Name:* 亗 𝐒𝚳𝚰𝐋𝚵 𝚳𝐃 亗
*GitHub Link:* 


@${m.sender.split("@")[0]}👋, Visit the repository for more info!`;

                await supreme.sendMessage(
                    m.chat,
                    { 
                        text: fallbackInfo,
                        contextInfo: {
                            mentionedJid: [m.sender]
                        }
                    },
                    { quoted: m }
                );
            }
        }
}


];