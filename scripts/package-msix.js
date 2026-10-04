const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const pkg = require(path.join(root, 'package.json'));
const checkStore = process.argv.includes('--check-store');
const storeBuild = process.argv.includes('--store') || checkStore;
const identityName = process.env.MSIX_IDENTITY_NAME || (storeBuild ? '' : 'ClipDows.Local');
const publisher = process.env.MSIX_PUBLISHER || (storeBuild ? '' : 'CN=ClipDows Local');
const publisherDisplayName = process.env.MSIX_PUBLISHER_DISPLAY_NAME || pkg.author || 'ClipDows';

if (storeBuild && (!identityName || !publisher)) {
  console.error('Store package identity is missing. Set MSIX_IDENTITY_NAME and MSIX_PUBLISHER from Partner Center, then run npm run dist:msix:store.');
  process.exit(1);
}
if (!/^[A-Za-z0-9.]+$/.test(identityName)) {
  console.error('MSIX_IDENTITY_NAME must contain only letters, numbers, and periods.');
  process.exit(1);
}
if (checkStore) process.exit(0);

function xml(value) {
  return String(value).replace(/[<>&"']/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char]);
}

function findMakeAppx() {
  const kitsRoot = path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Windows Kits', '10', 'bin');
  if (!fs.existsSync(kitsRoot)) throw new Error(`Windows SDK was not found at ${kitsRoot}. Install the Windows 10/11 SDK with MakeAppx.`);
  const sdkVersions = fs.readdirSync(kitsRoot).filter((name) => /^10\./.test(name)).sort().reverse();
  for (const version of sdkVersions) {
    const candidate = path.join(kitsRoot, version, 'x64', 'makeappx.exe');
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error('makeappx.exe was not found in the installed Windows SDK.');
}

function run(executable, args) {
  const result = spawnSync(executable, args, { cwd: root, encoding: 'utf8', windowsHide: true });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    if (result.stdout) process.stderr.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    throw new Error(`${path.basename(executable)} exited with code ${result.status}`);
  }
}

const appDir = path.join(root, 'release', 'win-unpacked');
if (!fs.existsSync(path.join(appDir, 'ClipDows.exe'))) {
  throw new Error(`Electron app output not found at ${appDir}. Run electron-builder with the Windows dir target first.`);
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clipdows-msix-'));
try {
  fs.cpSync(appDir, tempDir, { recursive: true });
  const assetsDir = path.join(tempDir, 'Assets');
  const powershell = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  run(powershell, [
    '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File',
    path.join(root, 'scripts', 'create-msix-assets.ps1'),
    '-Source', path.join(root, 'build', 'icon.png'),
    '-Destination', assetsDir,
  ]);

  const version = `${pkg.version}.0`;
  const description = pkg.description || pkg.productName;
  const manifest = `<?xml version="1.0" encoding="utf-8"?>
<Package xmlns="http://schemas.microsoft.com/appx/manifest/foundation/windows10"
         xmlns:uap="http://schemas.microsoft.com/appx/manifest/uap/windows10"
         xmlns:uap10="http://schemas.microsoft.com/appx/manifest/uap/windows10/10"
         xmlns:rescap="http://schemas.microsoft.com/appx/manifest/foundation/windows10/restrictedcapabilities"
         IgnorableNamespaces="uap uap10 rescap">
  <Identity Name="${xml(identityName)}" Publisher="${xml(publisher)}" Version="${version}" ProcessorArchitecture="x64" />
  <Properties>
    <DisplayName>${xml(pkg.productName)}</DisplayName>
    <PublisherDisplayName>${xml(publisherDisplayName)}</PublisherDisplayName>
    <Description>${xml(description)}</Description>
    <Logo>Assets\\StoreLogo.png</Logo>
  </Properties>
  <Dependencies>
    <TargetDeviceFamily Name="Windows.Desktop" MinVersion="10.0.17763.0" MaxVersionTested="10.0.26100.0" />
  </Dependencies>
  <Resources><Resource Language="en-us" /></Resources>
  <Applications>
    <Application Id="ClipDows" Executable="ClipDows.exe" EntryPoint="Windows.FullTrustApplication">
      <uap:VisualElements DisplayName="${xml(pkg.productName)}" Description="${xml(description)}" BackgroundColor="transparent" Square150x150Logo="Assets\\Square150x150Logo.png" Square44x44Logo="Assets\\Square44x44Logo.png" />
    </Application>
  </Applications>
  <Capabilities><rescap:Capability Name="runFullTrust" /></Capabilities>
</Package>
`;
  fs.writeFileSync(path.join(tempDir, 'AppxManifest.xml'), manifest, 'utf8');

  const tag = storeBuild ? 'store' : 'local';
  const output = path.join(root, 'release', `${pkg.productName}-${pkg.version}-x64-${tag}.msix`);
  run(findMakeAppx(), ['pack', '/d', tempDir, '/p', output, '/o']);
  console.log(`Created ${output}`);
  if (!storeBuild) {
    console.log('This local package uses ClipDows.Local identity for packaging checks. Set MSIX_IDENTITY_NAME and MSIX_PUBLISHER and run npm run dist:msix:store for the Partner Center identity.');
  }
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
