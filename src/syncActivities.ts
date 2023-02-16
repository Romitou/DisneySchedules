import { APIMessage, Routes } from 'discord-api-types/v10';
import { Activity, Env } from './typings';
import { generateMeetingEmbed } from './meetingSchedules';
import { generateShowEmbed } from './showSchedules';

export async function syncActivity(env: Env, activity: Activity) {
    let channelId;
    let embed;
    if (activity.type === 'meeting') {
        channelId = env.MEETINGS_CHANNEL_ID;
        embed = generateMeetingEmbed(activity);
    } else {
        channelId = env.SHOWS_CHANNEL_ID;
        embed = generateShowEmbed(activity);
    }

    const messages = await env.DISCORD.get(Routes.channelMessages(channelId)) as APIMessage[];

    let existingMessage: APIMessage | undefined;
    existingMessage = messages.find(message => message.embeds[0].title === activity.name);
    if (!existingMessage) {
        existingMessage = messages.find(message => message.embeds[0].title === activity.name + ' ');
    }
    if (!existingMessage) {
        console.error('Could not find message for activity:', activity);
    }

    if (existingMessage) {
        await env.DISCORD.patch(Routes.channelMessage(channelId, existingMessage.id), {
            body: {
                embeds: [embed],
            }
        })
    } else {
        await env.DISCORD.post(Routes.channelMessages(channelId), {
            body: {
                embeds: [embed],
            }
        })
    }
}
