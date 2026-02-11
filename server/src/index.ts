import { app } from './app';
import { env } from './config/env';

const port = env.PORT;

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API running on http://localhost:${port}`);
});
