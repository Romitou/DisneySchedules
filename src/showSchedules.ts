import { APIEmbed, APIMessage, RESTPostAPIChannelMessageJSONBody, Routes } from 'discord-api-types/v10';
import { formatHour } from './index';
import { Activity, Env } from './typings';

export function generateShowEmbed(show: Activity): APIEmbed {
    let description = show.shortDescription.replaceAll('<sup>e</sup>', 'ème')
        .replaceAll('<br />', '\n')
        .replaceAll('<em>', '')
        .replaceAll('</em>', '');

    let hours: string;
    hours = show.schedules.map((schedule: { startTime: string }) => formatHour(schedule.startTime)).join(', ');
    if (show.id === 'P2YS03') {
        const frenchHours = show.schedules.filter((schedule: { language: string; }) => schedule.language === 'fr').map((schedule: { startTime: string; }) => formatHour(schedule.startTime)).join(', ');
        const englishHours = show.schedules.filter((schedule: { language: string; }) => schedule.language === 'en').map((schedule: { startTime: string; }) => formatHour(schedule.startTime)).join(', ');
        hours = `🇫🇷 ${frenchHours}\n🇬🇧 ${englishHours}`;
    }

    const isDisneylandPark = show.location.id === 'P1';
    return {
        title: show.name.endsWith(' ') ? show.name.slice(0, -1) : show.name,
        description: description,
        image: {
            url: show.thumbMedia?.url,
        },
        footer: {
            text: 'Dernière mise à jour : ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' }) + ' - Données fournies par Disneyland Paris',
        },
        color: isDisneylandPark ? 16756684 : 16170336,
        fields: [
            {
                name: '🕙 Horaires de représentation',
                value: hours,
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

export async function updateShowWelcome(env: Env) {
    const messages = await env.DISCORD.get(Routes.channelMessages(env.SHOWS_CHANNEL_ID)) as APIMessage[];

    // Try to find welcome message
    const welcomeMessage = messages.find(message => {
        if (message.embeds.length === 0) return false;
        const embed = message.embeds[0];
        return embed.title?.includes('🕙 Horaires des spectacles');
    });

    // Generate new welcome embed
    const todayDate = new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Europe/Paris' });
    const welcomeBody: RESTPostAPIChannelMessageJSONBody = {
        embeds: [
            {
                title: `🕙 Horaires des spectacles - ${todayDate}`,
                description: `Retrouvez ci-dessous les horaires des spectacles des parcs Disneyland Paris pour le **${todayDate}**. Notez que ces horaires sont susceptibles de changer sans notification préalable à la discrétion de Disneyland Paris.`,
                color: 0x00a0e9,
            },
        ]
    }

    // Create welcome message if not exists
    if (welcomeMessage) {
        await env.DISCORD.patch(Routes.channelMessage(env.SHOWS_CHANNEL_ID, welcomeMessage.id), { body: welcomeBody });
    } else {
        await env.DISCORD.post(Routes.channelMessages(env.SHOWS_CHANNEL_ID), { body: welcomeBody });
    }
}

export async function deleteOutdatedShows(env: Env) {
    const activities = env.ACTIVITIES;
    const messages = await env.DISCORD.get(Routes.channelMessages(env.SHOWS_CHANNEL_ID)) as APIMessage[];
    const outdatedMessages = messages.filter(message => {
        if (message.embeds.length === 0) return true;
        const embed = message.embeds[0];
        if (embed.title?.includes('🕙 Horaires des spectacles')) return false;
        return !activities.find(activity => activity.name === embed.title || activity.name === embed.title + ' ' || activity.name === embed.title + '  ');
    });

    for (const message of outdatedMessages) {
        await env.DISCORD.delete(Routes.channelMessage(env.SHOWS_CHANNEL_ID, message.id));
    }
}
