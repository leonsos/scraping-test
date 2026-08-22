import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

async function test() {
    const jar = new CookieJar();
    const client = wrapper(axios.create({
        jar,
        withCredentials: true
    }));

    // Registrar interceptor de request para ver las cabeceras salientes reales
    client.interceptors.request.use((config) => {
        console.log('AXIOS REQUEST CONFIG HEADERS:', config.headers);
        return config;
    });

    console.log('--- GET 1 ---');
    const res1 = await client.get('https://httpbin.org/cookies/set/mycookie/myvalue');
    console.log('Set-Cookie headers:', res1.headers['set-cookie']);
    console.log('Jar contents:', await jar.getCookies('https://httpbin.org'));

    console.log('--- GET 2 ---');
    const res2 = await client.get('https://httpbin.org/cookies');
    console.log('Response data:', res2.data);
    console.log('Response headers sent by axios (according to httpbin):', res2.data.cookies);
}

test().catch(console.error);
