import { ofetch } from 'ofetch';
import { Activity, Env } from './typings';

export async function fetchActivities(env: Env): Promise<Activity[]> {
    console.log('Fetching activities...');
    const activities = await getActivities(env);

    return activities.filter((activity) => activity.schedules.length > 0
            && !activity.hideFunctionality.includes('Hide from Web List + Mobile App'))
        .map((activity) => {
            activity.type = activity.subType.includes('Character') ? 'meeting' : 'show';
            // Remove all trailing spaces
            activity.name = activity.name.replace(/\s+$/, '');
            return activity;
        });
}

export async function getActivities(env: Env): Promise<Activity[]> {
    return await ofetch('https://api.disneylandparis.com/query', {
        method: 'POST',
        body: {
            operationName: 'activitySchedules',
            query: env.ACTIVITIES_QUERY,
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
                date: env.DATE,
            }
        },
        parseResponse: JSON.parse,
    }).catch(console.error).then(response => {
        return response?.data?.activitySchedules || [];
    });
}
