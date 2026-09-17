import mongoose from 'mongoose';
import app from '../src/app.js';

export const apiUrl = app;

// Hook global: encerra a conexão somente depois de todas as suítes.
after(async () => {
  await mongoose.connection.close();
});
