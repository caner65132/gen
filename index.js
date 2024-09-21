const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes, Collection, PermissionsBitField, StringSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Cooldown sistemi için Map yapısı
const cooldowns = new Collection();

// Dosyaların yolu
const accountsFilePath = path.join(__dirname, 'valorant_accounts.txt');
const autoRolesPath = path.join(__dirname, 'auto_roles.json'); // Otomatik roller için JSON dosyası

// Botu başlatma ve gerekli izinleri ayarlama  
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers // Yeni eklenen
    ]
});

// Slash komutlarını kaydetme
const commands = [
    {
        name: 'ücretsiz',
        description: 'Ücretsiz hizmet seç',
        options: [
            {
                name: 'hizmet',
                description: 'Seçilecek hizmet türü',
                type: 3, // 3 = string
                required: true,
                choices: [
                    { name: 'valorant', value: 'valorant' },
                    { name: 'diğer', value: 'diğer' }
                ],
            },
        ],
    },
    {
        name: 'stock',
        description: 'Hizmet stoklarını gösterir.',
    },
    {
        name: 'sil',
        description: 'Belirtilen sayıda mesajı siler.',
        options: [
            {
                name: 'sayı',
                description: 'Silinecek mesaj sayısı',
                type: 4, // 4 = integer
                required: true,
            },
        ],
    },
    {
        name: 'oto-rol-ayarla',
        description: 'Yeni gelen üyeler için otomatik rol ayarlama',
    }
];

// Komutları Discord API'ye kaydetme
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
(async () => {
    try {
        console.log('Komutlar kaydediliyor...');
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
        console.log('Komutlar başarıyla kaydedildi!');
    } catch (error) {
        console.error('Komut kaydetme hatası:', error);
    }
})();

client.once('ready', () => {
    console.log(`
        ▄▀▄ ▀▀▀█ █░█ █▀▀▄ █▀ █▀
        █▀█ ░▄▀░ █░█ █▐█▀ █▀ █▀
        ▀░▀ ▀▀▀▀ ▀▀▀ ▀░▀▀ ▀▀ ▀░
        █░░ ▄▀▄ █▄░▄█ █▀
        █░░ █▀█ █░█░█ █▀
        ▀▀▀ ▀░▀ ▀░░░▀ ▀▀

        https://discord.gg/Mgd7uf3KRa

        İYİ KULLANIMLAR 🌹
    `);
   
    client.user.setPresence({
        activities: [{ name: `${client.guilds.cache.size} Servers`, type: 'WATCHING' }],
        status: 'online'
    });
});

// Yeni bir üye sunucuya katıldığında rolü ver
client.on('guildMemberAdd', async member => {
    try {
        const roleId = await getAutoRole(member.guild.id);
        if (roleId) {
            const role = member.guild.roles.cache.get(roleId);
            if (role) {
                await member.roles.add(role);
                console.log(`Rol ${role.name} ${member.user.tag} üyesine verildi.`);
            } else {
                console.error('Belirtilen rol bulunamadı.');
            }
        }
    } catch (error) {
        console.error('Rol verme hatası:', error.message);
    }
});

// Mesajlara yanıt verme
client.on('messageCreate', message => {
    if (message.author.bot) return;

    if (message.content.toLowerCase() === 'sa') {
        message.reply('Aleyküm Selam');
    }
});

// Komut etkileşimlerini işleme
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand() && !interaction.isSelectMenu()) return;

    const { commandName, options } = interaction;

    // Cooldown miktarlarını belirle
    const cooldownAmount = 30 * 60 * 1000; // 30 dakika

    if (commandName === 'ücretsiz') {
        // Cooldown kontrolü sadece /ücretsiz komutu için yapılacak
        if (!cooldowns.has(commandName)) {
            cooldowns.set(commandName, new Collection());
        }

        const now = Date.now();
        const timestamps = cooldowns.get(commandName);
        const cooldown = cooldownAmount;

        if (timestamps.has(interaction.user.id)) {
            const expirationTime = timestamps.get(interaction.user.id) + cooldown;

            if (now < expirationTime) {
                const timeLeft = expirationTime - now;
                const minutesLeft = Math.floor(timeLeft / 1000 / 60);
                const secondsLeft = Math.floor((timeLeft / 1000) % 60);
                return interaction.reply({ content: `Bu komutu tekrar kullanabilmek için ${minutesLeft} dakika ${secondsLeft} saniye beklemen gerekiyor.`, ephemeral: true });
            }
        }

        timestamps.set(interaction.user.id, now);
        setTimeout(() => timestamps.delete(interaction.user.id), cooldown);
    }

    try {
        if (commandName === 'ücretsiz') {
            const hizmet = options.getString('hizmet');

            if (hizmet === 'valorant') {
                if (fs.existsSync(accountsFilePath)) {
                    fs.readFile(accountsFilePath, 'utf8', async (err, data) => {
                        if (err) {
                            console.error('Dosya Okuma Hatası:', err.message);
                            await interaction.reply('Bir hata oluştu. Dosya okuma hatası.');
                            return;
                        }

                        const accounts = data.split('\n').filter(line => line.trim() !== '');

                        if (accounts.length === 0) {
                            await interaction.reply('Hesap listesi boş.');
                            return;
                        }

                        const randomAccount = accounts[Math.floor(Math.random() * accounts.length)];
                        const remainingAccounts = accounts.filter(account => account !== randomAccount);
                        fs.writeFile(accountsFilePath, remainingAccounts.join('\n'), (err) => {
                            if (err) {
                                console.error('Dosya Yazma Hatası:', err.message);
                            }
                        });

                        const embed = new EmbedBuilder()
                            .setColor('#00ff00')
                            .setTitle('AzureFlameShop')
                            .addFields(
                                { name: '📦 Kalan Stok', value: `${remainingAccounts.length}`, inline: true },
                                { name: '✅ Durum', value: 'Hesap Başarıyla DM’den İletildi!', inline: true },
                                { name: 'Kullanan kişi • Kullanım zamanı', value: `${interaction.user.tag} • <t:${Math.floor(Date.now() / 1000)}:R>`, inline: false }
                            );

                        const dmEmbed = new EmbedBuilder()
                            .setColor('#0099ff')
                            .setTitle('Valorant Hesabı')
                            .setDescription('İşte sizin için rastgele seçilen Valorant hesabı:')
                            .addFields({ name: 'Hesap Bilgisi', value: randomAccount })
                            .setFooter({ text: 'Bu hesap bilgisi rastgele seçilmiştir.' });

                        await interaction.user.send({ embeds: [dmEmbed] }).catch(err => {
                            console.error('DM Gönderme Hatası:', err.message);
                            interaction.followUp('Bir hata oluştu. DM gönderme hatası.');
                        });

                        await interaction.reply({ embeds: [embed] });
                    });
                } else {
                    console.error('Hesap dosyası bulunamadı:', accountsFilePath);
                    await interaction.reply('Hesap dosyası bulunamadı.');
                }
            } else {
                await interaction.reply('Geçersiz hizmet türü seçildi.');
            }
        } else if (commandName === 'stock') {
            fs.readFile(accountsFilePath, 'utf8', async (err, data) => {
                if (err) {
                    console.error('Dosya Okuma Hatası:', err.message);
                    await interaction.reply('Bir hata oluştu. Dosya okuma hatası.');
                    return;
                }

                const accounts = data.split('\n').filter(line => line.trim() !== '');
                const count = accounts.length;

                const embed = new EmbedBuilder()
                    .setColor('#0099ff')
                    .setTitle('AzureFlameShop Stok Bilgisi')
                    .setDescription('Aşağıda Ücretsiz Verdiğimiz Servislerimiz Bulunmaktadır.')
                    .addFields({ name: '📦 Toplam Valorant Stoğumuz', value: `${count}`, inline: true });

                await interaction.reply({ embeds: [embed] });
            });
        } else if (commandName === 'sil') {
            const deleteCount = options.getInteger('sayı');

            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
                return interaction.reply({ content: 'Bu komutu kullanmak için yeterli izniniz yok.', ephemeral: true });
            }

            if (!deleteCount || deleteCount < 1 || deleteCount > 100) {
                return interaction.reply({ content: 'Lütfen 1 ile 100 arasında bir sayı girin.', ephemeral: true });
            }

            await interaction.channel.bulkDelete(deleteCount, true).catch(error => {
                console.error(error);
                interaction.reply({ content: 'Mesajlar silinirken bir hata oluştu.', ephemeral: true });
            });

            await interaction.reply({ content: `${deleteCount} adet mesaj silindi.`, ephemeral: true });
        } else if (commandName === 'oto-rol-ayarla') {
            const roleOptions = [
                {
                    label: '💎 | ÜYE',
                    value: '1284426491266076805',
                }
            ];

            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('select-role')
                    .setPlaceholder('Bir rol seçin')
                    .addOptions(roleOptions)
            );

            await interaction.reply({ content: 'Otomatik rol vermek için bir rol seçin:', components: [row], ephemeral: true });
        }
    } catch (error) {
        console.error('Komut işleme hatası:', error.message);
    }
});

// Seçim menüsü etkileşimlerini işleme
client.on('interactionCreate', async interaction => {
    if (!interaction.isSelectMenu()) return;

    const selectedRole = interaction.values[0];
    try {
        const role = interaction.guild.roles.cache.get(selectedRole);
        if (role) {
            await saveAutoRole(interaction.guild.id, selectedRole);
            await interaction.reply({ content: `Otomatik rol olarak ${role.name} ayarlandı.`, ephemeral: true });
        } else {
            await interaction.reply({ content: 'Belirtilen rol bulunamadı.', ephemeral: true });
        }
    } catch (error) {
        console.error('Rol ayarlama hatası:', error.message);
    }
});

// Otomatik rolü JSON dosyasına kaydetme
async function saveAutoRole(guildId, roleId) {
    const data = fs.existsSync(autoRolesPath) ? JSON.parse(fs.readFileSync(autoRolesPath)) : {};
    data[guildId] = roleId;
    fs.writeFileSync(autoRolesPath, JSON.stringify(data));
}

// Sunucunun otomatik rolünü almak
async function getAutoRole(guildId) {
    if (fs.existsSync(autoRolesPath)) {
        const data = JSON.parse(fs.readFileSync(autoRolesPath));
        return data[guildId] || null;
    }
    return null;
}

client.login(process.env.DISCORD_TOKEN);
