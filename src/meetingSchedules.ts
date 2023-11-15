import { APIEmbed, APIMessage, RESTPostAPIChannelMessageJSONBody, Routes } from 'discord-api-types/v10';
import { discordClient, formatHour } from './index';
import { Activity, Env } from './typings';

export function generateMeetingEmbed(meeting: Activity): APIEmbed {
    const description = meeting.shortDescription
        .replace(/(<br \/>)?(<br \/>)?((Les personnages|Cette Rencontre).*sans préavis)(.?)( \\")?/g, '')
        .replaceAll('<br />', '\n')
        .replaceAll('<p>', '')
        .replaceAll('</p>', '')
    ;

    console.log('generate meeting')
    let stringToShow = '';
    for (const schedule of meeting.datedSchedules) {
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

    const isDisneylandPark = meeting.location.id === 'P1';
    console.log(stringToShow);
    return {
        title: meeting.name,
        description: description,
        image: {
            url: meeting.thumbMedia?.url,
        },
        footer: {
            text: meeting.id + ' - Dernière mise à jour : ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }) + ' - Données fournies par Disneyland Paris',
        },
        color: isDisneylandPark ? 16756684 : 16170336,
        fields: [
            {
                name: '🕙 Horaires de rencontre',
                value: stringToShow,
                inline: false,
            },
            {
                name: '📍 Lieu de rencontre',
                value: `${isDisneylandPark ? '🏰': '🎬'} ${meeting.location.value}, ${meeting.subLocation.value}`,
                inline: false,
            }
        ]
    }
}

export async function deleteOutdatedMeetings(activities: Activity[]) {
    console.log('Deleting outdated meetings...');
    const messages = await discordClient.get(Routes.channelMessages(process.env.MEETINGS_CHANNEL_ID as string)) as APIMessage[];
    const outdatedMessages = messages.filter(message => {
        if (message.embeds.length === 0) return true;
        const embed = message.embeds[0];
        if (embed.title?.includes('🕙 Horaires des rencontres')) return false;
        return !activities.find(activity => embed.footer?.text.startsWith(activity.id));
    });

    for (const message of outdatedMessages) {
        await discordClient.delete(Routes.channelMessage(process.env.MEETINGS_CHANNEL_ID as string, message.id));
    }
}
