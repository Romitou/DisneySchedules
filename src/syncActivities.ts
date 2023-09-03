import { APIMessage, Routes } from 'discord-api-types/v10';
import { Activity, Env } from './typings';
import { generateMeetingEmbed } from './meetingSchedules';
import { generateShowEmbed } from './showSchedules';
import { discordClient } from './index';

let meetingMessages: APIMessage[] = [];
let showMessages: APIMessage[] = [];

export async function syncActivity(activity: Activity) {
    console.log('Syncing activity:', activity.name);

    let messages;
    let channelId;
    let embed;
    if (activity.type === 'meeting') {
        channelId = process.env.MEETINGS_CHANNEL_ID as string;
        embed = generateMeetingEmbed(activity);
        if (meetingMessages.length === 0)
            meetingMessages = await discordClient.get(Routes.channelMessages(channelId)) as APIMessage[];
        messages = meetingMessages;
    } else {
        channelId = process.env.SHOWS_CHANNEL_ID as string;
        embed = generateShowEmbed(activity);
        if (showMessages.length === 0)
            showMessages = await discordClient.get(Routes.channelMessages(channelId)) as APIMessage[];
        messages = showMessages;
    }

    let existingMessage: APIMessage | undefined;
    existingMessage = messages.find(message => message.embeds[0].footer?.text.startsWith(activity.id));
    if (!existingMessage) {
        console.error('Could not find message for activity:', activity);
    }

    if (existingMessage) {
        await discordClient.patch(Routes.channelMessage(channelId, existingMessage.id), {
            body: {
                embeds: [embed],
            }
        })
    } else {
        await discordClient.post(Routes.channelMessages(channelId), {
            body: {
                embeds: [embed],
            }
        })
    }
}
