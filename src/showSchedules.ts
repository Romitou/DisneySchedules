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

    console.log('generate show')
    let stringToShow = '';
    for (const schedule of show.datedSchedules) {
        const fromDate = new Date(schedule.from);
        const toDate = new Date(schedule.to);
        const formattedFromDate = fromDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', timeZone: 'Europe/Paris' });
        const formattedToDate = toDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', timeZone: 'Europe/Paris' });
        let stringToAdd = `**${formattedFromDate} au ${formattedToDate} :** ${schedule.schedules}\n`;
        if (formattedFromDate === formattedToDate) {
            stringToAdd = `**${formattedFromDate} :** ${schedule.schedules}\n`;
        }
        if (stringToShow.length + stringToAdd.length > 1024) {
            stringToShow += '...';
        } else {
            stringToShow += stringToAdd;
        }
    }
    console.log(stringToShow);
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
