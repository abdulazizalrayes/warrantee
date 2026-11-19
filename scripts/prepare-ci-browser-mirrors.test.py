"""Offline tests: no access to the host's /etc or platform identity."""
import importlib.util
import stat
import tempfile
import unittest
from email.parser import Parser
from pathlib import Path

spec = importlib.util.spec_from_file_location("mirrors", Path(__file__).with_name("prepare-ci-browser-mirrors.py"))
mirrors = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mirrors)

NOBLE = """# Ubuntu Noble runner fixture
Types: deb deb-src
URIs: http://us-east-1.ec2.archive.ubuntu.com/ubuntu/
Suites: noble noble-updates noble-backports
Components: main restricted universe multiverse
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg
Architectures: amd64
X-Owner: retain this field

# Security-only stanza
Types: deb
URIs: http://security.ubuntu.com/ubuntu
Suites: noble-security
Components: main restricted
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg
"""


class MemoryIO:
    def __init__(self, source=NOBLE, config=None, failure=None):
        self.files = {mirrors.SOURCE: source}
        if config is not None:
            self.files[mirrors.CONFIG] = config
        self.calls, self.failure = [], failure

    def record(self, operation, name):
        self.calls.append((operation, name))
        if operation == self.failure:
            raise RuntimeError("HOSTILE-SECRET\nforged success")

    def check(self, name, optional=False):
        self.record("check", name)
        if not optional and name not in self.files:
            raise FileNotFoundError()
        return name in self.files

    def read(self, name):
        self.record("read", name)
        return self.files[name]

    def write(self, name, text, create=False):
        self.record("write", name)
        if create and name in self.files:
            raise FileExistsError()
        self.files[name] = text


class MirrorsTests(unittest.TestCase):
    def run_main(self, io, **kwargs):
        output = []
        options = dict(env=dict(mirrors.GUARDS), system=lambda: "Linux", uid=lambda: 0)
        options.update(kwargs)
        status = mirrors.main(io=io, out=output.append, **options)
        return status, output

    def test_round_trip_preserves_fields(self):
        fixed, count = mirrors.normalize(NOBLE)
        self.assertEqual(count, 2)
        originals = [Parser().parsestr(s) for s in NOBLE.replace("# Ubuntu Noble runner fixture\n", "").replace("# Security-only stanza\n", "").strip().split("\n\n")]
        for index, stanza in enumerate(fixed.strip().split("\n\n")):
            parsed = Parser().parsestr(stanza)
            self.assertEqual(parsed["URIs"], "https://" + ("archive" if index == 0 else "security") + ".ubuntu.com/ubuntu")
            self.assertEqual([(k, v) for k, v in parsed.items() if k != "URIs"],
                             [(k, v) for k, v in originals[index].items() if k != "URIs"])
        self.assertEqual(mirrors.normalize(fixed), (fixed, 2))

    def test_comments_folded_fields_and_multiple_uris(self):
        source = NOBLE.replace("Suites: noble noble-updates", "  # removed\nSuites: noble\n noble-updates")
        source = source.replace("http://us-east-1.ec2.archive.ubuntu.com/ubuntu/", "http://archive.ubuntu.com/ubuntu https://security.ubuntu.com/ubuntu")
        fixed, count = mirrors.normalize(source)
        self.assertEqual(count, 2)
        self.assertEqual(Parser().parsestr(fixed)["Suites"], "noble\n noble-updates noble-backports")

    def test_current_github_runner_failover_reference(self):
        for uri in ("mirror+file:/etc/apt/apt-mirrors.txt", "http://azure.archive.ubuntu.com/ubuntu/"):
            source = NOBLE.replace("http://us-east-1.ec2.archive.ubuntu.com/ubuntu/", uri)
            self.assertEqual(mirrors.normalize(source), mirrors.normalize(NOBLE))

    def test_refuses_malformed_or_unsupported_sources(self):
        uri = "http://us-east-1.ec2.archive.ubuntu.com/ubuntu/"
        bad_uris = ["http://evil.invalid/ubuntu", "http://archive.ubuntu.com.evil/ubuntu",
                    "http://user@archive.ubuntu.com/ubuntu", "http://archive.ubuntu.com:80/ubuntu",
                    "http://archive.ubuntu.com:/ubuntu", "https://archive.ubuntu.com/ubuntu?",
                    "https://archive.ubuntu.com/ubuntu#", "https://archive.ubuntu.com/other",
                    "ftp://archive.ubuntu.com/ubuntu", "http://.ec2.archive.ubuntu.com/ubuntu",
                    "http://-bad.ec2.archive.ubuntu.com/ubuntu", "http://archive.ubuntu.com/ubuntu\\evil",
                    "mirror+file:/etc/apt/other.txt", "mirror+file:/etc/apt/apt-mirrors.txt?",
                    "file:/etc/apt/apt-mirrors.txt", "mirror+file:/etc/apt/../apt/apt-mirrors.txt"]
        sources = [NOBLE.replace(uri, bad) for bad in bad_uris]
        sources += ["", "# only comments\n", NOBLE + "body HOSTILE-SECRET\n",
                    NOBLE.replace("URIs:", "URIs: http://archive.ubuntu.com/ubuntu\nuris:", 1),
                    NOBLE.replace("Types: deb deb-src", "Types: rpm"),
                    NOBLE.replace("noble-backports", "jammy"),
                    NOBLE.replace("Components: main restricted", "Components: bad"),
                    NOBLE.replace("Signed-By:", "Missing-Signed-By:"),
                    NOBLE.replace("URIs: http://security.ubuntu.com/ubuntu", "URIs:"),
                    NOBLE.replace("Types: deb deb-src", "Types deb deb-src"),
                    NOBLE.replace("ubuntu-archive-keyring.gpg", "evil.gpg"),
                    NOBLE + "Trusted: yes\n", NOBLE + "Allow-Insecure: yes\n",
                    NOBLE + "Check-Valid-Until: no\n", NOBLE + "Nonascii: \u00e9\n",
                    NOBLE + "Bad: \x00\n", NOBLE + "Bad: \x7f\n"]
        for source in sources:
            with self.subTest(source=sources.index(source)):
                with self.assertRaises(ValueError):
                    mirrors.normalize(source)

    def test_guards_do_not_touch_io(self):
        def unexpected():
            self.fail("identity lookup before environment guard")
        for key in mirrors.GUARDS:
            env = dict(mirrors.GUARDS)
            env[key] = "wrong"
            io = MemoryIO()
            self.assertEqual(self.run_main(io, env=env, system=unexpected, uid=unexpected), (1, ["guard: 0"]))
            self.assertEqual(io.calls, [])
        for identity in ({"system": lambda: "Darwin"}, {"uid": lambda: 501}):
            io = MemoryIO()
            self.assertEqual(self.run_main(io, **identity), (1, ["guard: 0"]))
            self.assertEqual(io.calls, [])

    def test_only_fixed_paths_and_idempotency(self):
        io = MemoryIO()
        io.files["/etc/apt/sources.list.d/vendor.sources"] = "untouched"
        self.assertEqual(self.run_main(io), (0, ["prepared: 2"]))
        self.assertEqual(io.files[mirrors.CONFIG], mirrors.TIMEOUTS)
        self.assertEqual(io.files["/etc/apt/sources.list.d/vendor.sources"], "untouched")
        self.assertTrue(all(name in {mirrors.SOURCE, mirrors.CONFIG} for _, name in io.calls))
        io.calls.clear()
        self.assertEqual(self.run_main(io), (0, ["prepared: 2"]))
        self.assertFalse(any(op == "write" for op, _ in io.calls))

    def test_stage_failures_are_sanitized(self):
        for failure, category in (("check", "read"), ("read", "read"), ("write", "write")):
            io = MemoryIO(failure=failure)
            self.assertEqual(self.run_main(io), (1, [category + ": 0"]))
        for io in (MemoryIO(config="HOSTILE-SECRET"), MemoryIO(source="HOSTILE-SECRET")):
            self.assertEqual(self.run_main(io), (1, ["validate: 0"]))
            self.assertFalse(any(op == "write" for op, _ in io.calls))

    def test_host_io_refuses_symlinks_and_nonregular_files(self):
        io = mirrors.HostIO()
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory).resolve()
            target = root / "source"
            io.write(str(target), "safe", create=True)
            self.assertTrue(io.check(str(target)))
            self.assertEqual(io.read(str(target)), "safe")
            self.assertEqual(stat.S_IMODE(target.stat().st_mode), 0o644)
            link = root / "link"
            link.symlink_to(target)
            for path in (link, root):
                with self.assertRaises(ValueError):
                    io.check(str(path))
            with self.assertRaises(OSError):
                io.write(str(link), "unsafe")
            with self.assertRaises(OSError):
                io.read(str(link))
            with self.assertRaises(FileExistsError):
                io.write(str(target), "unsafe", create=True)
            parent = root / "parent"
            parent.symlink_to(root, target_is_directory=True)
            with self.assertRaises(ValueError):
                io.check(str(parent / "source"))
            self.assertEqual(io.read(str(target)), "safe")


if __name__ == "__main__":
    unittest.main()
