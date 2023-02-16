import { ofetch } from 'ofetch';
import { APIEmbed, APIMessage, RESTPostAPIChannelMessageJSONBody, Routes } from 'discord-api-types/v10';
import { formatHour } from './index';
import { Env } from './typings';

async function getParkSchedule(env: Env): Promise<string[]> {
    const parkSchedules = await ofetch('https://api.disneylandparis.com/query', {
        method: 'POST',
        body: {
            operationName: 'activitySchedules',
            query: env.PARK_SCHEDULES_QUERY,
            variables: {
                market: 'fr-fr',
                types: [
                    {
                        type: "ThemePark",
                        status: [
                            "OPERATING",
                            "EXTRA_MAGIC_HOURS"
                        ]
                    }
                ],
                date: env.DATE,
            }
        },
        parseResponse: JSON.parse,
    }).catch(err => console.log(err)).then(res => res.data?.activitySchedules || []);


    const disneylandParkSchedule = parkSchedules.find((schedule: { id: string; }) => schedule.id === 'P1');
    const waltDisneyStudiosParkSchedule = parkSchedules.find((schedule: { id: string; }) => schedule.id === 'P2');

    const officialDisneylandParkHours = disneylandParkSchedule.schedules.find((schedule: { status: string; }) => schedule.status === 'OPERATING');
    const officialWaltDisneyStudiosParkHours = waltDisneyStudiosParkSchedule.schedules.find((schedule: { status: string; }) => schedule.status === 'OPERATING');

    const disneylandParkMagicHours = disneylandParkSchedule.schedules.find((schedule: { status: string; }) => schedule.status === 'EXTRA_MAGIC_HOURS');
    const waltDisneyStudiosParkMagicHours = waltDisneyStudiosParkSchedule.schedules.find((schedule: { status: string; }) => schedule.status === 'EXTRA_MAGIC_HOURS');

    let disneylandParkHours = `🕒 ${formatHour(officialDisneylandParkHours.startTime)} - ${formatHour(officialDisneylandParkHours.endTime)}`;
    if (disneylandParkMagicHours) {
        disneylandParkHours += `\n✨ ${formatHour(disneylandParkMagicHours.startTime)} - ${formatHour(disneylandParkMagicHours.endTime)}`;
    }

    let waltDisneyStudiosParkHours = `🕒 ${formatHour(officialWaltDisneyStudiosParkHours.startTime)} - ${formatHour(officialWaltDisneyStudiosParkHours.endTime)}`;
    if (waltDisneyStudiosParkMagicHours) {
        waltDisneyStudiosParkHours += `\n✨ ${formatHour(waltDisneyStudiosParkMagicHours.startTime)} - ${formatHour(waltDisneyStudiosParkMagicHours.endTime)}`;
    }

    return [disneylandParkHours, waltDisneyStudiosParkHours];
}

export async function updateParkSchedules(env: Env) {
    console.log('Updating park schedules...');
    const todayParkSchedules = await getParkSchedule(env);

    const messages = await env.DISCORD.get(Routes.channelMessages(env.PARKS_CHANNEL_ID)) as APIMessage[];
    const botMessage = messages.find(message => message.embeds?.[0]?.title?.includes('🕙 Horaires des parcs'));

    const sevenDaysEmbed: APIEmbed = {
        title: '🛰️ Horaires des parcs - 7 prochains jours',
        color: 0x97D8F6,
        footer: {
            text: 'Dernière mise à jour : ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }) + ' - Horaires sujets à modification',
        },
        fields: [],
    }
    const nowDate = new Date();
    for (let i = 1; i < 8; i++) {
        const date = new Date();
        date.setDate(nowDate.getDate() + i);
        const parkSchedules = await getParkSchedule(env);
        sevenDaysEmbed.fields?.push({
            name: date.toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' }),
            value: `🏰 ${parkSchedules[0].replace('\n', ' ')}\n🎬 ${parkSchedules[1].replace('\n', ' ')}`,
            inline: false,
        })
    }

    const todayDate = new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Europe/Paris' });
    const body: RESTPostAPIChannelMessageJSONBody = {
        embeds: [
            {
                title: `🕙 Horaires des parcs - ${todayDate}`,
                description: `Retrouvez ci-dessous les horaires des parcs Disneyland Paris pour le **${todayDate}**.\n\n✨ **Extra Magic Hours** : vous séjournez dans les hôtels Disney, vous possédez un Billet Privlège ou un Pass Annuel Magic Plus / Infinity ? Vous pouvez profiter de l'ouverture de certains parcs avant l'heure d'ouverture officielle.\n­`,
                image: {
                    url: 'https://media.disneylandparis.com/d4th/fr-fr/images/n026022_2024may09_world_disneyland-hotel-mickey-clock_2-1_tcm808-194434.jpg?w=1200',
                },
                color: 0x00a0e9,
                fields: [
                    {
                        name: '🏰 Parc Disneyland',
                        value: todayParkSchedules[0],
                        inline: true,
                    },
                    {
                        name: '🎬 Parc Walt Disney Studios',
                        value: todayParkSchedules[1],
                        inline: true,
                    },
                ],
                footer: {
                    text: 'Dernière mise à jour : ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }) + ' - Données fournies par Disneyland Paris',
                }
            },
            sevenDaysEmbed
        ]
    }

    if (botMessage) {
        await env.DISCORD.patch(Routes.channelMessage(env.PARKS_CHANNEL_ID, botMessage.id), { body });
    } else {
        await env.DISCORD.post(Routes.channelMessages(env.PARKS_CHANNEL_ID), { body });
    }
}
