import { ofetch } from 'ofetch';
import { Activity, OverrideActivity } from './typings';
import fs from 'fs';
import { formatDate } from './index';

export async function getAllActivities(): Promise<Activity[]> {
    const allActivities: Record<string, Activity> = {};

    const nowDate = new Date();
    for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(nowDate.getDate() + i);
        const formattedDate = formatDate(date);
        const activitiesForDate = await fetchActivities(formattedDate);
        for (const activity of activitiesForDate) {
            const existingActivity = allActivities[activity.id];
            if (existingActivity) {
                existingActivity.datedSchedules[formattedDate] = activity.schedules;
                allActivities[activity.id] = existingActivity;
            } else {
                activity.datedSchedules = {};
                activity.datedSchedules[formattedDate] = activity.schedules;
                allActivities[activity.id] = activity;
            }
        }
    }

    return Object.values(allActivities);
}

export async function fetchActivities(date: string): Promise<Activity[]> {
    console.log('Fetching activities...');
    const activities = await getActivities(date);

    let overrides: Record<string, OverrideActivity> = {};
    if (fs.existsSync(__dirname + '/../overrides.json')) {
        overrides = JSON.parse(fs.readFileSync(__dirname + '/../overrides.json', 'utf-8'));
    }

    return activities.filter((activity) => activity.schedules.length > 0
      && !['Hide from the Mobile App', 'Hide from Web List + Mobile App', 'Hide from the Listing Page', 'Hide from the Service'].includes(activity.hideFunctionality))
      .map((activity) => {
          activity.type = activity.subType.includes('Character') ? 'meeting' : 'show';
          // Remove all trailing spaces
          activity.name = activity.name.replace(/\s+$/, '');

          const override = overrides[activity.id];
          if (override) {
              activity.name = override.name;
              activity.shortDescription = override.description;
          }

          return activity;
      });
}

export async function getActivities(date: string): Promise<Activity[]> {
    return await ofetch('https://api.disneylandparis.com/query', {
        method: 'POST',
        body: {
            operationName: 'activitySchedules',
            query: process.env.ACTIVITIES_QUERY as string,
            variables: {
                market: 'fr-fr',
                types: [
                    {
                        type: "Entertainment",
                        status: [
                            "PERFORMANCE_TIME"
                        ]
                    }
                ],
                date,
            }
        },
        parseResponse: JSON.parse,
    }).catch(console.error).then(response => {
        return response?.data?.activitySchedules || [];
    });
}
