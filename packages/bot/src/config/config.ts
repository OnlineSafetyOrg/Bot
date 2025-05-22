import { ObjectNameIDArray } from '../types';

import process from 'node:process';
import dotenv from 'dotenv';
dotenv.config();

export type webhookArray = Array<{ name: string; id: string; token: string }>;

export interface ConfigInterface {
    client: {
        token: string;
        id: string;
        secret: string;
    };
    guilds: ObjectNameIDArray;
    webhooks: webhookArray;
}

export const config: ConfigInterface = {
    client: {
        token: process.env.CLIENT_TOKEN as string,
        id: process.env.CLIENT_ID as string,
        secret: process.env.CLIENT_SECRET as string,
    },
    guilds: [
        {
            name: 'Online Safety',
            id: '1360001636424093928',
        },
    ],
    webhooks: [],
};
