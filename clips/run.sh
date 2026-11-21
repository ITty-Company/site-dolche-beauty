#!/bin/zsh
# Dolché Beauty — LTX first/last-frame clips, ONE AT A TIME (nice + caffeinate).
# usage: [SEED=n] zsh sites/dolche-beauty/clips/run.sh [clip ids...]
cd /Users/anastasiia.krasnova/Projects/site-factory
PY=~/.local/share/itty-video/.venv/bin/python
K=sites/dolche-beauty/kf
C=sites/dolche-beauty/clips
PRE="One continuous shot, no cuts, photoreal, cinematic, bright natural light, silent, constant smooth speed, gentle parallax, nothing appears or disappears except what is described, no people, no hands."
NEG="hands, fingers, fingernails on hands, arms, people, person, human, face, eyes, body, manicurist, client, mirror, reflection of a person, holding, grabbing, brush in hand, text, letters, numbers, logo, watermark, label, brand name, extra bottles, duplicate objects, extra chairs, melting glass, bent tweezers, morphing objects, objects appearing, cuts, jittery, flicker, blurry, worst quality"
typeset -A A B P S
A[f1]=k1; B[f1]=k2; S[f1]=11; P[f1]="$PRE In an empty light nail studio the camera performs a slow continuous dolly forward and slightly to the right while tilting down toward the gel polish bottles on the white glossy table; the powdery morning light through the pink curtain becomes clearer and sunbeam stripes settle across the bottles, which stand perfectly still."
A[f2]=k2; B[f2]=k3; S[f2]=12; P[f2]="$PRE The camera makes a slow lateral truck to the left along the white glossy table while lowering to table height; a low sunbeam glides across the row of bare nude nail tips on the clear acrylic stand and their thin shadows lengthen. The objects stand perfectly still."
A[f3]=k3; B[f3]=k4; S[f3]=13; P[f3]="$PRE A very slow push-in toward the small clear glass dish of milky rose-pink gel next to the nail tip stand; the tips drift into soft focus, and a single glossy drop of rose gel falls into the dish, raising a small smooth crown and soft ripples."
A[f4]=k4; B[f4]=k5; S[f4]=14; P[f4]="$PRE The camera slowly descends to the level of the white table top and moves slightly left; the white dome-shaped nail lamp on the table softly switches on, a cool white-violet glow spreading from inside its opening across the glossy table. The objects stand perfectly still."
A[f6]=k6; B[f6]=k7; S[f6]=16; P[f6]="$PRE A slow arc of the camera downward from the high angle to table height, pushing in toward the row of small glass gel bottles; the light warms into golden hour and soft rose and amber caustic light patterns slowly crawl across the white table. The objects stand perfectly still."
A[of]=o1; B[of]=o2; S[of]=21; P[of]="$PRE A slow steady forward dolly along the empty brick-paved street toward the softly glowing window with the pink curtain; no people, no cars, no readable signs."
A[al]=a1; B[al]=a1; S[al]=31; P[al]="$PRE Locked-off static camera, the frame does not move. The nail lamp glow breathes very softly, the sheer pink curtain barely sways, dust motes float in the light. Everything else is perfectly still."
A[cl]=c1; B[cl]=c1; S[cl]=41; P[cl]="$PRE Locked-off static camera, the frame does not move. The sheer pink curtain sways very gently, dust motes drift in the warm backlight, leaves outside move slightly. Everything else is perfectly still."
if (( $# )); then LIST=($@); else LIST=(f1 f2 f3 f4 of cl f6 al); fi
for c in $LIST; do
  out=$C/$c.mp4
  if [[ -f $out ]]; then echo "== $c exists, skip"; continue; fi
  a=$K/${A[$c]}.webp; b=$K/${B[$c]}.webp; n=0
  while [[ ! -f $a || ! -f $b ]]; do (( n++ % 20 == 0 )) && echo "   waiting for $a $b $(date +%T)"; sleep 30; (( n > 240 )) && break; done
  [[ -f $a && -f $b ]] || { echo "== $c SKIPPED (no keyframes)"; continue; }
  sd=${SEED:-${S[$c]}}
  echo "== clip $c seed $sd $(date +%T)"
  caffeinate -i nice -n 10 $PY tools/ltx_flf.py $a $b $out.tmp.mp4 --prompt "${P[$c]}" --neg "$NEG" --seed $sd 2>&1 | grep -E "ok |Error|error|Traceback"
  [[ -f $out.tmp.mp4 ]] && mv $out.tmp.mp4 $out
  echo "== done $c $(date +%T)"
done
echo "== ALL DONE $(date +%T)"
