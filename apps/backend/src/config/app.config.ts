export default () => ({
  app: {
    port: Number(process.env.PORT ?? 3000),
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-only-jwt-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-only-refresh-secret',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  redis: {
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID,
    secret: process.env.RAZORPAY_SECRET,
  },
  firebase: {
    serverKey: process.env.FIREBASE_SERVER_KEY,
  },
});
