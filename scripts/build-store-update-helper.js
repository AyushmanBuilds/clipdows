const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

if (process.platform !== 'win32') {
  throw new Error('The Microsoft Store update bridge can only be built on Windows.');
}

const root = path.resolve(__dirname, '..');
const kitRoot = path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Windows Kits', '10');
const frameworkRoot = path.join(process.env.SystemRoot || 'C:\\Windows', 'Microsoft.NET', 'Framework64', 'v4.0.30319');
const csc = path.join(frameworkRoot, 'csc.exe');
const metadataRoot = path.join(kitRoot, 'UnionMetadata');
const metadataVersion = fs.readdirSync(metadataRoot).filter((name) => /^10\./.test(name)).sort().reverse()
  .find((name) => fs.existsSync(path.join(metadataRoot, name, 'Windows.winmd')));
const runtimeWinmd = metadataVersion && path.join(metadataRoot, metadataVersion, 'Windows.winmd');
const runtimeGac = path.join(process.env.SystemRoot || 'C:\\Windows', 'Microsoft.NET', 'assembly', 'GAC_MSIL', 'System.Runtime');
const runtimeFacadeDir = fs.readdirSync(runtimeGac).find((name) => fs.existsSync(path.join(runtimeGac, name, 'System.Runtime.dll')));
const runtimeFacade = runtimeFacadeDir && path.join(runtimeGac, runtimeFacadeDir, 'System.Runtime.dll');
const source = path.join(root, 'scripts', 'store-update', 'StoreUpdateHelper.cs');
const outputDir = path.join(root, 'build', 'store-update');
const output = path.join(outputDir, 'ClipDows.StoreUpdate.exe');

for (const file of [csc, runtimeWinmd, runtimeFacade, source]) {
  if (!fs.existsSync(file)) throw new Error(`Required Windows build file is missing: ${file}`);
}
fs.mkdirSync(outputDir, { recursive: true });
const args = [
  '/nologo', '/target:exe', '/optimize+', `/out:${output}`,
  '/reference:System.Runtime.WindowsRuntime.dll',
  '/reference:System.Runtime.InteropServices.WindowsRuntime.dll',
  `/reference:${runtimeWinmd}`,
  `/reference:${runtimeFacade}`,
  source,
];
const result = spawnSync(csc, args, { cwd: frameworkRoot, encoding: 'utf8', windowsHide: true });
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);
console.log(`Built ${output}`);
