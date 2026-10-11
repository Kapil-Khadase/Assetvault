"""
AssetVault Pre-Encryption File Validator
Enforces pre-encryption file integrity:
1. Validate extension (PDF, PNG, JPG, JPEG, WEBP)
2. Validate MIME type
3. Validate magic bytes / file signatures (rejects renamed executables, scripts, corrupt headers)
4. Validate maximum file size (25 MB)
5. Validate image dimensions and decode integrity for images
"""

import io
import struct
import logging

logger = logging.getLogger("assetvault")

ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg", "webp"}
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/pjpeg",
    "image/webp"
}

MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB
MIN_FILE_SIZE = 4  # bytes

# Signatures (magic bytes)
MAGIC_SIGNATURES = {
    "pdf": [b"%PDF-"],
    "png": [b"\x89PNG\r\n\x1a\n"],
    "jpg": [b"\xff\xd8\xff"],
    "jpeg": [b"\xff\xd8\xff"],
    "webp": [b"RIFF"]  # and bytes 8..12 must be b"WEBP"
}

DISALLOWED_EXECUTABLE_SIGNATURES = [
    (b"MZ", "DOS/Windows Executable"),
    (b"\x7fELF", "Linux ELF Executable"),
    (b"\xca\xfe\xba\xbe", "Mach-O / Java Class"),
    (b"#!", "Shell Script"),
    (b"<?php", "PHP Script"),
    (b"<script", "HTML Script"),
]

def validate_file_pre_encryption(filename: str, file_bytes: bytes, mime_type: str = None) -> dict:
    """
    Validates original file before client-side encryption.
    Returns metadata dict on success, or raises ValueError on validation failure.
    """
    if not filename:
        raise ValueError("Filename is required for file validation.")

    if not file_bytes or len(file_bytes) < MIN_FILE_SIZE:
        raise ValueError("File is empty or corrupted (below minimum size threshold).")

    if len(file_bytes) > MAX_FILE_SIZE:
        raise ValueError(f"File size ({len(file_bytes)} bytes) exceeds the 25 MB depository limit.")

    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Invalid file extension '.{ext}'. Supported formats: PDF, PNG, JPG, JPEG, WEBP.")

    if mime_type and mime_type.lower() not in ALLOWED_MIME_TYPES:
        raise ValueError(f"Invalid MIME type '{mime_type}'. Must be one of: {', '.join(sorted(ALLOWED_MIME_TYPES))}.")

    # Check for executable/script signatures regardless of extension
    for sig, desc in DISALLOWED_EXECUTABLE_SIGNATURES:
        if file_bytes.startswith(sig):
            raise ValueError(f"Executable or script file detected ({desc}). Upload rejected for security.")

    # Validate magic bytes for the declared extension
    expected_sigs = MAGIC_SIGNATURES.get(ext, [])
    matched_sig = any(file_bytes.startswith(s) for s in expected_sigs)
    if ext == "webp":
        matched_sig = file_bytes.startswith(b"RIFF") and len(file_bytes) >= 12 and file_bytes[8:12] == b"WEBP"

    if not matched_sig:
        raise ValueError(f"File signature (magic bytes) does not match extension '.{ext}'. Fake or corrupted file rejected.")

    # Image decode and dimension check
    width, height = None, None
    if ext in {"png", "jpg", "jpeg", "webp"}:
        width, height = _validate_image_dimensions(ext, file_bytes)
        if width <= 0 or height <= 0:
            raise ValueError("Malformed image file: Invalid or zero image dimensions.")

    return {
        "valid": True,
        "extension": ext,
        "size_bytes": len(file_bytes),
        "width": width,
        "height": height
    }

def _validate_image_dimensions(ext: str, file_bytes: bytes) -> tuple:
    """Extract and validate dimensions from image headers."""
    try:
        if ext == "png":
            # PNG IHDR chunk must be at byte 12..16 and minimum valid PNG size is 33 bytes
            if len(file_bytes) < 33 or file_bytes[12:16] != b"IHDR":
                raise ValueError("Corrupt or unreadable PNG header: missing valid IHDR chunk.")
            w, h = struct.unpack(">II", file_bytes[16:24])
            if w <= 0 or h <= 0:
                raise ValueError("Corrupt or unreadable PNG image: zero or invalid dimensions.")
            return w, h
        elif ext in {"jpg", "jpeg"}:
            # Scan JPEG segments for SOF0/SOF2 (0xFFC0 or 0xFFC2)
            idx = 2
            size = len(file_bytes)
            while idx < size - 8:
                if file_bytes[idx] != 0xFF:
                    idx += 1
                    continue
                marker = file_bytes[idx + 1]
                # SOF markers: 0xC0 (baseline), 0xC1 (extended), 0xC2 (progressive)
                if marker in {0xC0, 0xC1, 0xC2}:
                    h, w = struct.unpack(">HH", file_bytes[idx + 5:idx + 9])
                    return w, h
                # Skip marker segment
                segment_len = struct.unpack(">H", file_bytes[idx + 2:idx + 4])[0]
                idx += 2 + segment_len
            raise ValueError("Corrupt or unreadable JPEG image structure: SOF marker not found.")
        elif ext == "webp":
            # VP8 or VP8L header
            if len(file_bytes) < 30:
                raise ValueError("Corrupt or unreadable WEBP header.")
            if file_bytes[12:16] == b"VP8 ":
                # VP8 lossy: frame tag at 20..23, 26..30 has width/height
                w = struct.unpack("<H", file_bytes[26:28])[0] & 0x3FFF
                h = struct.unpack("<H", file_bytes[28:30])[0] & 0x3FFF
                return w, h
            elif file_bytes[12:16] == b"VP8L":
                # VP8L lossless
                b0, b1, b2, b3 = file_bytes[21:25]
                w = 1 + (((b1 & 0x3F) << 8) | b0)
                h = 1 + (((b3 & 0xF) << 10) | (b2 << 2) | ((b1 & 0xC0) >> 6))
                return w, h
            elif file_bytes[12:16] == b"VP8X":
                # VP8X extended
                w = 1 + struct.unpack("<I", file_bytes[24:27] + b"\x00")[0]
                h = 1 + struct.unpack("<I", file_bytes[27:30] + b"\x00")[0]
                return w, h
            else:
                return 1, 1  # Fallback for valid WEBP
    except ValueError:
        raise
    except Exception as e:
        logger.warning("Corrupt or unreadable image file: %s", e, exc_info=True)
        raise ValueError("Corrupt or unreadable image file.")

    return 1, 1

# Export alias for compatibility
validate_pre_encryption_file = validate_file_pre_encryption
