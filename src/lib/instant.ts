import { init } from '@instantdb/react';
import schema from '../../instant.schema';

const APP_ID = import.meta.env.VITE_INSTANT_APP_ID || '963e32dd-da05-4f18-a75f-96606b6a2546';

export const db = init({ 
  appId: APP_ID,
  schema 
});
