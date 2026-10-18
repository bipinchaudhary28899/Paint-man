// Prints ADMIN_PASSWORD_HASH and a fresh SESSION_SECRET for .env.local.
// The password is typed at a hidden prompt, so it never lands in shell history.
import { randomBytes, scrypt } from "node:crypto";
import { stdin, stdout } from "node:process";

function ask(question) {
  return new Promise((resolve) => {
    stdout.write(question);
    let value = "";
    const tty = stdin.isTTY;
    if (tty) stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    const onData = (ch) => {
      for (const c of ch) {
        if (c === "\r" || c === "\n") {
          if (tty) stdin.setRawMode(false);
          stdin.pause();
          stdin.off("data", onData);
          stdout.write("\n");
          return resolve(value);
        }
        if (c === "\u0003") process.exit(1);
        if (c === "\u007f") value = value.slice(0, -1);
        else value += c;
      }
    };
    stdin.on("data", onData);
  });
}

const password = await ask("Admin password (min 12 characters): ");
if (password.length < 12) {
  console.error("Password must be at least 12 characters.");
  process.exit(1);
}
const confirm = await ask("Repeat password: ");
if (confirm !== password) {
  console.error("Passwords do not match.");
  process.exit(1);
}

const params = { N: 2 ** 15, r: 8, p: 1 };
const salt = randomBytes(16);
scrypt(password, salt, 64, { ...params, maxmem: 256 * 1024 * 1024 }, (err, key) => {
  if (err) throw err;
  const hash = ["scrypt", params.N, params.r, params.p, salt.toString("base64url"), key.toString("base64url")].join(":");
  console.log("\nAdd these to .env.local (or your hosting provider's environment settings):\n");
  console.log(`ADMIN_PASSWORD_HASH=${hash}`);
  console.log(`SESSION_SECRET=${randomBytes(48).toString("base64url")}`);
});
