import puppeteer from 'puppeteer-core';
import { setTimeout } from 'timers/promises';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://localhost:5173';
const OUT = './screenshots';

const pages = [
	{ name: '01-dashboard', url: '/', waitFor: 3000 },
	{ name: '02-profilo', url: '/profilo/', waitFor: 2000 },
	{ name: '03-calcolatore', url: '/calcolatore/', waitFor: 3000 },
	{ name: '04-simulazione', url: '/simulazione/', waitFor: 2000 },
	{ name: '05-scenari', url: '/scenari/', waitFor: 2000 },
	{ name: '06-rischi', url: '/rischi/', waitFor: 2000 },
	{ name: '07-dati-storici', url: '/dati-storici/', waitFor: 3000 },
	{ name: '08-guida', url: '/guida/', waitFor: 2000 },
	{ name: '09-guida-step', url: '/guida/cos-e-fire/', waitFor: 2000 },
	{ name: '10-impostazioni', url: '/impostazioni/', waitFor: 2000 },
];

async function run() {
	const browser = await puppeteer.launch({
		executablePath: CHROME_PATH,
		headless: true,
		defaultViewport: { width: 1440, height: 900 },
		args: ['--no-sandbox', '--disable-setuid-sandbox']
	});

	const page = await browser.newPage();

	// First visit dashboard to trigger profile creation
	await page.goto(`${BASE}/`, { waitUntil: 'networkidle0', timeout: 15000 });
	await setTimeout(3000);

	// Visit profilo first to create a default profile
	await page.goto(`${BASE}/profilo/`, { waitUntil: 'networkidle0', timeout: 15000 });
	await setTimeout(3000);

	// Go back to dashboard so it loads with data
	await page.goto(`${BASE}/`, { waitUntil: 'networkidle0', timeout: 15000 });
	await setTimeout(3000);

	for (const p of pages) {
		console.log(`Capturing ${p.name}...`);
		try {
			await page.goto(`${BASE}${p.url}`, { waitUntil: 'networkidle0', timeout: 15000 });
			await setTimeout(p.waitFor);
			await page.screenshot({
				path: `${OUT}/${p.name}.png`,
				fullPage: false
			});
			console.log(`  OK -> ${OUT}/${p.name}.png`);
		} catch (err) {
			console.error(`  FAILED: ${err.message}`);
		}
	}

	await browser.close();
	console.log('\nDone! Screenshots saved in ./screenshots/');
}

run().catch(console.error);
