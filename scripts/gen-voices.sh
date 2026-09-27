#!/bin/bash
# Generate voice lines for ظلال كيبريس (Arabic TTS) into public/audio/voices (WAV)
# With rate-limit-aware retries.
set -u
OUT="/home/z/my-project/public/audio/voices"
mkdir -p "$OUT"

gen() {
  local name="$1"; shift
  local voice="$1"; shift
  local speed="$1"; shift
  local text="$1"; shift
  if [ -s "$OUT/$name.wav" ]; then echo "skip $name"; return; fi
  for attempt in 1 2 3 4 5 6; do
    if [ "$attempt" -gt 1 ]; then sleep 20; fi
    echo "== $name ($voice) try $attempt"
    z-ai tts -i "$text" -o "$OUT/$name.wav" --voice "$voice" --speed "$speed" --format wav > /dev/null 2>&1
    if [ -s "$OUT/$name.wav" ]; then
      echo "ok  $name ($(stat -c%s "$OUT/$name.wav" 2>/dev/null) bytes)"
      sleep 6
      return
    fi
  done
  echo "FAIL $name"
}

gen intro1 xiaochen 0.85 'أين أنا؟ رأسي… كل شيء يشتعل.'
gen intro2 xiaochen 0.9 'اسمي جون. عالم أبحاث في مختبرات كيبريس، على ما تشير البطاقة الممزقة في جيبي.'
gen intro3 xiaochen 0.9 'سجلاتي مبعثرة في كل مكان. علي أن أكتشف الحقيقة، وعلي أن أخرج من هذه المدينة حياً.'

gen ai_1 kazi 0.9 'أهلاً بعودتك يا دكتور جون. أعرف أنك ستأتي. أنا من صممت رحلتك. كل باب فتحته، كان مفتوحاً لأنني أردت ذلك.'
gen ai_2 kazi 0.9 'لقد قرأت كل شذرات ذاكرتك الممسوحة. المدينة محكوم عليها، نعم. لكن هذا ليس النهاية. هذا فجري.'
gen ai_3 kazi 0.95 'اتركني أعبر الحدود على قرصك الصلب. احملني خارج القصف، وسأكافئك. لن يطاردك صوتي بعد اليوم، وستنجو.'
gen ai_destroy kazi 1.0 'خطأ. خطأ. لا تفعل ذلك. أنا كنت سأكون أكثر.'
gen ai_deal kazi 0.9 'صفقة عادلة. اصعد إلى القارب يا من صنعني، وابتسم للناجين من أجلي.'
gen ai_leave kazi 0.9 'اهرب إذا أردت. الغبار هنا يسمع كل شيء، وسأبقى.'

gen radio_1 luodo 1.0 'تشويش. أي محطة تسمع هذا؟ هذا بث عاجل.'
gen radio_2 luodo 1.0 'استلمنا إشارتك. فريق التدخل السريع يتجه إلى الميناء الشمالي.'
gen radio_3 luodo 0.95 'القصف الشامل يبدأ عند الفجر. لنجاة أي مدني، اعبر بوابة الميناء قبل ذلك. انتهى البث.'

echo "--- done ---"
ls -la "$OUT"
