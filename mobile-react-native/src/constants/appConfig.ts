type Props = {
  baseUrl: string;
  wsUrl: string;
  locales: string[];
};

function AppConfig(): Props {

  return {
    locales: ['tr', 'en'],
    baseUrl: 'http://192.168.1.3:3000/api',
    wsUrl: 'ws://localhost:3000/ws',
  };
}

export default AppConfig();
