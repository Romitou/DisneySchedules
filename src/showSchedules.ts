import { APIEmbed, APIMessage, RESTPostAPIChannelMessageJSONBody, Routes } from 'discord-api-types/v10';
import { discordClient, formatHour } from './index';
import { Activity, Env } from './typings';

export function generateShowEmbed(show: Activity): APIEmbed {
    let description = show.shortDescription.replaceAll('<sup>e</sup>', 'ème')
        .replaceAll('<br />', '\n')
        .replaceAll('<em>', '')
        .replaceAll('</em>', '')
      .replaceAll('<p>', '')
      .replaceAll('</p>', '');


    let schedulesAreIdentical = true;
    let lastString: string | null = null;
    if (show.datedSchedules) {
        const scheduleValues = Object.values(show.datedSchedules);
        for (const schedules of scheduleValues) {
            const currentString = schedules.map((schedule) => formatHour(schedule.startTime)).join(', ');
            if (lastString && lastString !== currentString) {
                schedulesAreIdentical = false;
                break;
            }
            lastString = currentString;
            schedulesAreIdentical = true;
        }
    }

    let stringToShow: string;
    if (schedulesAreIdentical) {
        stringToShow = lastString ?? 'Inconnu';
    } else {
        show.compiledSchedules = '';
        for (const date of Object.keys(show.datedSchedules)) {
            const schedules = show.datedSchedules[date];
            if (schedules.length === 0) continue;
            const dateObject = new Date(date);
            const hours = schedules.map((schedule: { startTime: string }) => formatHour(schedule.startTime)).join(', ');
            // date as DD/MM/YYYY
            const formattedDate = dateObject.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Paris' });
            show.compiledSchedules += `\n:white_small_square: ${formattedDate} : ${hours}`;
        }
        stringToShow = show.compiledSchedules;
    }

    const isDisneylandPark = show.location.id === 'P1';
    return {
        title: show.name.endsWith(' ') ? show.name.slice(0, -1) : show.name,
        description: description,
        image: {
            url: show.thumbMedia?.url,
        },
        footer: {
            text: show.id + ' - Dernière mise à jour : ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }) + ' - Données fournies par Disneyland Paris',
        },
        color: isDisneylandPark ? 16756684 : 16170336,
        fields: [
            {
                name: '🕙 Horaires de représentation',
                value: stringToShow,
                inline: false,
            },
            {
                name: '📍 Lieu de représentation',
                value: `${isDisneylandPark ? '🏰': '🎬'} ${show.location.value}, ${show.subLocation.value}`,
                inline: false,
            }
        ]
    }
}

export async function updateShowWelcome() {
    console.log('Updating show welcome message...');
    const messages = await discordClient.get(Routes.channelMessages(process.env.SHOWS_CHANNEL_ID as string)) as APIMessage[];

    // Try to find welcome message
    const welcomeMessage = messages.find(message => {
        if (message.embeds.length === 0) return false;
        const embed = message.embeds[0];
        return embed.title?.includes('🕙 Horaires des spectacles');
    });

    // Generate new welcome embed
    const todayDate = new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Europe/Paris' });
    // 7 days later date
    const nextWeekDate = new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Europe/Paris' })

    const welcomeBody: RESTPostAPIChannelMessageJSONBody = {
        embeds: [
            {
                title: `🕙 Horaires des spectacles - ${todayDate}`,
                description: `Retrouvez ci-dessous les horaires des spectacles des parcs Disneyland Paris du **${todayDate}** au **${nextWeekDate}**. Notez que ces horaires sont susceptibles de changer sans notification préalable à la discrétion de Disneyland Paris.`,
                color: 0x00a0e9,
            },
        ]
    }

    // Create welcome message if not exists
    if (welcomeMessage) {
        await discordClient.patch(Routes.channelMessage(process.env.SHOWS_CHANNEL_ID as string, welcomeMessage.id), { body: welcomeBody });
    } else {
        await discordClient.post(Routes.channelMessages(process.env.SHOWS_CHANNEL_ID as string), { body: welcomeBody });
    }
}

export async function deleteOutdatedShows(activities: Activity[]) {
    console.log('Deleting outdated shows...');
    const messages = await discordClient.get(Routes.channelMessages(process.env.SHOWS_CHANNEL_ID as string)) as APIMessage[];
    const outdatedMessages = messages.filter(message => {
        if (message.embeds.length === 0) return true;
        const embed = message.embeds[0];
        if (embed.title?.includes('🕙 Horaires des spectacles')) return false;
        return !activities.find(activity => embed.footer?.text.startsWith(activity.id));
    });

    for (const message of outdatedMessages) {
        await discordClient.delete(Routes.channelMessage(process.env.SHOWS_CHANNEL_ID as string, message.id));
    }
}
