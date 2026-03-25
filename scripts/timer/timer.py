"""
Interval Timer Audio Generator

Generates an audio file (.mp3) with beeps for work/rest intervals,
suitable for playback in a PWA.

Usage:
    python src/timer.py                          # defaults: 40s/20s, 10 min
    python src/timer.py --duration 15            # 15-minute timer
    python src/timer.py --intervals 40/20        # single interval pattern
    python src/timer.py --intervals 40/20,50/10  # alternating patterns
    python src/timer.py --countdown 5            # 5-second start countdown
    python src/timer.py --transition 2           # 2-second transition beep
"""

import argparse
import math
import struct
import wave
import io
import os

SAMPLE_RATE = 44100
COUNTDOWN_TICK_HZ = 440
WORK_TICK_HZ = 784
REST_TICK_HZ = 523


def generate_tone(frequency: float, duration_s: float, volume: float = 0.5) -> list[int]:
    """Generate a sine wave tone as 16-bit PCM samples."""
    n_samples = int(SAMPLE_RATE * duration_s)
    samples = []
    for i in range(n_samples):
        t = i / SAMPLE_RATE
        # Apply a short fade in/out to avoid clicks (5ms)
        fade_samples = int(0.005 * SAMPLE_RATE)
        envelope = 1.0
        if i < fade_samples:
            envelope = i / fade_samples
        elif i > n_samples - fade_samples:
            envelope = (n_samples - i) / fade_samples
        value = volume * envelope * math.sin(2 * math.pi * frequency * t)
        samples.append(int(value * 32767))
    return samples


def generate_silence(duration_s: float) -> list[int]:
    """Generate silence as 16-bit PCM samples."""
    return [0] * int(SAMPLE_RATE * duration_s)


def generate_countdown_beeps(countdown_s: int, ticks: int, transition_s: float) -> list[int]:
    """Generate countdown: silence, then ticks, then a 'go' beep.

    For example, countdown_s=10, ticks=3 means 7s silence, then ticks at 8, 9,
    and a 'go' beep at 10.
    """
    samples = []
    lead_in = countdown_s - ticks
    if lead_in > 0:
        samples.extend(generate_silence(lead_in))

    # All ticks sound the same — the work beep that follows acts as the "go"
    for _ in range(ticks):
        samples.extend(generate_tone(COUNTDOWN_TICK_HZ, 0.1, volume=0.3))
        samples.extend(generate_silence(0.9))

    return samples


def generate_transition_ticks(ticks: int) -> list[int]:
    """Generate warning ticks before a phase transition (placed at end of current phase)."""
    samples = []
    for _ in range(ticks):
        samples.extend(generate_tone(COUNTDOWN_TICK_HZ, 0.1, volume=0.3))
        samples.extend(generate_silence(0.9))
    return samples


def generate_work_beep(transition_s: float) -> list[int]:
    """Short, high-pitched strike to signal 'GO'."""
    return generate_tone(WORK_TICK_HZ, transition_s, volume=0.4)


def generate_rest_beep(transition_s: float) -> list[int]:
    """Lower, longer tone to signal 'STOP/REST'."""
    # Use a longer duration so it feels like a 'sigh'
    duration = max(transition_s, 0.5)
    return generate_tone(REST_TICK_HZ, duration, volume=0.3)


def generate_last_round_beep(transition_s: float) -> list[int]:
    """A crisp, rhythmic boxing double-tap."""
    # 0.08s is the sweet spot for a 'percussive' strike
    first_tap_dur = 0.08 
    
    # 0.06s is a very tight, professional-sounding gap
    gap_dur = 0.06
    
    # We use the rest of the transition time for the bell to ring out
    main_strike_dur = max(0.2, transition_s - (first_tap_dur + gap_dur))

    # Using 784Hz (G5) for that 'Classic Digital' punch
    samples = generate_tone(784, first_tap_dur, volume=0.5) 
    samples.extend(generate_silence(gap_dur))
    samples.extend(generate_tone(784, main_strike_dur, volume=0.6))
    
    return samples

def generate_finish_beep() -> list[int]:
    """Single longer beep signaling the workout is complete."""
    return generate_tone(REST_TICK_HZ, 1.0, volume=0.4)


def parse_intervals(interval_str: str) -> list[tuple[int, int]]:
    """
    Parse interval string into list of (work_s, rest_s) tuples.
    Examples:
        "40/20"       -> [(40, 20)]
        "40/20,50/10" -> [(40, 20), (50, 10)]
    """
    patterns = []
    for part in interval_str.split(","):
        work, rest = part.strip().split("/")
        patterns.append((int(work), int(rest)))
    return patterns


def _phase_body(duration_s: float, ticks: int) -> list[int]:
    """Fill a phase body with silence and warning ticks at the end."""
    if duration_s <= 0:
        return []
    if duration_s >= ticks:
        samples = generate_silence(duration_s - ticks)
        samples.extend(generate_transition_ticks(ticks))
        return samples
    return generate_silence(duration_s)


def build_timer_audio(
    intervals: list[tuple[int, int]],
    total_duration_min: float,
    countdown_s: int,
    ticks: int,
    transition_s: float,
) -> list[int]:
    """Build the complete timer audio as PCM samples."""
    total_duration_s = total_duration_min * 60
    samples = []

    # Start countdown
    if countdown_s > 0:
        samples.extend(generate_countdown_beeps(countdown_s, ticks, transition_s))

    elapsed = 0.0
    interval_idx = 0

    while elapsed < total_duration_s:
        work_s, rest_s = intervals[interval_idx % len(intervals)]
        interval_idx += 1

        remaining_time = total_duration_s - elapsed

        # --- Work phase ---
        # If this is the last interval (not enough time for full work + rest),
        # extend work to fill remaining time and skip rest
        is_last = remaining_time <= work_s + rest_s
        work_dur = remaining_time if is_last else work_s

        if is_last:
            samples.extend(generate_last_round_beep(transition_s))
        else:
            samples.extend(generate_work_beep(transition_s))
        samples.extend(_phase_body(work_dur - transition_s, ticks))
        elapsed += work_dur

        if elapsed >= total_duration_s:
            break

        # --- Rest phase ---
        samples.extend(generate_rest_beep(transition_s))
        samples.extend(_phase_body(rest_s - transition_s, ticks))
        elapsed += rest_s

    # Finish beep
    samples.extend(generate_finish_beep())

    return samples


def samples_to_wav_bytes(samples: list[int]) -> bytes:
    """Convert PCM samples to WAV file bytes."""
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        packed = struct.pack(f"<{len(samples)}h", *samples)
        wf.writeframes(packed)
    return buf.getvalue()


def wav_to_mp3(wav_bytes: bytes, output_path: str) -> None:
    """Convert WAV bytes to MP3 using pydub."""
    from pydub import AudioSegment

    audio = AudioSegment.from_wav(io.BytesIO(wav_bytes))
    audio.export(output_path, format="mp3", bitrate="128k")


def main():
    parser = argparse.ArgumentParser(description="Generate interval timer audio")
    parser.add_argument(
        "--intervals",
        type=str,
        default="40/20",
        help='Work/rest patterns, e.g. "40/20" or "40/20,50/10" for alternating (default: 40/20)',
    )
    parser.add_argument(
        "--duration",
        type=float,
        default=10,
        help="Total workout duration in minutes (default: 10)",
    )
    parser.add_argument(
        "--countdown",
        type=int,
        default=10,
        help="Total countdown seconds before workout starts (default: 10)",
    )
    parser.add_argument(
        "--ticks",
        type=int,
        default=3,
        help="Number of audible ticks at the end of the countdown (default: 3)",
    )
    parser.add_argument(
        "--transition",
        type=float,
        default=0.5,
        help="Duration of transition beep in seconds (default: 0.5)",
    )
    parser.add_argument(
        "--format",
        choices=["wav", "mp3"],
        default="mp3",
        help="Output format (default: mp3)",
    )
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="Output file path (default: src/output/timer.<format>)",
    )
    args = parser.parse_args()

    intervals = parse_intervals(args.intervals)
    interval_label = args.intervals.replace("/", "-").replace(",", "_")

    if args.output:
        output_path = args.output
    else:
        output_dir = os.path.join(os.path.dirname(__file__), "output")
        os.makedirs(output_dir, exist_ok=True)
        output_path = os.path.join(output_dir, f"timer.{args.format}")

    print(f"Generating timer audio...")
    print(f"  Intervals: {', '.join(f'{w}s work / {r}s rest' for w, r in intervals)}")
    if len(intervals) > 1:
        print(f"  Mode: alternating between {len(intervals)} patterns")
    print(f"  Duration: {args.duration} min")
    print(f"  Countdown: {args.countdown}s ({args.ticks} ticks)")
    print(f"  Transition beep: {args.transition}s")

    samples = build_timer_audio(intervals, args.duration, args.countdown, args.ticks, args.transition)

    if args.format == "wav":
        wav_bytes = samples_to_wav_bytes(samples)
        with open(output_path, "wb") as f:
            f.write(wav_bytes)
    else:
        wav_bytes = samples_to_wav_bytes(samples)
        wav_to_mp3(wav_bytes, output_path)

    file_size = os.path.getsize(output_path)
    print(f"  Output: {output_path} ({file_size / 1024:.1f} KB)")
    print("Done!")


if __name__ == "__main__":
    main()
