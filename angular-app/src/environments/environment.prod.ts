export const environment = {
  production: true,
  apiUrl: (window as any).APP_CONFIG?.apiUrl ?? 'http://localhost:8081'
};
