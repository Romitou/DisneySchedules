import { REST } from '@discordjs/rest';

export interface Env {
    MEETINGS_CHANNEL_ID: string;
    SHOWS_CHANNEL_ID: string;
    PARKS_CHANNEL_ID: string;
    DATE: string;
    ACTIVITIES: Activity[];
    PARK_SCHEDULES_QUERY: string;
    ACTIVITIES_QUERY: string;
    DISCORD: REST;
    OVERRIDES: Record<string, OverrideActivity>;
}

export interface OverrideActivity {
    name: string;
    description: string;
}

export interface ActivitySchedule {
    startTime: string;
    endTime: string;
    closed: boolean;
    language: string;
}

export interface Activity {
    id: string;
    shortDescription: string;
    name: string;
    subType: string;
    pageLink: {
        url: string;
    }
    thumbMedia: {
        url: string;
    }
    hideFunctionality: string;
    location: {
        id: string;
        value: string;
    }
    subLocation: {
        id: string;
        value: string;
    }
    type: string;
    compiledSchedules: string;
    datedSchedules: { from: number, to: number, schedules: string }[];
    schedules: ActivitySchedule[];
}
