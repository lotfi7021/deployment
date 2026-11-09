export const environment = {
  production: false,
  apiUrl: (window as any).APP_CONFIG?.apiUrl ?? 'http://localhost:8081'
};
