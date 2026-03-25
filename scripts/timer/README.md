# Interval Timer Audio Generator

Generates an audio file with beeps for work/rest interval training, playable in a PWA.

## Audio flow

```
[silence ........] [tick] [tick] [tick]        <- countdown (default 10s, last 3s are ticks)
[WORK BEEP] [work .............] [tick tick tick]   <- work interval
[rest beep] [rest .......] [tick tick tick]          <- rest interval
[WORK BEEP] [work .............] [tick tick tick]   <- work interval
[rest beep] [rest .......] [tick tick tick]          <- rest interval
  ...repeats...
[DOUBLE BEEP] [final work ........] [tick tick tick] <- last round (work extends to fill time)
[END BEEP]                                           <- done
```

- **Ticks**: short quiet clicks warning that a transition is coming (default: 3 ticks, 1 per second)
- **Work beep**: higher-pitched beep at the start of each work interval
- **Rest beep**: lower-pitched beep at the start of each rest interval
- **Double beep**: two quick beeps signaling the final round
- **End beep**: single longer tone signaling the workout is complete
- The last interval is always work (no trailing rest) — it extends to fill remaining time

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
brew install ffmpeg  # needed for MP3 output
```

## Usage

```bash
# Defaults: 40s work / 20s rest, 10 min, MP3
python src/timer.py

# Custom intervals
python src/timer.py --intervals "40/20"
python src/timer.py --intervals "40/20,50/10"  # alternating patterns

# Custom duration
python src/timer.py --duration 15

# Custom countdown and ticks
python src/timer.py --countdown 10 --ticks 3

# Custom transition beep length
python src/timer.py --transition 0.5

# WAV output (no ffmpeg needed)
python src/timer.py --format wav

# Custom output path
python src/timer.py --output /path/to/file.mp3
```

Output goes to `src/output/` by default.
