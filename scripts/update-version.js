import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
const version = packageJson.version;
const timestamp = new Date().toISOString().replace(/[:T-]/g, '').slice(0, 12); // YYYYMMDDHHMM
const fullVersion = `v${version}-${timestamp}`;

console.log(`🚀 Generating new Service Worker version: ${fullVersion}`);

const targets = [
    {
        file: path.join(rootDir, 'public/sw.js'),
        pattern: /const VERSION = '.*'; \/\/ vSTAMP/
    },
    {
        file: path.join(rootDir, 'public/js/utils/service-worker-manager.js'),
        pattern: /export const SW_VERSION = '.*'; \/\/ vSTAMP/
    }
];

let success = true;

targets.forEach(({ file, pattern }) => {
    if (!fs.existsSync(file)) {
        console.warn(`⚠️ Warning: ${file} not found.`);
        return;
    }

    const content = fs.readFileSync(file, 'utf8');
    const prefix = pattern.source.split("'")[0];
    const suffix = "'; // vSTAMP";
    const newContent = content.replace(pattern, `${prefix}'${fullVersion}${suffix}`);

    if (content === newContent) {
        if (!content.includes('// vSTAMP')) {
            console.error(`❌ Error: Placeholder '// vSTAMP' missing in ${file}`);
            success = false;
        } else {
            console.log(`ℹ️ No change needed for ${path.basename(file)} (already up to date or pattern mismatch)`);
        }
    } else {
        fs.writeFileSync(file, newContent);
        console.log(`✅ Updated version in ${path.basename(file)}`);
    }
});

if (!success) {
    process.exit(1);
}
