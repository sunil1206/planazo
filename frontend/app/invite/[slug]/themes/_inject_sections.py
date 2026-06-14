#!/usr/bin/env python3
# Injects ShareThisPage + ShareYourMemories into the 5 non-Luxury themes.
import io, os, sys

THEMES_DIR = os.path.dirname(os.path.abspath(__file__))

IMPORT_NEEDLE = 'import { ThemeProps, imgUrl, formatDate, CATEGORY_ICONS } from "./types";'
IMPORT_REPLACEMENT = (
    IMPORT_NEEDLE + "\n"
    'import ShareThisPage from "./_sections/ShareThisPage";\n'
    'import ShareYourMemories from "./_sections/ShareYourMemories";'
)

FOOTER_MARKERS = {
    "CinematicDark.tsx":     "{/* ── Footer / Credits End",
    "FloralPastel.tsx":      "{/* ── Footer ",
    "KeralaTraditional.tsx": "{/* ── Footer ",
    "ModernMinimal.tsx":     "{/* ── Footer ",
    "RoyalMughal.tsx":       "{/* ── Footer ",
}

PRESETS = {
    "CinematicDark.tsx": {
        "share_bg": "BG_DARK", "share_surface": "BG_SURFACE",
        "text": "LIGHT", "muted": "SILVER",
        "share_accent": "ACCENT", "share_accent_text": "BG_DARK",
        "share_eyebrow": "Share the story", "share_heading": "Share This Page",
        "share_intro": "Send this invitation to anyone whose presence would make our story complete.",
        "mem_bg": "BG_SURFACE", "mem_surface": '"rgba(255,255,255,0.03)"',
        "mem_accent": "ACCENT", "mem_accent_text": "BG_DARK",
        "mem_eyebrow": "Capture the moment", "mem_heading": "Share Your Memories",
        "mem_intro": "Add a frame to our shared reel — every photo becomes part of the cinematic story we are writing together.",
    },
    "FloralPastel.tsx": {
        "share_bg": "LIGHT", "share_surface": '"#ffffff"',
        "text": "CHARCOAL", "muted": "`${CHARCOAL}99`",
        "share_accent": "MAUVE", "share_accent_text": '"#ffffff"',
        "share_eyebrow": "Spread the love", "share_heading": "Share This Invitation",
        "share_intro": "Invite friends and family to share in our joy — every share means the world.",
        "mem_bg": "PINK", "mem_surface": '"#ffffff"',
        "mem_accent": "ROSE", "mem_accent_text": '"#ffffff"',
        "mem_eyebrow": "A moment to remember", "mem_heading": "Share Your Memories",
        "mem_intro": "Caught a beautiful moment? Add it to our shared bouquet of memories.",
    },
    "KeralaTraditional.tsx": {
        "share_bg": "CREAM", "share_surface": '"#ffffff"',
        "text": "DARKBROWN", "muted": "`${DARKBROWN}99`",
        "share_accent": "SAFFRON", "share_accent_text": '"#ffffff"',
        "share_eyebrow": "Pankuvyppikkanam", "share_heading": "Share This Invitation",
        "share_intro": "Pass the joy of our union forward — share with the ones you love.",
        "mem_bg": '"#fdf3e0"', "mem_surface": '"#ffffff"',
        "mem_accent": "GOLD", "mem_accent_text": "DARKBROWN",
        "mem_eyebrow": "Ormakal Pankuvyppikku", "mem_heading": "Share Your Memories",
        "mem_intro": "Captured a beautiful moment from our celebration? Share it with us — every photo becomes part of our story.",
    },
    "ModernMinimal.tsx": {
        "share_bg": '"#ffffff"', "share_surface": '"#f5f5f5"',
        "text": '"#0a0a0a"', "muted": '"#737373"',
        "share_accent": '"#0a0a0a"', "share_accent_text": '"#ffffff"',
        "share_eyebrow": "Share", "share_heading": "Share This Page",
        "share_intro": "Send this invitation along to anyone who should be here with us.",
        "mem_bg": '"#fafafa"', "mem_surface": '"#ffffff"',
        "mem_accent": '"#0a0a0a"', "mem_accent_text": '"#ffffff"',
        "mem_eyebrow": "Memories", "mem_heading": "Share Your Memories",
        "mem_intro": "Add a photo from the day to our shared collection.",
    },
    "RoyalMughal.tsx": {
        "share_bg": '"#130820"', "share_surface": '"rgba(201,149,42,0.08)"',
        "text": '"#F8E7BD"', "muted": '"rgba(248,231,189,0.6)"',
        "share_accent": "GOLD", "share_accent_text": "DARK",
        "share_eyebrow": "Share the celebration", "share_heading": "Share This Invitation",
        "share_intro": "Spread our royal celebration far and wide — share with the noble company you would love to see by our side.",
        "mem_bg": "DARK", "mem_surface": '"rgba(201,149,42,0.06)"',
        "mem_accent": "GOLD", "mem_accent_text": "DARK",
        "mem_eyebrow": "A moment to be treasured", "mem_heading": "Share Your Memories",
        "mem_intro": "Captured a frame from our durbar of love? Send it our way — every photo deserves a place in our royal archive.",
    },
}


def attr(name, value):
    """Render a JSX attribute. Quoted strings stay quoted; everything else gets braces."""
    if value.startswith('"') or value.startswith("'"):
        return f'{name}={value}'
    return f'{name}={{{value}}}'


def render_block(p):
    return (
        '      {/* Share This Page */}\n'
        '      <ShareThisPage\n'
        '        coupleName={inv.couple}\n'
        '        slug={inv.slug}\n'
        '        ' + attr('background',  p['share_bg']) + '\n'
        '        ' + attr('surface',     p['share_surface']) + '\n'
        '        ' + attr('textColor',   p['text']) + '\n'
        '        ' + attr('mutedColor',  p['muted']) + '\n'
        '        ' + attr('accent',      p['share_accent']) + '\n'
        '        ' + attr('accentText',  p['share_accent_text']) + '\n'
        f'        eyebrow="{p["share_eyebrow"]}"\n'
        f'        heading="{p["share_heading"]}"\n'
        f'        intro="{p["share_intro"]}"\n'
        '      />\n\n'
        '      {/* Share Your Memories */}\n'
        '      <ShareYourMemories\n'
        '        onUploadPhoto={onUploadPhoto}\n'
        '        ' + attr('background',  p['mem_bg']) + '\n'
        '        ' + attr('surface',     p['mem_surface']) + '\n'
        '        ' + attr('textColor',   p['text']) + '\n'
        '        ' + attr('mutedColor',  p['muted']) + '\n'
        '        ' + attr('accent',      p['mem_accent']) + '\n'
        '        ' + attr('accentText',  p['mem_accent_text']) + '\n'
        f'        eyebrow="{p["mem_eyebrow"]}"\n'
        f'        heading="{p["mem_heading"]}"\n'
        f'        intro="{p["mem_intro"]}"\n'
        '      />\n\n'
    )


def patch_file(path, footer_marker, preset):
    name = os.path.basename(path)
    with io.open(path, 'r', encoding='utf-8') as f:
        text = f.read()

    if 'ShareThisPage' in text and 'ShareYourMemories' in text:
        print('  --  already injected: ' + name)
        return False

    if IMPORT_NEEDLE not in text:
        print('  !!  no import needle in ' + name)
        return False
    if footer_marker not in text:
        print('  !!  no footer marker in ' + name)
        return False

    # Replace only the un-commented import line. Find both occurrences,
    # pick the one whose line does NOT begin with whitespace + "//".
    chosen_idx = -1
    search = 0
    while True:
        idx = text.find(IMPORT_NEEDLE, search)
        if idx == -1:
            break
        line_start = text.rfind('\n', 0, idx) + 1
        prefix = text[line_start:idx].lstrip()
        if not prefix.startswith('//'):
            chosen_idx = idx
            break
        search = idx + len(IMPORT_NEEDLE)
    if chosen_idx == -1:
        print('  !!  no active import line in ' + name)
        return False
    end = chosen_idx + len(IMPORT_NEEDLE)
    text = text[:chosen_idx] + IMPORT_REPLACEMENT + text[end:]

    # Insert section block immediately before the footer marker.
    block = render_block(preset)
    text = text.replace(footer_marker, block + '      ' + footer_marker, 1)

    tmp = path + '.tmp'
    with io.open(tmp, 'w', encoding='utf-8', newline='\n') as f:
        f.write(text)
    os.replace(tmp, path)
    print('  ok  injected:  ' + name + '  (' + str(len(text)) + ' bytes)')
    return True


def main():
    changed = 0
    for fname, marker in FOOTER_MARKERS.items():
        full = os.path.join(THEMES_DIR, fname)
        if not os.path.isfile(full):
            print('  !!  missing: ' + fname)
            continue
        if patch_file(full, marker, PRESETS[fname]):
            changed += 1
    print('\nfiles changed: ' + str(changed))
    sys.exit(0 if changed > 0 else 1)


if __name__ == '__main__':
    main()
