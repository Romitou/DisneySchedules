import { ofetch } from 'ofetch';
import { Activity, ActivitySchedule, OverrideActivity } from './typings';
import fs from 'fs';
import { formatDate, formatHour } from './index';

function timeStringToFloat(time: string) {
    const hoursMinutes = time.split(/[.:]/);
    const hours = parseInt(hoursMinutes[0], 10);
    const minutes = hoursMinutes[1] ? parseInt(hoursMinutes[1], 10) : 0;
    return hours + minutes / 60;
}

function schedulesToString(schedules: ActivitySchedule[]): string {
    // let stringSchedule = '';
    // let lastEndTime = 0;
    // let i = 0;
    // let lastStartTimeString = null;
    // for (const schedule of schedules) {
    //     const endTime = timeStringToFloat(schedule.endTime);
    //     if (lastStartTimeString != null && schedules.length > i + 1) {
    //         const nextSchedule = schedules[i + 1];
    //         const nextStartTime = timeStringToFloat(nextSchedule.startTime);
    //         if (nextStartTime - endTime < 0.6) {
    //             lastStartTimeString = schedule.startTime;
    //         }
    //     } else {
    //         stringSchedule += `${schedule.startTime} - ${schedule.endTime}, `;
    //     }
    //     lastEndTime = endTime;
    //     i++;
    // }
    return schedules.map((schedule) => {
        return `${formatHour(schedule.startTime)}`;
    }).join(', ');
}

export async function getAllActivities(): Promise<Activity[]> {
    const allActivities: Record<string, Activity> = {};


    const nowDate = new Date();
    for (let i = 0; i < 90; i++) {
        const date = new Date();
        date.setDate(nowDate.getDate() + i);
        const formattedDate = formatDate(date);
        const activitiesForDate = await fetchActivities(formattedDate);
        if (activitiesForDate.length === 0 && date.getTime() > nowDate.setDate(nowDate.getDate() + 2)) {
            console.log('No more activities found for date ' + formattedDate)
            break;
        }
        for (const activity of activitiesForDate) {
            const schedulesString = schedulesToString(activity.schedules);
            const existingActivity = allActivities[activity.id];
            if (existingActivity) {
                const existingSlot = existingActivity.datedSchedules.find((slot) => date.getTime() > slot.from && date.getTime() < slot.to);
                if (existingSlot) {
                    if (existingSlot.schedules === schedulesString) {
                        existingSlot.to = Math.max(existingSlot.to, date.getTime());
                        existingActivity.datedSchedules = existingActivity.datedSchedules.map((slot) => {
                            if (slot.from === existingSlot.from) {
                                return existingSlot;
                            }
                            return slot;
                        });
                    } else {
                        existingActivity.datedSchedules.push({
                            from: date.getTime(),
                            to: date.getTime(),
                            schedules: schedulesString,
                        });
                    }
                } else {
                    const lastSlot = existingActivity.datedSchedules[existingActivity.datedSchedules.length - 1];
                    if (lastSlot.schedules === schedulesString) {
                        lastSlot.to = Math.max(lastSlot.to, date.getTime());
                        existingActivity.datedSchedules = existingActivity.datedSchedules.map((slot) => {
                            if (slot.from === lastSlot.from) {
                                return lastSlot;
                            }
                            return slot;
                        });
                    } else {
                        existingActivity.datedSchedules.push({
                            from: date.getTime(),
                            to: date.getTime(),
                            schedules: schedulesString,
                        });
                    }
                }
                allActivities[activity.id] = existingActivity;
            } else {
                activity.datedSchedules = [
                    {
                        from: date.getTime(),
                        to: date.getTime(),
                        schedules: schedulesString,
                    }
                ];
                allActivities[activity.id] = activity;
            }
        }
    }

    console.log('All activities fetched: ', allActivities)
    return Object.values(allActivities);
}

export async function fetchActivities(date: string): Promise<Activity[]> {
    console.log('Fetching activities...');
    const activities = await getActivities(date);

    let overrides: Record<string, OverrideActivity> = {};
    if (fs.existsSync(__dirname + '/../../overrides.json')) {
        overrides = JSON.parse(fs.readFileSync(__dirname + '/../../overrides.json', 'utf-8'));
    }

    if (fs.existsSync(__dirname + '/../../constants.json')) {
        const constants = JSON.parse(fs.readFileSync(__dirname + '/../../constants.json', 'utf8'));
        for (const [_, activity] of Object.entries(constants)) {
            activities.push(activity as Activity);
        }
    }

    return activities.filter((activity) => activity.schedules.length > 0)
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
    console.log('Fetching activities for date ' + date)
    console.log('Body: ', {
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
    });
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
