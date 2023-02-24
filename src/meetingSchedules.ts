import { APIEmbed, APIMessage, RESTPostAPIChannelMessageJSONBody, Routes } from 'discord-api-types/v10';
import { formatHour } from './index';
import { Activity, Env } from './typings';

export function generateMeetingEmbed(meeting: Activity): APIEmbed {
    const description = meeting.shortDescription
        .replace(/(<br \/>)?(<br \/>)?((Les personnages|Cette Rencontre).*sans préavis)(.?)( \\")?/g, '')
        .replaceAll('<br />', '\n');

    const isDisneylandPark = meeting.location.id === 'P1';
    return {
        title: meeting.name.endsWith(' ') ? meeting.name.slice(0, -1) : meeting.name,
        description: description,
        image: {
            url: meeting.thumbMedia?.url,
        },
        footer: {
            text: 'Dernière mise à jour : ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }) + ' - Données fournies par Disneyland Paris',
        },
        color: isDisneylandPark ? 16756684 : 16170336,
        fields: [
            {
                name: '🕙 Horaires de rencontre',
                value: meeting.schedules.map((schedule: { startTime: string }) => formatHour(schedule.startTime)).join(', '),
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

export async function deleteOutdatedMeetings(env: Env) {
    console.log('Deleting outdated meetings...');
    const activities = env.ACTIVITIES;
    const messages = await env.DISCORD.get(Routes.channelMessages(env.MEETINGS_CHANNEL_ID)) as APIMessage[];
    const outdatedMessages = messages.filter(message => {
        if (message.embeds.length === 0) return true;
        const embed = message.embeds[0];
        if (embed.title?.includes('🕙 Horaires des rencontres')) return false;
        return !activities.find(activity => activity.name === embed.title || activity.name === embed.title + ' ' || activity.name === embed.title + '  ');
    });

    for (const message of outdatedMessages) {
        await env.DISCORD.delete(Routes.channelMessage(env.MEETINGS_CHANNEL_ID, message.id));
    }
}

export async function updateMeetingWelcome(env: Env) {
    console.log('Updating meeting welcome message...');
    const messages = await env.DISCORD.get(Routes.channelMessages(env.MEETINGS_CHANNEL_ID)) as APIMessage[];

    // Try to find welcome message
    const welcomeMessage = messages.find(message => {
        if (message.embeds.length === 0) return false;
        const embed = message.embeds[0];
        return embed.title?.includes('🕙 Horaires des rencontres');
    });

    // Generate new welcome embed
    const todayDate = new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Europe/Paris' })
    const welcomeBody: RESTPostAPIChannelMessageJSONBody = {
        embeds: [
            {
                title: `🕙 Horaires des rencontres - ${todayDate}`,
                description: `Retrouvez ci-dessous les horaires des rencontres avec les personnages des parcs Disneyland Paris pour le **${todayDate}**. Notez que ces horaires sont susceptibles de changer en fonction des conditions météorologiques ou de la fréquentation du parc.`,
                color: 0x00a0e9,
            },
        ]
    }

    // Create welcome message if not exists
    if (welcomeMessage) {
        await env.DISCORD.patch(Routes.channelMessage(env.MEETINGS_CHANNEL_ID, welcomeMessage.id), { body: welcomeBody });
    } else {
        await env.DISCORD.post(Routes.channelMessages(env.MEETINGS_CHANNEL_ID), { body: welcomeBody });
    }

}
