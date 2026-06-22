const { spawn } = require('child_process');
const path = require('path');

const isWin = process.platform === 'win32';
const npm = isWin ? 'npm.cmd' : 'npm';

function run(name, cwd, color) {
  const proc = spawn(npm, ['start'], { cwd, stdio: 'pipe', shell: true });

  proc.stdout.on('data', (d) =>
    process.stdout.write(`\x1b[${color}m[${name}]\x1b[0m ${d}`)
  );
  proc.stderr.on('data', (d) =>
    process.stderr.write(`\x1b[${color}m[${name}]\x1b[0m ${d}`)
  );
  proc.on('exit', (code) => {
    console.log(`\x1b[${color}m[${name}]\x1b[0m exited with code ${code}`);
    process.exit(code ?? 1);
  });

  return proc;
}

const root = __dirname;
const serverProc = run('SERVER', path.join(root, 'server'), '32'); // green
const clientProc = run('CLIENT', path.join(root, 'client'), '36'); // cyan

process.on('SIGINT', () => {
  serverProc.kill();
  clientProc.kill();
  process.exit(0);
});
