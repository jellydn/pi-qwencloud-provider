#!/usr/bin/env python3
"""Create a minimal PNG test image for the vision E2E smoke test.

Generates a 50x50 solid red PNG without external dependencies (no PIL).
The image is small enough to create quickly but large enough to pass
QwenCloud's minimum dimension requirement (10x10).
"""

import struct
import zlib
import sys
from pathlib import Path

W, H = 50, 50

# Build raw RGB pixel data: all red
raw = b"\xff\x00\x00" * W * H


def chunk(ctype: bytes, data: bytes) -> bytes:
    c = ctype + data
    crc = zlib.crc32(c) & 0xFFFFFFFF  # mask to unsigned for struct.pack
    return struct.pack(">I", len(data)) + c + struct.pack(">I", crc)


ihdr = struct.pack(">IIBBBBB", W, H, 8, 2, 0, 0, 0)
idat = zlib.compress(raw)
png = (
    b"\x89PNG\r\n\x1a\n"
    + chunk(b"IHDR", ihdr)
    + chunk(b"IDAT", idat)
    + chunk(b"IEND", b"")
)

out = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/tmp/vision-smoke-test.png")
out.write_bytes(png)
print(f"Created {out} ({len(png)} bytes, {W}x{H})")
