"""Build compact game cues from CC0 source effects; no synthesized tones or reverb.
Source credits and license: assets/audio/CREDITS.md. Run from project root.
"""
import math
import struct
import wave
from pathlib import Path

ROOT = Path('assets/audio')
RATE = 48000

def read(name):
    with wave.open(str(ROOT / 'source' / (name + '.wav')), 'rb') as w:
        assert (w.getframerate(), w.getnchannels(), w.getsampwidth()) == (RATE, 2, 2)
        data = struct.unpack('<' + 'h' * w.getnframes() * 2, w.readframes(w.getnframes()))
    return [v / 32768 for v in data]

sources = {n: read(n) for n in ('destruction', 'impact', 'splash')}

def build(name, duration, layers, peak):
    frames = int(duration * RATE)
    mix = [0.0] * (frames * 2)
    for source, start, offset, length, gain in layers:
        data = sources[source]
        count = min(int(length * RATE), frames - int(offset * RATE), len(data)//2 - int(start * RATE))
        for i in range(count):
            # Gentle onset and short tail prevent clicks at edit boundaries.
            envelope = min(1, i / (RATE * .003), (count - i) / (RATE * .12))
            for ch in (0, 1):
                mix[(i + int(offset * RATE))*2 + ch] += data[(i + int(start * RATE))*2 + ch] * gain * envelope
    # Remove DC and preserve controlled relative levels between cues.
    mean = sum(mix) / len(mix)
    mix = [v - mean for v in mix]
    scale = peak / max(max(map(abs, mix)), .001)
    with wave.open(str(ROOT / (name + '.wav')), 'wb') as w:
        w.setparams((2, 2, RATE, 0, 'NONE', 'not compressed'))
        w.writeframes(b''.join(struct.pack('<h', int(v * scale * 32767)) for v in mix))

build('hit', 1.15, [('impact', 0, 0, 1.15, 1)], .72)
build('miss', 1.25, [('splash', 0, 0, 1.25, 1)], .48)
# One short destruction impact followed by water, instead of the former sliding drone.
build('sunk', 1.7, [('destruction', 0, 0, .85, .9), ('splash', 0, .45, 1.25, .65)], .74)
# Quiet tactile cues replace electronic beeps and synthesized fanfares.
build('place', .14, [('impact', .02, 0, .14, 1)], .12)
build('turn', .18, [('impact', .04, 0, .18, 1)], .10)
build('win', .55, [('splash', .3, 0, .55, 1)], .16)
build('lose', .55, [('splash', .5, 0, .55, 1)], .12)
