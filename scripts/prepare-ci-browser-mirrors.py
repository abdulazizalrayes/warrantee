#!/usr/bin/env python3
"""Normalize only Ubuntu Noble CI mirrors; never relax APT verification."""
import os
import platform
import stat
from email.parser import Parser
from pathlib import Path
from urllib.parse import urlsplit

SOURCE = "/etc/apt/sources.list.d/ubuntu.sources"
CONFIG = "/etc/apt/apt.conf.d/80warrantee-ci-browsers"
TIMEOUTS = 'Acquire::Retries "1";\nAcquire::http::Timeout "30";\nAcquire::https::Timeout "30";\n'
GUARDS = {"CI": "true", "GITHUB_ACTIONS": "true",
          "GITHUB_REPOSITORY": "abdulazizalrayes/warrantee", "RUNNER_OS": "Linux"}


def normalize(text):
    if not text.isascii() or any((ord(c) < 32 and c not in "\n\r\t") or ord(c) == 127 for c in text):
        raise ValueError()
    stanzas, lines = [], []
    for line in text.splitlines() + [""]:
        if line.lstrip().startswith("#"):
            continue
        if line.strip():
            lines.append(line)
        elif lines:
            stanzas.append("\n".join(lines) + "\n")
            lines = []
    result = []
    for stanza in stanzas:
        message = Parser().parsestr(stanza)
        keys = [key.lower() for key in message.keys()]
        if message.defects or message.get_payload() or len(keys) != len(set(keys)):
            raise ValueError()
        allowed = {"Types": {"deb", "deb-src"},
                   "Suites": {"noble", "noble-updates", "noble-backports", "noble-security"},
                   "Components": {"main", "restricted", "universe", "multiverse"},
                   "Signed-By": {"/usr/share/keyrings/ubuntu-archive-keyring.gpg"}}
        for key, values in allowed.items():
            tokens = message.get(key, "").split()
            if not tokens or not set(tokens) <= values or len(tokens) != len(set(tokens)):
                raise ValueError()
        for key in ("Trusted", "Allow-Insecure", "Allow-Weak", "Allow-Downgrade-To-Insecure"):
            if key in message and message[key].strip() != "no":
                raise ValueError()
        for key in ("Check-Valid-Until", "Check-Date"):
            if key in message and message[key].strip() != "yes":
                raise ValueError()
        uris = message.get("URIs", "").split()
        if not uris:
            raise ValueError()
        for uri in uris:
            parsed = urlsplit(uri)
            host = parsed.hostname or ""
            prefix = host.removesuffix(".ec2.archive.ubuntu.com")
            ec2 = host.endswith(".ec2.archive.ubuntu.com") and all(
                label and label[0].isalnum() and label[-1].isalnum()
                and all(c.isalnum() or c == "-" for c in label) for label in prefix.split("."))
            if (host not in {"archive.ubuntu.com", "security.ubuntu.com"} and not ec2
                    or parsed.scheme not in {"http", "https"} or parsed.netloc != host
                    or parsed.path not in {"/ubuntu", "/ubuntu/"} or "?" in uri or "#" in uri):
                raise ValueError()
        host = "security" if set(message["Suites"].split()) == {"noble-security"} else "archive"
        message.replace_header("URIs", "https://" + host + ".ubuntu.com/ubuntu")
        result.append(message.as_string().rstrip())
    if not result:
        raise ValueError()
    return "\n\n".join(result) + "\n", len(result)


class HostIO:
    def check(self, name, optional=False):
        path = Path(name)
        for parent in reversed(path.parents):
            if not stat.S_ISDIR(parent.lstat().st_mode):
                raise ValueError()
        try:
            info = path.lstat()
        except FileNotFoundError:
            if optional:
                return False
            raise
        if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1:
            raise ValueError()
        return True

    def read(self, name):
        with os.fdopen(os.open(name, os.O_RDONLY | os.O_NOFOLLOW), encoding="ascii") as source:
            return source.read()

    def write(self, name, text, create=False):
        flags = os.O_WRONLY | os.O_NOFOLLOW | (os.O_CREAT | os.O_EXCL if create else 0)
        with os.fdopen(os.open(name, flags, 0o644), "w", encoding="ascii") as target:
            info = os.fstat(target.fileno())
            if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1:
                raise ValueError()
            target.truncate(0)
            target.write(text)


def main(env=None, system=platform.system, uid=os.geteuid, io=None, out=print):
    stage = "guard"
    try:
        env = os.environ if env is None else env
        if any(env.get(key) != value for key, value in GUARDS.items()):
            raise ValueError()
        if system() != "Linux" or uid() != 0:
            raise ValueError()
        io = HostIO() if io is None else io
        stage = "read"
        io.check(SOURCE)
        exists = io.check(CONFIG, optional=True)
        original = io.read(SOURCE)
        config = io.read(CONFIG) if exists else TIMEOUTS
        stage = "validate"
        if config != TIMEOUTS:
            raise ValueError()
        fixed, count = normalize(original)
        stage = "write"
        if original != fixed:
            io.write(SOURCE, fixed)
        if not exists:
            io.write(CONFIG, TIMEOUTS, create=True)
        out("prepared: " + str(count))
        return 0
    except Exception:
        out(stage + ": 0")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
