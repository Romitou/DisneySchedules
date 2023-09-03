import { updateParkSchedules } from './parkSchedules';
import { deleteOutdatedMeetings, updateMeetingWelcome } from './meetingSchedules';
import { fetchActivities, getAllActivities } from './fetchActivities';
import { deleteOutdatedShows, updateShowWelcome } from './showSchedules';
import { Env } from './typings';
import { syncActivity } from './syncActivities';
import { config } from 'dotenv';
import { REST } from '@discordjs/rest';
import * as fs from 'fs';

config({ path: __dirname + '/../.env' });

export function formatHour(hour: string) {
	hour = hour.substring(0, 5);
	return hour.replace(/(\d+):(\d+)/, '$1h$2');
}

export const discordClient = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN as string);

async function run(): Promise<void> {
	let activities = await getAllActivities();

	if (process.argv.includes('--sync')) {
		console.log('Syncing activities...');
		for (const activity of activities) {
			await syncActivity(activity);
		}
		await updateParkSchedules();
	}

	if (process.argv.includes('--cleanup')) {
		console.log('Cleaning up...');
		await updateMeetingWelcome();
		await updateShowWelcome();

		await deleteOutdatedMeetings(activities);
		await deleteOutdatedShows(activities);
	}

	if (process.argv.includes('--overrides')) {
		console.log('Generating activities...');
		const generatedActivities: Record<string, Object> = {};
		activities.forEach(activity => {
			generatedActivities[activity.id] = {
				name: activity.name,
				description: activity.shortDescription,
			}
		})
		fs.writeFileSync(__dirname + '/../overrides.json', JSON.stringify(generatedActivities, null, 2));
	}
}

export function formatDate(date: Date) {
	const rawDate = date.toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' });
	return rawDate.substring(6, 10) + '-' + rawDate.substring(3, 5) + '-' + rawDate.substring(0, 2);
}

void run();
