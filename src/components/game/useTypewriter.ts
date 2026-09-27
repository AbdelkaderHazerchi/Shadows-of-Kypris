"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useTypewriter — حروف تظهر تباعاً كآلة كاتبة قديمة.
 * @param text    النص الكامل
 * @param speed   زمن الظهور لكل حرف (ms)
 * @param enabled تعطيله يجعل النص كاملاً فوراً
 */
export function useTypewriter(text: string, speed = 32, enabled = true) {
  const [count, setCount] = useState(() => (enabled ? 0 : text.length));
  const [prevKey, setPrevKey] = useState(() => `${text}\u0000${String(enabled)}`);

  // إعادة الضبط عند تغيّر النص/التفعيل (ضبط مشتق أثناء الرسم)
  const key = `${text}\u0000${String(enabled)}`;
  if (key !== prevKey) {
    setPrevKey(key);
    setCount(enabled ? 0 : text.length);
  }

  const done = !enabled || count >= text.length;

  const idRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled || text.length === 0) return;
    const id = setInterval(() => {
      setCount((c) => Math.min(c + 1, text.length));
    }, speed);
    idRef.current = id;
    return () => {
      clearInterval(id);
      if (idRef.current === id) idRef.current = null;
    };
  }, [text, speed, enabled]);

  // إيقاف المؤقّت فور الاكتمال
  useEffect(() => {
    if (done && idRef.current) {
      clearInterval(idRef.current);
      idRef.current = null;
    }
  }, [done]);

  const skip = useCallback(() => {
    setCount(text.length);
  }, [text]);

  return { shown: text.slice(0, count), done, skip };
}
