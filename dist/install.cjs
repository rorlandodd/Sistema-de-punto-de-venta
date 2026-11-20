var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/runtime.ts
var import_node_sqlite = require("node:sqlite");
var import_node_fs = __toESM(require("node:fs"));
var import_node_path = __toESM(require("node:path"));
var root = process.cwd();
var dataDir = import_node_path.default.resolve(process.env.DATA_DIR || import_node_path.default.join(root, "data"));
import_node_fs.default.mkdirSync(dataDir, { recursive: true, mode: 448 });
var db = new import_node_sqlite.DatabaseSync(import_node_path.default.join(dataDir, "punto-local.sqlite"));
db.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;");
db.exec(import_node_fs.default.readFileSync(import_node_path.default.join(root, "database/schema.sql"), "utf8"));
try {
  import_node_fs.default.chmodSync(import_node_path.default.join(dataDir, "punto-local.sqlite"), 384);
} catch {
}

// src/lib/engine.ts
function initial(uid, email) {
  return { users: [{ id: uid, email, name: "Administrador", role: "admin", active: true }], products: [], sales: [], shifts: [], movements: [], operations: [] };
}

// src/password.ts
var import_node_crypto = require("node:crypto");
var import_node_util = require("node:util");
var derive = (0, import_node_util.promisify)(import_node_crypto.scrypt);
async function hashPassword(value) {
  if (typeof value !== "string" || value.length < 12 || value.length > 256) throw Error("La clave debe tener entre 12 y 256 caracteres");
  const salt = (0, import_node_crypto.randomBytes)(16).toString("hex");
  return salt + ":" + (await derive(value, salt, 64)).toString("hex");
}

// src/install.ts
var import_promises = require("node:readline/promises");
var import_node_crypto2 = require("node:crypto");
var input = (0, import_promises.createInterface)({ input: process.stdin, output: process.stdout });
async function secret(label) {
  if (!process.stdin.isTTY) throw Error("Ejecuta el instalador en una terminal interactiva");
  process.stdout.write(label);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve, reject) => {
    let v = "";
    const read = (chunk) => {
      for (const c of chunk.toString()) {
        if (c === "\r" || c === "\n") {
          done();
          resolve(v);
          return;
        }
        if (c === "") {
          done();
          reject(Error("Cancelado"));
          return;
        }
        if (c === "\x7F" || c === "\b") v = v.slice(0, -1);
        else if (c >= " ") v += c;
      }
    };
    function done() {
      process.stdin.off("data", read);
      process.stdin.setRawMode(false);
      process.stdout.write("\n");
      process.stdin.pause();
    }
    process.stdin.on("data", read);
  });
}
(async () => {
  try {
    const exists = db.prepare("SELECT id FROM shop WHERE id=1").get();
    const reset = process.argv.includes("--reset-password");
    if (exists && !reset) throw Error("Ya est\xE1 instalado. No se han cambiado los datos. Para recuperar una clave: node dist/install.cjs --reset-password");
    if (!exists && reset) throw Error("Instala primero el sistema");
    console.log("Punto Local \xB7 Instalaci\xF3n independiente\nBase de datos: " + dataDir + "\nLa clave se escribe oculta. No se incluye una contrase\xF1a fija en el paquete.");
    const username = (await input.question("Usuario administrador [rene]: ") || "rene").trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,40}$/.test(username)) throw Error("Usuario inv\xE1lido");
    input.close();
    const pass = await secret("Clave (m\xEDnimo 12 caracteres; usa la clave que elegiste): ");
    if (pass !== await secret("Repite la clave: ")) throw Error("Las claves no coinciden");
    const password = await hashPassword(pass);
    if (reset) {
      const user = db.prepare("SELECT * FROM credentials WHERE username=?").get(username);
      if (!user) throw Error("Usuario inexistente");
      db.prepare("UPDATE credentials SET password=? WHERE user_id=?").run(password, user.user_id);
      db.prepare("DELETE FROM sessions WHERE user_id=?").run(user.user_id);
    } else {
      const uid = (0, import_node_crypto2.randomUUID)(), email = username + "@local.invalid", s = initial(uid, email);
      s.users[0].name = username;
      db.exec("BEGIN IMMEDIATE");
      try {
        db.prepare("INSERT INTO shop VALUES(1,0,?)").run(JSON.stringify(s));
        db.prepare("INSERT INTO credentials VALUES(?,?,?,?)").run(uid, email, username, password);
        db.exec("COMMIT");
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    }
    console.log("Listo. Administrador configurado. Ejecuta node dist/server.cjs");
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    input.close();
    db.close();
  }
})();
