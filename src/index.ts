import { updateParkSchedules } from './parkSchedules';
import { deleteOutdatedMeetings, updateMeetingWelcome } from './meetingSchedules';
import { fetchActivities } from './fetchActivities';
import { deleteOutdatedShows, updateShowWelcome } from './showSchedules';
import { Env } from './typings';
import { syncActivity } from './syncActivities';
import 'dotenv/config';
import { REST } from '@discordjs/rest';

export function formatHour(hour: string) {
	hour = hour.substring(0, 5);
	return hour.replace(/(\d+):(\d+)/, '$1h$2');
}

async function run(): Promise<void> {
	const env: Env = {
		MEETINGS_CHANNEL_ID: process.env.MEETINGS_CHANNEL_ID as string,
		SHOWS_CHANNEL_ID: process.env.SHOWS_CHANNEL_ID as string,
		PARKS_CHANNEL_ID: process.env.PARKS_CHANNEL_ID as string,
		DATE: formatDate(new Date()),
		ACTIVITIES: [],
		PARK_SCHEDULES_QUERY: process.env.PARK_SCHEDULES_QUERY as string,
		ACTIVITIES_QUERY: process.env.ACTIVITIES_QUERY as string,
		DISCORD: new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN as string)
	};
	env.ACTIVITIES = await fetchActivities(env);

	if (process.argv.includes('--sync')) {
		console.log('Syncing activities...');
		for (const activity of env.ACTIVITIES) {
			await syncActivity(env, activity);
		}
		await updateParkSchedules(env);
	}

	if (process.argv.includes('--cleanup')) {
		console.log('Cleaning up...');
		await updateMeetingWelcome(env);
		await updateShowWelcome(env);

		await deleteOutdatedMeetings(env);
		await deleteOutdatedShows(env);
	}
}

export function formatDate(date: Date) {
	const rawDate = date.toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' });
	return rawDate.substring(6, 10) + '-' + rawDate.substring(3, 5) + '-' + rawDate.substring(0, 2);
}

void run();
